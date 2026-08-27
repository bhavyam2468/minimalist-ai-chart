import { useApp, uid } from "./store";
import { findSkills, skillByName, SKILLS } from "./skills";
import { searchComponents, getComponentDef } from "./ui-library";
import { hostOf, siteSearch, webCrawl, webFetch, webSearch } from "./web";
import type { Artifact, WFile } from "./types";

export interface ToolCtx {
  chatId: string;
  nodeId: string;
  signal?: AbortSignal;
  summarize?: (focus: string) => Promise<string>;
  onSkillLoaded?: (name: string) => void;
}

const S = () => useApp.getState();
const chatOf = (id: string) => S().chats[id];

/* --------------------------------------------------------------- schemas */
const P = (props: Record<string, any>, required: string[] = []) => ({ type: "object", properties: props, required, additionalProperties: false });
const str = (description: string) => ({ type: "string", description });
const num = (description: string) => ({ type: "number", description });

export function baseToolDefs() {
  return [
    { name: "find_skills", description: "Search the installed skill library by intent. Returns name + description + when to use.", parameters: P({ query: str("intent phrase, e.g. 'edit a spreadsheet'") }, ["query"]) },
    { name: "read_skill", description: "Load the full body of one skill (level 2 disclosure).", parameters: P({ name: str("skill name") }, ["name"]) },

    { name: "list_files", description: "List every file in the workspace with its context state (local/known/context) and size.", parameters: P({}) },
    { name: "read_file", description: "Read a workspace file with line numbers. 1-indexed offset, default limit 400 lines.", parameters: P({ path: str("workspace path"), offset: num("first line (1-indexed)"), limit: num("max lines") }, ["path"]) },
    { name: "edit_file", description: "Write a workspace file. Creates it if missing. mode=rewrite (default) replaces the body, mode=append adds to the end.", parameters: P({ path: str("workspace path e.g. notes/plan.md"), content: str("file content"), mode: { type: "string", enum: ["rewrite", "append"] } }, ["path", "content"]) },
    { name: "apply_diff", description: "Exact-match patch. old_str must appear once (include surrounding context) unless replace_all is true.", parameters: P({ path: str("workspace path"), old_str: str("exact text to find"), new_str: str("replacement text"), replace_all: { type: "boolean" } }, ["path", "old_str", "new_str"]) },

    { name: "add_context", description: "Load known files fully into the working context.", parameters: P({ paths: { type: "array", items: { type: "string" } } }, ["paths"]) },
    { name: "remove_context", description: "Detach files from the context. The path stays known and can be re-added later.", parameters: P({ paths: { type: "array", items: { type: "string" } } }, ["paths"]) },
    { name: "compact_context", description: "Spawn a summariser sub-agent over the older turns and replace them with a structured summary.", parameters: P({ focus: str("what must survive compaction") }) },

    {
      name: "web_search",
      description: "High-speed web search with niche filtering (music, reddit discussions, tech, academic) and domain targeting.",
      parameters: P({
        query: str("search query or keywords"),
        site: str("optional domain or platform e.g. 'reddit.com', 'bandcamp.com', 'rateyourmusic.com', 'github.com', 'wikipedia.org'"),
        niche: { type: "string", enum: ["music", "discussions", "tech", "academic", "general"], description: "optional category to optimize search results for underground music, reddit discussions, tech docs, or papers" },
        limit: num("max results (default 6)"),
      }, ["query"]),
    },
    {
      name: "web_fetch",
      description: "Fetch one URL and return clean readable markdown text.",
      parameters: P({ url: str("absolute url") }, ["url"]),
    },

    { name: "run_python", description: "Execute python in a sandbox (numpy/pandas/matplotlib available). Workspace files are mounted at /work. Returns stdout.", parameters: P({ code: str("python source") }, ["code"]) },

    { name: "open_canvas", description: "Show something in the user's canvas right now: a workspace file path, a folder, an artifact id, or an http(s) url. Creates nothing.", parameters: P({ target: str("file path, folder, artifact id, or url"), title: str("optional label") }, ["target"]) },
    {
      name: "search_components",
      description: "Search the UI Component Marketplace & Library for interactive components, form elements (sliders, buttons, checkboxes, dropdowns, switches, steppers), charts, math/science visualizers, and dashboards. Search by type name, category, or semantic tags.",
      parameters: P({
        query: str("search query, tag, or component type (e.g. 'slider', 'form', 'button', 'chart', 'ios volume', 'math', 'chemistry')"),
        category: { type: "string", enum: ["form", "chart", "math-science", "data", "feedback", "layout", "interactive"], description: "optional category filter" },
        tag: str("optional specific tag to filter by"),
      }),
    },
    {
      name: "get_component_schema",
      description: "Get the full schema, accepted props, and live <component> code example for a specific UI component type (e.g. 'slider', 'button', 'checkbox', 'radio', 'dropdown', 'switch', 'chart', 'math', 'chemistry').",
      parameters: P({
        type: str("component type name, e.g. 'slider', 'button', 'checkbox', 'dropdown', 'switch', 'chart'"),
      }, ["type"]),
    },
    {
      name: "artifact",
      description: "Name a reference so the user can reopen it from the artifacts list: point at a workspace file/folder or a url. No content is stored — the target file stays the source of truth, and editing it updates the artifact. Files you write that are presentational get an artifact automatically, so only use this to label, annotate, or reference a url.",
      parameters: P({
        ref: str("workspace path (file or folder) or absolute url"),
        title: str("short human label"),
        note: str("one line: what this is / what to look at"),
        open: { type: "boolean", description: "show it in the canvas immediately (default true)" },
      }, ["ref"]),
    },
  ];
}

