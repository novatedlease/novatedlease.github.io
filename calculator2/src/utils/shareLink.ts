import type { Inputs } from "@engine/types";
import { setUrlParamForInputs } from "@engine/urlState";

/**
 * Copies a share link for these inputs. Resolves true when it reached the clipboard; otherwise
 * shows the link in a prompt so it can be copied by hand, and resolves false.
 */
export async function copyShareLink(inputs: Inputs): Promise<boolean> {
  const url = `${window.location.origin}${window.location.pathname}${setUrlParamForInputs(window.location.search, inputs)}`;

  // Rich clipboard: paste as a clickable sentence in apps that support HTML clipboard
  // (email, Slack, docs, forums) — mirrors calculator/src/App.tsx's copy-link behaviour.
  // The text/plain fallback is deliberately just the bare URL, not the sentence — plain-text
  // targets include single-line inputs like a browser's address bar, which can't hold the
  // newline separating sentence from URL; pasting there would squash them into one
  // ungarbled, unnavigable string instead of a clean URL.
  const linkText = "Check out my novated lease calculation output from novatedlease.guide";
  const html = `<a href="${url}">${linkText}</a>`;

  const ClipboardItemCtor = (window as unknown as { ClipboardItem?: new (items: Record<string, Blob>) => ClipboardItem }).ClipboardItem;

  try {
    if (navigator.clipboard?.write && ClipboardItemCtor) {
      const blobHtml = new Blob([html], { type: "text/html" });
      const blobText = new Blob([url], { type: "text/plain" });
      await navigator.clipboard.write([new ClipboardItemCtor({ "text/html": blobHtml, "text/plain": blobText })]);
    } else if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
    } else {
      throw new Error("Clipboard API unavailable");
    }
    return true;
  } catch {
    window.prompt("Copy this link:", url);
    return false;
  }
}
