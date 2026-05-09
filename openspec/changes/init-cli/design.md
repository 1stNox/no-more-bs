# Design: `init-cli`

## Technical Approach

Single-binary Bun CLI that reads bundled templates from its own install path, prompts the user, and writes copies into per-tool user-global directories. State-free: every decision derives from filesystem inspection (PATH, config dir presence, hash compare). No manifest, no markers, no tracking files written.

## Architecture Decisions

### Decision: Copy, not symlink/template/bootstrap
Copy is the only mode users asked for and the only one that works across npm publish, ad-hoc curl install, and offline use. Symlinks break on Windows + npm cache cleanup; templating adds a syntax surface; bootstrap (re-fetch on every run) adds network dependency.
- Rejected: symlink (cross-platform fragility).
- Rejected: per-machine templating (no variable substitution requirement exists).

### Decision: User-global only, no project-local scope
Mirrors how the three target tools actually load instructions and skills (all read user-global as the primary path). Project-local would multiply permutations (per-tool project dir conventions differ) without a user request behind it.

### Decision: Interactive checkbox UX, no flags for v1
Removes flag surface area; aligns with "no features beyond what was asked" in `GENERAL.md`. Pre-check derived from detection (`PATH` lookup OR config dir exists) makes the happy path one Enter keypress.

### Decision: `required: true` skill frontmatter, enforced in CLI
Need a way to lock `caveman` (referenced by `GENERAL.md` line 7) without hard-coding skill names in `src/index.ts`. Frontmatter flag keeps the rule next to the skill it governs and lets future skills opt-in.

### Decision: Stateless hash compare, atomic unit = file or dir
No manifest means no drift between intended state and recorded state. Atomic unit grain matches user expectation: a skill is one unit (a single behavioural change), a top-level md is one unit. Hashing per file inside a skill would over-prompt for cosmetic edits inside a multi-file skill.

- Top-level md: SHA-256 of file content.
- Skill dir: SHA-256 of a sorted `path\0sha256(content)\0…` digest of every file under the dir, so any internal change flips the unit hash exactly once.

### Decision: Conflict resolver branches `[o]verwrite / [s]kip / [d]iff / [b]ackup`
Four-way prompt covers the only outcomes a user could reasonably want at a divergent unit. `[d]` re-displays the prompt after rendering the diff (does not consume the choice).

- `[o]` overwrite: write source over target.
- `[s]` skip: leave target untouched.
- `[d]` diff: print unified diff (file-by-file inside a skill dir), re-prompt.
- `[b]` backup: rename target → `<target>.bak`, then write source.

For skill dirs, `[b]` backs up the dir as `<dir>.bak`. If `<target>.bak` already exists, append a numeric suffix.

### Decision: `init` is the only verb; re-runs use update-framing
One verb minimizes surface area and cognitive load. The CLI inspects target dirs at start and switches the banner copy ("Bootstrapping…" vs "Updating existing install at…") so re-runs do not lie about being fresh installs.

### Decision: Per-unit try/catch, never abort
A failed write to one tool's dir (e.g. `~/.claude/skills/foo` chmod 000) must not block writes to the other two tools. Errors accumulate into the final summary; exit code is 0 if any unit succeeded and 1 only if every unit failed. `SIGINT` prints the accumulated summary and exits 130.

### Decision: Source of truth = bundled npm package
CLI reads from `import.meta.dir` resolving to its own install path. Versioning the templates with the CLI keeps runtime and assets in lockstep — no possibility of a CLI upgrade fighting old templates or vice versa.

### Decision: Repo layout — promote `templates/` to top level
Moving `src/instructions/GENERAL.md` → `templates/GENERAL.md` and `src/skills/*` → `templates/skills/*` separates "code that runs" (`src/`) from "data that ships" (`templates/`). `package.json` `files` array gates exactly these two dirs into the tarball.

## Data Flow

```
                  ┌──────────────────────────┐
                  │ npx no-more-bs init      │
                  └──────────────┬───────────┘
                                 ▼
        detect(claude,codex,opencode) → defaults
                                 ▼
        prompt(tools)  ─►  prompt(skills, required-locked)
                                 ▼
        enumerate(templates/)   ─►  units = [GENERAL.md, …skills]
                                 ▼
        for each (tool × unit):
          hash(src) vs hash(target)
            equal       → skip silently
            target absent → write
            differ      → prompt [o/s/d/b]
                                 ▼
        try/catch per unit, accumulate
                                 ▼
        on SIGINT → partial summary, exit 130
        on end    → summary(installed,skipped,failed)
```

## File Changes

- `src/index.ts` — replace stub; CLI entry.
- `src/lib/detect.ts` — tool detection (PATH + config dir).
- `src/lib/registry.ts` — tool registry (id, binary name, config dir, top-level md filename, skills dir).
- `src/lib/templates.ts` — enumerate `templates/`, parse SKILL.md frontmatter.
- `src/lib/hash.ts` — file hash + dir aggregate hash.
- `src/lib/conflict.ts` — `[o/s/d/b]` resolver, diff renderer, backup writer.
- `src/lib/copy.ts` — copy orchestrator + per-unit try/catch + summary accumulator.
- `src/lib/prompts.ts` — `@inquirer/prompts` wrappers for tool + skill checkboxes (honours `required`).
- `scripts/validate-frontmatter.ts` — pre-publish validator; runs in `prepack`.
- `templates/GENERAL.md` — moved from `src/instructions/GENERAL.md`.
- `templates/skills/*` — moved from `src/skills/*`.
- `templates/skills/caveman/SKILL.md` — frontmatter gains `required: true`.
- `install.sh` — repo root; runner detection → bun fallback install → `npx no-more-bs@latest init`.
- `package.json` — `bin`, `files`, `prepack`, deps (`@inquirer/prompts`, `diff`).
- `README.md` — install instructions + audit alternative.
- `tests/unit/*.test.ts` — pure-logic units.
- `tests/integration/init.test.ts` — full CLI runs against `HOME=$(mktemp -d)`.

`src/instructions/` and `src/skills/` are removed by the move.

## Risks

- **Bun in the published package.** Consumers run `npx`, which uses node by default. The CLI must not rely on Bun-only globals at runtime — stick to Node-compatible APIs (`node:fs`, `node:crypto`, `node:path`). Bun is a dev/test runner here, not a runtime requirement for end users.
- **`@inquirer/prompts` ESM-only.** Match by setting `"type": "module"` (already set) and shipping ESM TS compiled to ESM JS, or running `src/index.ts` directly via the `bin` shim with a Node ≥ 20 shebang and TS-stripping (publish compiled JS to dodge this risk).
- **Hash dir aggregation correctness.** Must include relative paths in the digest, sort deterministically, and use a separator byte that cannot appear in paths. Covered by unit tests.
- **`curl | bash` installer.** Trust boundary. README documents the audit-and-run alternative; installer itself is short and reviewable.
