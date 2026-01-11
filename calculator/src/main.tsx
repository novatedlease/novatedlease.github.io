import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

const mountEl =
  document.getElementById("nl-calculator-root") ??
  document.getElementById("root");

if (!mountEl) {
  throw new Error(
    "Calculator mount element not found. Expected #nl-calculator-root (MkDocs embed) or #root (standalone Vite)."
  );
}

ReactDOM.createRoot(mountEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);