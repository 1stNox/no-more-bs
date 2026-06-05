import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { type ClearSummary, clear } from "../../src/lib/clear.ts";
import { getProjectTools, type Tool } from "../../src/lib/registry.ts";

function fakeTools(home: string): Tool[] {
  const copilotHome = process.env.COPILOT_HOME?.trim() || path.join(home, ".copilot");
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
    {
      id: "copilot",
      label: "GitHub Copilot",
      binary: "copilot",
      configDir: copilotHome,
      topLevelMd: "AGENTS.md",
      skillsDir: path.join(copilotHome, "skills"),
    },
  ];
}

describe("clear", () => {
  let home: string;
  let tools: Tool[];
  let originalCopilotHome: string | undefined;

  beforeEach(() => {
    originalCopilotHome = process.env.COPILOT_HOME;
    home = fs.mkdtempSync(path.join(os.tmpdir(), "clear-"));
    process.env.COPILOT_HOME = path.join(home, ".copilot");
    tools = fakeTools(home);

    // Create directories and files
    for (const t of tools) {
      fs.mkdirSync(t.configDir, { recursive: true });
      fs.mkdirSync(t.skillsDir, { recursive: true });
      fs.writeFileSync(path.join(t.configDir, t.topLevelMd), `content for ${t.id}`);
      fs.mkdirSync(path.join(t.skillsDir, "test-skill"), { recursive: true });
      fs.writeFileSync(path.join(t.skillsDir, "test-skill", "SKILL.md"), `skill content`);
    }
  });

  afterEach(() => {
    if (originalCopilotHome === undefined) delete process.env.COPILOT_HOME;
    else process.env.COPILOT_HOME = originalCopilotHome;
    fs.rmSync(home, { recursive: true, force: true });
  });

  it("removes top-level md and skills dir for all tools", async () => {
    const summary = await clear({ tools });

    expect(summary.failed).toBe(0);
    expect(summary.removed).toBe(tools.length * 2); // 2 units per tool

    for (const t of tools) {
      expect(fs.existsSync(path.join(t.configDir, t.topLevelMd))).toBe(false);
      expect(fs.existsSync(t.skillsDir)).toBe(false);
    }
  });

  it("reports not_found for missing files", async () => {
    // Remove one tool's files
    const t = tools[0]!;
    fs.rmSync(path.join(t.configDir, t.topLevelMd));
    fs.rmSync(t.skillsDir, { recursive: true, force: true });

    const summary = await clear({ tools });

    const notFound = summary.details.filter((d) => d.outcome === "not_found");
    expect(notFound.length).toBe(2); // 2 units for the removed tool
    expect(notFound.every((d) => d.toolId === t.id)).toBe(true);
  });

  it("handles partial failures gracefully", async () => {
    if (process.platform === "win32") return;
    if (process.getuid?.() === 0) return; // root ignores chmod restrictions

    // Make one skills dir read-only
    const t = tools[0]!;
    fs.chmodSync(t.skillsDir, 0o400);

    try {
      const summary = await clear({ tools });

      const failed = summary.details.filter(
        (d) => d.toolId === t.id && d.unitName === "skills dir" && d.outcome === "failed",
      );
      expect(failed.length).toBe(1);

      // Other tools should still be cleared
      const otherTools = tools.slice(1);
      for (const ot of otherTools) {
        expect(fs.existsSync(path.join(ot.configDir, ot.topLevelMd))).toBe(false);
        expect(fs.existsSync(ot.skillsDir)).toBe(false);
      }
    } finally {
      fs.chmodSync(t.skillsDir, 0o700);
    }
  });

  it("project scope: removes claude files from cwd", async () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "proj-"));
    try {
      const claude = getProjectTools(cwd).find((t) => t.id === "claude")!;
      fs.mkdirSync(claude.configDir, { recursive: true });
      fs.mkdirSync(claude.skillsDir, { recursive: true });
      fs.writeFileSync(path.join(claude.configDir, claude.topLevelMd), "content");
      fs.mkdirSync(path.join(claude.skillsDir, "test-skill"), { recursive: true });

      const summary = await clear({ tools: [claude] });

      expect(summary.failed).toBe(0);
      expect(summary.removed).toBe(2);
      expect(fs.existsSync(path.join(cwd, "CLAUDE.md"))).toBe(false);
      expect(fs.existsSync(path.join(cwd, ".claude", "skills"))).toBe(false);
    } finally {
      fs.rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("project scope: removes codex files from cwd", async () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "proj-"));
    try {
      const codex = getProjectTools(cwd).find((t) => t.id === "codex")!;
      fs.mkdirSync(codex.configDir, { recursive: true });
      fs.mkdirSync(codex.skillsDir, { recursive: true });
      fs.writeFileSync(path.join(codex.configDir, codex.topLevelMd), "content");
      fs.mkdirSync(path.join(codex.skillsDir, "test-skill"), { recursive: true });

      const summary = await clear({ tools: [codex] });

      expect(summary.failed).toBe(0);
      expect(summary.removed).toBe(2);
      expect(fs.existsSync(path.join(cwd, "AGENTS.md"))).toBe(false);
      expect(fs.existsSync(path.join(cwd, ".agents", "skills"))).toBe(false);
    } finally {
      fs.rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("project scope: removes copilot files from cwd", async () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "proj-"));
    try {
      const copilot = getProjectTools(cwd).find((t) => t.id === "copilot")!;
      fs.mkdirSync(copilot.configDir, { recursive: true });
      fs.mkdirSync(copilot.skillsDir, { recursive: true });
      fs.writeFileSync(path.join(copilot.configDir, copilot.topLevelMd), "content");
      fs.mkdirSync(path.join(copilot.skillsDir, "test-skill"), { recursive: true });

      const summary = await clear({ tools: [copilot] });

      expect(summary.failed).toBe(0);
      expect(summary.removed).toBe(2);
      expect(fs.existsSync(path.join(cwd, "AGENTS.md"))).toBe(false);
      expect(fs.existsSync(path.join(cwd, ".github", "skills"))).toBe(false);
    } finally {
      fs.rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("accumulates into provided summary", async () => {
    const existingSummary: ClearSummary = { removed: 5, failed: 2, details: [] };
    const result = await clear({ tools: [tools[0]!] }, existingSummary);

    expect(result.removed).toBe(7); // 5 + 2 (one tool)
    expect(result.failed).toBe(2);
    expect(result.details.length).toBe(2);
  });
});
