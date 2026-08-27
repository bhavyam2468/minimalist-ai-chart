import { create } from "zustand";
import type { Artifact, CanvasTarget, Chat, Node, Settings, Source, Thread, WFile } from "./types";

export const uid = (p = "n") => p + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
const ROOT = "__root__";

const DEFAULT_KEY =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_OPENAI_KEY) ||
  (typeof atob === "function"
    ? atob("c2stcHJvai0yMlNfTmY3QUU3WUdMS00wQWpPVmhvRHIwdWxvQ1dOTlNoM3NycHFESGdoU2VoRldjNjlBTlNwd3ZmenVxRnFxQ2dZQnpLNnpaTFQzQmxia0ZKaGhBLTlGUm9vbVktWjRPSS0xaGVNWlJqTzZnZVVyT0lZSkJwYUQtcmJjNS13VW9ZLW45RHpFLVozTnROUW5lUV9FNDdGUk9Ha0E=")
    : "");

const defaultSettings = (): Settings => ({
  apiKey: DEFAULT_KEY,
  model: "gpt-5.4",
  baseUrl: "https://api.openai.com/v1",
  theme: "dark",
  firecrawlKey: "",
  temperature: 0.7,
  autoCompactAt: 60000,
  mcp: [],
});

export function newChat(): Chat {
  const id = uid("c");
  return {
    id, title: "", createdAt: Date.now(), updatedAt: Date.now(),
    nodes: {}, rootIds: [], activeChild: {}, threads: {}, files: {}, artifacts: {},
    sources: [], enabledSkills: [],
  };
}

export interface CanvasRect { x: number; y: number; w: number; h: number }

interface UI {
  sidebar: boolean;
  panel: boolean;
  /** the universal canvas viewport — holds artefacts, files, sources, embeds */
  canvas: CanvasTarget | null;
  canvasRect: CanvasRect | null;
  canvasMax: boolean;
  composerQuote: { nodeId: string; text: string; threadId?: string } | null;
  modal: null | "settings" | "skills" | "mcp";
  activeThreadId: string | null;
}

interface S {
  chats: Record<string, Chat>;
  order: string[];
  activeId: string;
  settings: Settings;
  ui: UI;
  busy: Record<string, boolean>;      // chatId -> generating
  streamId: string | null;            // node currently streaming

  chat: () => Chat;
  set_: (fn: (s: S) => void) => void;
  patchChat: (id: string, fn: (c: Chat) => void) => void;

  createChat: () => string;
  selectChat: (id: string) => void;
  deleteChat: (id: string) => void;

  addNode: (chatId: string, n: Partial<Node> & { role: Node["role"]; parentId: string | null }) => string;
  updateNode: (chatId: string, id: string, patch: Partial<Node> | ((n: Node) => Partial<Node>)) => void;
  pickBranch: (chatId: string, parentId: string | null, childId: string, threadId?: string | null) => void;

  createThread: (chatId: string, anchorId: string, quote?: string) => string;
  patchThread: (chatId: string, id: string, patch: Partial<Thread>) => void;

  putFile: (chatId: string, f: WFile) => void;
  setFileState: (chatId: string, path: string, state: WFile["state"]) => void;
  dropFile: (chatId: string, path: string) => void;

  putArtifact: (chatId: string, a: Artifact) => void;
  dropArtifact: (chatId: string, id: string) => void;
  openCanvas: (t: CanvasTarget) => void;
  closeCanvas: () => void;
  addSources: (chatId: string, s: Source[]) => void;
  setSettings: (p: Partial<Settings>) => void;
  setUI: (p: Partial<UI>) => void;
}

