import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  nextBackupPath,
  type ResolverChoice,
  renderDiff,
  resolve,
} from "../../src/lib/conflict.ts";

const sequencePrompt = (choices: ResolverChoice[]) => {
  let i = 0;
  return async (_unitName: string) => {
    if (i >= choices.length) throw new Error("prompt called too many times");
    return choices[i++]!;
  };
};

describe("resolve", () => {
  let tmp: string;
  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "c-"));
  });
  afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

  const baseInput = (override: Partial<Parameters<typeof resolve>[0]> = {}) => {
    const src = path.join(tmp, "src.txt");
    const dst = path.join(tmp, "dst.txt");
    fs.writeFileSync(src, "src content");
    fs.writeFileSync(dst, "dst content");
    return {
      unitName: "demo",
      srcPath: src,
      dstPath: dst,
      kind: "file" as const,
      prompt: sequencePrompt(["skip"]),
      out: { write: () => true } as any,
      ...override,
    };
  };

  it("returns overwrite when user picks overwrite", async () => {
    const r = await resolve(baseInput({ prompt: sequencePrompt(["overwrite"]) }));
    expect(r).toEqual({ action: "overwrite" });
  });

  it("returns skip when user picks skip", async () => {
    const r = await resolve(baseInput({ prompt: sequencePrompt(["skip"]) }));
    expect(r).toEqual({ action: "skip" });
  });

  it("renders diff and re-prompts when user picks diff", async () => {
    const writes: string[] = [];
    const out = { write: (s: string) => (writes.push(s), true) } as any;
    const r = await resolve(baseInput({ prompt: sequencePrompt(["diff", "skip"]), out }));
    expect(r).toEqual({ action: "skip" });
    expect(writes.length).toBe(1);
    expect(writes[0]).toContain("src content");
  });

  it("returns backup with fresh .bak path when no backup exists", async () => {
    const input = baseInput({ prompt: sequencePrompt(["backup"]) });
    const r = await resolve(input);
    expect(r.action).toBe("backup");
    if (r.action !== "backup") throw new Error("expected backup");
    expect(r.backupPath).toBe(`${input.dstPath}.bak`);
  });

  it("returns backup with .bak.1 when .bak exists", async () => {
    const input = baseInput({ prompt: sequencePrompt(["backup"]) });
    fs.writeFileSync(`${input.dstPath}.bak`, "older backup");
    const r = await resolve(input);
    expect(r.action).toBe("backup");
    if (r.action !== "backup") throw new Error("expected backup");
    expect(r.backupPath).toBe(`${input.dstPath}.bak.1`);
  });
});

describe("nextBackupPath", () => {
  let tmp: string;
  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "bp-"));
  });
  afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

  it("returns .bak when none exists", () => {
    const f = path.join(tmp, "x");
    expect(nextBackupPath(f)).toBe(`${f}.bak`);
  });

  it("escalates suffix when prior backups exist", () => {
    const f = path.join(tmp, "x");
    fs.writeFileSync(`${f}.bak`, "");
    fs.writeFileSync(`${f}.bak.1`, "");
    expect(nextBackupPath(f)).toBe(`${f}.bak.2`);
  });
});

describe("renderDiff", () => {
  let tmp: string;
  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "d-"));
  });
  afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

  it("renders unified file diff", () => {
    const a = path.join(tmp, "a");
    const b = path.join(tmp, "b");
    fs.writeFileSync(a, "alpha\n");
    fs.writeFileSync(b, "beta\n");
    const patch = renderDiff({ srcPath: a, dstPath: b, kind: "file" });
    expect(patch).toContain("-beta");
    expect(patch).toContain("+alpha");
  });

  it("walks both dirs and emits one patch per differing file", () => {
    const src = path.join(tmp, "src");
    const dst = path.join(tmp, "dst");
    fs.mkdirSync(src);
    fs.mkdirSync(dst);
    fs.writeFileSync(path.join(src, "same"), "x");
    fs.writeFileSync(path.join(dst, "same"), "x");
    fs.writeFileSync(path.join(src, "diff"), "new");
    fs.writeFileSync(path.join(dst, "diff"), "old");
    fs.writeFileSync(path.join(src, "added"), "n");
    const patch = renderDiff({ srcPath: src, dstPath: dst, kind: "dir" });
    expect(patch).toContain("diff");
    expect(patch).toContain("added");
    expect(patch).not.toContain("same\n@@");
  });
});
