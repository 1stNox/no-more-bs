import { describe, it, expect, afterEach } from "bun:test";
import fs from "fs";
import os from "os";
import path from "path";
import { enumerate } from "../../src/lib/templates.ts";

const REPO_TEMPLATES = path.join(import.meta.dir, "../../templates");

describe("enumerate (real templates/)", () => {
  it("returns GENERAL.md path and all 10 skills", () => {
    const t = enumerate(REPO_TEMPLATES);
    expect(t.generalMd).toBe(path.join(REPO_TEMPLATES, "GENERAL.md"));
    expect(t.skills.length).toBe(10);
  });

  it("marks caveman as required and others as not required", () => {
    const t = enumerate(REPO_TEMPLATES);
    const caveman = t.skills.find((s) => s.id === "caveman");
    expect(caveman?.required).toBe(true);
    for (const s of t.skills.filter((s) => s.id !== "caveman")) {
      expect(s.required).toBe(false);
    }
  });

  it("returns skills sorted by id", () => {
    const t = enumerate(REPO_TEMPLATES);
    const ids = t.skills.map((s) => s.id);
    expect(ids).toEqual([...ids].sort());
  });
});

describe("enumerate (fixture)", () => {
  let tmp: string;

  afterEach(() => {
    if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("throws when GENERAL.md is missing", () => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "tpl-"));
    fs.mkdirSync(path.join(tmp, "skills"));
    expect(() => enumerate(tmp)).toThrow(/missing/);
  });

  it("returns a single skill with required=false", () => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "tpl-"));
    fs.writeFileSync(path.join(tmp, "GENERAL.md"), "# stub");
    const skillsDir = path.join(tmp, "skills");
    fs.mkdirSync(path.join(skillsDir, "alpha"), { recursive: true });
    fs.writeFileSync(
      path.join(skillsDir, "alpha", "SKILL.md"),
      `---\nname: alpha\ndescription: A test skill.\n---\n`,
    );
    const t = enumerate(tmp);
    expect(t.skills).toEqual([{ id: "alpha", dir: path.join(skillsDir, "alpha"), required: false }]);
  });
});
