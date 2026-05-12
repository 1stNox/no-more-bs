import { describe, expect, it } from "bun:test";
import {
  pickConflict,
  pickProjectTool,
  pickScope,
  pickSkills,
  pickTools,
} from "../../src/lib/prompts.ts";
import { getProjectTools, type Tool } from "../../src/lib/registry.ts";
import type { SkillEntry } from "../../src/lib/templates.ts";

const TOOLS: Tool[] = [
  {
    id: "claude",
    label: "Claude Code",
    binary: "claude",
    configDir: "/tmp/claude",
    topLevelMd: "CLAUDE.md",
    skillsDir: "/tmp/claude/skills",
  },
  {
    id: "codex",
    label: "Codex",
    binary: "codex",
    configDir: "/tmp/codex",
    topLevelMd: "AGENTS.md",
    skillsDir: "/tmp/codex/skills",
  },
];

const SKILLS: SkillEntry[] = [
  { id: "caveman", dir: "/tpl/caveman", required: true },
  { id: "tdd", dir: "/tpl/tdd", required: false },
  { id: "handoff", dir: "/tpl/handoff", required: false },
];

describe("pickTools", () => {
  it("pre-checks detected tools and annotates undetected", async () => {
    let captured: any;
    const stub = (async (cfg: any) => {
      captured = cfg;
      return cfg.choices.filter((c: any) => c.checked).map((c: any) => c.value);
    }) as any;

    const result = await pickTools(TOOLS, { claude: true, codex: false }, { checkbox: stub });
    expect(captured.choices[0]).toMatchObject({
      value: "claude",
      checked: true,
      name: "Claude Code",
    });
    expect(captured.choices[1]).toMatchObject({
      value: "codex",
      checked: false,
      name: "Codex (not detected)",
    });
    expect(result.map((t) => t.id)).toEqual(["claude"]);
  });

  it("returns the user's manual selection regardless of detection", async () => {
    const stub = (async () => ["codex"]) as any;
    const result = await pickTools(TOOLS, { claude: true, codex: false }, { checkbox: stub });
    expect(result.map((t) => t.id)).toEqual(["codex"]);
  });
});

describe("pickSkills", () => {
  it("always includes required skills even if stub returns nothing", async () => {
    const stub = (async () => []) as any;
    const result = await pickSkills(SKILLS, { checkbox: stub });
    expect(result.map((s) => s.id)).toEqual(["caveman"]);
  });

  it("merges required with user-selected optional skills", async () => {
    const stub = (async () => ["tdd"]) as any;
    const result = await pickSkills(SKILLS, { checkbox: stub });
    expect(result.map((s) => s.id).sort()).toEqual(["caveman", "tdd"]);
  });

  it("marks required skills as disabled in the prompt config", async () => {
    let captured: any;
    const stub = (async (cfg: any) => {
      captured = cfg;
      return [];
    }) as any;
    await pickSkills(SKILLS, { checkbox: stub });
    const caveman = captured.choices.find((c: any) => c.value === "caveman");
    expect(caveman.disabled).toBe("required");
    expect(caveman.checked).toBe(true);
  });
});

describe("pickScope", () => {
  it("offers user and project scopes", async () => {
    let captured: any;
    const stub = (async (cfg: any) => {
      captured = cfg;
      return "user";
    }) as any;
    const result = await pickScope({ select: stub });
    expect(result).toBe("user");
    const values = captured.choices.map((c: any) => c.value);
    expect(values).toEqual(["user", "project"]);
  });

  it("returns project when selected", async () => {
    const stub = (async () => "project") as any;
    expect(await pickScope({ select: stub })).toBe("project");
  });
});

describe("pickProjectTool", () => {
  it("returns the chosen tool (codex → AGENTS paths)", async () => {
    const tools = getProjectTools("/tmp/proj");
    const stub = (async () => "codex") as any;
    const result = await pickProjectTool(tools, { select: stub });
    expect(result.id).toBe("codex");
    expect(result.topLevelMd).toBe("AGENTS.md");
    expect(result.skillsDir).toBe("/tmp/proj/.agents/skills");
  });

  it("offers exactly Claude / Codex / OpenCode / Pi / Copilot", async () => {
    const tools = getProjectTools("/tmp/proj");
    let captured: any;
    const stub = (async (cfg: any) => {
      captured = cfg;
      return "claude";
    }) as any;
    const result = await pickProjectTool(tools, { select: stub });
    const values = captured.choices.map((c: any) => c.value);
    expect(values).toEqual(["claude", "codex", "opencode", "pi", "copilot"]);
    expect(result.id).toBe("claude");
    expect(result.configDir).toBe("/tmp/proj");
    expect(result.skillsDir).toBe("/tmp/proj/.claude/skills");
  });

  it("codex and opencode resolve to identical project paths", async () => {
    const tools = getProjectTools("/tmp/proj");
    const codex = tools.find((t) => t.id === "codex")!;
    const opencode = tools.find((t) => t.id === "opencode")!;
    expect(codex.topLevelMd).toBe(opencode.topLevelMd);
    expect(codex.skillsDir).toBe(opencode.skillsDir);
    expect(codex.configDir).toBe(opencode.configDir);
  });
});

describe("pickConflict", () => {
  it("returns the choice value from the underlying select", async () => {
    const stub = (async () => "backup") as any;
    expect(await pickConflict("foo", { select: stub })).toBe("backup");
  });

  it("offers all four branches", async () => {
    let captured: any;
    const stub = (async (cfg: any) => {
      captured = cfg;
      return "skip";
    }) as any;
    await pickConflict("foo", { select: stub });
    const values = captured.choices.map((c: any) => c.value);
    expect(values).toEqual(["overwrite", "skip", "diff", "backup"]);
  });
});
