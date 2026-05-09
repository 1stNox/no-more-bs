import fs from "fs";
import path from "path";
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
    } catch {
      continue;
    }
  }
  return false;
}

export function detectTool(t: Pick<Tool, "binary" | "configDir">): boolean {
  return isBinaryOnPath(t.binary) || fs.existsSync(t.configDir);
}
