import fs from "node:fs";
import path from "node:path";
import { parseFrontmatter } from "./frontmatter.ts";

export interface SkillEntry {
  id: string;
  dir: string;
  required: boolean;
}

export interface Templates {
  generalMd: string;
  skills: SkillEntry[];
}

export function enumerate(templatesDir: string): Templates {
  const generalMd = path.join(templatesDir, "GENERAL.md");
  if (!fs.existsSync(generalMd)) {
    throw new Error(`missing ${generalMd}`);
  }

  const skillsDir = path.join(templatesDir, "skills");
  const skills: SkillEntry[] = [];

  for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const id = entry.name;
    const dir = path.join(skillsDir, id);
    const skillMd = path.join(dir, "SKILL.md");
    if (!fs.existsSync(skillMd)) continue;
    const fm = parseFrontmatter(fs.readFileSync(skillMd, "utf-8"));
    skills.push({ id, dir, required: fm.required === true });
  }

  skills.sort((a, b) => a.id.localeCompare(b.id));
  return { generalMd, skills };
}
