import React from "react";

const KEYWORDS = new Set(
  ("const let var function return if else for while break continue class extends new this import from export default async await try catch finally throw typeof instanceof delete in of " +
   "interface type enum implements public private protected readonly static abstract override namespace declare satisfies as is keyof infer " +
   "def lambda pass None True False elif print import as with yield global nonlocal raise assert del not and or None self cls async await match case " +
   "package func struct impl fn use mut trait pub crate mod where Some Ok Err " +
   "select insert update delete from where group by order having join left right inner outer on limit " +
   "null true false void int float double string bool char long short byte echo end do then fi elif esac case done unset local export")
    .split(" ")
);

const HL =
  /(\/\*[\s\S]*?(?:\*\/|$)|\/\/[^\n]*|(?<![\w:/])#[^\n]*|"""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$)|"(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?|`(?:\\.|[^`\\])*`?|\b0[xXbBoO][\da-fA-F_]+\b|\b\d[\d_]*\.?\d*(?:[eE][+-]?\d+)?\b|<\/?[A-Za-z][\w.-]*|\b[A-Za-z_$][\w$]*\b|[{}()[\];,.]|[+\-*/%=<>!&|^~?:]+)/g;

/** Token-classified JSX for a code string. Deterministic, no deps. */
export function highlight(code: string, lang = ""): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const isMarkup = /^(html|xml|svg|vue|jsx|tsx|md)$/i.test(lang);
  let last = 0;
  let k = 0;

  for (const m of code.matchAll(HL)) {
    const s = m.index!;
    if (s > last) out.push(code.slice(last, s));
    const t = m[0];
    let cls = "";

    if (t.startsWith("//") || t.startsWith("/*") || (t.startsWith("#") && !isMarkup)) cls = "tk-com";
    else if (/^("""|'''|["'`])/.test(t)) cls = "tk-str";
    else if (/^\d|^0[xXbBoO]/.test(t)) cls = "tk-num";
    else if (/^<\/?[A-Za-z]/.test(t)) cls = "tk-tag";
    else if (KEYWORDS.has(t)) cls = "tk-key";
    else if (/^[+\-*/%=<>!&|^~?:]+$/.test(t)) cls = "tk-op";
    else if (/^[A-Za-z_$][\w$]*$/.test(t)) {
      const after = code.slice(s + t.length).match(/^\s*/)?.[0].length ?? 0;
      const next = code[s + t.length + after];
      if (next === "(") cls = "tk-fn";
      else if (isMarkup && next === "=") cls = "tk-atr";
      else if (/^[A-Z]/.test(t)) cls = "tk-atr";
    }

    out.push(cls ? <span key={k++} className={cls}>{t}</span> : t);
    last = s + t.length;
  }
  if (last < code.length) out.push(code.slice(last));
  return out;
}

export function langOf(path: string): string {
  const e = (path.split(".").pop() || "").toLowerCase();
  const map: Record<string, string> = {
    ts: "typescript", tsx: "tsx", js: "javascript", jsx: "jsx", mjs: "javascript", cjs: "javascript",
    py: "python", rb: "ruby", go: "go", rs: "rust", java: "java", kt: "kotlin", swift: "swift",
    c: "c", h: "c", cpp: "cpp", cc: "cpp", hpp: "cpp", cs: "csharp", php: "php",
    sh: "bash", bash: "bash", zsh: "bash", fish: "bash", ps1: "powershell",
    sql: "sql", html: "html", htm: "html", xml: "xml", svg: "svg", vue: "vue",
    css: "css", scss: "scss", less: "less", json: "json", yaml: "yaml", yml: "yaml", toml: "toml",
    md: "markdown", mdx: "markdown", txt: "text", csv: "csv", tsv: "csv", ini: "ini", env: "bash",
    dockerfile: "docker", makefile: "makefile", r: "r", lua: "lua", dart: "dart", scala: "scala",
  };
  return map[e] || e || "text";
}
