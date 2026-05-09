import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { hashDir, hashFile } from "../../src/lib/hash.ts";

describe("hashFile", () => {
  it("returns sha256 hex of file contents", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "h-"));
    try {
      const f = path.join(tmp, "x.txt");
      const content = "hello world";
      fs.writeFileSync(f, content);
      const expected = crypto.createHash("sha256").update(content).digest("hex");
      expect(hashFile(f)).toBe(expected);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe("hashDir", () => {
  let a: string;
  let b: string;

  beforeEach(() => {
    a = fs.mkdtempSync(path.join(os.tmpdir(), "ha-"));
    b = fs.mkdtempSync(path.join(os.tmpdir(), "hb-"));
  });

  afterEach(() => {
    fs.rmSync(a, { recursive: true, force: true });
    fs.rmSync(b, { recursive: true, force: true });
  });

  it("is identical for two dirs with the same content created in different order", () => {
    fs.writeFileSync(path.join(a, "first"), "1");
    fs.writeFileSync(path.join(a, "second"), "2");
    fs.writeFileSync(path.join(b, "second"), "2");
    fs.writeFileSync(path.join(b, "first"), "1");
    expect(hashDir(a)).toBe(hashDir(b));
  });

  it("changes when a file's content changes", () => {
    fs.writeFileSync(path.join(a, "x"), "1");
    const before = hashDir(a);
    fs.writeFileSync(path.join(a, "x"), "2");
    expect(hashDir(a)).not.toBe(before);
  });

  it("changes when a file is added", () => {
    fs.writeFileSync(path.join(a, "x"), "1");
    const before = hashDir(a);
    fs.writeFileSync(path.join(a, "y"), "2");
    expect(hashDir(a)).not.toBe(before);
  });

  it("changes when a file is removed", () => {
    fs.writeFileSync(path.join(a, "x"), "1");
    fs.writeFileSync(path.join(a, "y"), "2");
    const before = hashDir(a);
    fs.rmSync(path.join(a, "y"));
    expect(hashDir(a)).not.toBe(before);
  });

  it("descends into subdirectories", () => {
    fs.mkdirSync(path.join(a, "sub"));
    fs.writeFileSync(path.join(a, "sub", "deep"), "x");
    fs.mkdirSync(path.join(b, "sub"));
    fs.writeFileSync(path.join(b, "sub", "deep"), "x");
    expect(hashDir(a)).toBe(hashDir(b));
  });
});
