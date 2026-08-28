/**
 * Bulletproof clipboard helper that works inside sandboxed iframes,
 * mobile viewports, and browsers with strict async clipboard permissions.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (text == null) return false;

  // 1. Try modern Async Clipboard API
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // In iframes or non-focused windows, async clipboard may reject with NotAllowedError.
      // Fall through to textarea execCommand fallback.
    }
  }

  // 2. Fallback to document.execCommand('copy')
  if (typeof document !== "undefined") {
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.setAttribute("readonly", "");
      el.style.contain = "strict";
      el.style.position = "fixed";
      el.style.left = "-9999px";
      el.style.fontSize = "12pt"; // Prevent mobile Safari zooming
      document.body.appendChild(el);

      const selection = document.getSelection();
      const originalRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

      el.select();
      el.selectionStart = 0;
      el.selectionEnd = text.length;

      const success = document.execCommand("copy");
      document.body.removeChild(el);

      if (originalRange && selection) {
        selection.removeAllRanges();
        selection.addRange(originalRange);
      }

      return success;
    } catch {
      return false;
    }
  }

  return false;
}
