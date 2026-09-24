import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { Av, Pill, Load, useAuth, useFetch, pkr, lakh, dshort, ago, agentName } from "../ui.jsx";

const Head = ({ t, s }) => <><h1>{t}</h1><p className="sub">{s}</p></>;
const Kpi = ({ label, value, note }) => <div className="card kpi"><span>{label}</span><b>{value}</b>{note && <i>{note}</i>}</div>;

export function Dashboard() {
  const s = useFetch("/dashboard"), nav = useNavigate(), { user } = useAuth(), [q, setQ] = useState("");
  if (!s.data) return <Load s={s} />;
  const d = s.data, h = new Date().getHours(), max = Math.max(...d.weekly, 1);
  return (
    <>
      <Head t={`Good ${h < 12 ? "morning" : h < 18 ? "afternoon" : "evening"}, ${user.name.split(" ")[0]} ☀️`}
        s={d.pending ? `${d.pending} item${d.pending > 1 ? "s are" : " is"} waiting for your approval today.` : "Nothing is waiting for your approval."} />
      <form className="ask" onSubmit={(e) => { e.preventDefault(); nav(`/chat${q.trim() ? "?q=" + encodeURIComponent(q) : ""}`); }}>
        <span style={{ padding: 6 }}>✦</span>
        <input className="inp" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask the agent anything… e.g. “Show this week’s overdue tasks”" aria-label="Ask the agent" />
        <button className="btn">Ask</button>
      </form>
      <div className="grid g4" style={{ marginBottom: 12 }}>
        <Kpi label="Pending approvals" value={d.pending} note={`${d.highRisk} high risk`} />
        <Kpi label="Unpaid invoices" value={lakh(d.unpaidTotal)} note={`${d.overdue} overdue`} />
        <Kpi label="Active projects" value={d.active} note={`${d.atRisk} at risk`} />
        <Kpi label="Leaves today" value={d.leavesToday} note={`of ${d.headcount} staff`} />
      </div>
      <div className="grid g2">
        <div className="card"><h2>Invoices collected (PKR, lakh)</h2>
          <div className="bars">{d.weekly.map((v, i) => <div key={i} style={{ height: `${(v / max) * 100}%` }} title={v.toFixed(1) + "L"}><em>W{i + 1}</em></div>)}</div></div>
        <div className="card"><h2>Agent activity</h2>
          {!d.activity.length ? <p className="empty">No activity yet. Ask something in Agent Chat.</p> : d.activity.map((r, i) => (
            <div key={r._id} className="row"><Av name={agentName(r.route)} i={i} /><div className="g"><b>{agentName(r.route)}</b><small>{r.prompt}</small></div><small>{ago(r.createdAt)}</small></div>
          ))}</div>
      </div>
    </>
  );
}

export function Approvals() {
  const s = useFetch("/approvals"), [tab, setTab] = useState("Pending");
  if (!s.data) return <Load s={s} />;
  const list = tab === "Pending" ? s.data.filter((a) => a.status === "Pending") : s.data;
  const decide = async (id, decision) => { try { await api(`/approvals/${id}/decide`, { method: "POST", body: { decision } }); } catch (e) { alert(e.message); } s.load(); };
  return (
    <>
      <Head t="Approvals" s="Review the sensitive actions the agent has prepared." />
      <div className="chips" style={{ marginBottom: 12 }}>{["Pending", "All"].map((t) => <button key={t} onClick={() => setTab(t)} style={tab === t ? { background: "var(--acc)", color: "#fff" } : {}}>{t}</button>)}</div>
      <div className="card">
        {!list.length ? <p className="empty">{tab === "Pending" ? "You’re all caught up. New requests from the agent will appear here." : "No requests yet."}</p> : list.map((a, i) => (
          <div key={a._id} className="row"><Av name={agentName(a.agent)} i={i} />
            <div className="g"><b>{a.summary}</b><small>{agentName(a.agent)} · {ago(a.createdAt)}</small></div>
            <Pill t={a.risk} />
            {a.status === "Pending" ? <><button className="btn s" onClick={() => decide(a._id, "approve")}>Approve</button><button className="btn r s" onClick={() => decide(a._id, "reject")}>Reject</button></> : <Pill t={a.status} />}
          </div>
        ))}
      </div>
    </>
  );
}

export function Hr() {
  const s = useFetch("/hr");
  if (!s.data) return <Load s={s} />;
  const d = s.data;
  const decide = async (id, decision) => { await api(`/leaves/${id}/decide`, { method: "POST", body: { decision } }); s.load(); };
  return (
    <>
      <Head t="HR" s="Team, leaves and attendance." />
      <div className="grid g3" style={{ marginBottom: 12 }}>
        <Kpi label="Headcount" value={d.headcount} /><Kpi label="On leave today" value={d.onLeave} /><Kpi label="Pending leaves" value={d.pending} />
      </div>
      <div className="card"><h2>Leave requests</h2><div className="tw"><table>
        <thead><tr><th>Employee</th><th>Type</th><th>Dates</th><th>Status</th><th></th></tr></thead>
        <tbody>{d.leaves.map((l, i) => (
          <tr key={l._id}><td><div style={{ display: "flex", gap: 8, alignItems: "center" }}><Av name={l.employee} i={i} />{l.employee}</div></td><td>{l.type}</td>
            <td>{dshort(l.from)}{l.to !== l.from ? ` – ${dshort(l.to)}` : ""}</td><td><Pill t={l.status} /></td>
            <td>{l.status === "Pending" && <><button className="btn s" onClick={() => decide(l._id, "approve")}>Approve</button> <button className="btn r s" onClick={() => decide(l._id, "reject")}>Reject</button></>}</td></tr>
        ))}</tbody></table></div></div>
    </>
  );
}

