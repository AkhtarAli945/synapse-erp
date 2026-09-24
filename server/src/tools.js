import { z } from "zod";
import { Leave, Invoice, Project } from "./models.js";

const day = (d) => d.toISOString().slice(0, 10);
const esc = (s) => s.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const starts = (s) => new RegExp("^" + esc(s), "i");
export const invStatus = (i) => (i.status === "Paid" ? "Paid" : i.due < new Date() ? "Overdue" : "Unpaid");

// Every tool the agents can call. `sensitive` tools never run directly:
// they go through the approval gate (unless the user's policy turns it off).
export const TOOLS = [
  {
    name: "list_leaves", domain: "hr",
    description: "List leave requests, optionally filtered by status.",
    schema: z.object({ status: z.enum(["Pending", "Approved", "Rejected"]).optional() }),
    run: async ({ status }) =>
      (await Leave.find(status ? { status } : {}).sort({ from: 1 }).lean())
        .map((l) => ({ employee: l.employee, type: l.type, from: day(l.from), to: day(l.to), status: l.status })),
  },
  {
    name: "decide_leave", domain: "hr", sensitive: true, perm: "leaveSignoff", risk: "Low",
    description: "Approve or reject the pending leave request of an employee (first name is enough).",
    schema: z.object({ employee: z.string(), decision: z.enum(["Approved", "Rejected"]) }),
    summary: (a) => `${a.decision === "Approved" ? "Approve" : "Reject"} leave — ${a.employee}`,
    run: async ({ employee, decision }) => {
      const l = await Leave.findOneAndUpdate({ employee: starts(employee), status: "Pending" }, { status: decision }, { new: true });
      return l ? { ok: true, employee: l.employee, status: l.status } : { ok: false, error: "No pending leave found" };
    },
  },
  {
    name: "list_invoices", domain: "finance",
    description: "List invoices with totals. status: Paid, Unpaid (any not paid) or Overdue. Omit for all.",
    schema: z.object({ status: z.enum(["Paid", "Unpaid", "Overdue"]).optional() }),
    run: async ({ status }) => {
      const rows = (await Invoice.find().sort({ due: 1 }).lean()).map((i) => ({
        number: i.number, client: i.client, amount: i.amount, due: day(i.due), status: invStatus(i),
      }));
      const f = !status ? rows : rows.filter((r) => (status === "Unpaid" ? r.status !== "Paid" : r.status === status));
      return { count: f.length, totalPKR: f.reduce((s, r) => s + r.amount, 0), invoices: f };
    },
  },
  {
    name: "pay_invoice", domain: "finance", sensitive: true, perm: "paymentSignoff", risk: "High",
    description: "Mark an invoice as paid by its number, e.g. INV-2041.",
    schema: z.object({ number: z.string() }),
    summary: (a) => `Pay invoice ${a.number}`,
    run: async ({ number }) => {
      const i = await Invoice.findOneAndUpdate({ number: new RegExp("^" + esc(number) + "$", "i"), status: { $ne: "Paid" } }, { status: "Paid", paidAt: new Date() }, { new: true });
      return i ? { ok: true, number: i.number, amount: i.amount } : { ok: false, error: "Invoice not found or already paid" };
    },
  },
  {
    name: "list_projects", domain: "projects",
    description: "List projects with progress, owner and delay risk. Optionally filter by risk.",
    schema: z.object({ risk: z.enum(["Low", "Medium", "High"]).optional() }),
    run: async ({ risk }) =>
      (await Project.find(risk ? { risk } : {}).lean()).map((p) => ({ name: p.name, status: p.status, progress: p.progress, risk: p.risk, owner: p.owner })),
  },
  {
    name: "reassign_project", domain: "projects", sensitive: true, risk: "Medium",
    description: "Assign a project to a different owner.",
    schema: z.object({ name: z.string(), owner: z.string() }),
    summary: (a) => `Reassign "${a.name}" to ${a.owner}`,
    run: async ({ name, owner }) => {
      const p = await Project.findOneAndUpdate({ name: new RegExp(esc(name), "i") }, { owner }, { new: true });
      return p ? { ok: true, project: p.name, owner: p.owner } : { ok: false, error: "Project not found" };
    },
  },
];
