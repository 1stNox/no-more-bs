import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { copy } from "../../src/lib/copy.ts";
import type { Tool } from "../../src/lib/registry.ts";
import type { SkillEntry } from "../../src/lib/templates.ts";

const always = (choice: "overwrite" | "skip" | "diff" | "backup") => async () => choice;

describe("copy", () => {
  let tmp: string;
  let tool: Tool;
  let generalMd: string;
  let skill: SkillEntry;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cp-"));

    const home = path.join(tmp, "home");
    fs.mkdirSync(home);
    tool = {
      id: "claude",
      label: "Claude Code",
      binary: "claude",
      configDir: path.join(home, ".claude"),
      topLevelMd: "CLAUDE.md",
      skillsDir: path.join(home, ".claude", "skills"),
    };

    const tplDir = path.join(tmp, "templates");
    fs.mkdirSync(tplDir);
    generalMd = path.join(tplDir, "GENERAL.md");
    fs.writeFileSync(generalMd, "general content\n");

    const skillDir = path.join(tplDir, "skills", "alpha");
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(
      path.join(skillDir, "SKILL.md"),
      `---\nname: alpha\ndescription: Test.\n---\nbody\n`,
    );
    skill = { id: "alpha", dir: skillDir, required: false };
  });

  afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

  it("installs both units on a fresh target", async () => {
    const summary = await copy({
      tools: [tool],
      generalMd,
      skills: [skill],
      prompt: always("overwrite"),
    });
    expect(summary.installed).toBe(2);
    expect(summary.skipped).toBe(0);
    expect(summary.failed).toBe(0);
    expect(fs.readFileSync(path.join(tool.configDir, "CLAUDE.md"), "utf-8")).toBe(
      "general content\n",
    );
    expect(fs.existsSync(path.join(tool.skillsDir, "alpha", "SKILL.md"))).toBe(true);
  });

  it("skips silently on idempotent re-run (no prompt called)", async () => {
    const failingPrompt = async () => {
      throw new Error("prompt should not be called");
    };
    await copy({ tools: [tool], generalMd, skills: [skill], prompt: always("overwrite") });
    const summary = await copy({
      tools: [tool],
      generalMd,
      skills: [skill],
      prompt: failingPrompt,
    });
    expect(summary.installed).toBe(0);
    expect(summary.skipped).toBe(2);
    expect(summary.failed).toBe(0);
  });

  it("invokes prompt and overwrites on hash mismatch", async () => {
    await copy({ tools: [tool], generalMd, skills: [skill], prompt: always("overwrite") });
    fs.writeFileSync(path.join(tool.configDir, "CLAUDE.md"), "user-modified\n");
    const summary = await copy({
      tools: [tool],
      generalMd,
      skills: [skill],
      prompt: always("overwrite"),
      out: { write: () => true } as any,
    });
    expect(summary.installed).toBe(1);
    expect(summary.skipped).toBe(1);
    expect(fs.readFileSync(path.join(tool.configDir, "CLAUDE.md"), "utf-8")).toBe(
      "general content\n",
    );
  });

  it("records failure but continues with remaining units", async () => {
    fs.mkdirSync(tool.configDir, { recursive: true });
    const targetMd = path.join(tool.configDir, "CLAUDE.md");
    fs.mkdirSync(targetMd);
    const summary = await copy({
      tools: [tool],
      generalMd,
      skills: [skill],
      prompt: always("overwrite"),
      out: { write: () => true } as any,
    });
    expect(summary.failed).toBeGreaterThanOrEqual(1);
    expect(summary.installed).toBeGreaterThanOrEqual(1);
    expect(fs.existsSync(path.join(tool.skillsDir, "alpha"))).toBe(true);
  });

  it("skips excluded skill for specified tool but installs for others", async () => {
    const tool2: Tool = {
      id: "codex" as any,
      label: "Codex",
      binary: "codex",
      configDir: path.join(tmp, "home", ".agents"),
      topLevelMd: "AGENTS.md",
      skillsDir: path.join(tmp, "home", ".agents", "skills"),
    };
    const summary = await copy({
      tools: [tool, tool2],
      generalMd,
      skills: [skill],
      prompt: always("overwrite"),
      toolSkillExclusions: { claude: ["alpha"] },
    });
    expect(fs.existsSync(path.join(tool.skillsDir, "alpha"))).toBe(false);
    expect(fs.existsSync(path.join(tool2.skillsDir, "alpha", "SKILL.md"))).toBe(true);
    const skipped = summary.details.find(
      (d) => d.toolId === "claude" && d.unitName === "skill:alpha",
    );
    expect(skipped?.outcome).toBe("skipped");
    expect(skipped?.message).toBe("not supported by this tool");
  });

  it("backs up existing target when user picks backup", async () => {
    await copy({ tools: [tool], generalMd, skills: [skill], prompt: always("overwrite") });
    const targetMd = path.join(tool.configDir, "CLAUDE.md");
    fs.writeFileSync(targetMd, "user-modified\n");
    const summary = await copy({
      tools: [tool],
      generalMd,
      skills: [skill],
      prompt: always("backup"),
      out: { write: () => true } as any,
    });
    expect(summary.installed).toBe(1);
    expect(fs.readFileSync(`${targetMd}.bak`, "utf-8")).toBe("user-modified\n");
    expect(fs.readFileSync(targetMd, "utf-8")).toBe("general content\n");
  });
});
