import { create } from "zustand";
import type { Artifact, CanvasTarget, Chat, Node, Provider, Settings, Source, Thread, WFile } from "./types";

export const uid = (p = "n") => p + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
const ROOT = "__root__";

/**
 * Optional build-time default. Set VITE_OPENAI_KEY in your environment
 * (.env.local locally, or Vercel → Settings → Environment Variables) to
 * pre-fill Settings → API Key. Users can always override it in the app.
 */
const DEFAULT_KEY: string =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_OPENAI_KEY) || "";

const defaultSettings = (): Settings => ({
  provider: "openai",
  providers: {
    openai: { apiKey: DEFAULT_KEY, model: "gpt-5.4" },
    gemini: { apiKey: "", model: "gemma-4-31b-it" },
    custom: { apiKey: "", model: "", baseUrl: "" },
  },
  theme: "dark",
  firecrawlKey: "",
  temperature: 0.7,
  autoCompactAt: 60000,
  mcp: [],
});

/* ------------------------------------------------------- BYOK providers */

export const PROVIDERS: Record<
  Provider,
  { label: string; baseUrl: string; defaultModel: string; fallbacks: string[]; keyHint: string }
> = {
  openai: {
    label: "openai",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-5.4",
    fallbacks: ["gpt-4.1", "gpt-4o"],
    keyHint: "sk-…",
  },
  gemini: {
    label: "gemini",
    /* Google's OpenAI-compatible endpoint, so the same client speaks both.
       Gemma 4 sits on the free tier even when flash quotas run out. */
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    defaultModel: "gemma-4-31b-it",
    fallbacks: ["gemma-4-26b-a4b-it", "gemini-flash-latest"],
    keyHint: "AIza…",
  },
  custom: {
    label: "custom",
    baseUrl: "",
    defaultModel: "",
    fallbacks: [],
    keyHint: "optional for local servers",
  },
};

/* Gemini retires model names and quotas expire; saved settings pointing at
   a dead or quota-bound name would 404/429 forever. Swap them for the live
   free-tier default at load time. */
const DEAD_GEMINI = new Set([
  "gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash", "gemini-2.0-pro",
  "gemini-1.5-flash", "gemini-1.5-pro", "gemini-flash-latest", "gemini-3.6-flash",
]);

/** Resolve the active connection for the chosen provider. */
export function connOf(s: Settings): {
  apiKey: string;
  baseUrl: string;
  model: string;
  fallbacks: string[];
  requireKey: boolean;
} {
  const meta = PROVIDERS[s.provider] ?? PROVIDERS.openai;
  const p = s.providers?.[s.provider] ?? { apiKey: "", model: "" };
  return {
    apiKey: p.apiKey ?? "",
    baseUrl: (s.provider === "custom" ? (p.baseUrl ?? "") : meta.baseUrl).replace(/\/+$/, ""),
    model: p.model || meta.defaultModel,
    fallbacks: meta.fallbacks,
    requireKey: s.provider !== "custom",
  };
}

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
  deleteThread: (chatId: string, id: string) => void;

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
    /* Old flat settings (pre-BYOK) are intentionally not migrated. */
    const settings: Settings = d.settings?.providers ? { ...defaultSettings(), ...d.settings } : defaultSettings();
    if (DEAD_GEMINI.has(settings.providers.gemini.model))
      settings.providers.gemini = { ...settings.providers.gemini, model: PROVIDERS.gemini.defaultModel };
    return { chats: d.chats, order: d.order, activeId: d.activeId, settings };
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
  ui: { sidebar: false, panel: false, canvas: null, canvasRect: null, canvasMax: false, composerQuote: null, modal: null, activeThreadId: null },
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
    /* One empty thread at a time: while a thread still has no messages,
       asking for another one re-anchors the existing empty thread instead
       of stacking up blanks. */
    const empty = Object.values(get().chats[chatId]?.threads ?? {}).find((t) => t.rootIds.length === 0);
    if (empty) {
      get().patchChat(chatId, (c) => {
        const cur = c.threads[empty.id];
        c.threads = {
          ...c.threads,
          [empty.id]: {
            ...cur,
            anchorId,
            quote: quote ?? cur.quote,
            title: quote ? quote.slice(0, 48) : cur.title,
            collapsed: false,
          },
        };
      });
      return empty.id;
    }
    const id = uid("t");
    get().patchChat(chatId, (c) => {
      const th: Thread = { id, anchorId, title: quote ? quote.slice(0, 48) : "Deep dive", quote, rootIds: [], activeChild: {}, collapsed: false, createdAt: Date.now() };
      c.threads = { ...c.threads, [id]: th };
    });
    return id;
  },
  patchThread: (chatId, id, patch) =>
    get().patchChat(chatId, (c) => { c.threads = { ...c.threads, [id]: { ...c.threads[id], ...patch } }; }),
  deleteThread: (chatId, id) => {
    get().patchChat(chatId, (c) => {
      const th = c.threads[id];
      if (!th) return;
      const walk = (nid: string) => {
        const n = c.nodes[nid];
        if (!n) return;
        n.children.forEach(walk);
        delete c.nodes[nid];
      };
      th.rootIds.forEach(walk);
      const threads = { ...c.threads };
      delete threads[id];
      c.threads = threads;
    });
    const { activeThreadId, composerQuote } = get().ui;
    if (activeThreadId === id || composerQuote?.threadId === id)
      set((s) => ({
        ...s,
        ui: {
          ...s.ui,
          activeThreadId: activeThreadId === id ? null : s.ui.activeThreadId,
          composerQuote: composerQuote?.threadId === id ? null : s.ui.composerQuote,
        },
      }));
  },

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
