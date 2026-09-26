
import { useEffect, useState } from "react";
import { NavLink, Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { api } from "./api.js";
import { Av, AuthCtx, useAuth } from "./ui.jsx";
import Login from "./pages/Login.jsx";
import Chat from "./pages/Chat.jsx";
import { Dashboard, Approvals, Hr, Finance, Projects, Trace, Settings } from "./pages/Pages.jsx";

const NAV = [["/", "Dashboard"], ["/chat", "Agent Chat"], ["/approvals", "Approvals"], ["/hr", "HR"], ["/finance", "Finance"], ["/projects", "Projects"], ["/trace", "Agent Trace"], ["/settings", "Settings"]];

function Shell() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const esc = (e) => e.key === "Escape" && setOpen(false);
    addEventListener("keydown", esc);
    return () => { removeEventListener("keydown", esc); document.body.style.overflow = ""; };
  }, [open]);

  const toggleTheme = () => {
    const el = document.documentElement;
    const dark = el.dataset.theme ? el.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    el.dataset.theme = dark ? "light" : "dark";
    localStorage.setItem("theme", el.dataset.theme);
  };

  return (
    <div className="shell">
      <header className="top">
        <button className="tg menu" onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open}>☰</button>
        <div className="logo"><span className="dot" />Synapse</div>
        <button className="tg" onClick={toggleTheme} aria-label="Switch light or dark theme">◐</button>
      </header>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <aside className={"side" + (open ? " open" : "")} aria-label="Main menu">
        <div className="logo"><span className="dot" />Synapse</div>
        <nav className="tabs">{NAV.map(([to, label]) => <NavLink key={to} to={to} end={to === "/"}>{label}</NavLink>)}</nav>
        <div className="me-box">
          <Av name={user.name} /><b>{user.name}</b>
          <button className="tg dsk" onClick={toggleTheme} aria-label="Switch light or dark theme">◐</button>
          <button className="tg" onClick={logout}>Sign out</button>
        </div>
      </aside>
      <main className="wrap"><Outlet /></main>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(!localStorage.getItem("token"));
  useEffect(() => {
    if (!localStorage.getItem("token")) return;
    api("/auth/me").then((d) => setUser(d.user)).catch(() => localStorage.removeItem("token")).finally(() => setReady(true));
  }, []);
  const logout = () => { localStorage.removeItem("token"); setUser(null); };
  if (!ready) return <p className="empty">Loading…</p>;
  return (
    <AuthCtx.Provider value={{ user, setUser, logout }}>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route element={user ? <Shell /> : <Navigate to="/login" replace />}>
          <Route index element={<Dashboard />} />
          <Route path="chat" element={<Chat />} />
          <Route path="approvals" element={<Approvals />} />
          <Route path="hr" element={<Hr />} />
          <Route path="finance" element={<Finance />} />
          <Route path="projects" element={<Projects />} />
          <Route path="trace" element={<Trace />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthCtx.Provider>
  );
}