export function Finance() {
  const s = useFetch("/finance");
  if (!s.data) return <Load s={s} />;
  const d = s.data;
  return (
    <>
      <Head t="Finance" s="Invoices and payments at a glance." />
      <div className="grid g3" style={{ marginBottom: 12 }}>
        <Kpi label="Unpaid" value={lakh(d.unpaid)} /><Kpi label="Overdue" value={d.overdue} /><Kpi label="Collected this month" value={lakh(d.collected)} />
      </div>
      <div className="card"><h2>Invoices</h2><div className="tw"><table>
        <thead><tr><th>Invoice</th><th>Client</th><th>Amount</th><th>Due</th><th>Status</th></tr></thead>
        <tbody>{d.invoices.map((i) => <tr key={i._id}><td><b>{i.number}</b></td><td>{i.client}</td><td>{pkr(i.amount)}</td><td>{dshort(i.due)}</td><td><Pill t={i.status} /></td></tr>)}</tbody></table></div></div>
    </>
  );
}

export function Projects() {
  const s = useFetch("/projects");
  if (!s.data) return <Load s={s} />;
  const cols = [["todo", "To do"], ["progress", "In progress"], ["done", "Done"]];
  return (
    <>
      <Head t="Projects" s="The agent detects delay risk on its own." />
      <div className="grid g3 kan">{cols.map(([k, label]) => {
        const items = s.data.filter((p) => p.status === k);
        return <div key={k}><h2>{label} <span>{items.length}</span></h2>
          {items.map((p) => <div key={p._id} className="card"><b>{p.name}</b> <span style={{ float: "right" }}><Pill t={p.risk} /></span>
            <div className="prog"><i style={{ width: `${p.progress}%` }} /></div><small style={{ color: "var(--mute)" }}>{p.progress}% complete · {p.owner}</small></div>)}</div>;
      })}</div>
    </>
  );
}

export function Trace() {
  const s = useFetch("/runs");
  return (
    <>
      <Head t="Agent Trace" s="LangGraph workflow — every step visible and auditable." />
      <div className="card" style={{ marginBottom: 12 }}><div className="flow">
        <div className="nd">User</div><span className="ar">→</span><div className="nd a">Supervisor</div><span className="ar">→</span>
        <div style={{ display: "grid", gap: 6 }}><div className="nd">HR Agent</div><div className="nd">Finance Agent</div><div className="nd">Projects Agent</div></div>
        <span className="ar">→</span><div className="nd" style={{ borderColor: "var(--warn)" }}>Approval Gate</div><span className="ar">→</span><div className="nd">Tools / DB</div>
      </div></div>
      <div className="card"><h2>Recent runs</h2>
        {!s.data ? <Load s={s} /> : !s.data.length ? <p className="empty">No runs yet. Send a message in Agent Chat.</p> : s.data.map((r) => (
          <div key={r._id} className="row"><div className="g"><b>“{r.prompt}”</b><small>{(r.steps || []).map((x) => x.text).join(" → ") || "No steps recorded"}</small></div>
            <small>{(r.ms / 1000).toFixed(1)}s</small><Pill t={r.status} /></div>
        ))}</div>
    </>
  );
}

export function Settings() {
  const { user, setUser, logout } = useAuth();
  const [err, setErr] = useState("");
  const flip = async (k) => {
    try { const d = await api("/settings", { method: "PUT", body: { ...user.perms, [k]: !user.perms[k] } }); setUser(d.user); setErr(""); } catch (e) { setErr(e.message); }
  };
  const items = [["leaveSignoff", "Human sign-off for leave approvals"], ["paymentSignoff", "Human sign-off for payments"]];
  return (
    <>
      <Head t="Settings" s="You control what the agent is allowed to do." />
      <div className="grid g2">
        <div className="card"><h2>Agent permissions</h2>
          {items.map(([k, label]) => <div key={k} className="row"><div className="g">{label}</div>
            <button className={"sw " + (user.perms[k] ? "on" : "")} onClick={() => flip(k)} role="switch" aria-checked={!!user.perms[k]} aria-label={label} /></div>)}
          <p className="sub" style={{ margin: "10px 0 0" }}>Project reassignments always need approval.</p>{err && <p className="err">{err}</p>}</div>
        <div className="card"><h2>Profile</h2>
          <div className="row"><Av name={user.name} /><div className="g"><b>{user.name}</b><small>{user.email}</small></div></div>
          <button className="btn o" style={{ marginTop: 12 }} onClick={logout}>Sign out</button></div>
      </div>
    </>
  );
}
