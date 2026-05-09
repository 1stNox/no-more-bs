# Delta for `cli`

> Greenfield change — `openspec/specs/cli/spec.md` does not yet exist. All requirements below are ADDED. On archive, this file is promoted to the canonical spec.

## ADDED Requirements

### Requirement: Single `init` verb
The CLI MUST expose exactly one verb, `init`, invoked as `npx no-more-bs init` (or with no args). Any other argument MUST print a usage line to stderr and exit non-zero.

#### Scenario: No args runs init
- GIVEN the CLI is published as `no-more-bs`
- WHEN the user runs `npx no-more-bs`
- THEN the CLI behaves identically to `npx no-more-bs init`

#### Scenario: Unknown verb errors out
- GIVEN the CLI is invoked with `npx no-more-bs update`
- WHEN argv parsing runs
- THEN the process exits with code 2 and writes a usage line to stderr
- AND no filesystem writes occur

### Requirement: Tool detection drives default selection
The CLI MUST detect each of the three target tools and pre-check their checkbox iff the tool's binary is on `PATH` OR its user-global config directory exists.

#### Scenario: Detected tool is pre-checked
- GIVEN `claude` is on the user's `PATH`
- WHEN the tool checkbox prompt renders
- THEN the `Claude Code` row is pre-checked
- AND no `(not detected)` annotation appears on it

#### Scenario: Undetected tool is selectable
- GIVEN none of `codex` is on `PATH`, nor does `~/.agents/` exist
- WHEN the tool checkbox prompt renders
- THEN the `Codex` row is unchecked and annotated `(not detected)`
- AND the user can still select it

### Requirement: Skill selection honours `required` frontmatter
A skill whose `SKILL.md` frontmatter contains `required: true` MUST be installed for every selected tool, regardless of user input on the skill checkbox.

#### Scenario: Caveman cannot be deselected
- GIVEN `templates/skills/caveman/SKILL.md` frontmatter contains `required: true`
- WHEN the skill checkbox renders
- THEN the `caveman` entry is shown as required and non-toggleable
- AND the returned skill list always contains `caveman`

#### Scenario: Non-required skill can be deselected
- GIVEN `templates/skills/tdd/SKILL.md` frontmatter contains no `required` flag
- WHEN the user deselects the `tdd` row
- THEN `tdd` is excluded from the install for every selected tool

### Requirement: Filename mapping per tool
The top-level instructions file MUST be written as `CLAUDE.md` for Claude Code and as `AGENTS.md` for both Codex and OpenCode. Source filename in the package remains `templates/GENERAL.md`.

#### Scenario: Claude gets CLAUDE.md
- GIVEN the user selected Claude Code
- WHEN the copy phase runs for the top-level md
- THEN `~/.claude/CLAUDE.md` is the target path

#### Scenario: Codex and OpenCode get AGENTS.md
- GIVEN the user selected Codex and OpenCode
- WHEN the copy phase runs for the top-level md
- THEN both `~/.agents/AGENTS.md` and `~/.config/opencode/AGENTS.md` are written from the same source file

### Requirement: User-global only, no project-local writes
The CLI MUST write only to user-global config directories (`~/.claude/`, `~/.agents/`, `~/.config/opencode/`). It MUST NOT write into the current working directory or any subdirectory thereof.

#### Scenario: CWD untouched
- GIVEN the user runs `init` from inside a project repo
- WHEN the run completes successfully
- THEN no file under the CWD has been created or modified by the CLI

### Requirement: Stateless hash compare
The CLI MUST decide whether each unit (top-level md OR skill directory) is identical between source and target by comparing SHA-256 hashes computed at runtime. It MUST NOT persist any manifest, marker file, or sentinel between runs.

#### Scenario: Equal hash means silent skip
- GIVEN a previous `init` run installed `caveman` and the user has not modified it
- WHEN the user re-runs `init`
- THEN the `caveman` unit is skipped silently with no prompt
- AND the run summary increments `skipped` for that unit

#### Scenario: Differing hash triggers conflict prompt
- GIVEN the user manually edited `~/.claude/skills/caveman/SKILL.md`
- WHEN the user re-runs `init`
- THEN a conflict prompt fires once for the `caveman` unit
- AND it offers `[o]verwrite / [s]kip / [d]iff / [b]ackup`

### Requirement: Conflict resolver branches
On hash mismatch, the CLI MUST present a four-way prompt and execute the chosen branch.

#### Scenario: Overwrite replaces target
- GIVEN a divergent unit and the user picks `[o]`
- WHEN the action runs
- THEN the target is replaced byte-for-byte by the source
- AND the summary increments `installed`

