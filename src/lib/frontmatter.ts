export interface SkillFrontmatter {
  name: string;
  description: string;
  required?: boolean;
}

const FENCE = /^---\r?\n([\s\S]*?)\r?\n---/;

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
