import fs from "node:fs";
import path from "node:path";
import { type ResolveInput, resolve } from "./conflict.ts";
import { hashDir, hashFile } from "./hash.ts";
import type { Tool } from "./registry.ts";
import type { SkillEntry } from "./templates.ts";

export type UnitKind = "file" | "dir";
export type Outcome = "installed" | "skipped" | "failed";

export interface UnitResult {
  toolId: string;
  unitName: string;
  outcome: Outcome;
  message?: string;
}

export interface CopySummary {
  installed: number;
  skipped: number;
  failed: number;
  details: UnitResult[];
}

export interface CopyInput {
  tools: Tool[];
  generalMd: string;
  skills: SkillEntry[];
  prompt: ResolveInput["prompt"];
  out?: NodeJS.WritableStream;
  toolSkillExclusions?: Record<string, string[]>;
}

interface Unit {
  name: string;
  kind: UnitKind;
  src: string;
  dst: (tool: Tool) => string;
  skillId?: string;
}

function units(input: CopyInput): Unit[] {
  const list: Unit[] = [
    {
      name: "GENERAL.md",
      kind: "file",
      src: input.generalMd,
      dst: (t) => path.join(t.configDir, t.topLevelMd),
    },
  ];
  for (const s of input.skills) {
    list.push({
      name: `skill:${s.id}`,
      kind: "dir",
      src: s.dir,
      dst: (t) => path.join(t.skillsDir, s.id),
      skillId: s.id,
    });
  }
  return list;
}

function hashOf(p: string, kind: UnitKind): string {
  return kind === "file" ? hashFile(p) : hashDir(p);
}

function writeUnit(src: string, dst: string, kind: UnitKind) {
  if (kind === "file") {
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
  } else {
    fs.rmSync(dst, { recursive: true, force: true });
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.cpSync(src, dst, { recursive: true });
  }
}

export async function copy(input: CopyInput, summary?: CopySummary): Promise<CopySummary> {
  summary = summary ?? { installed: 0, skipped: 0, failed: 0, details: [] };

  const record = (toolId: string, unitName: string, outcome: Outcome, message?: string) => {
    summary[outcome]++;
    summary.details.push({ toolId, unitName, outcome, message });
  };

  for (const tool of input.tools) {
    for (const u of units(input)) {
      if (u.skillId && input.toolSkillExclusions?.[tool.id]?.includes(u.skillId)) {
        record(tool.id, u.name, "skipped", "not supported by this tool");
        continue;
      }
      const dst = u.dst(tool);
      try {
        if (!fs.existsSync(dst)) {
          writeUnit(u.src, dst, u.kind);
          record(tool.id, u.name, "installed");
          continue;
        }
        if (hashOf(u.src, u.kind) === hashOf(dst, u.kind)) {
          record(tool.id, u.name, "skipped");
          continue;
        }
        const r = await resolve({
          unitName: `${tool.id}/${u.name}`,
          srcPath: u.src,
          dstPath: dst,
          kind: u.kind,
          prompt: input.prompt,
          out: input.out,
        });
        if (r.action === "skip") {
          record(tool.id, u.name, "skipped");
        } else if (r.action === "overwrite") {
          writeUnit(u.src, dst, u.kind);
          record(tool.id, u.name, "installed");
        } else if (r.action === "backup") {
          fs.renameSync(dst, r.backupPath);
          writeUnit(u.src, dst, u.kind);
          record(tool.id, u.name, "installed", `backup at ${r.backupPath}`);
        }
      } catch (err) {
        record(tool.id, u.name, "failed", err instanceof Error ? err.message : String(err));
      }
    }
  }
  return summary;
}
