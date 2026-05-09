# Tasks

> Granularity: each numbered item is a discrete, session-completable unit. Commit at the end of each top-level section. Follow TDD inside each unit (write the failing test first when a test is named).

## 1. Repo restructure (templates split)

- [ ] 1.1 `mkdir -p templates/skills`
- [ ] 1.2 `git mv src/instructions/GENERAL.md templates/GENERAL.md`
- [ ] 1.3 `git mv src/skills/* templates/skills/` then `rmdir src/instructions src/skills`
- [ ] 1.4 Add `required: true` to `templates/skills/caveman/SKILL.md` frontmatter (between `name:` and `description:`).
- [ ] 1.5 Sanity-check: `find templates -type f | sort` shows `GENERAL.md` plus 10 `skills/<name>/SKILL.md` files.
- [ ] 1.6 Commit: `chore: move instructions+skills into templates/`.

## 2. Package config

- [ ] 2.1 In `package.json` add `"bin": { "no-more-bs": "./dist/index.js" }`.
- [ ] 2.2 Add `"files": ["dist", "templates"]`.
- [ ] 2.3 Add `"scripts": { "build": "bun build src/index.ts --target=node --outfile=dist/index.js", "test": "bun test", "prepack": "bun run scripts/validate-frontmatter.ts && bun run build" }`.
- [ ] 2.4 Add deps: `bun add @inquirer/prompts diff` and `bun add -d @types/diff`.
- [ ] 2.5 Confirm `bun install` clean; commit.

## 3. Pre-publish frontmatter validator

- [ ] 3.1 Write `tests/unit/frontmatter.test.ts` covering: every skill has `name`+`description`, `caveman` has `required: true`, malformed YAML throws.
- [ ] 3.2 Run test → fails (no validator yet).
- [ ] 3.3 Implement `scripts/validate-frontmatter.ts`: walk `templates/skills/*/SKILL.md`, parse YAML between leading `---` fences, assert required keys, assert caveman flag.
- [ ] 3.4 Run test → passes.
- [ ] 3.5 Run validator manually: `bun run scripts/validate-frontmatter.ts` exits 0.
- [ ] 3.6 Commit.

## 4. Tool registry + detection

- [ ] 4.1 Write `tests/unit/detect.test.ts`: stub PATH and `fs.existsSync`, assert `detected === true` when binary on PATH, when only config dir exists, false when neither.
- [ ] 4.2 Run → fails.
- [ ] 4.3 Create `src/lib/registry.ts` exporting `TOOLS = [{ id:"claude", binary:"claude", configDir:"~/.claude", topLevelMd:"CLAUDE.md", skillsDir:"~/.claude/skills" }, …codex, …opencode]` with `~` expanded via `os.homedir()` at access time.
- [ ] 4.4 Create `src/lib/detect.ts` exporting `detectTool(t: Tool): boolean`. Use `which` shell-out (`Bun.$\`which ${t.binary}\``.nothrow()) or pure-JS PATH walk; OR `existsSync(t.configDir)`.
- [ ] 4.5 Run tests → pass. Commit.

## 5. Filename mapper

- [ ] 5.1 Write `tests/unit/filename.test.ts`: `mapTopLevelMd("claude") === "CLAUDE.md"`, codex+opencode → `"AGENTS.md"`, unknown id → throw.
- [ ] 5.2 Implement in `src/lib/registry.ts` (re-using the per-tool field `topLevelMd`). Helper `mapTopLevelMd(id)` is just a lookup.
- [ ] 5.3 Tests pass. Commit.

## 6. Template enumeration + frontmatter parsing

- [ ] 6.1 Write `tests/unit/templates.test.ts`: against a fixture under `tests/fixtures/templates/`, assert `enumerate()` returns `{ generalMd: <abs path>, skills: [{ id, dir, required }, …] }` with `required` true only for skills whose frontmatter says so.
- [ ] 6.2 Implement `src/lib/templates.ts`: resolve `templates/` via `import.meta.dir`-relative path that survives bundling (`new URL("../../templates", import.meta.url)`); list children of `templates/skills/`; for each, read first frontmatter block and parse YAML.
- [ ] 6.3 Tests pass. Commit.

## 7. Hashing

- [ ] 7.1 Write `tests/unit/hash.test.ts`:
  - `hashFile` of a known buffer returns its sha256 hex.
  - `hashDir` is stable across path order, changes when any file's content changes, changes when a file is added/removed.
- [ ] 7.2 Implement `src/lib/hash.ts`: `hashFile(path)` reads + sha256s; `hashDir(path)` walks recursively, sorts entries by relative path, writes `relPath\0<sha256>\0` per file into a sha256 stream, returns final digest hex.
- [ ] 7.3 Tests pass. Commit.

## 8. Conflict resolver

- [ ] 8.1 Write `tests/unit/conflict.test.ts` covering each branch:
  - `[o]` returns `{ action: "overwrite" }`.
  - `[s]` returns `{ action: "skip" }`.
  - `[d]` triggers diff render, re-prompts.
  - `[b]` returns `{ action: "backup", backupPath }`; if `<path>.bak` exists, suffix `.bak.1`, `.bak.2`, …
- [ ] 8.2 Implement `src/lib/conflict.ts`:
  - `resolve({ unit, srcPath, dstPath, kind: "file"|"dir" })` using `@inquirer/prompts` `select` (or a simple readline shim wrapped to stay testable — inject a prompt fn).
  - Diff: for `kind:"file"` use `diff.createPatch`; for `kind:"dir"` walk both dirs, diff file-by-file, prepend each block with the relative path.
  - Backup path resolver picks first non-existing `<dst>.bak[.N]`.
