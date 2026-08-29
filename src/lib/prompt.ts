/**
The agent's system prompt.

The static voice/behaviour text lives in `src/prompts/system.md` so it can be
edited by hand; this module appends the live state on every request: pinned
skill bodies, the skill index, the workspace file index, and the full body of
every file currently loaded into context. `contextTokenCount` is the matching
rough estimate of what a request will cost, used to warn before it gets
expensive.
 */
import systemMd from "../prompts/system.md?raw";
import { mainPath, useApp } from "./store";
import { SKILLS, skillIndex } from "./skills";
import { baseToolDefs } from "./tool-defs";
import { mcpToolDefs } from "./mcp";
import type { Chat } from "./types";

const S = () => useApp.getState();

export function systemPrompt(c: Chat): string {
  const pinned = new Set(c.enabledSkills ?? []);
  const pinnedBodies = SKILLS.filter((s) => pinned.has(s.name)).map((s) => s.body).join("\n\n");
  const files = Object.values(c.files);
  const list = files.length
    ? files.map((f) => `- ${f.path} (${f.kind}, ${f.size}b) [${f.state}]`).join("\n")
    : "- (empty)";
  const inCtx = files.filter((f) => f.state === "context" && f.kind !== "image");
  const bodies = inCtx
    .map((f) => `<file path="${f.path}">\n${f.content.slice(0, 14000)}${f.content.length > 14000 ? "\n… truncated, use read_file for more" : ""}\n</file>`)
    .join("\n\n");

  return `${systemMd.trim()}

${pinnedBodies ? `## Pinned skill bodies\n${pinnedBodies}\n\n` : ""}## Skill library (call read_skill to load a body)
${skillIndex()}

## Workspace
${list}

${bodies ? `## Files currently in context\n${bodies}` : ""}`;
}

export function contextTokenCount(c: Chat): number {
  try {
    const sys = systemPrompt(c);
    const mcpServers = S()?.settings?.mcp || [];
    const tools = JSON.stringify([...baseToolDefs(), ...mcpToolDefs(mcpServers)]);
    const msgsLen = mainPath(c)
      .filter((n) => !n.hidden)
      .reduce((a, n) => a + n.content.length + (n.toolCalls || []).reduce((x, t) => x + (t.output?.length || 0), 0), 0);
    const filesLen = Object.values(c.files)
      .filter((f) => f.state === "context")
      .reduce((a, f) => a + f.content.length, 0);
    return Math.max(1, Math.round((sys.length + tools.length + msgsLen + filesLen) / 4));
  } catch {
    return 1200;
  }
}
