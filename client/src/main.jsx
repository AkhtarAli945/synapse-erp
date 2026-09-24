import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";

const saved = localStorage.getItem("theme");
if (saved) document.documentElement.dataset.theme = saved;
createRoot(document.getElementById("root")).render(<BrowserRouter><App /></BrowserRouter>);
