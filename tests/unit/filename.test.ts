import { describe, expect, it } from "bun:test";
import path from "node:path";
import { getProjectTools, mapTopLevelMd } from "../../src/lib/registry.ts";

describe("mapTopLevelMd", () => {
  it("maps claude → CLAUDE.md", () => {
    expect(mapTopLevelMd("claude")).toBe("CLAUDE.md");
  });

  it("maps codex → AGENTS.md", () => {
    expect(mapTopLevelMd("codex")).toBe("AGENTS.md");
  });

  it("maps opencode → AGENTS.md", () => {
    expect(mapTopLevelMd("opencode")).toBe("AGENTS.md");
  });

  it("throws on unknown id", () => {
    // @ts-expect-error testing runtime guard
    expect(() => mapTopLevelMd("unknown")).toThrow(/unknown tool/);
  });
});

describe("getProjectTools", () => {
  it("claude project uses cwd as configDir, CLAUDE.md and .claude/skills", () => {
    const cwd = "/tmp/proj";
    const t = getProjectTools(cwd).find((x) => x.id === "claude");
    expect(t).toBeDefined();
    expect(t!.configDir).toBe(cwd);
    expect(t!.topLevelMd).toBe("CLAUDE.md");
    expect(t!.skillsDir).toBe(path.join(cwd, ".claude", "skills"));
  });

  it("codex project uses cwd as configDir, AGENTS.md and .agents/skills", () => {
    const cwd = "/tmp/proj";
    const t = getProjectTools(cwd).find((x) => x.id === "codex");
    expect(t).toBeDefined();
    expect(t!.configDir).toBe(cwd);
    expect(t!.topLevelMd).toBe("AGENTS.md");
    expect(t!.skillsDir).toBe(path.join(cwd, ".agents", "skills"));
  });

  it("opencode project shares paths with codex", () => {
    const cwd = "/tmp/proj";
    const t = getProjectTools(cwd).find((x) => x.id === "opencode");
    expect(t).toBeDefined();
    expect(t!.configDir).toBe(cwd);
    expect(t!.topLevelMd).toBe("AGENTS.md");
    expect(t!.skillsDir).toBe(path.join(cwd, ".agents", "skills"));
  });
});
