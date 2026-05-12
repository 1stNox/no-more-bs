import os from "node:os";
import path from "node:path";

export type ToolId = "claude" | "codex" | "opencode" | "pi";
export type Scope = "user" | "project";

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
    {
      id: "pi",
      label: "Pi",
      binary: "pi",
      configDir: path.join(home, ".pi", "agent"),
      topLevelMd: "AGENTS.md",
      skillsDir: path.join(home, ".pi", "agent", "skills"),
    },
  ];
}

export function mapTopLevelMd(id: ToolId): "CLAUDE.md" | "AGENTS.md" {
  const t = getTools().find((t) => t.id === id);
  if (!t) throw new Error(`unknown tool: ${id}`);
  return t.topLevelMd;
}

export function getProjectTools(cwd: string): Tool[] {
  const agentsSkills = path.join(cwd, ".agents", "skills");
  return [
    {
      id: "claude",
      label: "Claude Code",
      binary: "claude",
      configDir: cwd,
      topLevelMd: "CLAUDE.md",
      skillsDir: path.join(cwd, ".claude", "skills"),
    },
    {
      id: "codex",
      label: "Codex (shares AGENTS format with OpenCode)",
      binary: "codex",
      configDir: cwd,
      topLevelMd: "AGENTS.md",
      skillsDir: agentsSkills,
    },
    {
      id: "opencode",
      label: "OpenCode (shares AGENTS format with Codex)",
      binary: "opencode",
      configDir: cwd,
      topLevelMd: "AGENTS.md",
      skillsDir: agentsSkills,
    },
    {
      id: "pi",
      label: "Pi",
      binary: "pi",
      configDir: cwd,
      topLevelMd: "AGENTS.md",
      skillsDir: path.join(cwd, ".pi", "skills"),
    },
  ];
}
