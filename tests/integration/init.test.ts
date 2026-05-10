import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { type CopySummary, copy } from "../../src/lib/copy.ts";
import { pickSkills } from "../../src/lib/prompts.ts";
import { getProjectTools, type Tool } from "../../src/lib/registry.ts";
import { enumerate } from "../../src/lib/templates.ts";

const REPO_TEMPLATES = path.join(import.meta.dir, "../../templates");

function fakeTools(home: string): Tool[] {
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

const overwrite = async () => "overwrite" as const;
const skip = async () => "skip" as const;
const backup = async () => "backup" as const;
const failPrompt = async () => {
  throw new Error("prompt should not have been called");
};

describe("init integration", () => {
  let home: string;
  let tools: Tool[];

  beforeEach(() => {
    home = fs.mkdtempSync(path.join(os.tmpdir(), "init-"));
    tools = fakeTools(home);
  });

  afterEach(() => fs.rmSync(home, { recursive: true, force: true }));

  it("fresh install writes correct tree to all three tool dirs", async () => {
    const tpl = enumerate(REPO_TEMPLATES);
    const summary = await copy({
      tools,
      generalMd: tpl.generalMd,
      skills: tpl.skills,
      prompt: overwrite,
    });

    expect(summary.failed).toBe(0);
    const expectedUnits = (1 + tpl.skills.length) * tools.length;
    expect(summary.installed).toBe(expectedUnits);

    expect(fs.existsSync(path.join(home, ".claude", "CLAUDE.md"))).toBe(true);
    expect(fs.existsSync(path.join(home, ".agents", "AGENTS.md"))).toBe(true);
    expect(fs.existsSync(path.join(home, ".config", "opencode", "AGENTS.md"))).toBe(true);

    const generalSrc = fs.readFileSync(tpl.generalMd, "utf-8");
    expect(fs.readFileSync(path.join(home, ".agents", "AGENTS.md"), "utf-8")).toBe(generalSrc);

    expect(fs.existsSync(path.join(home, ".claude", "skills", "caveman", "SKILL.md"))).toBe(true);
    expect(fs.existsSync(path.join(home, ".agents", "skills", "tdd", "SKILL.md"))).toBe(true);
  });

  it("idempotent re-run produces zero prompts", async () => {
    const tpl = enumerate(REPO_TEMPLATES);
    await copy({ tools, generalMd: tpl.generalMd, skills: tpl.skills, prompt: overwrite });

    const summary: CopySummary = { installed: 0, skipped: 0, failed: 0, details: [] };
    await copy(
      { tools, generalMd: tpl.generalMd, skills: tpl.skills, prompt: failPrompt },
      summary,
    );

    expect(summary.installed).toBe(0);
    expect(summary.failed).toBe(0);
    expect(summary.skipped).toBe(summary.details.length);
  });

  it("conflict skip leaves user-modified file alone", async () => {
    const tpl = enumerate(REPO_TEMPLATES);
    await copy({ tools: [tools[0]!], generalMd: tpl.generalMd, skills: [], prompt: overwrite });
    const target = path.join(home, ".claude", "CLAUDE.md");
    fs.writeFileSync(target, "user edit\n");

    await copy({
      tools: [tools[0]!],
      generalMd: tpl.generalMd,
      skills: [],
      prompt: skip,
      out: { write: () => true } as any,
    });
    expect(fs.readFileSync(target, "utf-8")).toBe("user edit\n");
  });

  it("conflict backup preserves user copy and writes source", async () => {
    const tpl = enumerate(REPO_TEMPLATES);
    await copy({ tools: [tools[0]!], generalMd: tpl.generalMd, skills: [], prompt: overwrite });
    const target = path.join(home, ".claude", "CLAUDE.md");
    fs.writeFileSync(target, "user edit\n");

    await copy({
      tools: [tools[0]!],
      generalMd: tpl.generalMd,
      skills: [],
      prompt: backup,
      out: { write: () => true } as any,
    });
    expect(fs.readFileSync(`${target}.bak`, "utf-8")).toBe("user edit\n");
    expect(fs.readFileSync(target, "utf-8")).toBe(fs.readFileSync(tpl.generalMd, "utf-8"));
  });

  it("required skills are always included via pickSkills", async () => {
    const tpl = enumerate(REPO_TEMPLATES);
    const stub = (async () => []) as any;
    const result = await pickSkills(tpl.skills, { checkbox: stub });
    expect(result.find((s) => s.id === "caveman")).toBeDefined();
  });

  it("project scope (claude): writes CLAUDE.md and .claude/skills under cwd", async () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "proj-"));
    try {
      const tpl = enumerate(REPO_TEMPLATES);
      const claude = getProjectTools(cwd).find((t) => t.id === "claude")!;
      const summary = await copy({
        tools: [claude],
        generalMd: tpl.generalMd,
        skills: tpl.skills,
        prompt: overwrite,
      });
      expect(summary.failed).toBe(0);
      expect(fs.existsSync(path.join(cwd, "CLAUDE.md"))).toBe(true);
      expect(fs.existsSync(path.join(cwd, ".claude", "skills", "caveman", "SKILL.md"))).toBe(true);
      expect(fs.existsSync(path.join(cwd, ".agents"))).toBe(false);
      expect(fs.existsSync(path.join(cwd, "AGENTS.md"))).toBe(false);
    } finally {
      fs.rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("project scope (codex): writes AGENTS.md and .agents/skills under cwd", async () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "proj-"));
    try {
      const tpl = enumerate(REPO_TEMPLATES);
      const codex = getProjectTools(cwd).find((t) => t.id === "codex")!;
      const summary = await copy({
        tools: [codex],
        generalMd: tpl.generalMd,
        skills: tpl.skills,
        prompt: overwrite,
      });
      expect(summary.failed).toBe(0);
      expect(fs.existsSync(path.join(cwd, "AGENTS.md"))).toBe(true);
      expect(fs.existsSync(path.join(cwd, ".agents", "skills", "caveman", "SKILL.md"))).toBe(true);
      expect(fs.existsSync(path.join(cwd, ".claude"))).toBe(false);
      expect(fs.existsSync(path.join(cwd, "CLAUDE.md"))).toBe(false);
    } finally {
      fs.rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("project scope (opencode): same paths as codex", async () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "proj-"));
    try {
      const tpl = enumerate(REPO_TEMPLATES);
      const opencode = getProjectTools(cwd).find((t) => t.id === "opencode")!;
      const summary = await copy({
        tools: [opencode],
        generalMd: tpl.generalMd,
        skills: tpl.skills,
        prompt: overwrite,
      });
      expect(summary.failed).toBe(0);
      expect(fs.existsSync(path.join(cwd, "AGENTS.md"))).toBe(true);
      expect(fs.existsSync(path.join(cwd, ".agents", "skills", "caveman", "SKILL.md"))).toBe(true);
    } finally {
      fs.rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("partial failure: one tool's skillsDir parent unwritable, other tools still install", async () => {
    if (process.platform === "win32") return;
    const tpl = enumerate(REPO_TEMPLATES);

    fs.mkdirSync(tools[0]!.configDir, { recursive: true });
    fs.mkdirSync(tools[0]!.skillsDir, { recursive: true });
    fs.chmodSync(tools[0]!.skillsDir, 0o400);

    try {
      const summary = await copy({
        tools,
        generalMd: tpl.generalMd,
        skills: tpl.skills,
        prompt: overwrite,
      });
      const claudeFails = summary.details.filter(
        (d) => d.toolId === "claude" && d.outcome === "failed",
      ).length;
      const codexInstalls = summary.details.filter(
        (d) => d.toolId === "codex" && d.outcome === "installed",
      ).length;
      const opencodeInstalls = summary.details.filter(
        (d) => d.toolId === "opencode" && d.outcome === "installed",
      ).length;

      expect(claudeFails).toBeGreaterThan(0);
      expect(codexInstalls).toBe(1 + tpl.skills.length);
      expect(opencodeInstalls).toBe(1 + tpl.skills.length);
    } finally {
      fs.chmodSync(tools[0]!.skillsDir, 0o700);
    }
  });
});
