import { describe, it, expect, afterEach } from "bun:test";
import fs from "fs";
import path from "path";
import os from "os";
import { parseFrontmatter, type SkillFrontmatter } from "../../src/lib/frontmatter.ts";
import { validateSkills, type ValidationError } from "../../scripts/validate-frontmatter.ts";

describe("parseFrontmatter", () => {
  it("parses well-formed frontmatter into SkillFrontmatter object", () => {
    const source = `---
name: caveman
required: true
description: >
  Ultra-compressed communication mode.
  Cuts token usage ~75%.
---
Rest of content`;

    const result = parseFrontmatter(source);
    expect(result.name).toBe("caveman");
    expect(result.required).toBe(true);
    expect(result.description).toBeTruthy();
    expect(result.description).toContain("Ultra-compressed");
  });

  it("throws when source is missing leading --- fence", () => {
    const source = `name: caveman
description: test
---`;
    expect(() => parseFrontmatter(source)).toThrow();
  });

  it("throws on malformed YAML inside fences", () => {
    const source = `---
name: caveman
description: >
  test
  invalid yaml here:  : :
---`;
    expect(() => parseFrontmatter(source)).toThrow();
  });

  it("parses inline single-line description (real skill format)", () => {
    const source = `---
name: tdd
description: Test-driven development with red-green-refactor loop.
---
Content`;

    const result = parseFrontmatter(source);
    expect(result.name).toBe("tdd");
    expect(result.description).toBe("Test-driven development with red-green-refactor loop.");
    expect(result.required).toBe(false);
  });
});

describe("validateSkills", () => {
  let tempDir: string;

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  it("returns empty array for valid skills in real templates/skills/ directory", () => {
    const templatesSkillsDir = path.join(
      __dirname,
      "../../templates/skills"
    );
    const errors = validateSkills(templatesSkillsDir);
    expect(errors).toEqual([]);
  });

  it("returns validation error when skill is missing description", () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fm-"));
    const testSkillDir = path.join(tempDir, "test-skill");
    fs.mkdirSync(testSkillDir);

    fs.writeFileSync(
      path.join(testSkillDir, "SKILL.md"),
      `---
name: test-skill
---
Content here`
    );

    const errors = validateSkills(tempDir);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].file).toContain("test-skill");
    expect(errors[0].message).toContain("description");
  });

  it("returns validation error when caveman is missing required: true flag", () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fm-"));
    const cavemanDir = path.join(tempDir, "caveman");
    fs.mkdirSync(cavemanDir);

    fs.writeFileSync(
      path.join(cavemanDir, "SKILL.md"),
      `---
name: caveman
description: >
  Test description
---
Content here`
    );

    const errors = validateSkills(tempDir);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].file).toContain("caveman");
    expect(errors[0].message).toContain("required");
  });

  it("returns error when SKILL.md is missing", () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fm-"));
    const testSkillDir = path.join(tempDir, "orphan-skill");
    fs.mkdirSync(testSkillDir);
    // Don't create SKILL.md

    const errors = validateSkills(tempDir);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].file).toContain("orphan-skill");
    expect(errors[0].message).toContain("missing SKILL.md");
  });
});
