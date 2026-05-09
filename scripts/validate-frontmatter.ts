import fs from "fs";
import path from "path";

export interface SkillFrontmatter {
  name: string;
  description: string;
  required?: boolean;
}

export interface ValidationError {
  file: string;
  message: string;
}

const FENCE = /^---\r?\n([\s\S]*?)\r?\n---/;
const REQUIRED_SKILLS = ["caveman"] as const;

export function parseFrontmatter(source: string): SkillFrontmatter {
  const match = source.match(FENCE);
  if (!match) throw new Error("missing frontmatter fences");
  const block = match[1];

  if (/:  :/.test(block) || /: :/.test(block)) {
    throw new Error("malformed YAML: double-colon sequence");
  }

  const single = (key: string): string | undefined => {
    const m = block.match(new RegExp(`^${key}:[ \\t]+(.+?)\\s*$`, "m"));
    return m?.[1];
  };

  const folded = (key: string): string | undefined => {
    const head = block.match(
      new RegExp(`^${key}:[ \\t]+>[ \\t]*\\r?\\n([\\s\\S]*?)(?=^\\S|$(?!\\n))`, "m")
    );
    if (!head) return undefined;
    return head[1]
      .split(/\r?\n/)
      .map((l) => l.replace(/^[ \t]+/, ""))
      .filter(Boolean)
      .join(" ")
      .trim();
  };

  const name = single("name");
  if (!name) throw new Error("name missing or empty");

  const descSingle = single("description");
  const description =
    descSingle && descSingle !== ">" ? descSingle : folded("description");
  if (!description) throw new Error("description missing or empty");

  const required = /^required:\s*true\s*$/m.test(block);

  return { name, description, required };
}

/**
 * Validate all skills in templatesSkillsDir.
 * Returns array of validation errors.
 */
export function validateSkills(templatesSkillsDir: string): ValidationError[] {
  const errors: ValidationError[] = [];

  const entries = fs.readdirSync(templatesSkillsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const skillId = entry.name;
    const skillPath = path.join(templatesSkillsDir, skillId);
    const skillMdPath = path.join(skillPath, "SKILL.md");

    if (!fs.existsSync(skillMdPath)) {
      errors.push({
        file: path.relative(path.dirname(templatesSkillsDir), path.join(skillPath, "SKILL.md")),
        message: "missing SKILL.md",
      });
      continue;
    }

    let frontmatter: SkillFrontmatter;
    try {
      const content = fs.readFileSync(skillMdPath, "utf-8");
      frontmatter = parseFrontmatter(content);
    } catch (err) {
      errors.push({
        file: path.relative(path.dirname(templatesSkillsDir), skillMdPath),
        message: `failed to parse YAML: ${err instanceof Error ? err.message : String(err)}`,
      });
      continue;
    }

    if (!frontmatter.name || typeof frontmatter.name !== "string") {
      errors.push({
        file: path.relative(path.dirname(templatesSkillsDir), skillMdPath),
        message: "missing or invalid name",
      });
    }

    if (!frontmatter.description || typeof frontmatter.description !== "string") {
      errors.push({
        file: path.relative(path.dirname(templatesSkillsDir), skillMdPath),
        message: "missing or invalid description",
      });
    }

    if (
      (REQUIRED_SKILLS as readonly string[]).includes(skillId) &&
      frontmatter.required !== true
    ) {
      errors.push({
        file: path.relative(path.dirname(templatesSkillsDir), skillMdPath),
        message: `${skillId} skill must have required: true`,
      });
    }
  }

  return errors;
}

// CLI entry point
if (import.meta.main) {
  const scriptDir = path.dirname(new URL(import.meta.url).pathname);
  const repoRoot = path.dirname(scriptDir);
  const templatesSkillsDir = path.join(repoRoot, "templates", "skills");
  const errors = validateSkills(templatesSkillsDir);

  if (errors.length) {
    for (const e of errors) {
      console.error(`${e.file}: ${e.message}`);
    }
    process.exit(1);
  }

  process.exit(0);
}
