import os from "node:os";
import path from "node:path";

export type ToolId = "claude" | "codex" | "opencode";

export interface Tool {
  id: ToolId;
  label: string;
  binary: string;
  configDir: string;
  topLevelMd: "CLAUDE.md" | "AGENTS.md";
  skillsDir: string;
}

export function getTools(): Tool[] {
  const home = os.homedir();
  return [
    {
      id: "claude",
      label: "Claude Code",
      binary: "claude",
      configDir: path.join(home, ".claude"),
      topLevelMd: "CLAUDE.md",
      skillsDir: path.join(home, ".claude", "skills"),
    },
    {
      id: "codex",
      label: "Codex",
      binary: "codex",
      configDir: path.join(home, ".agents"),
      topLevelMd: "AGENTS.md",
      skillsDir: path.join(home, ".agents", "skills"),
    },
    {
      id: "opencode",
      label: "OpenCode",
      binary: "opencode",
      configDir: path.join(home, ".config", "opencode"),
      topLevelMd: "AGENTS.md",
      skillsDir: path.join(home, ".config", "opencode", "skills"),
    },
  ];
}

export function mapTopLevelMd(id: ToolId): "CLAUDE.md" | "AGENTS.md" {
  const t = getTools().find((t) => t.id === id);
  if (!t) throw new Error(`unknown tool: ${id}`);
  return t.topLevelMd;
}
