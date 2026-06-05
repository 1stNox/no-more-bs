import { describe, expect, it } from "bun:test";
import { parseArgv } from "../../src/index.ts";

describe("parseArgv", () => {
  it("accepts no args", () => {
    expect(parseArgv([])).toEqual({ ok: true });
  });

  it("accepts the init verb", () => {
    expect(parseArgv(["init"])).toEqual({ ok: true, command: "init" });
  });

  it("accepts the clear verb", () => {
    expect(parseArgv(["clear"])).toEqual({ ok: true, command: "clear" });
  });

  it("rejects an unknown verb", () => {
    const r = parseArgv(["update"]);
    expect(r.ok).toBe(false);
    expect(r.usage).toMatch(/Usage:/);
  });

  it("rejects extra positional args", () => {
    expect(parseArgv(["init", "extra"]).ok).toBe(false);
  });

  it("rejects clear with extra args", () => {
    expect(parseArgv(["clear", "extra"]).ok).toBe(false);
  });

  it("usage includes clear command", () => {
    const r = parseArgv(["unknown"]);
    expect(r.usage).toMatch(/init\|clear/);
  });
});
