// import { Router } from "express";
// import bcrypt from "bcryptjs";
// import jwt from "jsonwebtoken";
// import { User, Employee, Leave, Invoice, Project, Approval, Run } from "./models.js";
// import { TOOLS, invStatus } from "./tools.js";
// import { runAgent } from "./agent.js";

// const r = Router();
// const sign = (u) => jwt.sign({ id: u._id }, process.env.JWT_SECRET || "dev-secret", { expiresIn: "7d" });
// const pub = (u) => ({ id: u._id, name: u.name, email: u.email, perms: u.perms });

// const auth = async (req, res, next) => {
//   try {
//     const t = (req.headers.authorization || "").replace("Bearer ", "");
//     const { id } = jwt.verify(t, process.env.JWT_SECRET || "dev-secret");
//     req.user = await User.findById(id);
//     if (!req.user) throw new Error("no user");
//     next();
//   } catch { res.status(401).json({ error: "Please sign in again." }); }
// };

// // ---------- Auth ----------
// r.post("/auth/register", async (req, res) => {
//   const { name, email, password } = req.body;
//   if (!name || !email || !password || password.length < 6) return res.status(400).json({ error: "Enter your name, a valid email and a password of 6+ characters." });
//   if (await User.findOne({ email: email.toLowerCase() })) return res.status(409).json({ error: "This email is already registered." });
//   const u = await User.create({ name, email, password: await bcrypt.hash(password, 10) });
//   res.json({ token: sign(u), user: pub(u) });
// });
// r.post("/auth/login", async (req, res) => {
//   const u = await User.findOne({ email: (req.body.email || "").toLowerCase() });
//   if (!u || !(await bcrypt.compare(req.body.password || "", u.password))) return res.status(401).json({ error: "Wrong email or password." });
//   res.json({ token: sign(u), user: pub(u) });
// });
// r.get("/auth/me", auth, (req, res) => res.json({ user: pub(req.user) }));
// r.put("/settings", auth, async (req, res) => {
//   const { leaveSignoff, paymentSignoff } = req.body;
//   req.user.perms = { leaveSignoff: !!leaveSignoff, paymentSignoff: !!paymentSignoff };
//   await req.user.save();
//   res.json({ user: pub(req.user) });
// });

// // ---------- Agent ----------
// r.post("/agent/chat", auth, async (req, res) => {
//   const message = (req.body.message || "").trim();
//   if (!message) return res.status(400).json({ error: "Type a message first." });
//   const t0 = Date.now();
//   try {
//     const out = await runAgent({ input: message, userId: req.user._id, perms: req.user.perms });
//     await Run.create({ user: req.user._id, prompt: message, route: out.route, steps: out.steps, ms: Date.now() - t0, status: out.approvals.length ? "Waiting" : "Done" });
//     res.json(out);
//   } catch (e) {
//     console.error(e);
//     await Run.create({ user: req.user._id, prompt: message, steps: [], ms: Date.now() - t0, status: "Failed" });
//     res.status(500).json({ error: /api.?key|401/i.test(e.message) ? "The Groq API key is missing or invalid. Check GROQ_API_KEY in server/.env." : "The agent could not finish this request. Please try again." });
//   }
// });
// r.get("/runs", auth, async (req, res) => res.json(await Run.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(20).lean()));

// // ---------- Approvals ----------
// r.get("/approvals", auth, async (req, res) => res.json(await Approval.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50).lean()));
// r.post("/approvals/:id/decide", auth, async (req, res) => {
//   const a = await Approval.findOne({ _id: req.params.id, user: req.user._id, status: "Pending" });
//   if (!a) return res.status(404).json({ error: "This request was already handled." });
//   if (req.body.decision === "approve") {
//     const result = await TOOLS.find((t) => t.name === a.tool).run(a.args);
//     a.status = result.ok === false ? "Failed" : "Approved";
//     await a.save();
//     return res.json({ approval: a, result });
//   }
//   a.status = "Rejected";
//   await a.save();
//   res.json({ approval: a });
// });

