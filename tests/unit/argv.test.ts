import { describe, it, expect } from "bun:test";
import { parseArgv } from "../../src/index.ts";

describe("parseArgv", () => {
  it("accepts no args", () => {
    expect(parseArgv([])).toEqual({ ok: true });
  });

  it("accepts the init verb", () => {
    expect(parseArgv(["init"])).toEqual({ ok: true });
  });

  it("rejects an unknown verb", () => {
    const r = parseArgv(["update"]);
    expect(r.ok).toBe(false);
    expect(r.usage).toMatch(/Usage:/);
  });

  it("rejects extra positional args", () => {
    expect(parseArgv(["init", "extra"]).ok).toBe(false);
  });
});
