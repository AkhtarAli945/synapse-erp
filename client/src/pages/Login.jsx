
import { useState } from "react";
import { api } from "../api.js";
import { useAuth } from "../ui.jsx";

export default function Login() {
  const { setUser } = useAuth();
  const [signup, setSignup] = useState(false);
  const [f, setF] = useState({ name: "", email: "", password: "" });
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr(""); setNote("");
    try {
      if (signup) {
        await api("/auth/register", { method: "POST", body: f });
        setSignup(false); setF({ name: "", email: f.email, password: "" });
        setNote("Account created. Sign in to continue.");
      } else {
        const d = await api("/auth/login", { method: "POST", body: f });
        localStorage.setItem("token", d.token); setUser(d.user);
      }
    } catch (x) { setErr(x.message); }
    setBusy(false);
  };

  return (
    <div className="authwrap"><div className="login">
      <div className="hero">
        <div><b>✦ Synapse ERP Agent</b><h1>Just say it,<br />and it’s done.</h1><p style={{ opacity: .9 }}>HR, Finance and Projects — in one conversation.</p></div>
        <div><div className="chip">“Approve Ali’s leave” → HR Agent ✓</div><div className="chip">“Show unpaid invoices” → Finance Agent ✓</div></div>
      </div>
      <form className="form" onSubmit={submit}>
        <h2 style={{ fontSize: 20 }}>{signup ? "Create your account" : "Welcome back 👋"}</h2>
        <p className="sub">{signup ? "Set up your workspace in a minute" : "Sign in to your workspace"}</p>
        {signup && <><label htmlFor="n">Name</label><input id="n" className="field" value={f.name} onChange={set("name")} placeholder="Your name" required /></>}
        <label htmlFor="e">Email</label><input id="e" className="field" type="email" value={f.email} onChange={set("email")} placeholder="you@company.com" required />
        <label htmlFor="p">Password</label><input id="p" className="field" type="password" value={f.password} onChange={set("password")} placeholder="At least 6 characters" minLength={6} required />
        {note && <p className="note">{note}</p>}
        {err && <p className="err">{err}</p>}
        <button className="btn" style={{ width: "100%" }} disabled={busy}>{busy ? "Please wait…" : signup ? "Sign up" : "Sign in"}</button>
        <p style={{ textAlign: "center", color: "var(--mute)", marginTop: 16 }}>
          {signup ? "Already have an account? " : "Don’t have an account? "}
          <b style={{ color: "var(--acc)", cursor: "pointer" }} onClick={() => { setSignup(!signup); setErr(""); setNote(""); }}>{signup ? "Sign in" : "Sign up"}</b>
        </p>
      </form>
    </div></div>
  );
}
