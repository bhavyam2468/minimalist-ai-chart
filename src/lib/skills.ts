/* ===========================================================================
   skills.ts — Agent Skills, Anthropic SKILL.md style.

   Level 1  name + description  -> always in the system prompt (~1 line each)
   Level 2  body                -> only when `read_skill` is called, or when a
                                   file upload auto-activates the skill
   Level 3  resources           -> referenced sections read on demand
   ========================================================================= */

export interface Skill {
  name: string;
  description: string;
  always?: boolean;                 // level-2 body always injected
  triggers?: RegExp;                // auto-activated by file mime / extension
  body: string;
}

export const SKILLS: Skill[] = [
  {
    name: "generative-ui",
    description:
      "Create inline interactive UI widgets (<component>) or .ui.json canvas files: color-picker palette, calendar date picker, precision slider, clock, weather, search bar, multi-field form with submit, reactive calculators, charts, visualizers, and slides.",
    always: true,
    body: `# generative-ui
Always prefer creating UI from the pre-existing component library with \`<component type="..." ... />\` directly inline in your message. If and only if no suitable pre-existing component fits the user's needs, resort to writing custom HTML/CSS/JS files in the workspace with \`write_file\` and surfacing them with \`open_canvas\`.

## Pre-Existing Component Types
- **color-picker**: \`<component type="color-picker" label="Theme Swatches" value="#7C3AED" colors='["#7C3AED","#FF6B6B","#10B981"]' />\`
- **calendar**: \`<component type="calendar" label="Target Date" value="2026-08-28" />\`
- **slider**: \`<component type="slider" label="Capacity" value="65" min="0" max="100" unit="%" />\`
- **clock**: \`<component type="clock" label="System Clock" />\`
- **weather**: \`<component type="weather" city="New York City, NY" temp="74°F" condition="Clear Skies" />\`
- **search-bar**: \`<component type="search-bar" placeholder="Search components..." />\`
- **form**: Multi-field form container linked to a Submit button that sends structured JSON back:
  \`<component type="form" title="Config" submitLabel="Apply" fields='[{"id":"color","label":"Accent","type":"color-picker"},{"id":"env","label":"Env","type":"dropdown","options":["dev","prod"]}]' />\`
- **reactive**: Dynamic scenario & formula calculator updating charts/metrics in real time:
  \`<component type="reactive" title="Simulator" state='{"price":50,"qty":100}' controls='[{"id":"price","type":"slider","min":10,"max":200}]' />\`
- **question**: \`<component type="question" question="Which model?" options='[{"id":"v1","label":"Standard"},{"id":"v2","label":"Pro"}]' requireSubmit="true" />\`
- **charts**: \`<component type="chart" kind="line|bar|hbar|donut|pie|bubble|treemap|waterfall|radar|gauge|funnel|candlestick|heatmap" data='[...]' />\`
- **chemistry**: \`<component type="chemistry" molecule="caffeine" />\`
- **math**: \`<component type="math" fn="sin(x)*cos(2*x)" />\`
- **slides**: \`<component type="slide:title" title="..." subtitle="..." />\`
`,
  },
  {
    name: "skill-finder",
    description:
      "Discover which skills exist and load them. Use at the start of any non-trivial task, or whenever the user mentions a file type, a workflow or a tool you are not sure how to drive.",
    always: true,
    body: `# skill-finder
1. Call \`find_skills\` with a short intent phrase ("edit a spreadsheet", "research the web").
2. Read at most two results with \`read_skill\`.
3. Follow the body literally. Skills override your defaults.
Never guess a workflow that a skill already documents.`,
  },
  {
    name: "context-management",
    description:
      "Manage what is loaded in the working context: attach/detach files, compact the conversation, inspect token pressure. Always available.",
    always: true,
    body: `# context-management
Three states exist for every file:
- **local**  — on the user's machine only. You cannot see it.
- **known**  — the workspace knows the path + a one line summary. Cheap.
- **context**— the full body is inside your context window. Expensive.

Commands
- \`add_context(paths)\`     known -> context
- \`remove_context(paths)\`  context -> known. The name is never forgotten.
- \`compact_context(focus)\` spawn a summariser sub-agent over the older turns.

Rules
1. Keep at most ~3 large files in context at once.
2. Detach a file the moment the sub-task that needed it is finished.
3. Before a long agentic run, compact if the conversation is over ~60k tokens.
4. Compaction preserves: user intent verbatim, file paths, names, numbers,
   decisions, unresolved tasks. Unrelated tangents move to \`notes/aside.md\`.`,
  },
  {
    name: "workspace-files",
    description:
      "Create, read, patch and organise files in the agent workspace. Use for any code, notes, data or artefact that should outlive one message.",
    body: `# workspace-files
Only three primitives — keep the surface small:
- \`edit_file(path, content, mode)\` — mode \`rewrite\` (default) or \`append\`.
  Creates the file when it does not exist. No separate create command.
- \`read_file(path, offset?, limit?)\` — 1-indexed lines, returns numbered lines,
  truncates past 2000 lines. Always read before patching.
- \`apply_diff(path, old_str, new_str, replace_all?)\` — exact-match patch.
  \`old_str\` must be unique; include 2-3 lines of surrounding context.

Conventions
- \`notes/\`, \`data/\`, \`src/\`, \`out/\`. Extensions always explicit.
- Prefer \`apply_diff\` over rewriting files longer than ~80 lines.
- After writing a file worth looking at, surface it with
  \`open_canvas({ target: "<path>" })\` — the user gets a real editor for it.`,
  },
  {
    name: "web-research",
    description:
      "High-speed web search and page fetcher with niche filtering mechanics (music, underground subcultures, reddit discussions, tech, academic). Use whenever information requires external or niche data.",
    body: `# web-research
Tools: \`web_search\`, \`web_fetch\`.

## 1. Unified Search: \`web_search({ query, site?, niche?, limit? })\`
- \`query\`: Specific keyword phrases (e.g. \`midwest emo underground bands revival\`), not conversational questions.
- \`niche\` (or \`category\`):
  - \`music\`: Activates MusicBrainz artist registries, Bandcamp metadata, indie music tags, discographies, and cult/underground scenes.
  - \`discussions\`: Activates Reddit enthusiast threads, forum consensus, and user recommendation deep-dives.
  - \`tech\`: Activates GitHub repositories, documentation, and HackerNews discussions.
  - \`academic\`: Activates arXiv, PubMed, and scholarly databases.
  - \`general\`: Multi-engine web search (fast SearXNG, DuckDuckGo, Wikipedia).
- \`site\`: Directly target a specific platform (e.g. \`site: "reddit.com"\`, \`site: "bandcamp.com"\`, \`site: "rateyourmusic.com"\`, \`site: "github.com"\`).

## 2. Niche & Underground Discovery Tactics
When asked for niche, obscure, or underground recommendations:
- **Use Niche Filtering**: Always set \`niche: "music"\` or \`niche: "discussions"\` to bypass generic encyclopedia overviews.
- **High-Signal Keyword Modifiers**: Append qualifiers such as \`"underrated"\`, \`"obscure"\`, \`"hidden gems"\`, \`"revival"\`, \`"diy scene"\`, \`"lesser known"\`.
- **Target Specialist Platforms**: Use \`site: "reddit.com"\` (e.g. \`site: "reddit.com/r/midwestemo"\`) or \`site: "bandcamp.com"\`.

## 3. Page Reading: \`web_fetch({ url })\`
- Fetches the URL and extracts clean readable markdown. Fetch only the top 1-2 most relevant URLs when deep detail is needed.

## CRITICAL EFFICIENCY & ANTI-LOOPING RULES
- **MAXIMUM 1 TO 2 SEARCHES**: Execute at most 1 or 2 targeted searches per user turn. DO NOT loop through dozens of searches or query multiple websites one by one.
- **IMMEDIATE SYNTHESIS**: After 1-2 searches, synthesize a detailed, comprehensive, high-quality answer immediately, combining the search results with your extensive pre-trained knowledge base. The user expects instant, actionable recommendations, not endless scraping.
- **Cite inline** with clean markdown links: e.g. \`[Mineral](https://musicbrainz.org/artist/...)\`.`,
  },
  {
    name: "canvas-design",
    description:
      "Everything the user looks at that is not prose: build files in the workspace and let the canvas render them — HTML projects, .ui.json view files, images, sheets, documents. Also covers opening a file or url and naming references.",
    body: `# canvas-design
There is one rule: **you never store UI in a special place — you write files.**
The canvas is a floating viewport that renders whatever file you point it at,
and an *artifact* is only a saved reference (a label + a path or url). Nothing
is duplicated, so the file stays editable by you and the user, and the canvas
updates the moment the file changes.

## What the canvas does with each file
| you write                        | the canvas shows                                   |
|----------------------------------|----------------------------------------------------|
| \`x/index.html\` (+ styles.css,    | a running sandboxed page, with run/code tabs and    |
| script.js, any siblings)         | every sibling file reachable as a tab              |
| \`x.ui.json\`                      | the block view below, live, with a view/code toggle |
| \`*.png / *.jpg / *.gif\`          | image viewer with zoom                              |
| \`*.csv / *.tsv\`                  | grid with sticky headers, raw toggle                |
| \`*.md\`                           | editor / split / preview                            |
| any code file                    | syntax-highlighted editor                           |
| a url                            | reader view + live frame                            |

Relative references inside html are resolved against sibling workspace files,
so \`<link rel="stylesheet" href="styles.css">\` and
\`<script src="script.js"></script>\` just work. Keep them relative — no
absolute paths, no CDNs you didn't verify.

## Two worked flows
**A web app / widget / timer / pomodoro**
1. \`edit_file("pomodoro/index.html", "<!doctype html>…<link rel=stylesheet href=styles.css><script src=script.js></script>…")\`
2. \`edit_file("pomodoro/styles.css", …)\`, \`edit_file("pomodoro/script.js", …)\`
3. That's it — writing the html auto-registers an artifact and opens it.
   To patch it later use \`apply_diff("pomodoro/script.js", old, new)\`; the
   running view re-renders on save.

**A chart from real numbers**
1. \`edit_file("charts/sales.py", "import matplotlib…plt.savefig('/work/charts/sales.png')")\`
2. \`run_python\` it — files written under /work sync back into the workspace.
3. \`charts/sales.png\` now exists, is referenced automatically, and opens in
   the canvas. Keep the .py next to it so the chart is reproducible.

## Opening and naming things
- \`open_canvas({ target })\` — show any path, folder, artifact or url. Creates
  nothing. Use it instead of pasting file contents into your reply.
- \`artifact({ ref, title, note })\` — a saved reference in the artifacts list.
  Presentational files you write get one automatically, so use this only to
  give a nicer label, add a note, or reference a url. Pass \`open:false\` to
  register quietly. A folder ref resolves to its index.html / *.ui.json /
  README.md.

## The .ui.json block view (C1 by Thesys style)
Write it when you want a rich, interactive themed dashboard without writing manual HTML. Shape:
\`{ "title": str, "ratio": "landscape|portrait|square|auto", "blocks": [ … ] }\`

Block DSL
{ type:"heading", text, level? }
{ type:"text", text }                              markdown inline supported
{ type:"metric", label, value, delta?, hint? }    delta tags show trends (+14.2% vs prev)
{ type:"metrics", items:[{label,value,delta?}] }
{ type:"chart", kind:"bar"|"line"|"area"|"pie"|"donut"|"scatter"|"hbar",
  data:[{label, value}] | series:[{name, points:[{x,y}]}], title?, caption? }
  -> Interactive hover tooltips, crosshairs, and multi-series toggle legends supported
{ type:"table", columns:[...], rows:[[...]] }     sortable columns + search filter input
{ type:"tabs", tabs:[{label, blocks:[...]}] }     multi-tab dashboard switching
{ type:"slider", label, min, max, step, value, unit? }  interactive range slider
{ type:"callout"|"alert", kind:"info"|"success"|"warn"|"err", title?, text }
{ type:"accordion", items:[{title, content?, blocks?:[...]}] }
{ type:"list", items:[...], ordered? }
{ type:"kv", items:[{k,v}] }
{ type:"progress", label, value /*0-100*/ }
{ type:"input", label, placeholder?, kind?:"text"|"number"|"date" }
{ type:"button", label, action? }
{ type:"timer", label, seconds }
{ type:"stopwatch", label }
{ type:"pomodoro", label, work?:1500, breakFor?:300 }
{ type:"counter", label, value?, step? }
{ type:"todo", label, items:[str] }
{ type:"image", src, caption? }
{ type:"video", youtube }
{ type:"code", language, content }
{ type:"markdown", content }
{ type:"divider" }
{ type:"grid", of:[block…] }
{ type:"columns", of:[[block…],[block…]] }

## React apps in the canvas
You can create full React applications in the workspace:
1. Write an \`app/App.tsx\` or \`app/index.html\` with React & Tailwind CSS.
2. The canvas automatically bundles and transpiles JSX/TSX with in-browser Babel and mounts into \`<div id="root"></div>\`.
3. Sibling CSS and JS/TSX files are resolved and inlined seamlessly.

Design law — everything you emit must look like it shipped with the app:
solid background, one accent, generous whitespace, uppercase micro-labels,
no shadows except var(--shadow), no border-radius other than var(--r)/--r-sm.
In raw HTML that means: use var(--surface), var(--text), var(--accent), var(--r)
and never a literal color.`,
  },
  {
    name: "data-analysis",
    description:
      "Run python (numpy, pandas, matplotlib pre-installed) over workspace data, compute statistics and produce chart-ready results. Use for numbers, csv, transformations and simulations.",
    triggers: /\.(csv|tsv|json|parquet)$/i,
    body: `# data-analysis
\`run_python(code)\` executes in a sandboxed Pyodide runtime.
- Pre-installed: numpy, pandas, matplotlib (agg), scipy-lite subset.
- Workspace files are mounted read/write at \`/work/<path>\`.
- \`print()\` output is returned. Keep it under ~4kB.
- To install more: \`await micropip.install("pkg")\` — ask the user first.

Pattern
1. read/prepare with pandas
2. print a compact result table
3. hand the numbers to \`canvas\` chart blocks (do not screenshot matplotlib)`,
  },
  {
    name: "spreadsheets",
    description:
      "Read and reason over Excel/CSV workbooks: sheets, headers, formulas, pivots. Auto-activates when a .xlsx/.xls/.csv file is attached.",
    triggers: /\.(xlsx|xls|csv|tsv)$/i,
    body: `# spreadsheets
Uploaded workbooks are converted to markdown tables per sheet at
\`data/<name>.md\` and the raw grid stays available as csv.
1. \`read_file\` the sheet you need — never load every sheet.
2. Reshape with \`run_python\` + pandas for anything over ~200 rows.
3. Emit results as \`canvas\` table/chart blocks, or write a new csv with
   \`edit_file\` and tell the user the path.
Watch for: merged headers, thousands separators, dates as serial numbers.`,
  },
  {
    name: "documents",
    description:
      "Work with PDF, DOCX and PPTX: extraction, summarisation, structured rewriting, outline generation. Auto-activates on document upload.",
    triggers: /\.(pdf|docx|doc|pptx|ppt|rtf|epub)$/i,
    body: `# documents
Uploads are converted to markdown at \`docs/<name>.md\` with page markers
(\`--- page N ---\`). The original stays attached for reference.
1. Skim with \`read_file(path, 1, 120)\` before loading everything.
2. Quote page numbers when citing.
3. For long documents, summarise section by section into \`notes/<name>.md\`
   and detach the source with \`remove_context\`.`,
  },
  {
    name: "images",
    description:
      "Interpret attached images, screenshots and diagrams. Auto-activates on image upload.",
    triggers: /\.(png|jpe?g|gif|webp|avif|bmp|heic)$/i,
    body: `# images
Images are passed straight into the vision input — no conversion needed.
Describe what is actually visible before interpreting. For UI screenshots,
report structure (layout, hierarchy, spacing) not just content.`,
  },
  {
    name: "custom-tooling",
    description:
      "Build reusable commands: author a new skill, define a python SDK helper the user can call later, or wire up an MCP server.",
    body: `# custom-tooling
Authoring a skill
1. \`edit_file("skills/<name>/SKILL.md", body)\`
2. Frontmatter: \`name\` (lowercase-hyphen, <=64 chars) and \`description\`
   (<=1024 chars, says *what* and *when*). Body under 500 lines.
3. Move long reference material to \`skills/<name>/references/*.md\` and link it.

Authoring an SDK helper
- Write pure python into \`sdk/<name>.py\` exposing small named functions.
- Document the signature at the top of the file, then call it from
  \`run_python\` instead of re-writing the logic every turn.

MCP
- Servers configured in the app are exposed as \`mcp__<server>__<tool>\`.
- Their schemas are already in your tool list; just call them.`,
  },
];

export const skillByName = (n: string) => SKILLS.find((s) => s.name === n);

export function skillIndex(): string {
  return SKILLS.map((s) => `- ${s.name}: ${s.description}`).join("\n");
}

export function findSkills(query: string): Skill[] {
  const q = query.toLowerCase().split(/\W+/).filter((w) => w.length > 2);
  const score = (s: Skill) => {
    const hay = (s.name + " " + s.description + " " + s.body.slice(0, 400)).toLowerCase();
    return q.reduce((acc, w) => acc + (hay.includes(w) ? 1 : 0), 0);
  };
  return SKILLS.map((s) => ({ s, v: score(s) })).filter((x) => x.v > 0).sort((a, b) => b.v - a.v).map((x) => x.s).slice(0, 4);
}

export function skillForFile(path: string): string | undefined {
  return SKILLS.find((s) => s.triggers?.test(path))?.name;
}
