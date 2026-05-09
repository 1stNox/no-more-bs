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

/**
 * Parse YAML frontmatter between leading --- fences.
 * Handles simple YAML: key: value, key: > multiline literal block.
 */
export function parseFrontmatter(source: string): SkillFrontmatter {
  const lines = source.split("\n");

  // Find opening ---
  if (!lines[0] || !lines[0].trim().startsWith("---")) {
    throw new Error("Missing opening --- fence");
  }

  // Find closing ---
  let closingIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim().startsWith("---")) {
      closingIndex = i;
      break;
    }
  }
  if (closingIndex === -1) {
    throw new Error("Missing closing --- fence");
  }

  const yamlLines = lines.slice(1, closingIndex);
  const yaml = yamlLines.join("\n");

  // Parse simple YAML: name, description, required
  const result: SkillFrontmatter = {
    name: "",
    description: "",
  };

  let i = 0;
  while (i < yamlLines.length) {
    const line = yamlLines[i];

    // Skip empty lines
    if (!line.trim()) {
      i++;
      continue;
    }

    // Check for invalid YAML syntax on non-indented lines (keys)
    if (!line.startsWith(" ") && !line.startsWith("\t")) {
      if (line.includes(":  :") || line.includes(": :")) {
        throw new Error(`Malformed YAML: ${line}`);
      }

      // Parse key: value
      const colonIndex = line.indexOf(":");
      if (colonIndex === -1) {
        throw new Error(`Malformed YAML line: ${line}`);
      }

      const key = line.substring(0, colonIndex).trim();
      let value = line.substring(colonIndex + 1).trim();

      if (key === "name") {
        result.name = value;
      } else if (key === "required") {
        result.required = value === "true";
      } else if (key === "description") {
        // Handle description: value or description: > multiline
        if (value === ">") {
          // Multiline literal block
          const multilines: string[] = [];
          i++;
          while (i < yamlLines.length) {
            const nextLine = yamlLines[i];
            if (!nextLine.trim()) {
              i++;
              break;
            }
            // Check if this line is a new key (not indented, contains :)
            if (
              !nextLine.startsWith(" ") &&
              !nextLine.startsWith("\t") &&
              nextLine.includes(":")
            ) {
              // Back up: this is the next key
              i--;
              break;
            }
            // Line is part of multiline description
            // Check for malformed YAML within literal block
            if (nextLine.includes(":  :") || nextLine.includes(": :")) {
              throw new Error(
                `Malformed YAML in literal block: ${nextLine.trim()}`
              );
            }
            multilines.push(nextLine.trim());
            i++;
          }
          result.description = multilines.join(" ");
        } else {
          result.description = value;
        }
      }
    }

    i++;
  }

  return result;
}

/**
 * Validate all skills in templatesSkillsDir.
 * Returns array of validation errors.
 */
export function validateSkills(templatesSkillsDir: string): ValidationError[] {
  const errors: ValidationError[] = [];

  // Iterate immediate subdirectories
  const entries = fs.readdirSync(templatesSkillsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const skillId = entry.name;
    const skillPath = path.join(templatesSkillsDir, skillId);
    const skillMdPath = path.join(skillPath, "SKILL.md");

    // Check if SKILL.md exists
    if (!fs.existsSync(skillMdPath)) {
      errors.push({
        file: path.relative(
          path.dirname(templatesSkillsDir),
          path.join(skillPath, "SKILL.md")
        ),
        message: "missing SKILL.md",
      });
      continue;
    }

    // Read and parse SKILL.md
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

    // Validate name exists and is non-empty
    if (!frontmatter.name || typeof frontmatter.name !== "string") {
      errors.push({
        file: path.relative(path.dirname(templatesSkillsDir), skillMdPath),
        message: "missing or invalid name",
      });
    }

    // Validate description exists and is non-empty
    if (
      !frontmatter.description ||
      typeof frontmatter.description !== "string"
    ) {
      errors.push({
        file: path.relative(path.dirname(templatesSkillsDir), skillMdPath),
        message: "missing or invalid description",
      });
    }

    // Validate caveman has required: true
    if (skillId === "caveman" && frontmatter.required !== true) {
      errors.push({
        file: path.relative(path.dirname(templatesSkillsDir), skillMdPath),
        message: "caveman skill must have required: true",
      });
    }
  }

  return errors;
}

// CLI entry point
if (import.meta.main) {
  // Resolve relative to this script's location
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
