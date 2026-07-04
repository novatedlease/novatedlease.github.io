import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

const mountEl =
  document.getElementById("nl-calculator-old-root") ??
  document.getElementById("root");

if (!mountEl) {
  throw new Error(
    "Calculator mount element not found. Expected #nl-calculator-old-root (Astro embed) or #root (standalone Vite)."
  );
}

mountEl.removeAttribute("data-loading");
mountEl.removeAttribute("aria-busy");

ReactDOM.createRoot(mountEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
