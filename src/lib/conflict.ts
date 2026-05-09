import fs from "fs";
import path from "path";
import { createPatch } from "diff";

export type ResolverChoice = "overwrite" | "skip" | "diff" | "backup";
export type Action = "overwrite" | "skip" | "backup";

export interface ResolveResult {
  action: Action;
  backupPath?: string;
}

export interface ResolveInput {
  unitName: string;
  srcPath: string;
  dstPath: string;
  kind: "file" | "dir";
  prompt: () => Promise<ResolverChoice>;
  out?: NodeJS.WritableStream;
}

export async function resolve(input: ResolveInput): Promise<ResolveResult> {
  const out = input.out ?? process.stdout;
  for (;;) {
    const choice = await input.prompt();
    if (choice === "overwrite") return { action: "overwrite" };
    if (choice === "skip") return { action: "skip" };
    if (choice === "backup") {
      return { action: "backup", backupPath: nextBackupPath(input.dstPath) };
    }
    out.write(renderDiff(input));
  }
}

export function nextBackupPath(dst: string): string {
  if (!fs.existsSync(`${dst}.bak`)) return `${dst}.bak`;
  for (let n = 1; ; n++) {
    const candidate = `${dst}.bak.${n}`;
    if (!fs.existsSync(candidate)) return candidate;
  }
}

export function renderDiff(input: Pick<ResolveInput, "srcPath" | "dstPath" | "kind">): string {
  if (input.kind === "file") {
    const src = fs.readFileSync(input.srcPath, "utf-8");
    const dst = fs.existsSync(input.dstPath) ? fs.readFileSync(input.dstPath, "utf-8") : "";
    return createPatch(path.basename(input.dstPath), dst, src);
  }

  const collect = (root: string): Map<string, string> => {
    const m = new Map<string, string>();
    if (!fs.existsSync(root)) return m;
    const walk = (cur: string) => {
      for (const ent of fs.readdirSync(cur, { withFileTypes: true })) {
        const abs = path.join(cur, ent.name);
        if (ent.isDirectory()) walk(abs);
        else if (ent.isFile()) m.set(path.relative(root, abs), fs.readFileSync(abs, "utf-8"));
      }
    };
    walk(root);
    return m;
  };

  const srcMap = collect(input.srcPath);
  const dstMap = collect(input.dstPath);
  const all = new Set([...srcMap.keys(), ...dstMap.keys()]);
  const blocks: string[] = [];
  for (const rel of [...all].sort()) {
    const a = dstMap.get(rel) ?? "";
    const b = srcMap.get(rel) ?? "";
    if (a === b) continue;
    blocks.push(createPatch(rel, a, b));
  }
  return blocks.join("\n");
}
