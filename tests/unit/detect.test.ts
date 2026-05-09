import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { detectTool, isBinaryOnPath } from "../../src/lib/detect.ts";

describe("isBinaryOnPath", () => {
  let tmpBin: string;
  let origPath: string | undefined;

  beforeEach(() => {
    tmpBin = fs.mkdtempSync(path.join(os.tmpdir(), "bin-"));
    origPath = process.env.PATH;
    process.env.PATH = tmpBin;
  });

  afterEach(() => {
    process.env.PATH = origPath;
    fs.rmSync(tmpBin, { recursive: true, force: true });
  });

  it("returns true when an executable file is on PATH", () => {
    const f = path.join(tmpBin, "fakebin");
    fs.writeFileSync(f, "#!/bin/sh\nexit 0\n", { mode: 0o755 });
    expect(isBinaryOnPath("fakebin")).toBe(true);
  });

  it("returns false when the file exists but is not executable", () => {
    const f = path.join(tmpBin, "nonexec");
    fs.writeFileSync(f, "x", { mode: 0o644 });
    expect(isBinaryOnPath("nonexec")).toBe(false);
  });

  it("returns false when binary not on PATH", () => {
    expect(isBinaryOnPath("does-not-exist-zzz")).toBe(false);
  });
});

describe("detectTool", () => {
  let tmpHome: string;
  let origPath: string | undefined;

  beforeEach(() => {
    tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "home-"));
    origPath = process.env.PATH;
    process.env.PATH = "";
  });

  afterEach(() => {
    process.env.PATH = origPath;
    fs.rmSync(tmpHome, { recursive: true, force: true });
  });

  it("returns true when binary is on PATH", () => {
    const bindir = fs.mkdtempSync(path.join(os.tmpdir(), "bin-"));
    try {
      const f = path.join(bindir, "claude");
      fs.writeFileSync(f, "x", { mode: 0o755 });
      process.env.PATH = bindir;
      const cfg = path.join(tmpHome, ".claude");
      expect(detectTool({ binary: "claude", configDir: cfg })).toBe(true);
    } finally {
      fs.rmSync(bindir, { recursive: true, force: true });
    }
  });

  it("returns true when only config dir exists", () => {
    const cfg = path.join(tmpHome, ".claude");
    fs.mkdirSync(cfg, { recursive: true });
    expect(detectTool({ binary: "definitely-not-real", configDir: cfg })).toBe(true);
  });

  it("returns false when neither exists", () => {
    const cfg = path.join(tmpHome, ".missing");
    expect(detectTool({ binary: "definitely-not-real", configDir: cfg })).toBe(false);
  });
});