/* ------------------------------------------------------------- workspace */
function getFile(chatId: string, path: string): WFile | undefined {
  const c = chatOf(chatId);
  return c.files[path] || Object.values(c.files).find((f) => f.path.endsWith(path) || f.path.split("/").pop() === path);
}

function writeFile(chatId: string, path: string, content: string, origin: WFile["origin"] = "agent") {
  const prev = chatOf(chatId).files[path];
  const f: WFile = {
    path, content, mime: "text/plain", size: content.length,
    kind: /\.(ts|tsx|js|jsx|py|css|html|json|sh|rs|go|java|c|cpp)$/i.test(path) ? "code" : /\.(csv|tsv)$/i.test(path) ? "data" : "text",
    state: prev?.state === "known" ? "known" : "context",
    origin: prev?.origin ?? origin, createdAt: prev?.createdAt ?? Date.now(),
  };
  S().putFile(chatId, f);
  autoArtifact(chatId, path, !prev);
  return f;
}

/** Anything presentational the agent writes becomes a reference automatically. */
const REFERRABLE = /\.(html?|ui\.json|png|jpe?g|gif|webp|svg|mp4)$/i;
const AUTO_OPEN = /\.(html?|ui\.json)$/i;
function autoArtifact(chatId: string, path: string, isNew: boolean) {
  if (!REFERRABLE.test(path)) return;
  const c = chatOf(chatId);
  if (Object.values(c.artifacts ?? {}).some((a) => a.ref === path)) return;
  const id = uid("af");
  S().putArtifact(chatId, {
    id,
    kind: "file",
    ref: path,
    title: path.split("/").length > 1 ? path.split("/").slice(-2).join("/") : path,
    createdAt: Date.now(),
  });
  if (isNew && AUTO_OPEN.test(path)) S().openCanvas({ kind: "artifact", id });
}

const numbered = (text: string, from: number) =>
  text.split("\n").map((l, i) => `${String(from + i).padStart(5, " ")}  ${l}`).join("\n");

/* ---------------------------------------------------------------- python */
let pyodide: any = null;
let pyLoading: Promise<any> | null = null;
async function ensurePyodide() {
  if (pyodide) return pyodide;
  if (pyLoading) return pyLoading;
  pyLoading = (async () => {
    if (!(window as any).loadPyodide) {
      await new Promise<void>((res, rej) => {
        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js";
        s.onload = () => res(); s.onerror = () => rej(new Error("pyodide load failed"));
        document.head.appendChild(s);
      });
    }
    pyodide = await (window as any).loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/" });
    await pyodide.loadPackage(["numpy", "pandas", "matplotlib", "micropip"]).catch(() => {});
    return pyodide;
  })();
  return pyLoading;
}

