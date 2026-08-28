# Atelier — agentic canvas

A client-side agentic workspace. The agent answers directly in the page
(no chat bubbles), works against a virtual filesystem held in the browser,
and opens anything it makes — a page, a spreadsheet, a document, a URL — in a
floating canvas beside the conversation.

Everything runs in the browser. There is no server; requests go straight from
the client to an OpenAI-compatible endpoint.

## What it does

- **Document-shaped answers** — streaming markdown with tables, task lists,
  footnotes, LaTeX, code highlighting, YouTube embeds and `<details>`
- **A workspace, not a scratchpad** — the agent reads, writes and patches
  files (PDF / DOCX / XLSX / images are ingested to text on upload), and every
  presentational file becomes an artifact automatically
- **A floating canvas** — renders a workspace file according to its type: a
  running sandboxed page for an HTML project, an editor for code, a viewer for
  images, sheets, documents and PDFs, or a live web page
- **Tools** — web search and fetch, crawl, a Pyodide python sandbox, and
  context management (attach / detach / compact)
- **Skills** — a library of procedures the agent loads on demand; a few are
  always pinned into the prompt
- **Threads** — select any passage to quote it or fork a side conversation
  anchored to that node
- **MCP** — attach external MCP servers and their tools appear alongside the
  built-in ones

## Setup

```bash
npm install
npm run dev
```

`npm run build` produces a single self-contained `dist/index.html`
(vite-plugin-singlefile).

## Environment variables

Read at **build time**:

| Variable          | Required | Description                                                                                                     |
| ----------------- | -------- | --------------------------------------------------------------------------------------------------------------- |
| `VITE_OPENAI_KEY` | No       | Pre-fills Settings → API Key. If unset, paste a key into the app's Settings modal instead.                       |

```bash
cp .env.example .env.local   # then VITE_OPENAI_KEY=sk-...
```

`.env.local` is git-ignored. On Vercel, set the variable under
Settings → Environment Variables and redeploy — build-time variables do not
update without a new build.

> ⚠️ Anything prefixed `VITE_` is embedded in the client bundle and readable by
> anyone who loads the site. Use a key with strict limits for public
> deployments, or proxy the calls.

## Architecture

```
src/
├── App.tsx                  # entry: pick the active chat, hand it to the shell
├── main.tsx
│
├── ui/                      # the chrome around the conversation
│   ├── AppShell.tsx         #   three-column layout, breakpoint, ⌘\ / ⌘. shortcuts
│   ├── Chrome.tsx           #   Sidebar, Rail, Panel
│   ├── Composer.tsx         #   input, uploads, skills menu
│   ├── Message.tsx          #   one turn: text, tool calls, sources, artifacts
│   ├── SelectionPopup.tsx   #   the quote / thread-on-this tray
│   ├── Modals.tsx           #   settings, skills, MCP
│   ├── ErrorBoundary.tsx
│   └── Icons.tsx
│
├── lib/                     # everything that is not a component
│   ├── types.ts             #   the data model (Chat, Node, Thread, WFile, Artifact…)
│   ├── store.ts             #   Zustand store, persistence, migrations
│   ├── agent.ts             #   the turn loop: stream → run tools → stream again
│   ├── prompt.ts            #   the system prompt, built from live state
│   ├── messages.ts          #   chat tree → request messages, thread handling
│   ├── stream.ts            #   SSE streaming, model fallback, tool-call recovery
│   ├── compact.ts           #   context compaction sub-agent
│   ├── tool-defs.ts         #   the tool schemas sent to the model
│   ├── run-tool.ts          #   tool name → result string, MCP passthrough
│   ├── workspace.ts         #   the virtual filesystem, artifact auto-registration
│   ├── python.ts            #   lazy Pyodide bootstrap
│   ├── skills.ts            #   the skill library
│   ├── mcp.ts               #   MCP server listing and calls
│   ├── web.ts               #   search, fetch, crawl, HTML → markdown
│   ├── ingest.ts            #   uploaded files → text
│   ├── xml.ts, clipboard.ts, useStickToBottom.ts
│
├── canvas/                  # the floating viewport
│   ├── CanvasHost.tsx       #   window: drag, resize, bottom sheet on mobile
│   ├── FileEditor.tsx       #   adapts to the file: code, sheet, image, ui.json
│   ├── ProjectView.tsx      #   runs a folder of files as a sandboxed page
│   ├── WebViewer.tsx        #   live web page
│   ├── view.ts              #   extension → which viewer
│   └── theme.ts             #   design tokens injected into rendered iframes
│
├── md/                      # the markdown pipeline
│   ├── parse.ts             #   text → block/inline AST
│   ├── Markdown.tsx         #   AST → streaming React
│   └── highlight.tsx
│
├── styles/                  # app.css, canvas.css, globals.css, prose.css
└── utils/cn.ts
```

### How a turn works

`send` appends a user node and calls `generate`. `generate` builds messages
from the node tree, streams a completion into the node, and if the model asked
for tools it runs them and streams again — up to six hops. Tool calls are
written to the node as they start so the UI shows them running, then patched
with output and timing.

An artifact is only a **reference**: a title pointing at a workspace path or a
URL. It owns no content, so editing the file updates the artifact.

### Currently unbuilt

The block renderer (a JSON-driven component system) was removed wholesale and
is waiting on a rebuild. Until it lands:

- a `.ui.json` file's preview pane shows a placeholder — the file itself is
  intact, switch to `code` to read or edit it
- a `<component>` tag in a response renders its raw source instead of mounting

The `.ui.json` format and the `<component>` parse path are still in place, so
old sessions and old transcripts remain readable.

## Tech

React 19 · Vite 7 · Tailwind CSS 4 · Zustand · Lenis · KaTeX

The heavy document parsers are **not** bundled. PDF.js, Mammoth and SheetJS
are pulled from a CDN the first time a file of that type is ingested, and
Pyodide the first time `run_python` is called, so the shipped bundle stays
small and nothing is paid for until it is used.

`package.json` still lists `pdfjs-dist`, `mammoth`, `xlsx`, `gsap` and
`smiles-drawer` — none of them are imported by any module (the first three are
loaded from CDN instead). They are candidates for removal.

## License

MIT