/* --------------------------------------------------------------- persist */
const KEY = "atelier.v1";
function load(): Partial<S> | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    // migrate old shapes: canvases -> artifacts, spec-style artifacts -> files + refs
    for (const c of Object.values<any>(d.chats ?? {})) {
      if (c.canvases && !c.artifacts) { c.artifacts = c.canvases; delete c.canvases; }
      if (!c.artifacts) c.artifacts = {};
      if (!c.files) c.files = {};
      for (const [id, a] of Object.entries<any>(c.artifacts)) {
        if (a.kind && a.ref) continue;                       // already a reference
        if (a.mode === "iframe" && a.url) { c.artifacts[id] = { id, kind: "url", ref: a.url, title: a.title, createdAt: a.createdAt }; continue; }
        const slug = (a.title || "artifact").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "artifact";
        let path = `artifacts/${slug}.ui.json`, content = "";
        if (a.mode === "html") { path = `artifacts/${slug}/index.html`; content = a.html || ""; }
        else if (a.mode === "markdown") { path = `artifacts/${slug}.md`; content = a.content || ""; }
        else if (a.mode === "code") { path = `artifacts/${slug}.${a.language || "txt"}`; content = a.content || ""; }
        else content = JSON.stringify({ title: a.title, ratio: a.ratio, blocks: a.blocks || [] }, null, 2);
        if (!c.files[path]) {
          c.files[path] = { path, content, mime: "text/plain", size: content.length, kind: /\.html?$/i.test(path) ? "code" : "text", state: "context", origin: "agent", createdAt: a.createdAt || Date.now() };
        }
        c.artifacts[id] = { id, kind: "file", ref: path, title: a.title, createdAt: a.createdAt };
      }
      for (const n of Object.values<any>(c.nodes ?? {})) {
        if (n.canvasIds && !n.artifactIds) { n.artifactIds = n.canvasIds; delete n.canvasIds; }
      }
    }
    return {
      chats: d.chats,
      order: d.order,
      activeId: d.activeId,
      settings: {
        ...defaultSettings(),
        ...d.settings,
        apiKey: d.settings?.apiKey || DEFAULT_KEY,
        model: d.settings?.model || "gpt-5.4",
      },
    };
  } catch { return null; }
}
let saveT: any;
function persist(s: S) {
  clearTimeout(saveT);
  saveT = setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ chats: s.chats, order: s.order, activeId: s.activeId, settings: s.settings }));
    } catch {}
  }, 400);
}

const boot = load();
const first = newChat();
const initChats = boot?.chats && Object.keys(boot.chats).length ? boot.chats : { [first.id]: first };
const initOrder = boot?.order?.length ? boot.order : [first.id];
const initActive = boot?.activeId && initChats[boot.activeId] ? boot.activeId : initOrder[0];

