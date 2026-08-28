/**
 * Theme injection for iframe-rendered content.
 *
 * The canvas renders user/agent-authored HTML and JSX inside a sandboxed
 * iframe, which has no access to the host document's stylesheets. This
 * snapshots the live design tokens off :root and serialises them into a
 * self-contained stylesheet, so anything rendered in the iframe inherits the
 * app's colours, radii, spacing and type scale.
 *
 * Deliberately independent of the block renderer — plain HTML projects and
 * generated sites use it too.
 */

const TOKENS = [
  "--bg", "--surface", "--surface-2", "--surface-3", "--line", "--line-soft",
  "--text", "--text-dim", "--text-faint", "--accent", "--accent-soft", "--accent-line",
  "--ok", "--warn", "--err", "--info", "--r", "--r-sm", "--r-xs", "--sp-2", "--sp-3",
  "--sp-4", "--sp-5", "--font", "--mono", "--fs", "--fs-sm", "--fs-xs", "--fs-lg", "--fs-xl", "--shadow",
];

export function themeCss(): string {
  const cs = getComputedStyle(document.documentElement);
  const vars = TOKENS.map((t) => `${t}: ${cs.getPropertyValue(t).trim()};`).join("\n  ");
  return `:root {\n  ${vars}\n}
*{box-sizing:border-box}
body{margin:0;background:var(--surface);color:var(--text);font-family:var(--font);font-size:var(--fs);line-height:1.6}
h1,h2,h3,h4{font-weight:560;letter-spacing:-.012em;margin:0 0 10px}
h1{font-size:var(--fs-xl)} h2{font-size:var(--fs-lg)} h3{font-size:var(--fs)}
p{margin:0 0 12px}
small,.dim{color:var(--text-dim)}
button{font:inherit;height:34px;padding:0 14px;border-radius:var(--r-sm);border:1px solid var(--line);background:var(--surface-2);color:var(--text-dim);cursor:pointer;transition:all .14s var(--ease)}
button:hover{color:var(--text);border-color:var(--accent-line);transform:translateY(-1px)}
button.primary{background:var(--text);color:var(--bg);border-color:transparent}
input,select,textarea{font:inherit;background:var(--surface-2);border:1px solid var(--line);border-radius:var(--r-sm);color:var(--text);padding:8px 11px;outline:none;width:100%}
input:focus,textarea:focus{border-color:var(--accent-line)}
.card{background:var(--surface-2);border:1px solid var(--line-soft);border-radius:var(--r);padding:var(--sp-4)}
.grid{display:grid;gap:var(--sp-3);grid-template-columns:repeat(auto-fit,minmax(170px,1fr))}
.label{font-size:var(--fs-xs);letter-spacing:.09em;text-transform:uppercase;color:var(--text-faint)}
table{width:100%;border-collapse:collapse}
th{text-align:left;font-size:var(--fs-xs);letter-spacing:.05em;text-transform:uppercase;color:var(--text-dim);padding:8px 12px;background:var(--surface-3)}
td{padding:8px 12px;border-top:1px solid var(--line-soft)}
@keyframes fade-in{from{opacity:0}to{opacity:1}}
@keyframes sweep{from{background-size:0% 100%}to{background-size:100% 100%}}
@keyframes grow-y{from{transform:scaleY(0)}to{transform:scaleY(1)}}
@keyframes draw{to{stroke-dashoffset:0}}
::-webkit-scrollbar{width:0;height:0}
*{scrollbar-width:none}`;
}
