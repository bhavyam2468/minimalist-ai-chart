/**
What the model is allowed to call.

The JSON-schema tool list sent with every request, plus the ToolCtx each call
is handed. Kept apart from the implementations so the shape of the agent's
capabilities can be read in one screen — and so the prompt can measure them
without importing the runtimes they trigger.
 */
export interface ToolCtx {
  chatId: string;
  nodeId: string;
  signal?: AbortSignal;
  summarize?: (focus: string) => Promise<string>;
  onSkillLoaded?: (name: string) => void;
}

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
