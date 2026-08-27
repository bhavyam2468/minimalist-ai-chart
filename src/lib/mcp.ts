/* ===========================================================================
   mcp.ts — minimal Model Context Protocol client (Streamable HTTP, stateless
   2026-07-28 style with a 2025 fallback). Tools discovered from a server are
   exposed to the model as `mcp__<serverId>__<tool>`.
   ========================================================================= */
import type { McpServer } from "./types";

const PROTO = "2026-07-28";
let rpcId = 1;

async function rpc(srv: McpServer, method: string, params: any = {}) {
  const body = {
    jsonrpc: "2.0",
    id: rpcId++,
    method,
    params: {
      ...params,
      _meta: {
        "io.modelcontextprotocol/protocolVersion": PROTO,
        "io.modelcontextprotocol/clientInfo": { name: "atelier", version: "1.0" },
        "io.modelcontextprotocol/clientCapabilities": {},
      },
    },
  };
  const res = await fetch(srv.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "MCP-Protocol-Version": PROTO,
      "Mcp-Method": method,
      ...(params?.name ? { "Mcp-Name": params.name } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("text/event-stream")) {
    const text = await res.text();
    const last = text.split("\n").filter((l) => l.startsWith("data:")).pop();
    if (!last) throw new Error("empty sse response");
    const j = JSON.parse(last.slice(5).trim());
    if (j.error) throw new Error(j.error.message);
    return j.result;
  }
  const j = await res.json();
  if (j.error) throw new Error(j.error.message);
  return j.result;
}

export async function mcpList(srv: McpServer) {
  const r = await rpc(srv, "tools/list", {});
  return (r?.tools ?? []).map((t: any) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema }));
}

export async function mcpCall(srv: McpServer, tool: string, args: any): Promise<string> {
  try {
    const r = await rpc(srv, "tools/call", { name: tool, arguments: args });
    const parts = (r?.content ?? []).map((c: any) => (c.type === "text" ? c.text : `[${c.type}]`));
    return parts.join("\n").slice(0, 12000) || JSON.stringify(r).slice(0, 4000);
  } catch (e: any) {
    return `mcp error: ${e.message}`;
  }
}

export function mcpToolDefs(servers: McpServer[]) {
  const out: { name: string; description: string; parameters: any }[] = [];
  for (const s of servers) {
    if (!s.enabled || !s.tools) continue;
    for (const t of s.tools) {
      out.push({
        name: `mcp__${s.id}__${t.name}`,
        description: `[${s.name}] ${t.description || t.name}`,
        parameters: t.inputSchema && t.inputSchema.type === "object" ? t.inputSchema : { type: "object", properties: {} },
      });
    }
  }
  return out;
}