#### Scenario: Skip leaves target untouched
- GIVEN a divergent unit and the user picks `[s]`
- WHEN the action runs
- THEN the target is unchanged
- AND the summary increments `skipped`

#### Scenario: Diff renders and re-prompts
- GIVEN a divergent unit and the user picks `[d]`
- WHEN the diff renders
- THEN a unified diff (file-by-file inside a skill dir) is printed to stdout
- AND the same four-way prompt is shown again

#### Scenario: Backup preserves the existing target
- GIVEN a divergent unit and the user picks `[b]`
- WHEN the action runs
- THEN the existing target is renamed to `<target>.bak` (suffix `.bak.1`, `.bak.2`, … if `.bak` is taken)
- AND the source is written to the original target path
- AND the summary increments `installed`

### Requirement: Atomic unit grain
A conflict prompt MUST fire at most once per top-level md and at most once per skill directory. The CLI MUST NOT prompt per file inside a skill directory.

#### Scenario: One prompt per skill dir
- GIVEN three files inside `~/.claude/skills/handoff/` differ from the source
- WHEN the conflict resolver runs
- THEN exactly one prompt fires for the `handoff` unit
- AND the chosen action applies to the entire directory atomically

### Requirement: Per-unit error containment
Errors writing one unit MUST NOT abort the run. The CLI MUST catch per-unit errors, record them, and continue with remaining units.

#### Scenario: One tool's dir is unwritable
- GIVEN `~/.claude/skills/` is chmod 000 and the user selected Claude, Codex, OpenCode
- WHEN the run executes
- THEN every Claude unit fails with a recorded error
- AND every Codex and OpenCode unit succeeds
- AND the final summary reports the per-unit failures with the underlying error

### Requirement: SIGINT prints summary and exits 130
On `SIGINT`, the CLI MUST print the accumulated summary and exit with status 130.

#### Scenario: User Ctrl-C mid-run
- GIVEN the run has installed two units and is mid-prompt for a third
- WHEN the user sends SIGINT
- THEN the partial summary is printed (2 installed, others not attempted)
- AND the process exits with code 130

### Requirement: Final summary
On normal termination the CLI MUST print a final summary listing counts of installed, skipped, and failed units. Exit code MUST be 0 unless every unit failed, in which case exit MUST be 1.

#### Scenario: Mixed run reports counts
- GIVEN the run results in 4 installed, 6 skipped, 1 failed
- WHEN the CLI exits normally
- THEN stdout contains a summary block with those three counts
- AND the exit code is 0

#### Scenario: Total failure exits 1
- GIVEN every unit failed (e.g. all target dirs unwritable)
- WHEN the CLI exits normally
- THEN the summary lists every failure
- AND the exit code is 1

### Requirement: Source bundled in published package
The CLI MUST resolve `templates/` relative to its own install path (`import.meta.url`) and MUST NOT fetch templates from the network at runtime.

#### Scenario: Offline run
- GIVEN the user has no network connectivity
- WHEN the user runs an already-installed CLI
- THEN the run completes without any network call
- AND all installed content originates from the bundled `templates/` directory

### Requirement: Update-framing on re-run
The CLI MUST detect whether any target tool's config dir already exists at start-of-run and switch its banner copy accordingly: `Bootstrapping fresh install` if none exist, `Updating existing install at …` otherwise.

#### Scenario: First-time run
- GIVEN none of `~/.claude`, `~/.agents`, `~/.config/opencode` exists
- WHEN the CLI prints its banner
- THEN the banner reads `Bootstrapping fresh install`

#### Scenario: Re-run framing
- GIVEN at least one target tool's config dir exists
- WHEN the CLI prints its banner
- THEN the banner reads `Updating existing install at <list of detected dirs>`

### Requirement: Pre-publish frontmatter validation
A `prepack` script MUST validate every `templates/skills/*/SKILL.md` frontmatter and fail the publish if any file is missing required keys, has malformed YAML, or if `caveman` lacks `required: true`.

#### Scenario: Malformed frontmatter blocks publish
- GIVEN a skill's `SKILL.md` has malformed YAML
- WHEN `bun run prepack` runs
- THEN the validator exits non-zero
- AND `npm pack`/`npm publish` is aborted before producing a tarball

#### Scenario: Caveman missing required flag blocks publish
- GIVEN `templates/skills/caveman/SKILL.md` lacks `required: true`
- WHEN `bun run prepack` runs
- THEN the validator exits non-zero with a message naming the missing flag
