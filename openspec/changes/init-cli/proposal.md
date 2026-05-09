# Proposal: `init-cli` — bootstrap agentic-coding configs

## Intent

Engineers using Claude Code, Codex, and/or OpenCode currently copy-paste behavioural instructions and skills into each tool's user-global config dir by hand. This is tedious, drifts across machines, and onboarding new tools means redoing the work.

`npx no-more-bs init` ships an interactive CLI that copies a curated set of behavioural instructions (`GENERAL.md`) and reusable skills into the right user-global config dirs for whichever of the three tools the user has installed. Re-runs are idempotent via stateless hash comparison; conflicts prompt per-unit with overwrite/skip/diff/backup.

## Scope

In scope:
- Single verb: `init` (re-run = update).
- Three target tools, user-global only: Claude Code (`~/.claude/`), Codex (`~/.agents/`), OpenCode (`~/.config/opencode/`).
- Copy-mode propagation of bundled `templates/GENERAL.md` (renamed to `CLAUDE.md` or `AGENTS.md` per tool) and `templates/skills/*`.
- Interactive checkbox selection for tools and skills via `@inquirer/prompts`.
  - Tool list pre-checked iff binary on `PATH` **or** config dir exists; undetected tools shown unchecked + `(not detected)`.
  - Skills with frontmatter `required: true` are non-toggleable. `caveman` carries this flag (referenced by `GENERAL.md`).
- Stateless hash comparison per atomic unit (top-level md OR skill dir): equal → silent skip, differs → prompt `[o]verwrite / [s]kip / [d]iff / [b]ackup`.
- Per-unit try/catch; never abort the run. `SIGINT` → partial summary, exit 130. Final summary lists installed/skipped/failed counts.
- `install.sh` at repo root for `curl … | bash` bootstrap; uses bun/pnpm/node if present, else installs bun, then `npx no-more-bs@latest init`.
- Unit + integration tests with `bun test` (integration uses `HOME=$(mktemp -d)`).

Out of scope (flag in plan, do not implement):
- `update` / `list` / `remove` / `doctor` subcommands.
- Stale-skill cleanup when a future version drops a skill the user previously installed.
- Project-local install scope.
- Skill conversion for tools without native skill support (moot — all three have native skills).
- Telemetry / analytics.
- GitHub release binaries, brew tap, custom installer domain.

## Approach

Bun + TypeScript CLI, single source file (`src/index.ts`) backed by small pure helpers. Templates live under top-level `templates/` and ship in the published npm package (`files: ["src","templates"]`); the CLI reads them from `import.meta.dir` at runtime. No persistent state on the user's machine — re-run safety comes from comparing SHA-256 hashes of source vs target. `@inquirer/prompts` for interactive UX, `diff` package for the unified-diff branch of the conflict resolver.

Distribution: `npm publish` + a small `install.sh` on `main` that callers fetch with `curl -fsSL` and pipe to `bash`. README documents the audit alternative (`curl -o install.sh && less && bash`).
