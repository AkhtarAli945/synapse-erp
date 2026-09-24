import { StateGraph, Annotation, START, END } from "@langchain/langgraph";
import { ChatGroq } from "@langchain/groq";
import { tool } from "@langchain/core/tools";
import { SystemMessage, HumanMessage, ToolMessage } from "@langchain/core/messages";
import { TOOLS } from "./tools.js";
import { Approval } from "./models.js";

const model = () => new ChatGroq({ model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile", temperature: 0 });
const text = (m) => (typeof m.content === "string" ? m.content : JSON.stringify(m.content));
const concat = { reducer: (a, b) => a.concat(b), default: () => [] };

const State = Annotation.Root({
  input: Annotation(), userId: Annotation(), perms: Annotation(),
  route: Annotation(), reply: Annotation(), proposed: Annotation(),
  steps: Annotation(concat), approvals: Annotation(concat),
});

// 1) Supervisor: decides which specialist agent handles the request.
const supervisor = async (s) => {
  const r = await model().invoke([
    new SystemMessage("Classify the request into ONE word. hr = leaves, employees, attendance. finance = invoices, payments, clients. projects = projects, tasks, delays, owners. general = anything else. Reply with only the word."),
    new HumanMessage(s.input),
  ]);
  const w = text(r).toLowerCase();
  const route = ["hr", "finance", "projects"].find((k) => w.includes(k)) || "general";
  return { route, steps: [{ node: "supervisor", text: `Routed to ${route} agent` }] };
};

// 2) Specialist agents: call read-only tools now, queue sensitive ones for the gate.
const specialist = (domain) => async (s) => {
  const defs = TOOLS.filter((t) => t.domain === domain);
  const lc = defs.map((d) => tool(async () => "", { name: d.name, description: d.description, schema: d.schema }));
  const sys = new SystemMessage(`You are the ${domain.toUpperCase()} agent of a company ERP. Use the tools to answer or act. Never invent data. Amounts are PKR. Today is ${new Date().toDateString()}. Keep replies short and clear.`);
  const human = new HumanMessage(s.input);
  const first = await model().bindTools(lc).invoke([sys, human]);
  const calls = first.tool_calls || [];
  if (!calls.length) return { reply: text(first), proposed: [], steps: [{ node: domain, text: `${domain} agent answered` }] };

  const steps = [], proposed = [], msgs = [];
  for (const c of calls) {
    const d = defs.find((x) => x.name === c.name);
    if (!d) { msgs.push(new ToolMessage({ tool_call_id: c.id, content: "Unknown tool" })); continue; }
    const call = `${d.name}(${JSON.stringify(c.args)})`;
    if (d.sensitive) {
      proposed.push({ tool: d.name, args: c.args });
      msgs.push(new ToolMessage({ tool_call_id: c.id, content: "Submitted to the approval gate. Tell the user it needs their approval." }));
      steps.push({ node: "tool", text: `Prepared ${call}` });
    } else {
      msgs.push(new ToolMessage({ tool_call_id: c.id, content: JSON.stringify(await d.run(c.args)) }));
      steps.push({ node: "tool", text: `Called ${call}` });
    }
  }
  const final = await model().invoke([sys, human, first, ...msgs]);
  return { reply: text(final), proposed, steps };
};

// 3) Approval gate: sensitive actions wait for a human (unless the user's policy allows auto-run).
const gate = async (s) => {
  const approvals = [], steps = [];
  let reply = s.reply || "";
  for (const p of s.proposed || []) {
    const d = TOOLS.find((t) => t.name === p.tool);
    const needs = d.perm ? s.perms?.[d.perm] !== false : true;
    if (needs) {
      const a = await Approval.create({ user: s.userId, tool: d.name, args: p.args, summary: d.summary(p.args), agent: s.route, risk: d.risk });
      approvals.push(a.toObject());
      steps.push({ node: "gate", text: "Waiting for human approval" });
    } else {
      await d.run(p.args);
      steps.push({ node: "gate", text: `Auto-approved by your policy: ${d.name}` });
      reply += `\n\n✓ Done automatically — your policy doesn't require approval for this.`;
    }
  }
  return { approvals, steps, reply };
};

const general = async (s) => {
  const r = await model().invoke([
    new SystemMessage("You are Synapse, an ERP assistant. You can manage HR (leaves), Finance (invoices, payments) and Projects (progress, risk, owners). Answer briefly and suggest what you can do."),
    new HumanMessage(s.input),
  ]);
  return { reply: text(r), steps: [{ node: "general", text: "General answer" }] };
};

const graph = new StateGraph(State)
  .addNode("supervisor", supervisor)
  .addNode("hr", specialist("hr"))
  .addNode("finance", specialist("finance"))
  .addNode("projects", specialist("projects"))
  .addNode("general", general)
  .addNode("gate", gate)
  .addEdge(START, "supervisor")
  .addConditionalEdges("supervisor", (s) => s.route, ["hr", "finance", "projects", "general"])
  .addEdge("hr", "gate").addEdge("finance", "gate").addEdge("projects", "gate")
  .addEdge("gate", END).addEdge("general", END)
  .compile();

export const runAgent = async ({ input, userId, perms }) => {
  const out = await graph.invoke({ input, userId, perms, proposed: [] });
  return { reply: out.reply, route: out.route, steps: out.steps, approvals: out.approvals };
};
