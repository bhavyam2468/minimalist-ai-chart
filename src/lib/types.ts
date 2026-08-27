export type Role = "user" | "assistant";

export type FileState = "local" | "known" | "context";

export interface WFile {
  path: string;
  content: string;          // text content (markdown-ised for binaries)
  mime: string;
  size: number;
  kind: "text" | "image" | "pdf" | "sheet" | "doc" | "code" | "data";
  dataUrl?: string;         // images -> sent to vision input
  state: FileState;
  origin: "upload" | "agent";
  skill?: string;           // skill auto-activated by this file
  createdAt: number;
  updatedAt?: number;
}

export interface ToolCallRecord {
  id: string;
  name: string;
  args: any;
  argsRaw: string;
  status: "running" | "done" | "error";
  output?: string;
  ms?: number;
}

export interface Source {
  url: string;
  title: string;
  snippet?: string;
}

export interface CanvasBlock {
  type: string;
  [k: string]: any;
}

/**
 * An artefact is *only a reference*. It owns no content.
 * It points at a workspace file (or folder entry) or an external url, and
 * gives it a label so it can be reopened from the artefacts section.
 */
export interface Artifact {
  id: string;
  title: string;
  kind: "file" | "url";
  ref: string;                 // workspace path, or absolute url
  note?: string;
  createdAt: number;
}

/** How the canvas should present a workspace path. Derived, never stored. */
export type CanvasView = "project" | "ui" | "image" | "sheet" | "markdown" | "code" | "text" | "pdf";

/**
 * The canvas is a universal floating viewport. Anything that is not chat
 * opens inside it: artefacts, workspace files, web sources, raw embeds.
 */
export type CanvasTarget =
  | { kind: "artifact"; id: string }
  | { kind: "file"; path: string }
  | { kind: "source"; url: string; title?: string }
  | { kind: "embed"; url: string; title?: string };

/** legacy shape kept only so old sessions can be migrated */
export interface LegacyArtifact {
  id: string; title: string; ratio: string; mode: string;
  blocks?: CanvasBlock[]; html?: string; url?: string; content?: string; language?: string; createdAt: number;
}

export interface Node {
  id: string;
  parentId: string | null;
  role: Role;
  content: string;
  createdAt: number;
  children: string[];
  threadId?: string | null;
  attachments?: string[];
  quote?: string;
  toolCalls?: ToolCallRecord[];
  sources?: Source[];
  artifactIds?: string[];
  model?: string;
  hidden?: boolean;
  summary?: string;
  error?: string;
}

export interface Thread {
  id: string;
  anchorId: string;
  title: string;
  quote?: string;
  rootIds: string[];
  activeChild: Record<string, string>;
  collapsed: boolean;
  createdAt: number;
}

export interface Chat {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  nodes: Record<string, Node>;
  rootIds: string[];
  activeChild: Record<string, string>;
  threads: Record<string, Thread>;
  files: Record<string, WFile>;
  artifacts: Record<string, Artifact>;
  sources: Source[];
  enabledSkills: string[];
}

export interface McpServer {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  tools?: { name: string; description?: string; inputSchema?: any }[];
  error?: string;
}

export interface Settings {
  apiKey: string;
  model: string;
  baseUrl: string;
  theme: "dark" | "light";
  firecrawlKey: string;
  temperature: number;
  autoCompactAt: number;
  mcp: McpServer[];
}
