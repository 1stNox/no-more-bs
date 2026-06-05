import fs from "node:fs";
import path from "node:path";
import type { Tool } from "./registry.ts";

export interface ClearSummary {
  removed: number;
  failed: number;
  details: ClearResult[];
}

export interface ClearResult {
  toolId: string;
  unitName: string;
  outcome: "removed" | "failed" | "not_found";
  message?: string;
}

export interface ClearInput {
  tools: Tool[];
  out?: NodeJS.WritableStream;
}

interface Unit {
  name: string;
  dst: (tool: Tool) => string;
  isDir: boolean;
}

function units(): Unit[] {
  return [
    {
      name: "top-level md",
      dst: (t) => path.join(t.configDir, t.topLevelMd),
      isDir: false,
    },
    {
      name: "skills dir",
      dst: (t) => t.skillsDir,
      isDir: true,
    },
  ];
}

export async function clear(input: ClearInput, summary?: ClearSummary): Promise<ClearSummary> {
  summary = summary ?? { removed: 0, failed: 0, details: [] };

  const record = (toolId: string, unitName: string, outcome: ClearResult["outcome"], message?: string) => {
    if (outcome === "removed") summary.removed++;
    else if (outcome === "failed") summary.failed++;
    summary.details.push({ toolId, unitName, outcome, message });
  };

  for (const tool of input.tools) {
    for (const u of units()) {
      const dst = u.dst(tool);
      try {
        if (!fs.existsSync(dst)) {
          record(tool.id, u.name, "not_found");
          continue;
        }
        if (u.isDir) {
          fs.rmSync(dst, { recursive: true, force: true });
        } else {
          fs.unlinkSync(dst);
        }
        record(tool.id, u.name, "removed");
      } catch (err) {
        record(tool.id, u.name, "failed", err instanceof Error ? err.message : String(err));
      }
    }
  }
  return summary;
}

export function printClearSummary(summary: ClearSummary, out: NodeJS.WritableStream = process.stdout) {
  out.write(
    `\nSummary: ${summary.removed} removed, ${summary.failed} failed.\n`,
  );
  for (const d of summary.details) {
    if (d.outcome === "failed") {
      out.write(`  failed: ${d.toolId}/${d.unitName}: ${d.message}\n`);
    } else if (d.outcome === "not_found") {
      out.write(`  not found: ${d.toolId}/${d.unitName}\n`);
    } else if (d.message) {
      out.write(`  ${d.outcome}: ${d.toolId}/${d.unitName} (${d.message})\n`);
    } else {
      out.write(`  ${d.outcome}: ${d.toolId}/${d.unitName}\n`);
    }
  }
}
