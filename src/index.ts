#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { getTools } from "./lib/registry.ts";
import { detectTool } from "./lib/detect.ts";
import { enumerate } from "./lib/templates.ts";
import { copy, type CopySummary } from "./lib/copy.ts";
import { pickTools, pickSkills, pickConflict } from "./lib/prompts.ts";

export interface ArgvParse {
  ok: boolean;
  usage?: string;
}

export function parseArgv(argv: string[]): ArgvParse {
  if (argv.length === 0) return { ok: true };
  if (argv.length === 1 && argv[0] === "init") return { ok: true };
  return { ok: false, usage: "Usage: no-more-bs [init]" };
}

function defaultTemplatesDir(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.join(here, "..", "templates");
}

export function printSummary(summary: CopySummary, out: NodeJS.WritableStream = process.stdout) {
  out.write(
    `\nSummary: ${summary.installed} installed, ${summary.skipped} skipped, ${summary.failed} failed.\n`,
  );
  for (const d of summary.details) {
    if (d.outcome === "failed") {
      out.write(`  failed: ${d.toolId}/${d.unitName}: ${d.message}\n`);
    } else if (d.message) {
      out.write(`  ${d.outcome}: ${d.toolId}/${d.unitName} (${d.message})\n`);
    }
  }
}

async function runInit(): Promise<number> {
  const tools = getTools();
  const detected: Record<string, boolean> = {};
  for (const t of tools) detected[t.id] = detectTool(t);

  const existing = tools.filter((t) => fs.existsSync(t.configDir));
  const banner = existing.length
    ? `Updating existing install at: ${existing.map((t) => t.configDir).join(", ")}\n`
    : `Bootstrapping fresh install\n`;
  process.stdout.write(banner);

  const tpl = enumerate(defaultTemplatesDir());
  const selectedTools = await pickTools(tools, detected);
  if (selectedTools.length === 0) {
    process.stdout.write("No tools selected. Nothing to do.\n");
    return 0;
  }
  const selectedSkills = await pickSkills(tpl.skills);

  const summary: CopySummary = { installed: 0, skipped: 0, failed: 0, details: [] };

  process.on("SIGINT", () => {
    printSummary(summary);
    process.exit(130);
  });

  await copy(
    {
      tools: selectedTools,
      generalMd: tpl.generalMd,
      skills: selectedSkills,
      prompt: (unitName) => pickConflict(unitName),
      out: process.stdout,
    },
    summary,
  );

  printSummary(summary);
  const total = summary.details.length;
  return total > 0 && summary.failed === total ? 1 : 0;
}

if (import.meta.main) {
  const parsed = parseArgv(process.argv.slice(2));
  if (!parsed.ok) {
    process.stderr.write(`${parsed.usage}\n`);
    process.exit(2);
  }
  runInit()
    .then((code) => process.exit(code))
    .catch((err) => {
      process.stderr.write(`error: ${err instanceof Error ? err.message : String(err)}\n`);
      process.exit(1);
    });
}