/* ------------------------------------------------------------------ main */
export async function runTool(name: string, args: any, ctx: ToolCtx): Promise<string> {
  const { chatId } = ctx;
  const st = S();
  const settings = st.settings;

  switch (name) {
    /* ---- skills ---- */
    case "find_skills": {
      const hits = findSkills(args.query || "");
      const list = (hits.length ? hits : SKILLS.slice(0, 4));
      return list.map((s) => `${s.name} — ${s.description}`).join("\n") + "\n\nCall read_skill(name) to load one.";
    }
    case "read_skill": {
      const s = skillByName(args.name);
      if (!s) return `No skill named ${args.name}. Available: ${SKILLS.map((x) => x.name).join(", ")}`;
      ctx.onSkillLoaded?.(s.name);
      return s.body;
    }

    /* ---- UI Component Library & Marketplace ---- */
    case "search_components": {
      const hits = searchComponents(args.query || "", { category: args.category, tag: args.tag });
      if (!hits.length) {
        return `No components found for query "${args.query || ""}". Available types: slider, button, checkbox, radio, dropdown, switch, input, stepper, rating, progress, chart, math, chemistry, switcher, metrics, question.`;
      }
      return hits
        .map(
          (h) =>
            `### ${h.name} (\`<component type="${h.type}" />\`)\n` +
            `Type: \`${h.type}\` | Category: ${h.category}\n` +
            `Tags: ${h.tags.join(", ")}\n` +
            `Description: ${h.description}\n` +
            `Example:\n\`\`\`html\n${h.snippet}\n\`\`\``
        )
        .join("\n\n---\n\n");
    }
    case "get_component_schema": {
      const def = getComponentDef(args.type);
      if (!def) {
        return `Component type "${args.type}" not found. Use search_components to explore available component types.`;
      }
      return (
        `# Component: ${def.name} (\`${def.type}\`)\n` +
        `Category: ${def.category}\n` +
        `Description: ${def.description}\n\n` +
        `## Properties Schema:\n\`\`\`json\n${JSON.stringify(def.schema, null, 2)}\n\`\`\`\n\n` +
        `## Quick Snippet:\n\`\`\`html\n${def.snippet}\n\`\`\`\n\n` +
        `## Full JSON Structure:\n\`\`\`json\n${def.jsonSnippet}\n\`\`\``
      );
    }

    /* ---- common aliases ---- */
    case "search": return await runTool("web_search", args, ctx);
    case "fetch": return await runTool("web_fetch", args, ctx);
    case "python": return await runTool("run_python", args, ctx);
    case "component":
    case "render_component":
    case "create_chart": {
      return `To render this component inline in chat, output <component>${JSON.stringify(args, null, 2)}</component> directly in your response.`;
    }

    /* ---- workspace ---- */
    case "list_files": {
      const c = chatOf(chatId);
      const files = Object.values(c.files);
      if (!files.length) return "workspace is empty";
      const refs = new Map(Object.values(c.artifacts ?? {}).map((a: any) => [a.ref, a.title]));
      return files
        .map((f) => {
          const eye = f.state === "context" ? "●" : f.state === "known" ? "○" : "·";
          const named = refs.get(f.path);
          return `${eye} ${f.path}  (${f.kind}, ${f.size}b, ${f.state})${named ? `  ⟶ artifact "${named}"` : ""}`;
        })
        .join("\n")
        + `\n\n${refs.size} artifact reference(s). ⟶ = already saved; open_canvas({target}) to show, no new artifact needed.`;
    }
    case "read_file": {
      const f = getFile(chatId, args.path);
      if (!f) return `not found: ${args.path}`;
      if (f.kind === "image") return `[image ${f.path} — already visible in the vision input]`;
      const lines = f.content.split("\n");
      const off = Math.max(1, args.offset || 1);
      const lim = Math.min(args.limit || 400, 2000);
      const slice = lines.slice(off - 1, off - 1 + lim);
      const more = lines.length > off - 1 + lim ? `\n… ${lines.length - (off - 1 + lim)} more lines (read_file offset=${off + lim})` : "";
      return numbered(slice.join("\n"), off) + more;
    }
    case "edit_file": {
      const path = String(args.path).replace(/^\/+/, "");
      const prev = chatOf(chatId).files[path];
      const content = args.mode === "append" && prev ? prev.content + "\n" + args.content : args.content;
      const f = writeFile(chatId, path, content);
      return `${prev ? "updated" : "created"} ${path} (${f.content.split("\n").length} lines, ${f.size}b)`;
    }
    case "apply_diff": {
      const f = getFile(chatId, args.path);
      if (!f) return `not found: ${args.path}`;
      const count = f.content.split(args.old_str).length - 1;
      if (count === 0) return `no match for old_str in ${f.path}. Read the file again before patching.`;
      if (count > 1 && !args.replace_all) return `old_str matched ${count} times in ${f.path}; add context to make it unique or set replace_all.`;
      const next = args.replace_all ? f.content.split(args.old_str).join(args.new_str) : f.content.replace(args.old_str, args.new_str);
      writeFile(chatId, f.path, next);
      return `patched ${f.path} (${count} ${count === 1 ? "site" : "sites"})`;
    }

    /* ---- context ---- */
    case "add_context": {
      const paths: string[] = args.paths || [];
      paths.forEach((p) => { const f = getFile(chatId, p); if (f) S().setFileState(chatId, f.path, "context"); });
      return `in context: ${paths.join(", ")}`;
    }
    case "remove_context": {
      const paths: string[] = args.paths || [];
      paths.forEach((p) => { const f = getFile(chatId, p); if (f) S().setFileState(chatId, f.path, "known"); });
      return `detached (still known): ${paths.join(", ")}`;
    }
    case "compact_context": {
      if (!ctx.summarize) return "compaction unavailable";
      const out = await ctx.summarize(args.focus || "");
      return out;
    }

    /* ---- web ---- */
    case "web_search": {
      const hits = await webSearch(args.query, {
        limit: Math.min(args.limit || 6, 10),
        site: args.site,
        niche: args.niche || args.category,
        key: settings.firecrawlKey,
        signal: ctx.signal,
      });
      S().addSources(chatId, hits.filter((h) => h.url));
      if (hits.length === 0) return `no results for "${args.query}"`;
      const first = hits[0];
      if (first.status === "error") return `search failed. provider detail: ${first.detail || first.snippet || "unknown"}`;
      return hits.map((h, i) => `[${i + 1}] ${h.title}\n${h.url}\n${(h.snippet || "").slice(0, 280)}`).join("\n\n");
    }
    case "web_fetch": {
      try {
        const r = await webFetch(args.url, { key: settings.firecrawlKey, signal: ctx.signal });
        if (!r.markdown.trim()) return `fetched ${args.url} but the body is empty`;
        S().addSources(chatId, [{ url: args.url, title: r.title, snippet: hostOf(args.url) }]);
        const body = r.markdown.slice(0, 18000);
        return `# ${r.title}\nURL: ${args.url}\n\n${body}${r.markdown.length > 18000 ? "\n… truncated" : ""}`;
      } catch (e: any) {
        return `fetch failed for ${args.url}: ${e.message}`;
      }
    }
    case "web_crawl": {
      try {
        const pages = await webCrawl(args.url, Math.min(args.limit || 4, 8), settings.firecrawlKey, ctx.signal);
        if (!pages || pages.length === 0) {
          return `crawl produced no readable pages for ${args.url}`;
        }
        S().addSources(chatId, pages.map((p) => ({ url: p.url, title: p.title })));
        return pages.map((p) => `## ${p.title}\nURL: ${p.url}\n\n${p.markdown.slice(0, 4500)}`).join("\n\n---\n\n");
      } catch (e: any) {
        return `crawl failed for ${args.url}: ${e.message}`;
      }
    }
    case "site_search": {
      const hits = await webSearch(args.query, {
        limit: Math.min(args.limit || 6, 10),
        site: args.site,
        key: settings.firecrawlKey,
        signal: ctx.signal,
      });
      if (!hits.length) return "no results";
      S().addSources(chatId, hits.filter((h) => h.url));
      return hits.map((h, i) => `[${i + 1}] ${h.title}\n${h.url}\n${(h.snippet || "").slice(0, 260)}`).join("\n\n");
    }

    /* ---- python ---- */
    case "run_python": {
      const py = await ensurePyodide();
      try { py.FS.mkdir("/work"); } catch {}
      for (const f of Object.values(chatOf(chatId).files)) {
        if (f.kind === "image") continue;
        const parts = f.path.split("/"); parts.pop();
        let dir = "/work";
        for (const p of parts) { dir += "/" + p; try { py.FS.mkdir(dir); } catch {} }
        try { py.FS.writeFile("/work/" + f.path, f.content); } catch {}
      }
      const wrapped = `
import sys, io, os
os.chdir('/work')
for _d in ('charts','data','notes','artifacts','out','src','docs','uploads'):
    try: os.makedirs('/work/'+_d, exist_ok=True)
    except Exception: pass
try:
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    plt.rcParams.update({
        'figure.facecolor': '#0c0c0e',
        'axes.facecolor': '#141417',
        'axes.edgecolor': '#26262c',
        'axes.linewidth': 0.8,
        'grid.color': '#1c1c21',
        'grid.linestyle': '--',
        'grid.alpha': 0.7,
        'text.color': '#ecebe8',
        'axes.labelcolor': '#9d9d9a',
        'xtick.color': '#66666a',
        'ytick.color': '#66666a',
        'figure.autolayout': True,
        'font.size': 9,
        'axes.prop_cycle': matplotlib.cycler(color=['#d7b28c', '#7fa6cc', '#7fb98a', '#d8b45c', '#d97e6f', '#c49c74'])
    })
except Exception: pass
_o = io.StringIO(); _e = sys.stdout; sys.stdout = _o
try:
${(args.code || "").split("\n").map((l: string) => "    " + l).join("\n")}
except Exception as _ex:
    import traceback; traceback.print_exc(file=_o)
finally:
    sys.stdout = _e
_o.getvalue()
`;
      const out = await py.runPythonAsync(wrapped);
      // sync any new/changed files back into the workspace
      const walk = (dir: string) => {
        for (const entry of py.FS.readdir(dir)) {
          if (entry === "." || entry === "..") continue;
          const full = dir + "/" + entry;
          const stat = py.FS.stat(full);
          if (py.FS.isDir(stat.mode)) walk(full);
          else if (stat.size < 2_000_000) {
            try {
              const rel = full.replace("/work/", "");
              if (/\.(png|jpe?g|gif|webp|bmp|ico)$/i.test(rel)) {
                const bytes: Uint8Array = py.FS.readFile(full);
                let bin = "";
                for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
                const dataUrl = `data:image/${rel.match(/\.(\w+)$/i)![1].toLowerCase()};base64,${btoa(bin)}`;
                const prev = chatOf(chatId).files[rel];
                if (prev?.dataUrl === dataUrl) continue;
                S().putFile(chatId, {
                  path: rel, content: `[image ${rel.split("/").pop()}]`, mime: "image/png", size: bytes.length,
                  kind: "image", dataUrl, state: "context", origin: "agent", createdAt: prev?.createdAt ?? Date.now(), updatedAt: Date.now(),
                });
                autoArtifact(chatId, rel, !prev);
              } else {
                const data = py.FS.readFile(full, { encoding: "utf8" });
                const prev = chatOf(chatId).files[rel];
                if (!prev || prev.content !== data) writeFile(chatId, rel, data);
              }
            } catch {}
          }
        }
      };
      try { walk("/work"); } catch {}
      const text = String(out ?? "").trim();
      return text ? text.slice(0, 6000) : "(no output)";
    }

    /* ---- artifact: a labelled reference to something that already exists ---- */
    case "artifact": {
      let ref = String(args.ref || args.path || args.url || "").trim();
      const title = String(args.title || "").trim();

      // convenience: no ref but content given → write real files, then reference them
      if (!ref && (args.blocks || args.html || args.content)) {
        const slug = (title || "untitled").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "untitled";
        let path: string, content: string;
        if (args.blocks) {
          path = `artifacts/${slug}.ui.json`;
          content = JSON.stringify({ title, ratio: args.ratio, blocks: args.blocks }, null, 2);
        } else if (args.html) {
          path = `artifacts/${slug}/index.html`;
          content = String(args.html);
        } else {
          path = `artifacts/${slug}.md`;
          content = String(args.content);
        }
        writeFile(chatId, path, content);
        ref = path;
      }
      if (!ref) return "artifact needs a ref — pass path (workspace file or folder) or url";

      // a folder reference resolves to its entry file
      const filesNow = () => chatOf(chatId).files;
      if (!/^https?:\/\//i.test(ref) && !filesNow()[ref]) {
        const dirRef = ref.replace(/\/+$/, "");
        const cands = Object.keys(filesNow()).filter((p) => p.startsWith(dirRef + "/"));
        if (cands.length) {
          const entry =
            cands.find((p) => /\/index\.html?$/i.test(p)) ||
            cands.find((p) => /\.ui\.json$/i.test(p)) ||
            cands.find((p) => /\/app\.(tsx|jsx|js)$/i.test(p)) ||
            cands.find((p) => /\.html?$/i.test(p)) ||
            cands.find((p) => /readme\.md$/i.test(p)) ||
            cands.sort((a, b) => a.length - b.length)[0];
          ref = entry;
        }
      }

      const isUrl = /^https?:\/\//i.test(ref);
      if (!isUrl && !filesNow()[ref]) return `nothing in the workspace at ${ref} — write it with edit_file first`;

      // reuse an existing reference to the same target instead of duplicating it
      const prior = Object.values(chatOf(chatId).artifacts ?? {}).find((x: Artifact) => x.ref === ref);
      const a: Artifact = {
        id: prior?.id ?? uid("af"),
        title: title || prior?.title || (isUrl ? hostOf(ref) : ref.split("/").slice(-2).join("/")),
        kind: isUrl ? "url" : "file",
        ref,
        note: args.note ?? prior?.note,
        createdAt: prior?.createdAt ?? Date.now(),
      };
      S().putArtifact(chatId, a);
      const node = chatOf(chatId).nodes[ctx.nodeId];
      if (node && !node.artifactIds?.includes(a.id)) {
        S().updateNode(chatId, ctx.nodeId, (n) => ({ artifactIds: [...(n.artifactIds || []), a.id] }));
      }
      if (args.open !== false) S().openCanvas({ kind: "artifact", id: a.id });
      return `artifact "${a.title}" → ${ref} (a reference; edit ${isUrl ? "the page" : "the file"} to change what it shows)`;
    }

    /* ---- open something in the canvas ---- */
    case "open_canvas": {
      const what = String(args.target || "");
      if (/^https?:\/\//i.test(what)) {
        S().openCanvas({ kind: "source", url: what, title: args.title });
        return `opened ${hostOf(what)} in the canvas`;
      }
      const af = Object.values(chatOf(chatId).artifacts ?? {}).find((a: Artifact) => a.id === what || a.title === what);
      if (af) { S().openCanvas({ kind: "artifact", id: af.id }); return `opened "${af.title}" → ${af.ref}`; }
      const f = getFile(chatId, what);
      if (f) { S().openCanvas({ kind: "file", path: f.path }); return `opened ${f.path} in the canvas`; }
      // a folder: resolve to its entry file so the whole project opens
      const dirRef = what.replace(/\/+$/, "");
      const cands = Object.keys(chatOf(chatId).files).filter((p) => p.startsWith(dirRef + "/"));
      if (cands.length) {
        const entry = cands.find((p) => /\/index\.html?$/i.test(p)) || cands.find((p) => /\.ui\.json$/i.test(p))
          || cands.find((p) => /\/app\.(tsx|jsx|js)$/i.test(p))
          || cands.find((p) => /\.html?$/i.test(p)) || cands.find((p) => /readme\.md$/i.test(p))
          || cands.sort((a, b) => a.length - b.length)[0];
        S().openCanvas({ kind: "file", path: entry });
        return `opened ${dirRef}/ (${cands.length} files) at ${entry}`;
      }
      return `nothing named ${what} in the workspace`;
    }
  }

  /* ---- MCP passthrough ---- */
  if (name.startsWith("mcp__")) {
    const [, serverId, ...rest] = name.split("__");
    const tool = rest.join("__");
    const srv = settings.mcp.find((m) => m.id === serverId || m.name === serverId);
    if (!srv) return `unknown mcp server ${serverId}`;
    const { mcpCall } = await import("./mcp");
    return await mcpCall(srv, tool, args);
  }

  return `unknown tool "${name}". You can execute web searches, workspace file operations, or output inline <component> tags directly in your message.`;
}
