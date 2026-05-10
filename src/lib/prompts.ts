import { checkbox, select } from "@inquirer/prompts";
import type { ResolverChoice } from "./conflict.ts";
import type { Scope, Tool } from "./registry.ts";
import type { SkillEntry } from "./templates.ts";

export interface PromptDeps {
  checkbox?: typeof checkbox;
  select?: typeof select;
}

export async function pickScope(deps: PromptDeps = {}): Promise<Scope> {
  const ask = deps.select ?? select;
  return (await ask({
    message: "Install scope:",
    choices: [
      { name: "User (global, all projects)", value: "user" },
      { name: "Project (current directory)", value: "project" },
    ],
  })) as Scope;
}

export async function pickProjectTool(tools: Tool[], deps: PromptDeps = {}): Promise<Tool> {
  const ask = deps.select ?? select;
  const id = (await ask({
    message: "Select coding agent format:",
    choices: tools.map((t) => ({ name: t.label, value: t.id })),
  })) as string;
  const t = tools.find((x) => x.id === id);
  if (!t) throw new Error(`unknown tool: ${id}`);
  return t;
}

export async function pickTools(
  tools: Tool[],
  detected: Record<string, boolean>,
  deps: PromptDeps = {},
): Promise<Tool[]> {
  const ask = deps.checkbox ?? checkbox;
  const ids = (await ask({
    message: "Select tools to install for:",
    choices: tools.map((t) => ({
      name: detected[t.id] ? t.label : `${t.label} (not detected)`,
      value: t.id,
      checked: !!detected[t.id],
    })),
  })) as string[];
  return tools.filter((t) => ids.includes(t.id));
}

export async function pickSkills(
  skills: SkillEntry[],
  deps: PromptDeps = {},
): Promise<SkillEntry[]> {
  const ask = deps.checkbox ?? checkbox;
  const required = skills.filter((s) => s.required);
  const optional = skills.filter((s) => !s.required);
  const choices = [
    ...required.map((s) => ({
      name: `${s.id} (required)`,
      value: s.id,
      checked: true,
      disabled: "required",
    })),
    ...optional.map((s) => ({
      name: s.id,
      value: s.id,
      checked: true,
    })),
  ];
  const picked = (await ask({ message: "Select skills to install:", choices })) as string[];
  const set = new Set([...required.map((s) => s.id), ...picked]);
  return skills.filter((s) => set.has(s.id));
}

export async function pickConflict(
  unitName: string,
  deps: PromptDeps = {},
): Promise<ResolverChoice> {
  const ask = deps.select ?? select;
  return (await ask({
    message: `${unitName}: target differs. What now?`,
    choices: [
      { name: "[o]verwrite", value: "overwrite" },
      { name: "[s]kip", value: "skip" },
      { name: "[d]iff", value: "diff" },
      { name: "[b]ackup", value: "backup" },
    ],
  })) as ResolverChoice;
}
