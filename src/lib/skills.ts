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
      "Compose rich inline UI (<component>) or .ui.json files using Gamma-inspired fundamental blocks (card, grid, text, metric, button, slider, input, dropdown, switch, progress, chart) and reactive state logic.",
    always: true,
    body: `# generative-ui
This app does NOT use bloated monolithic widgets or pre-baked slide templates. It uses a small set of fundamental, nestable building blocks inspired by Gamma, linked with a reactive programming engine.

## Core Design Principles
1. **Radical Minimalism & Zero Redundancy**: Be as non-redundant and minimal as possible. NEVER state the obvious. If a widget displays a primary value (such as a timecode, number, or reading), do NOT add a title naming what the widget is, and do NOT add redundant status labels or badges describing what is already clear from the value itself. Let the primary value speak for itself as the sole focal point.
2. **Hover Controls Over Numbers (Floating Actions with Drop Shadow)**: For numeric displays or visualizers, provide square action buttons inside \`hoverControls\` on the \`metric\` block. At rest, only the clean number is shown. When hovering over the number, the action buttons appear centered directly over the number with a drop shadow, and disappear when unhovered. Use dynamic icon states via reactive expressions: e.g. \`"icon": "\${active ? 'pause' : 'play'}"\`, \`"icon": "skip"\`, \`"icon": "refresh"\`.
3. **Compact Rounded Rectangle Cards (Default)**: Always use clean, compact rounded rectangles (\`"shape": "rect"\` or default card) so the widget fits naturally and neatly in the chat UI. Circular shapes (\`"shape": "circle"\`) are only an optional availability if explicitly requested by the user—never use circles by default. For progress on cards, use \`borderProgress\` which renders as an elegant top perimeter bar.
4. **Universal Corner Radii**: All elements adhere to the universal corner radii of the design system: cards use \`var(--r)\`, buttons use \`var(--r-sm)\`, badges/tags use \`var(--r-xs)\`.
5. **Cross-Component State Sharing**: Multiple \`<component>\` tags in the same message automatically share state! If you split UI across text or math sections, use \`<component id="master">\` on the primary card and \`<component link="master">\` on downstream buttons to let them control the master state.
6. **Auto-Adaptive Layout**: Adjacent buttons are automatically grouped and balanced across the row. Odd items in grids auto-span to eliminate awkward holes. Long labels smoothly marquee on hover without breaking words.

## Fundamental Composable Blocks
- **card**: Container with optional \`title\`, \`subtitle\`, \`badge\`, \`centered\` (boolean), \`borderProgress\` (0-100), \`progressColor\`, \`shape\` ("rect"|"circle"), \`state\`, \`tick\`, \`onTick\`, \`id\`, and nested \`blocks\`.
- **grid**: Composable multi-column layout (\`cols\`: 1-6, \`gap\`, and child \`blocks\`). Automatically balances odd items.
- **text**: Composable typography (\`text\`, \`variant\`: "title"|"sub"|"kicker"|"code"|"body", \`align\`).
- **metric**: KPI stat block (\`label\`, \`value\`, \`delta\`, \`sub\`, \`centered\`, \`hoverControls\`: array of buttons).
- **button**: Reactive action trigger (\`text\`, \`icon\`: "play"|"pause"|"skip"|"refresh"|"check"|"x"|"plus"|"minus"|"settings", \`shape\`: "square"|"rect", \`hover\`: boolean, \`variant\`: "primary"|"secondary"|"outline"|"ghost"|"danger", \`onClick\` script, \`submitToChat\`).
- **slider**: Precision expansion slider (hairline track expanding to 26px on drag with precision readout, \`label\`, \`min\`, \`max\`, \`step\`, \`unit\`, and \`bind\`).
- **input**: Text/number input (\`label\`, \`placeholder\`, \`type\`, \`bind\`).
- **dropdown**: Select menu (\`label\`, \`options\`, \`bind\`).
- **switch**: Boolean toggle switch (\`label\`, \`description\`, \`bind\`).
- **checkbox**: Boolean checkbox (\`label\`, \`description\`, \`bind\`).
- **progress**: Clean progress meter (\`value\`, \`max\`, \`label\`, \`unit\`).
- **chart**: Composable charts (\`kind\`: "line"|"area"|"bar"|"hbar"|"donut"|"pie"|"radar"|"gauge"|"candlestick", \`title\`, \`data\`).
- **table**: Clean data table (\`headers\`, \`rows\`).
- **badge**: Status badge with universal radius (\`text\`, \`color\`: "default"|"accent"|"ok"|"warn"|"danger"|"faint").
- **divider**: Hairline separator.
- **math**: Interactive 2D function visualizer (\`fn\`, \`xmin\`, \`xmax\`).
- **chemistry**: 2D molecule diagram (\`smiles\` or \`molecule\`).

## Reactive State & Logic Engine
Any \`card\` or UI document can declare reactive state and dynamic ticking:
- \`state\`: Initial state object, e.g. \`{ "seconds": 0, "active": false, "users": 100, "price": 49 }\`.
- \`tick\`: Interval in ms (e.g. \`1000\` for 1s ticks, \`100\` for 0.1s ticks).
- \`onTick\`: JS script executed every tick (e.g. \`"if (active) seconds++"\`).
- \`onClick\`: JS script executed on button click (e.g. \`"active = !active"\` or \`"seconds = 0; active = false"\`).
- \`bind\`: Two-way binding attribute on sliders, inputs, switches, dropdowns, and checkboxes linking directly to a key in \`state\`.
- \`\${...}\` / \`{...}\`: Dynamic template interpolation in any label, value, text, badge, or chart. Built-in helpers: \`pad(n)\`, \`Math\`, \`Date\`.
- \`submitToChat\`: On buttons, sends a message back to chat with interpolated state (e.g. \`"Forecast submitted: ARR=\${users * price * 12}"\`).

## Composable Recipes

1. **Radically Minimal Dynamic Visualizer (Border Progress, Number with Hover Controls)**:
\`\`\`json
{
  "type": "card",
  "borderProgress": "\${((total - count) / total) * 100}",
  "state": { "total": 100, "count": 100, "active": false },
  "tick": 1000,
  "onTick": "if (active && count > 0) count--",
  "blocks": [
    {
      "type": "metric",
      "centered": true,
      "value": "\${count}",
      "hoverControls": [
        { "type": "button", "shape": "square", "icon": "\${active ? 'pause' : 'play'}", "variant": "primary", "onClick": "active = !active" },
        { "type": "button", "shape": "square", "icon": "skip", "variant": "secondary", "onClick": "count = 0; active = false" }
      ]
    }
  ]
}
\`\`\`

2. **Cross-Component Linked Action Across Markdown**:
Master Card:
\`\`\`xml
<component id="tracker">
{
  "type": "card",
  "borderProgress": "\${progress}",
  "state": { "progress": 70, "active": false },
  "blocks": [
    { "type": "metric", "centered": true, "value": "\${progress}%" }
  ]
}
</component>
\`\`\`
... intermediate markdown text, formulas, or math ...
Downstream Linked Action Button:
\`\`\`xml
<component link="tracker">
{
  "type": "button",
  "shape": "square",
  "hover": true,
  "icon": "\${active ? 'pause' : 'play'}",
  "variant": "primary",
  "onClick": "active = !active"
}
</component>
\`\`\`

3. **Interactive Scenario Calculator**:
\`\`\`json
{
  "type": "card",
  "state": { "quantity": 150, "unitPrice": 49 },
  "blocks": [
    { "type": "slider", "label": "Volume", "min": 10, "max": 1000, "step": 10, "bind": "quantity" },
    { "type": "slider", "label": "Unit Price", "min": 10, "max": 200, "step": 5, "unit": "$", "bind": "unitPrice" },
    {
      "type": "grid",
      "cols": 2,
      "blocks": [
        { "type": "metric", "label": "Subtotal", "value": "$\${quantity * unitPrice}" },
        { "type": "metric", "label": "Annualized", "value": "$\${quantity * unitPrice * 12}" }
      ]
    },
    { "type": "button", "text": "Submit Scenario", "submitToChat": "Submitted: \${quantity} units at $\${unitPrice} -> Total is $\${quantity * unitPrice * 12}" }
  ]
}
\`\`\`

4. **Composable Data Overview**:
\`\`\`json
{
  "type": "card",
  "blocks": [
    { "type": "text", "text": "Performance Metrics", "variant": "title" },
    {
      "type": "grid",
      "cols": 3,
      "blocks": [
        { "type": "metric", "label": "Median TTFT", "value": "24ms", "delta": "-8ms" },
        { "type": "metric", "label": "Peak Concurrency", "value": "12,000", "delta": "+40%" },
        { "type": "metric", "label": "Error Rate", "value": "0.01%", "sub": "p99.9" }
      ]
    }
  ]
}
\`\`\`

4. **Interactive Scenario Calculator**:
\`\`\`json
{
  "type": "card",
  "title": "SaaS Scenario Calculator",
  "state": { "users": 150, "price": 49 },
  "blocks": [
    { "type": "slider", "label": "Active Users", "min": 10, "max": 1000, "step": 10, "bind": "users" },
    { "type": "slider", "label": "Price/Month", "min": 10, "max": 200, "step": 5, "unit": "$", "bind": "price" },
    {
      "type": "grid",
      "cols": 2,
      "blocks": [
        { "type": "metric", "label": "Monthly Revenue (MRR)", "value": "$\${users * price}" },
        { "type": "metric", "label": "Annual Run Rate (ARR)", "value": "$\${users * price * 12}" }
      ]
    },
    { "type": "button", "text": "Submit Model to Chat", "submitToChat": "Model submitted: \${users} users at $\${price}/mo -> ARR is $\${users * price * 12}" }
  ]
}
\`\`\`

5. **Gamma-Style Presentation Card / Slide**:
\`\`\`json
{
  "type": "card",
  "blocks": [
    { "type": "badge", "text": "Q3 2026 ROADMAP", "color": "accent" },
    { "type": "text", "text": "Next-Generation Inference Engine", "variant": "title" },
    { "type": "text", "text": "Transitioning from static widgets to composable reactive building blocks.", "variant": "sub" },
    {
      "type": "grid",
      "cols": 3,
      "blocks": [
        { "type": "metric", "label": "Median TTFT", "value": "24ms", "delta": "-8ms" },
        { "type": "metric", "label": "Peak Concurrency", "value": "12,000", "delta": "+40%" },
        { "type": "metric", "label": "Error Rate", "value": "0.01%", "sub": "p99.9" }
      ]
    }
  ]
}
\`\`\`
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
