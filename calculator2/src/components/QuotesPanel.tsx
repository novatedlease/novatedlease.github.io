import { useEffect, useRef, useState } from "react";
import type { Inputs } from "@engine/types";
import { Button } from "./ui/Button";
import {
  type SavedQuoteV1,
  safeSaveQuotes,
  newQuoteId,
  coerceInputs,
  exportQuotesFile,
  parseImportedQuotesFile,
} from "../state/savedQuotes";

/**
 * Saved-quotes manager, ported from calculator/src/App.tsx's inline quotes UI
 * (lines ~558-706) into a standalone component. Same localStorage key/shape —
 * quotes saved in v1 or v2 are interchangeable. `quotes` is controlled by the
 * parent (App.tsx) so ComparatorView sees the same live list without a second
 * copy of localStorage state.
 */
export function QuotesPanel(props: {
  inputs: Inputs;
  defaultInputs: Inputs;
  onLoadQuote: (inputs: Inputs) => void;
  quotes: SavedQuoteV1[];
  onQuotesChange: (quotes: SavedQuoteV1[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const quotes = props.quotes;
  const [nameDraft, setNameDraft] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (anchorRef.current && !anchorRef.current.contains(target)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  function persist(next: SavedQuoteV1[]) {
    props.onQuotesChange(next);
    safeSaveQuotes(next);
  }

  function saveCurrent() {
    const trimmed = nameDraft.trim();
    const q: SavedQuoteV1 = {
      v: 1,
      id: newQuoteId(),
      name: trimmed || `Quote ${quotes.length + 1}`,
      createdAtIso: new Date().toISOString(),
      inputs: props.inputs,
    };
    persist([q, ...quotes]);
    setNameDraft("");
  }

  function loadQuote(q: SavedQuoteV1) {
    props.onLoadQuote(coerceInputs(q.inputs, props.defaultInputs));
    setOpen(false);
  }

  function deleteQuote(id: string) {
    persist(quotes.filter((q) => q.id !== id));
  }

  function commitRename(id: string) {
    const trimmed = renameDraft.trim();
    if (trimmed) persist(quotes.map((q) => (q.id === id ? { ...q, name: trimmed } : q)));
    setRenamingId(null);
  }

  function handleImportFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const incoming = parseImportedQuotesFile((e.target?.result as string) ?? "");
      if (!incoming) {
        alert("Could not read file. Make sure it's a valid quotes export.");
        return;
      }
      const existingIds = new Set(quotes.map((q) => q.id));
      const merged = [...incoming, ...quotes.filter((q) => !incoming.some((iq) => iq.id === q.id))].slice(0, 50);
      const added = incoming.filter((q) => !existingIds.has(q.id)).length;
      const updated = incoming.length - added;
      persist(merged);
      alert(`Imported ${incoming.length} quote${incoming.length !== 1 ? "s" : ""}: ${added} new, ${updated} updated.`);
    };
    reader.readAsText(file);
  }

  return (
    <div ref={anchorRef} style={{ position: "relative" }}>
      <Button variant="secondary" size="sm" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        Saved quotes ({quotes.length})
      </Button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            width: 340,
            maxHeight: 420,
            overflowY: "auto",
            background: "var(--nlc-surface)",
            border: "1px solid var(--nlc-border)",
            borderRadius: "var(--nlc-radius-lg)",
            boxShadow: "var(--nlc-shadow-lg)",
            padding: 12,
            zIndex: 50,
            fontSize: 12.5,
          }}
        >
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            <input
              className="nlc-input"
              placeholder="Name this quote..."
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveCurrent();
              }}
              style={{ flex: 1, fontSize: 12.5, padding: "6px 8px" }}
            />
            <Button variant="primary" size="sm" onClick={saveCurrent}>
              Save
            </Button>
          </div>

          {quotes.length === 0 ? (
            <div style={{ color: "var(--nlc-text-muted)", padding: "8px 2px" }}>No saved quotes yet.</div>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {quotes.map((q) => (
                <li key={q.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 2px", borderTop: "1px solid var(--nlc-border)" }}>
                  {renamingId === q.id ? (
                    <input
                      className="nlc-input"
                      autoFocus
                      value={renameDraft}
                      onChange={(e) => setRenameDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRename(q.id);
                        if (e.key === "Escape") setRenamingId(null);
                      }}
                      onBlur={() => commitRename(q.id)}
                      style={{ flex: 1, fontSize: 12.5, padding: "4px 6px" }}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => loadQuote(q)}
                      title={new Date(q.createdAtIso).toLocaleString("en-AU")}
                      style={{ flex: 1, textAlign: "left", border: "none", background: "none", cursor: "pointer", padding: "4px 6px", color: "var(--nlc-text)", fontWeight: 600 }}
                    >
                      {q.name}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setRenamingId(q.id);
                      setRenameDraft(q.name);
                    }}
                    aria-label={`Rename ${q.name}`}
                    style={{ border: "none", background: "none", cursor: "pointer", color: "var(--nlc-text-muted)", padding: 4 }}
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteQuote(q.id)}
                    aria-label={`Delete ${q.name}`}
                    style={{ border: "none", background: "none", cursor: "pointer", color: "var(--nlc-bad)", padding: 4 }}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div style={{ display: "flex", gap: 6, marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--nlc-border)" }}>
            <Button variant="ghost" size="sm" onClick={() => exportQuotesFile(quotes)} disabled={quotes.length === 0}>
              Export
            </Button>
            <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>
              Import
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImportFile(file);
                e.target.value = "";
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
