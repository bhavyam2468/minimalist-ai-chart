/**
A linter for model-emitted tool calls.

LLMs — especially via OpenAI-compat shims over Gemini — occasionally emit
malformed calls: two calls glued into one record (`edit_fileopen_canvas`
with both arg blobs welded), a dangling second JSON blob after valid args,
names that match no declared tool, or unparseable arguments. Shipping any of
that back to the API poisons the next hop with a 400.

The linter is a pipeline of rules. A rule inspects the record list, may
*fix* it (return a new list) and may *report* diagnostics. Diagnostics that
describe unfixable problems feed `correctivePrompt`, the automated re-query
that hands the model the exact tool syntax and asks it to re-issue the call.

To add a check later (rate-limit awareness, arg-schema validation, duplicate
call folding, …), append a rule to `RULES`. Nothing else changes.
 */
import type { ToolCallRecord } from "./types";

export interface LintDiag { rule: string; message: string }
export interface LintTool { name: string; description?: string; parameters?: any }
export interface LintCtx { known: Set<string>; tools: LintTool[] }

/* ----------------------------------------------- shared arg scanning ---- */

export function firstBalancedObject(s: string): [string, string] {
  const start = s.indexOf("{");
  if (start === -1) return ["", s];
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (esc) { esc = false; continue; }
    if (ch === "\\") { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === "{") depth++;
    if (ch === "}") { depth--; if (depth === 0) return [s.slice(start, i + 1), s.slice(i + 1)]; }
  }
  return ["", s];
}

const parse = (s: string) => { try { return JSON.parse(s); } catch { return { _raw: s }; } };

/* ---------------------------------------------------------------- rules ---- */

type Rule = (recs: ToolCallRecord[], ctx: LintCtx, diags: LintDiag[]) => ToolCallRecord[];

/** `edit_fileopen_canvas` -> `edit_file` + `open_canvas`, args split too. */
const splitGluedNames: Rule = (recs, ctx, diags) => {
  const out: ToolCallRecord[] = [];
  for (const r of recs) {
    if (ctx.known.has(r.name)) { out.push(r); continue; }
    let pair: [string, string] | null = null;
    for (const n1 of ctx.known) {
      if (r.name.startsWith(n1) && ctx.known.has(r.name.slice(n1.length))) { pair = [n1, r.name.slice(n1.length)]; break; }
    }
    if (!pair) { out.push(r); continue; }
    diags.push({ rule: "glued-names", message: `"${r.name}" is two calls glued together; split into ${pair[0]} and ${pair[1]} (auto-fixed)` });
    const [a1, rest] = firstBalancedObject(r.argsRaw);
    const tail = rest.trim();
    const a2 = tail.startsWith("{") ? firstBalancedObject(tail)[0] : "";
    out.push({ ...r, name: pair[0], args: parse(a1 || r.argsRaw), argsRaw: a1 || r.argsRaw });
    out.push({ ...r, id: r.id + ":2", name: pair[1], args: parse(a2 || "{}"), argsRaw: a2 || "{}" });
  }
  return out;
};

/** Known name but a second JSON blob welded onto the args: keep the first. */
const danglingArgs: Rule = (recs, ctx, diags) =>
  recs.map((r) => {
    if (!ctx.known.has(r.name)) return r;
    const [a1, rest] = firstBalancedObject(r.argsRaw);
    if (a1 && rest.trim()) {
      diags.push({ rule: "dangling-args", message: `args for "${r.name}" had a second JSON blob glued on; kept the first (auto-fixed)` });
      return { ...r, args: parse(a1), argsRaw: a1 };
    }
    return r;
  });

/** Report what no rule could fix; these trigger the corrective re-query. */
const reportUnrunnable: Rule = (recs, ctx, diags) => {
  for (const r of recs) {
    if (!ctx.known.has(r.name)) diags.push({ rule: "unknown-tool", message: `no tool named "${r.name}" exists` });
    else if (r.args && typeof r.args === "object" && "_raw" in (r.args as object)) diags.push({ rule: "bad-json", message: `args for "${r.name}" are not valid JSON` });
  }
  return recs;
};

const RULES: Rule[] = [splitGluedNames, danglingArgs, reportUnrunnable];

/* ------------------------------------------------------------- driver ---- */

export function lintToolCalls(recs: ToolCallRecord[], ctx: LintCtx): { records: ToolCallRecord[]; diags: LintDiag[] } {
  const diags: LintDiag[] = [];
  let out = recs;
  for (const rule of RULES) out = rule(out, ctx, diags);
  return { records: out, diags };
}

/** Diagnostics the linter fixed by itself — no re-query needed. */
export const FIXED_RULES = new Set(["glued-names", "dangling-args"]);

/** Only unfixable problems should trigger the automated corrective hop. */
export function needsCorrective(diags: LintDiag[]): LintDiag[] {
  return diags.filter((d) => !FIXED_RULES.has(d.rule));
}

/** History gate: a call safe to resend to the API. */
export function isSaneCall(t: ToolCallRecord, known: Set<string>): boolean {
  return /^[\w-]{1,64}$/.test(t.name) && known.has(t.name);
}

/* ------------------------------------- the automated corrective prompt ---- */

export function correctivePrompt(diags: LintDiag[], tools: LintTool[]): string {
  const list = diags.map((d) => `- [${d.rule}] ${d.message}`).join("\n");
  const syntax = tools.map((t) => `- ${t.name} — ${t.description} args: ${JSON.stringify(t.parameters)}`).join("\n");
  return `[auto-recovery] Your previous tool attempt was rejected:\n${list}\nRe-issue the intended action now. Rules: exactly one tool per call; tool names verbatim from the list below; arguments valid JSON matching the schema. Continue the task without addressing this note.\n\nAvailable tools:\n${syntax}`;
}