// // ---------- Data pages ----------
// r.get("/dashboard", auth, async (req, res) => {
//   const [pending, invs, projs, leaves, headcount, runs] = await Promise.all([
//     Approval.find({ user: req.user._id, status: "Pending" }).lean(),
//     Invoice.find().lean(), Project.find().lean(), Leave.find().lean(), Employee.countDocuments(),
//     Run.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(5).lean(),
//   ]);
//   const now = Date.now(), wk = 7 * 864e5;
//   const unpaid = invs.filter((i) => i.status !== "Paid");
//   const weekly = [0, 1, 2, 3].map((k) =>
//     invs.filter((i) => i.paidAt && now - i.paidAt > (3 - k) * wk && now - i.paidAt <= (4 - k) * wk).reduce((s, i) => s + i.amount, 0) / 1e5);
//   res.json({
//     pending: pending.length, highRisk: pending.filter((p) => p.risk === "High").length,
//     unpaidTotal: unpaid.reduce((s, i) => s + i.amount, 0), overdue: unpaid.filter((i) => i.due < now).length,
//     active: projs.filter((p) => p.status !== "done").length, atRisk: projs.filter((p) => p.risk === "High").length,
//     leavesToday: leaves.filter((l) => l.status === "Approved" && l.from <= now && l.to >= now).length, headcount, weekly, activity: runs,
//   });
// });
// r.get("/hr", auth, async (req, res) => {
//   const [headcount, leaves] = await Promise.all([Employee.countDocuments(), Leave.find().sort({ from: 1 }).lean()]);
//   const now = Date.now();
//   res.json({
//     headcount, pending: leaves.filter((l) => l.status === "Pending").length,
//     onLeave: leaves.filter((l) => l.status === "Approved" && l.from <= now && l.to >= now).length, leaves,
//   });
// });
// r.post("/leaves/:id/decide", auth, async (req, res) => {
//   const status = req.body.decision === "approve" ? "Approved" : "Rejected";
//   res.json(await Leave.findByIdAndUpdate(req.params.id, { status }, { new: true }));
// });
// r.get("/finance", auth, async (req, res) => {
//   const invs = (await Invoice.find().sort({ due: 1 }).lean()).map((i) => ({ ...i, status: invStatus(i) }));
//   const month = new Date(); month.setDate(1); month.setHours(0, 0, 0, 0);
//   res.json({
//     unpaid: invs.filter((i) => i.status !== "Paid").reduce((s, i) => s + i.amount, 0),
//     overdue: invs.filter((i) => i.status === "Overdue").length,
//     collected: invs.filter((i) => i.paidAt >= month).reduce((s, i) => s + i.amount, 0), invoices: invs,
//   });
// });
// r.get("/projects", auth, async (req, res) => res.json(await Project.find().lean()));

// export default r;







import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User, Employee, Leave, Invoice, Project, Approval, Run } from "./models.js";
import { TOOLS, invStatus } from "./tools.js";
import { runAgent } from "./agent.js";

const r = Router();
const sign = (u) => jwt.sign({ id: u._id }, process.env.JWT_SECRET || "dev-secret", { expiresIn: "7d" });
const pub = (u) => ({ id: u._id, name: u.name, email: u.email, perms: u.perms });

const auth = async (req, res, next) => {
  try {
    const t = (req.headers.authorization || "").replace("Bearer ", "");
    const { id } = jwt.verify(t, process.env.JWT_SECRET || "dev-secret");
    req.user = await User.findById(id);
    if (!req.user) throw new Error("no user");
    next();
  } catch { res.status(401).json({ error: "Please sign in again." }); }
};

// ---------- Auth ----------
r.post("/auth/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password || password.length < 6) return res.status(400).json({ error: "Enter your name, a valid email and a password of 6+ characters." });
  if (await User.findOne({ email: email.toLowerCase() })) return res.status(409).json({ error: "This email is already registered." });
  await User.create({ name, email, password: await bcrypt.hash(password, 10) });
  res.status(201).json({ ok: true });
});
r.post("/auth/login", async (req, res) => {
  const u = await User.findOne({ email: (req.body.email || "").toLowerCase() });
  if (!u || !(await bcrypt.compare(req.body.password || "", u.password))) return res.status(401).json({ error: "Wrong email or password." });
  res.json({ token: sign(u), user: pub(u) });
});
r.get("/auth/me", auth, (req, res) => res.json({ user: pub(req.user) }));
r.put("/settings", auth, async (req, res) => {
  const { leaveSignoff, paymentSignoff } = req.body;
  req.user.perms = { leaveSignoff: !!leaveSignoff, paymentSignoff: !!paymentSignoff };
  await req.user.save();
  res.json({ user: pub(req.user) });
});

