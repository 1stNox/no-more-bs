import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export function hashFile(filePath: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

export function hashDir(dirPath: string): string {
  const files: string[] = [];

  const walk = (cur: string) => {
    for (const ent of fs.readdirSync(cur, { withFileTypes: true })) {
      const abs = path.join(cur, ent.name);
      if (ent.isDirectory()) walk(abs);
      else if (ent.isFile()) files.push(abs);
    }
  };

  walk(dirPath);
  files.sort();

  const h = crypto.createHash("sha256");
  for (const abs of files) {
    const rel = path.relative(dirPath, abs);
    h.update(rel);
    h.update("\0");
    h.update(hashFile(abs));
    h.update("\0");
  }
  return h.digest("hex");
}
