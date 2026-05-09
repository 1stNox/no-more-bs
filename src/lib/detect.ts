import fs from "node:fs";
import path from "node:path";
import type { Tool } from "./registry.ts";

export function isBinaryOnPath(binary: string): boolean {
  const raw = process.env.PATH ?? "";
  const sep = process.platform === "win32" ? ";" : ":";
  for (const dir of raw.split(sep)) {
    if (!dir) continue;
    const full = path.join(dir, binary);
    try {
      const st = fs.statSync(full);
      if (!st.isFile()) continue;
      if (process.platform === "win32") return true;
      if ((st.mode & 0o111) !== 0) return true;
    } catch {}
  }
  return false;
}

export function detectTool(t: Pick<Tool, "binary" | "configDir">): boolean {
  if (isBinaryOnPath(t.binary)) return true;
  try { return fs.statSync(t.configDir).isDirectory(); } catch { return false; }
}
