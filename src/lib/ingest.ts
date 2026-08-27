/* ===========================================================================
   ingest.ts — turns an uploaded file into the right model input.
   images  -> vision input (data url)
   pdf     -> markdown with page markers      (documents skill)
   docx    -> markdown                        (documents skill)
   xlsx/csv-> one markdown table per sheet    (spreadsheets skill)
   text/*  -> verbatim                        (no skill needed)
   Heavy parsers are pulled from a CDN on first use so nothing bloats the app.
   ========================================================================= */
import type { WFile } from "./types";
import { skillForFile } from "./skills";

const PDF_V = "4.7.76";

async function loadScript(src: string) {
  await new Promise<void>((res, rej) => {
    const s = document.createElement("script");
    s.src = src; s.onload = () => res(); s.onerror = () => rej(new Error("load " + src));
    document.head.appendChild(s);
  });
}

async function pdfToMarkdown(file: File): Promise<string> {
  const pdfjs: any = await import(/* @vite-ignore */ `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDF_V}/build/pdf.min.mjs`);
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDF_V}/build/pdf.worker.min.mjs`;
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const out: string[] = [];
  const max = Math.min(doc.numPages, 120);
  for (let p = 1; p <= max; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    let line = ""; let lastY: number | null = null; const lines: string[] = [];
    for (const it of tc.items as any[]) {
      const y = it.transform[5];
      if (lastY !== null && Math.abs(y - lastY) > 3) { lines.push(line.trim()); line = ""; }
      line += it.str + (it.hasEOL ? " " : "");
      lastY = y;
    }
    if (line.trim()) lines.push(line.trim());
    out.push(`--- page ${p} ---\n` + lines.filter(Boolean).join("\n"));
  }
  if (doc.numPages > max) out.push(`--- ${doc.numPages - max} further pages omitted ---`);
  return out.join("\n\n");
}

async function docxToMarkdown(file: File): Promise<string> {
  if (!(window as any).mammoth) await loadScript("https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js");
  const buf = await file.arrayBuffer();
  const r = await (window as any).mammoth.convertToHtml({ arrayBuffer: buf });
  const html: string = r.value || "";
  return html
    .replace(/<h([1-6])[^>]*>(.*?)<\/h\1>/gi, (_m, l, t) => `\n${"#".repeat(+l)} ${strip(t)}\n`)
    .replace(/<li[^>]*>(.*?)<\/li>/gi, (_m, t) => `- ${strip(t)}\n`)
    .replace(/<p[^>]*>(.*?)<\/p>/gi, (_m, t) => `${strip(t)}\n\n`)
    .replace(/<strong>(.*?)<\/strong>/gi, "**$1**")
    .replace(/<em>(.*?)<\/em>/gi, "*$1*")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
const strip = (s: string) => s.replace(/<[^>]+>/g, "").trim();

async function sheetToMarkdown(file: File): Promise<string> {
  const XLSX_URL = `https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs`;
  const XLSX: any = await import(/* @vite-ignore */ XLSX_URL);
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const out: string[] = [];
  for (const name of wb.SheetNames.slice(0, 12)) {
    const rows: any[][] = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, blankrows: false, defval: "" });
    if (!rows.length) continue;
    const width = Math.max(...rows.map((r) => r.length));
    const head = rows[0].map((c: any) => String(c ?? "").trim() || " ");
    while (head.length < width) head.push(" ");
    const body = rows.slice(1, 400);
    out.push(
      `## sheet: ${name}  (${rows.length} rows × ${width} cols)\n\n` +
      `| ${head.join(" | ")} |\n| ${head.map(() => "---").join(" | ")} |\n` +
      body.map((r) => `| ${Array.from({ length: width }, (_, i) => String(r[i] ?? "").replace(/\|/g, "\\|")).join(" | ")} |`).join("\n") +
      (rows.length > 401 ? `\n\n_${rows.length - 401} more rows — use run_python + pandas_` : "")
    );
  }
  return out.join("\n\n");
}

const readText = (f: File) => f.text();
const readDataUrl = (f: File) =>
  new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(f); });

export async function ingest(file: File): Promise<WFile> {
  const name = file.name;
  const ext = (name.split(".").pop() || "").toLowerCase();
  const base = { size: file.size, mime: file.type, state: "context" as const, origin: "upload" as const, createdAt: Date.now(), skill: skillForFile(name) };

  if (file.type.startsWith("image/")) {
    const dataUrl = await readDataUrl(file);
    return { ...base, path: `uploads/${name}`, content: `[image ${name}]`, kind: "image", dataUrl };
  }
  if (ext === "pdf") {
    const md = await pdfToMarkdown(file).catch((e) => `[pdf extraction failed: ${e.message}]`);
    return { ...base, path: `docs/${name.replace(/\.pdf$/i, "")}.md`, content: md, kind: "pdf", size: md.length };
  }
  if (["docx", "doc"].includes(ext)) {
    const md = await docxToMarkdown(file).catch((e) => `[docx extraction failed: ${e.message}]`);
    return { ...base, path: `docs/${name.replace(/\.docx?$/i, "")}.md`, content: md, kind: "doc", size: md.length };
  }
  if (["xlsx", "xls", "xlsm", "ods"].includes(ext)) {
    const md = await sheetToMarkdown(file).catch((e) => `[workbook parse failed: ${e.message}]`);
    return { ...base, path: `data/${name.replace(/\.[^.]+$/, "")}.md`, content: md, kind: "sheet", size: md.length };
  }
  if (["csv", "tsv"].includes(ext)) {
    const t = await readText(file);
    return { ...base, path: `data/${name}`, content: t, kind: "data", size: t.length };
  }
  const t = await readText(file).catch(() => "");
  if (t) {
    const kind = /\.(ts|tsx|js|jsx|py|rs|go|java|c|cpp|css|html|json|yaml|yml|sh|sql)$/i.test(name) ? "code" : "text";
    return { ...base, path: kind === "code" ? `src/${name}` : `uploads/${name}`, content: t, kind: kind as WFile["kind"], size: t.length };
  }
  return { ...base, path: `uploads/${name}`, content: `[binary file ${name}, ${file.size} bytes — not readable]`, kind: "text" };
}
