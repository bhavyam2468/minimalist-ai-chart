import type { CanvasView, WFile } from "../lib/types";

/* Decide how the canvas should present a workspace path — from the extension
   alone, so nothing has to be stored anywhere. */

const IMAGE = ["png", "jpg", "jpeg", "gif", "webp", "avif", "bmp", "svg", "heic"];
const CODE = ["ts", "tsx", "js", "jsx", "mjs", "cjs", "py", "rs", "go", "java", "c", "h", "cpp", "cc", "cs", "rb", "php", "sh", "bash", "sql", "css", "scss", "toml", "ini", "env", "yaml", "yml", "xml", "log"];

export function viewOf(path: string, file?: WFile): CanvasView {
  const p = path.toLowerCase();
  if (p.endsWith(".html") || p.endsWith(".htm") || p.endsWith("/app.tsx") || p.endsWith("/app.jsx") || p === "app.tsx" || p === "app.jsx") return "project";
  const e = p.split(".").pop() || "";
  if (IMAGE.includes(e) || file?.kind === "image" || file?.dataUrl) return "image";
  if (e === "csv" || e === "tsv" || file?.kind === "sheet") return "sheet";
  if (e === "md" || e === "mdx" || e === "markdown" || file?.kind === "doc" || file?.kind === "pdf") return "markdown";
  if (e === "pdf") return "pdf";
  if (CODE.includes(e) || file?.kind === "code") return "code";
  if (e === "json") return "code";
  return "text";
}

export const VIEW_LABEL: Record<CanvasView, string> = {
  project: "site", image: "image", sheet: "sheet",
  markdown: "doc", code: "code", text: "text", pdf: "pdf",
};

/** Suggested starting size for the canvas window. */
export function viewSize(v: CanvasView): { w: number; h: number } {
  switch (v) {
    case "project": return { w: 900, h: 680 };
    case "image": return { w: 760, h: 600 };
    case "sheet": return { w: 1000, h: 620 };
    case "markdown": return { w: 820, h: 720 };
    default: return { w: 880, h: 680 };
  }
}
