import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseFrontmatter } from "../src/lib/frontmatter.ts";

export interface ValidationError {
  file: string;
  message: string;
}

const REQUIRED_SKILLS = ["caveman"] as const;

export function validateSkills(templatesSkillsDir: string): ValidationError[] {
  const errors: ValidationError[] = [];
  const parent = path.dirname(templatesSkillsDir);
  const rel = (p: string) => path.relative(parent, p);

  const entries = fs.readdirSync(templatesSkillsDir, { withFileTypes: true });
  const present = new Set(entries.filter((e) => e.isDirectory()).map((e) => e.name));

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const skillId = entry.name;
    const skillMdPath = path.join(templatesSkillsDir, skillId, "SKILL.md");

    if (!fs.existsSync(skillMdPath)) {
      errors.push({ file: rel(skillMdPath), message: "missing SKILL.md" });
      continue;
    }

    try {
      const content = fs.readFileSync(skillMdPath, "utf-8");
      const fm = parseFrontmatter(content);
      if ((REQUIRED_SKILLS as readonly string[]).includes(skillId) && fm.required !== true) {
        errors.push({
          file: rel(skillMdPath),
          message: `${skillId} skill must have required: true`,
        });
      }
    } catch (err) {
      errors.push({
        file: rel(skillMdPath),
        message: `failed to parse YAML: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  for (const skillId of REQUIRED_SKILLS) {
    if (!present.has(skillId)) {
      errors.push({
        file: rel(path.join(templatesSkillsDir, skillId)),
        message: "missing required skill directory",
      });
    }
  }

  return errors;
}

if (import.meta.main) {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.dirname(scriptDir);
  const errors = validateSkills(path.join(repoRoot, "templates", "skills"));

  if (errors.length) {
    for (const e of errors) console.error(`${e.file}: ${e.message}`);
    process.exit(1);
  }
  process.exit(0);
}
