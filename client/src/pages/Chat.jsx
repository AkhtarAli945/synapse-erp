import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import { Pill, agentName } from "../ui.jsx";

const ICON = { supervisor: "🧭", tool: "🔧", gate: "⏸", general: "💬" };
const IDEAS = ["Show unpaid invoices", "Approve Ali’s leave", "Which projects are at risk?"];

export default function Chat() {
  const [msgs, setMsgs] = useState([{ role: "bot", text: "Hi! I can manage HR, Finance and Projects. Sensitive actions always wait for your approval.", steps: [], approvals: [] }]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [params, setParams] = useSearchParams();
  const end = useRef(null), started = useRef(false);

  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs, busy]);
  useEffect(() => {
    const q = params.get("q");
    if (q && !started.current) { started.current = true; setParams({}, { replace: true }); send(q); }
  }, []); // eslint-disable-line

  async function send(message) {
    message = (message ?? text).trim();
    if (!message || busy) return;
    setText(""); setBusy(true);
    setMsgs((m) => [...m, { role: "me", text: message }]);
    try {
      const d = await api("/agent/chat", { method: "POST", body: { message } });
      setMsgs((m) => [...m, { role: "bot", text: d.reply, route: d.route, steps: d.steps, approvals: d.approvals }]);
    } catch (e) {
      setMsgs((m) => [...m, { role: "bot", text: e.message, error: true, steps: [], approvals: [] }]);
    }
    setBusy(false);
  }

  async function decide(mi, id, decision) {
    try {
      const d = await api(`/approvals/${id}/decide`, { method: "POST", body: { decision } });
      setMsgs((m) => m.map((x, i) => (i !== mi ? x : { ...x, approvals: x.approvals.map((a) => (a._id === id ? d.approval : a)) })));
    } catch (e) { alert(e.message); }
  }

  const last = [...msgs].reverse().find((m) => m.role === "bot" && m.steps?.length);

  return (
    <>
      <h1>Agent Chat</h1><p className="sub">The supervisor routes each request to the right sub-agent.</p>
      <div className="chatgrid">
        <div className="card chat" style={{ minWidth: 0 }}>
          <div className="msgs">
            {msgs.map((m, i) => m.role === "me" ? <div key={i} className="me">{m.text}</div> : (
              <div key={i} className="bot">
                {m.route && <div className="route"><span className="pill">Supervisor</span>→<span className="pill ok">{agentName(m.route)}</span></div>}
                {m.error ? <span style={{ color: "var(--bad)" }}>{m.text}</span> : m.text}
                {m.steps?.filter((s) => s.node === "tool").map((s, k) => <div key={k} className="tool">{s.text}</div>)}
                {m.approvals?.map((a) => (
                  <div key={a._id} className="appr">
                    <b>{a.status === "Pending" ? "⚠ Approval required" : "Decision recorded"}</b> <Pill t={a.risk} /><br />
                    <span style={{ color: "var(--mute)" }}>{a.summary}</span>
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      {a.status === "Pending" ? <><button className="btn s" onClick={() => decide(i, a._id, "approve")}>Approve</button><button className="btn r s" onClick={() => decide(i, a._id, "reject")}>Reject</button></> : <Pill t={a.status} />}
                    </div>
                  </div>
                ))}
              </div>
            ))}
            {busy && <div className="bot" style={{ color: "var(--mute)" }}>Thinking…</div>}
            <div ref={end} />
          </div>
          <div className="chips">{IDEAS.map((t) => <button key={t} onClick={() => send(t)} disabled={busy}>{t}</button>)}</div>
          <form className="ask" style={{ margin: 0 }} onSubmit={(e) => { e.preventDefault(); send(); }}>
            <input className="inp" value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message…" aria-label="Message" />
            <button className="btn" disabled={busy || !text.trim()}>Send</button>
          </form>
        </div>
        <div className="card" style={{ minWidth: 0 }}>
          <h2>Live steps</h2>
          {!last ? <p className="empty">Steps appear here after your first request.</p> : last.steps.map((s, i) => (
            <div key={i} className="row"><span>{ICON[s.node] || "🔀"}</span><div className="g">{s.text}</div></div>
          ))}
        </div>
      </div>
    </>
  );
}