- [ ] 8.3 Tests pass. Commit.

## 9. Copy orchestrator + summary

- [ ] 9.1 Write `tests/unit/copy.test.ts`: with stubbed prompts always returning `overwrite`, copying a unit twice is idempotent (second pass = silent skip, summary shows `skipped:1`).
- [ ] 9.2 Implement `src/lib/copy.ts`:
  - Input: selected tools, selected skills, enumerated templates.
  - For each `(tool, unit)` pair:
    - Compute target path via registry mapping (`generalMd` → `<configDir>/<topLevelMd>`; `skill` → `<skillsDir>/<id>`).
    - If target absent → write.
    - Else if `hashSrc === hashDst` → skip silently.
    - Else → call `resolve(...)`, act on result.
  - Wrap each pair in `try/catch`; push outcome (`installed`|`skipped`|`failed`+err) onto an accumulator.
  - Return summary object.
- [ ] 9.3 Tests pass. Commit.

## 10. Interactive prompts

- [ ] 10.1 Write `tests/unit/prompts.test.ts` (using `@inquirer/prompts` test helpers or by injecting a prompt fn): tool checkbox pre-checks detected tools; skill checkbox marks `required:true` skills as non-toggleable (selecting nothing still includes them).
- [ ] 10.2 Implement `src/lib/prompts.ts`:
  - `pickTools(detection)` → `checkbox` with `checked: detection[id]`, label suffix ` (not detected)` for falsy.
  - `pickSkills(skills)` → `checkbox` with required entries marked `disabled: "required"` and `checked: true`; merge required IDs into the returned list unconditionally.
- [ ] 10.3 Tests pass. Commit.

## 11. CLI entry

- [ ] 11.1 Write `tests/unit/argv.test.ts`: invoking with no args or `init` proceeds; any other arg prints usage to stderr and exits 2.
- [ ] 11.2 Implement `src/index.ts`:
  - Shebang `#!/usr/bin/env node`.
  - Parse `process.argv.slice(2)`; allow `[]` or `["init"]`.
  - Detect tools, enumerate templates, prompt, run copy orchestrator.
  - Print banner: `Updating existing install at …` if **any** target tool's config dir already exists, else `Bootstrapping fresh install`.
  - `process.on("SIGINT", () => { printSummary(acc); process.exit(130); })`.
  - On end: `printSummary(acc); process.exit(acc.failed === acc.total ? 1 : 0)`.
- [ ] 11.3 Tests pass. Manual smoke: `bun run src/index.ts init` against `HOME=$(mktemp -d) PATH=…` writes the expected tree. Commit.

## 12. Integration tests

- [ ] 12.1 Create `tests/integration/init.test.ts`. Helper: spawn the CLI with `HOME` pointing at a fresh tempdir, scripted stdin answering prompts.
- [ ] 12.2 Test: fresh install — all three tools selected, default skills, asserts file tree under each config dir matches the expected mapping (filenames mapped, caveman present, GENERAL.md content equal byte-for-byte modulo filename).
- [ ] 12.3 Test: idempotent re-run — second invocation against the same `HOME` produces zero conflict prompts and `summary.skipped === total`.
- [ ] 12.4 Test: conflict branches — pre-populate target with mutated copy, drive each of `[o/s/d/b]` and assert outcome on disk.
- [ ] 12.5 Test: required skill — answer skill prompt with `caveman` deselected (if achievable); assert it is still installed.
- [ ] 12.6 Test: partial failure — `chmod 000` one tool's `skillsDir` parent, assert other two tools succeed and summary lists the failure.
- [ ] 12.7 All integration tests green. Commit.

## 13. Installer + README

- [ ] 13.1 Write `install.sh` at repo root:
  ```sh
  #!/usr/bin/env bash
  set -euo pipefail
  if command -v bunx >/dev/null;  then runner=bunx
  elif command -v pnpm >/dev/null; then runner="pnpm dlx"
  elif command -v npx >/dev/null;  then runner=npx
  else
    curl -fsSL https://bun.sh/install | bash
    export PATH="$HOME/.bun/bin:$PATH"
    runner=bunx
  fi
  exec $runner no-more-bs@latest init
  ```
- [ ] 13.2 Smoke-test `install.sh` in a clean shell where bun is absent (use `env -i PATH=/usr/bin:/bin bash install.sh` against a local registry or skip the `npx` step in dry-run).
- [ ] 13.3 Update `README.md`:
  - One-liner install: `curl -fsSL https://raw.githubusercontent.com/<owner>/no-more-bs/main/install.sh | bash`.
  - Audit alternative: `curl -fsSL ... -o install.sh && less install.sh && bash install.sh`.
  - What `init` does (one paragraph).
  - List of tools and skills shipped.
- [ ] 13.4 Commit.

## 14. Publish prep (no publish action — flag only)

- [ ] 14.1 Run `bun run prepack` locally; assert `dist/index.js` exists, validator passed, no extra files leaked.
- [ ] 14.2 `npm pack --dry-run`; inspect tarball file list = `src/`? — confirm `files` field excludes `src/` and includes `dist/` + `templates/` only.
- [ ] 14.3 Open follow-up issue: `npm publish` runbook (out-of-band; not part of this change).

## Out-of-scope reminders (do not implement)

- `update`/`list`/`remove`/`doctor` subcommands.
- Stale-skill cleanup across versions.
- Project-local install scope.
- Telemetry.
- GitHub release binaries / brew tap.
- Custom installer domain.
