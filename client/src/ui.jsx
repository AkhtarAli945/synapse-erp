import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "./api.js";

const COLORS = ["#6d5efc", "#12b5a0", "#f59e0b", "#e879c9", "#3b82f6"];
export const Av = ({ name = "?", i = 0 }) => (
  <span className="av" style={{ background: COLORS[i % 5] }}>{name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}</span>
);
const TONE = { Paid: "ok", Approved: "ok", Done: "ok", Low: "ok", Pending: "wn", Unpaid: "wn", Medium: "wn", Waiting: "wn", Overdue: "bd", Rejected: "bd", High: "bd", Failed: "bd" };
export const Pill = ({ t }) => <span className={"pill " + (TONE[t] || "")}>{t}</span>;
export const pkr = (n) => "PKR " + Math.round(n).toLocaleString("en-US");
export const lakh = (n) => "PKR " + (n / 1e5).toFixed(1) + "L";
export const dshort = (d) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
export const ago = (d) => {
  const m = Math.max(1, Math.round((Date.now() - new Date(d)) / 6e4));
  return m < 60 ? `${m}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`;
};
export const agentName = (r) => (r === "hr" ? "HR Agent" : r ? r[0].toUpperCase() + r.slice(1) + " Agent" : "Agent");

export function useFetch(path) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const load = useCallback(() => api(path).then((d) => { setData(d); setError(""); }).catch((e) => setError(e.message)), [path]);
  useEffect(() => { load(); }, [load]);
  return { data, error, load };
}
export const Load = ({ s }) => (s.error ? <p className="err">{s.error}</p> : <p className="empty">Loading…</p>);

export const AuthCtx = createContext();
export const useAuth = () => useContext(AuthCtx);