// ---------- Agent ----------
r.post("/agent/chat", auth, async (req, res) => {
  const message = (req.body.message || "").trim();
  if (!message) return res.status(400).json({ error: "Type a message first." });
  const t0 = Date.now();
  try {
    const out = await runAgent({ input: message, userId: req.user._id, perms: req.user.perms });
    await Run.create({ user: req.user._id, prompt: message, route: out.route, steps: out.steps, ms: Date.now() - t0, status: out.approvals.length ? "Waiting" : "Done" });
    res.json(out);
  } catch (e) {
    console.error(e);
    await Run.create({ user: req.user._id, prompt: message, steps: [], ms: Date.now() - t0, status: "Failed" });
    res.status(500).json({ error: /api.?key|401/i.test(e.message) ? "The Groq API key is missing or invalid. Check GROQ_API_KEY in server/.env." : "The agent could not finish this request. Please try again." });
  }
});
r.get("/runs", auth, async (req, res) => res.json(await Run.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(20).lean()));

// ---------- Approvals ----------
r.get("/approvals", auth, async (req, res) => res.json(await Approval.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50).lean()));
r.post("/approvals/:id/decide", auth, async (req, res) => {
  const a = await Approval.findOne({ _id: req.params.id, user: req.user._id, status: "Pending" });
  if (!a) return res.status(404).json({ error: "This request was already handled." });
  if (req.body.decision === "approve") {
    const result = await TOOLS.find((t) => t.name === a.tool).run(a.args);
    a.status = result.ok === false ? "Failed" : "Approved";
    await a.save();
    return res.json({ approval: a, result });
  }
  a.status = "Rejected";
  await a.save();
  res.json({ approval: a });
});

// ---------- Data pages ----------
r.get("/dashboard", auth, async (req, res) => {
  const [pending, invs, projs, leaves, headcount, runs] = await Promise.all([
    Approval.find({ user: req.user._id, status: "Pending" }).lean(),
    Invoice.find().lean(), Project.find().lean(), Leave.find().lean(), Employee.countDocuments(),
    Run.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(5).lean(),
  ]);
  const now = Date.now(), wk = 7 * 864e5;
  const unpaid = invs.filter((i) => i.status !== "Paid");
  const weekly = [0, 1, 2, 3].map((k) =>
    invs.filter((i) => i.paidAt && now - i.paidAt > (3 - k) * wk && now - i.paidAt <= (4 - k) * wk).reduce((s, i) => s + i.amount, 0) / 1e5);
  res.json({
    pending: pending.length, highRisk: pending.filter((p) => p.risk === "High").length,
    unpaidTotal: unpaid.reduce((s, i) => s + i.amount, 0), overdue: unpaid.filter((i) => i.due < now).length,
    active: projs.filter((p) => p.status !== "done").length, atRisk: projs.filter((p) => p.risk === "High").length,
    leavesToday: leaves.filter((l) => l.status === "Approved" && l.from <= now && l.to >= now).length, headcount, weekly, activity: runs,
  });
});
r.get("/hr", auth, async (req, res) => {
  const [headcount, leaves] = await Promise.all([Employee.countDocuments(), Leave.find().sort({ from: 1 }).lean()]);
  const now = Date.now();
  res.json({
    headcount, pending: leaves.filter((l) => l.status === "Pending").length,
    onLeave: leaves.filter((l) => l.status === "Approved" && l.from <= now && l.to >= now).length, leaves,
  });
});
r.post("/leaves/:id/decide", auth, async (req, res) => {
  const status = req.body.decision === "approve" ? "Approved" : "Rejected";
  res.json(await Leave.findByIdAndUpdate(req.params.id, { status }, { new: true }));
});
r.get("/finance", auth, async (req, res) => {
  const invs = (await Invoice.find().sort({ due: 1 }).lean()).map((i) => ({ ...i, status: invStatus(i) }));
  const month = new Date(); month.setDate(1); month.setHours(0, 0, 0, 0);
  res.json({
    unpaid: invs.filter((i) => i.status !== "Paid").reduce((s, i) => s + i.amount, 0),
    overdue: invs.filter((i) => i.status === "Overdue").length,
    collected: invs.filter((i) => i.paidAt >= month).reduce((s, i) => s + i.amount, 0), invoices: invs,
  });
});
r.get("/projects", auth, async (req, res) => res.json(await Project.find().lean()));

export default r;
