import { describe, expect, it } from "bun:test";
import { mapTopLevelMd } from "../../src/lib/registry.ts";

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