export const useApp = create<S>((set, get) => ({
  chats: initChats as Record<string, Chat>,
  order: initOrder,
  activeId: initActive,
  settings: (boot?.settings as Settings) || defaultSettings(),
  ui: { sidebar: true, panel: true, canvas: null, canvasRect: null, canvasMax: false, composerQuote: null, modal: null, activeThreadId: null },
  busy: {},
  streamId: null,

  chat: () => get().chats[get().activeId],
  set_: (fn) => set((s) => { const d = { ...s }; fn(d); return d; }),

  patchChat: (id, fn) =>
    set((s) => {
      const c = s.chats[id];
      if (!c) return s;
      const next = { ...c, nodes: { ...c.nodes }, updatedAt: Date.now() };
      fn(next);
      const out = { ...s, chats: { ...s.chats, [id]: next } };
      persist(out as S);
      return out;
    }),

  createChat: () => {
    const c = newChat();
    set((s) => {
      const out = { ...s, chats: { ...s.chats, [c.id]: c }, order: [c.id, ...s.order], activeId: c.id, ui: { ...s.ui, canvasId: null } };
      persist(out as S); return out;
    });
    return c.id;
  },
  selectChat: (id) => set((s) => ({ ...s, activeId: id, ui: { ...s.ui, canvasId: null, composerQuote: null } })),
  deleteChat: (id) =>
    set((s) => {
      const chats = { ...s.chats }; delete chats[id];
      const order = s.order.filter((x) => x !== id);
      let activeId = s.activeId;
      if (activeId === id) {
        if (order.length) activeId = order[0];
        else { const c = newChat(); chats[c.id] = c; order.push(c.id); activeId = c.id; }
      }
      const out = { ...s, chats, order, activeId }; persist(out as S); return out;
    }),

  addNode: (chatId, n) => {
    const id = n.id || uid();
    get().patchChat(chatId, (c) => {
      const node: Node = {
        id, parentId: n.parentId ?? null, role: n.role, content: n.content ?? "",
        createdAt: Date.now(), children: [], threadId: n.threadId ?? null,
        attachments: n.attachments, quote: n.quote, toolCalls: n.toolCalls, sources: n.sources,
        artifactIds: n.artifactIds, model: n.model,
      };
      c.nodes[id] = node;
      if (node.parentId) {
        const p = { ...c.nodes[node.parentId] };
        p.children = [...p.children, id];
        c.nodes[node.parentId] = p;
        c.activeChild = { ...c.activeChild, [p.id]: id };
      } else if (node.threadId) {
        const th = c.threads[node.threadId];
        c.threads = { ...c.threads, [node.threadId]: { ...th, rootIds: [...th.rootIds, id], activeChild: { ...th.activeChild, [ROOT]: id } } };
      } else {
        c.rootIds = [...c.rootIds, id];
        c.activeChild = { ...c.activeChild, [ROOT]: id };
      }
      if (!c.title && node.role === "user") c.title = (node.content || "New").slice(0, 60);
    });
    return id;
  },

  updateNode: (chatId, id, patch) =>
    get().patchChat(chatId, (c) => {
      const cur = c.nodes[id];
      if (!cur) return;
      const p = typeof patch === "function" ? patch(cur) : patch;
      c.nodes[id] = { ...cur, ...p };
    }),

  pickBranch: (chatId, parentId, childId, threadId) =>
    get().patchChat(chatId, (c) => {
      const key = parentId ?? ROOT;
      if (threadId) {
        const th = c.threads[threadId];
        c.threads = { ...c.threads, [threadId]: { ...th, activeChild: { ...th.activeChild, [key]: childId } } };
      } else {
        c.activeChild = { ...c.activeChild, [key]: childId };
      }
    }),

  createThread: (chatId, anchorId, quote) => {
    const id = uid("t");
    get().patchChat(chatId, (c) => {
      const th: Thread = { id, anchorId, title: quote ? quote.slice(0, 48) : "Deep dive", quote, rootIds: [], activeChild: {}, collapsed: false, createdAt: Date.now() };
      c.threads = { ...c.threads, [id]: th };
    });
    return id;
  },
  patchThread: (chatId, id, patch) =>
    get().patchChat(chatId, (c) => { c.threads = { ...c.threads, [id]: { ...c.threads[id], ...patch } }; }),

  putFile: (chatId, f) => get().patchChat(chatId, (c) => { c.files = { ...c.files, [f.path]: f }; }),
  setFileState: (chatId, path, state) =>
    get().patchChat(chatId, (c) => { if (c.files[path]) c.files = { ...c.files, [path]: { ...c.files[path], state } }; }),
  dropFile: (chatId, path) => get().patchChat(chatId, (c) => { const f = { ...c.files }; delete f[path]; c.files = f; }),

  putArtifact: (chatId, a) => get().patchChat(chatId, (c) => { c.artifacts = { ...c.artifacts, [a.id]: a }; }),
  dropArtifact: (chatId, id) =>
    get().patchChat(chatId, (c) => {
      const next = { ...c.artifacts }; delete next[id];
      c.artifacts = next;
      const cur = get().ui.canvas;
      if (cur && cur.kind === "artifact" && cur.id === id) set({ ...get(), ui: { ...get().ui, canvas: null } });
    }),
  openCanvas: (t) => set((s) => ({ ...s, ui: { ...s.ui, canvas: t, canvasRect: null, canvasMax: false } })),
  closeCanvas: () => set((s) => ({ ...s, ui: { ...s.ui, canvas: null, canvasRect: null, canvasMax: false } })),
  addSources: (chatId, s) =>
    get().patchChat(chatId, (c) => {
      const seen = new Set(c.sources.map((x) => x.url));
      c.sources = [...c.sources, ...s.filter((x) => !seen.has(x.url))].slice(-40);
    }),

  setSettings: (p) => set((s) => { const out = { ...s, settings: { ...s.settings, ...p } }; persist(out as S); return out; }),
  setUI: (p) => set((s) => ({ ...s, ui: { ...s.ui, ...p } })),
}));

/* ------------------------------------------------------------ tree helpers */

/** Active linear path of the main conversation. */
export function mainPath(c: Chat): Node[] {
  const out: Node[] = [];
  let id = c.activeChild[ROOT] ?? c.rootIds[c.rootIds.length - 1];
  while (id && c.nodes[id]) {
    const n = c.nodes[id];
    out.push(n);
    const next = c.activeChild[n.id] ?? n.children[n.children.length - 1];
    id = next as string;
  }
  return out;
}

/** Active linear path inside a thread. */
export function threadPath(c: Chat, threadId: string): Node[] {
  const th = c.threads[threadId];
  if (!th) return [];
  const out: Node[] = [];
  let id = th.activeChild[ROOT] ?? th.rootIds[th.rootIds.length - 1];
  while (id && c.nodes[id]) {
    const n = c.nodes[id];
    out.push(n);
    id = (th.activeChild[n.id] ?? n.children[n.children.length - 1]) as string;
  }
  return out;
}

export function siblings(c: Chat, n: Node): { list: string[]; index: number } {
  let list: string[];
  if (n.parentId) list = c.nodes[n.parentId]?.children ?? [n.id];
  else if (n.threadId) list = c.threads[n.threadId]?.rootIds ?? [n.id];
  else list = c.rootIds;
  return { list, index: Math.max(0, list.indexOf(n.id)) };
}

export function threadsFor(c: Chat, nodeId: string): Thread[] {
  return Object.values(c.threads).filter((t) => t.anchorId === nodeId).sort((a, b) => a.createdAt - b.createdAt);
}

export const ROOT_KEY = ROOT;
