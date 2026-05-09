# no-more-bs

Bootstrap shared behavioural instructions and reusable skills across Claude Code, Codex, and OpenCode in one interactive command.

## What it does

`no-more-bs init` copies a curated `GENERAL.md` (renamed to `CLAUDE.md` or `AGENTS.md` per tool) plus a set of skills into the user-global config directory of each agentic-coding tool you use:

| Tool        | Config dir              | Top-level file | Skills dir                    |
|-------------|-------------------------|----------------|-------------------------------|
| Claude Code | `~/.claude/`            | `CLAUDE.md`    | `~/.claude/skills/`           |
| Codex       | `~/.agents/`            | `AGENTS.md`    | `~/.agents/skills/`           |
| OpenCode    | `~/.config/opencode/`   | `AGENTS.md`    | `~/.config/opencode/skills/`  |

Tools are pre-checked when their binary is on `PATH` or their config directory exists. Skills marked `required: true` (currently `caveman`) are non-toggleable. Re-runs are idempotent: the CLI hashes each unit and silently skips matches; on mismatch you get a per-unit prompt with `[o]verwrite / [s]kip / [d]iff / [b]ackup`.

## Bundled skills

`caveman`, `git-guardrails`, `grill-me`, `grill-with-docs`, `handoff`, `improve-codebase-architecture`, `prototype`, `tdd`, `write-a-skill`, `zoom-out`.

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

The installer probes for `bunx`, `pnpm dlx`, and `npx` in that order; otherwise it installs Bun and uses `bunx`. It then runs `no-more-bs@latest init` with whichever runner was found.

If you already have a JS runner, you can skip the installer entirely:

```sh
npx no-more-bs@latest init
```

> **Windows:** the CLI is not tested on Windows. It should work via `npx`/`bunx`, but config-directory paths (especially OpenCode's `~/.config/opencode/`) may not match where your tools actually look on Windows. Verify the install landed in the expected place before relying on it.

## Contributing

Developer documentation lives in [`docs/`](./docs/README.md).

## Credits

- [Matt Pocock](https://github.com/mattpocock/skills/tree/main) — skills concept and structure

## License

MIT.
