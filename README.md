# no-more-bs

Bootstrap shared behavioural instructions and reusable skills across Claude Code,
Codex, OpenCode, Pi, and GitHub Copilot in one interactive command.

## What it does

### Install: `no-more-bs init`

`no-more-bs init` first asks for the install scope:

- **User** (global, all projects) — copies into the user-global config dir of each selected tool.
- **Project** (current directory) — copies into the cwd for one chosen format.

### User scope

Curated `GENERAL.md` (renamed to `CLAUDE.md` or `AGENTS.md` per tool) plus a set of
skills land in the user-global config directory of each agentic-coding tool you
select:

| Tool            | Config dir              | Top-level file | Skills dir                    |
|-----------------|-------------------------|----------------|-------------------------------|
| Claude Code     | `~/.claude/`            | `CLAUDE.md`    | `~/.claude/skills/`           |
| Codex           | `~/.agents/`            | `AGENTS.md`    | `~/.agents/skills/`           |
| OpenCode        | `~/.config/opencode/`   | `AGENTS.md`    | `~/.config/opencode/skills/`  |
| Pi              | `~/.pi/agent/`          | `AGENTS.md`    | `~/.pi/agent/skills/`         |
| GitHub Copilot  | `~/.copilot/` or `$COPILOT_HOME` | `AGENTS.md`    | `$COPILOT_HOME/skills/` |

Tools are pre-checked when their binary is on `PATH` or their config directory exists.

### Project scope

Pick one tool for the current directory. Codex and OpenCode share the AGENTS
format — picking either covers both.

| Tool                         | Top-level file        | Skills dir                  |
|------------------------------|-----------------------|-----------------------------|
| Claude Code                  | `<cwd>/CLAUDE.md`     | `<cwd>/.claude/skills/`     |
| Codex                        | `<cwd>/AGENTS.md`     | `<cwd>/.agents/skills/`     |
| OpenCode                     | `<cwd>/AGENTS.md`     | `<cwd>/.agents/skills/`     |
| Pi                           | `<cwd>/AGENTS.md`     | `<cwd>/.pi/skills/`         |
| GitHub Copilot               | `<cwd>/AGENTS.md`     | `<cwd>/.github/skills/`     |

Skills marked `required: true` (currently `caveman`) are non-toggleable. Re-runs are
idempotent: the CLI hashes each unit and silently skips matches; on mismatch you
get a per-unit prompt with `[o]verwrite / [s]kip / [d]iff / [b]ackup`.

## Bundled skills

`caveman`, `git-guardrails`, `grill-me`, `grill-with-docs`, `handoff`,
`improve-codebase-architecture`, `prototype`, `tdd`, `write-a-skill`, `zoom-out`.

### Clear: `no-more-bs clear`

`no-more-bs clear` removes the files that were installed by `init`. It asks for
the clear scope (user or project), lets you select which tools to clear, and asks
for confirmation before deleting anything.

For **user scope**, it removes:
- The top-level instruction file (`CLAUDE.md` or `AGENTS.md`) from each tool's config directory
- The entire skills directory for each selected tool

For **project scope**, it removes:
- The top-level instruction file from the current directory
- The skills directory from the current directory

> **Warning:** This is a destructive operation. The CLI will ask for confirmation
> and show you exactly which tools and scope will be affected before proceeding.

## Install

One-liner:

```sh
curl -fsSL https://raw.githubusercontent.com/1stNox/no-more-bs/main/install.sh | bash
```

Audit-then-run (recommended if you don't trust pipes-to-shell):

```sh
curl -fsSL https://raw.githubusercontent.com/1stNox/no-more-bs/main/install.sh -o install.sh
less install.sh
bash install.sh
```

The installer probes for `bunx`, `pnpm dlx`, and `npx` in that order; otherwise it
installs Bun and uses `bunx`. It then runs `no-more-bs@latest init` with whichever
runner was found.

If you already have a JS runner, you can skip the installer entirely:

```sh
npx no-more-bs@latest init
```

> **Windows:** the CLI is not tested on Windows. It should work via `npx`/`bunx`,
> but config-directory paths (especially OpenCode's `~/.config/opencode/`) may not
> match where your tools actually look on Windows. Verify the install landed in the
> expected place before relying on it.

## Contributing

Developer documentation lives in [`docs/`](./docs/README.md).

## Credits

- [Matt Pocock](https://github.com/mattpocock/skills/tree/main) — skills concept and structure

## License

MIT.
