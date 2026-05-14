---
name: openspec
description: >
  Enforces spec-driven development using OpenSpec (https://openspec.dev/). Requires proposals, specs,
  design, and tasks before any implementation. Use when planning a feature, fixing a bug beyond a
  one-liner, making architectural changes, or when the user mentions OpenSpec, /opsx, specs, proposals,
  or spec-driven development. Also use when the user asks to build, add, implement, refactor, or change
  something — route through OpenSpec first, code second.
---

# OpenSpec Enforcement

**Never implement without a change proposal.** Every feature, bug fix, or refactor that touches more than one file must flow through OpenSpec.

## Mandatory Flow

1. **Propose** — `/opsx:propose <change-name>` or `/opsx:new <change-name>`
2. **Refine** — review generated proposal, specs, design, tasks; edit if needed
3. **Implement** — `/opsx:apply`
4. **Verify** — `/opsx:verify` (expanded workflow)
5. **Sync & Archive** — `/opsx:sync` then `/opsx:archive`

Skip steps only for: typos, one-line fixes, config tweaks, or when the user explicitly overrides.

## When to Route Through OpenSpec

Route through OpenSpec when the user asks to:
- Add, build, implement, or create a feature
- Refactor, restructure, or redesign code
- Fix a multi-file bug or add error handling
- Change behavior or requirements

Do **not** route through OpenSpec for: trivial edits, typo fixes, config changes, or single-line adjustments.

## Explore First (Optional)

If requirements are unclear, run `/opsx:explore <topic>` before proposing. This investigates the codebase and compares approaches without creating artifacts.

## Rules

- **No naked implementation.** Never start coding a feature without a change folder in `openspec/changes/`.
- **Read existing specs first.** Before proposing, read `openspec/specs/` to understand current system behavior.
- **Delta specs, not full rewrites.** Delta specs show ADDED/MODIFIED/REMOVED requirements relative to existing specs.
- **Specs describe behavior, not implementation.** No class names, no library choices, no step-by-step plans in `spec.md`. Those go in `design.md` and `tasks.md`.
- **Update when you learn.** If implementation reveals the design was wrong, update artifacts before continuing.
- **New change when intent shifts.** If scope grows past ~50% of the original proposal, archive and start a new change.
- **Archive when done.** Always finish with `/opsx:archive` to merge delta specs into main specs.

## Quick Commands

| Command | Purpose |
|---------|---------|
| `/opsx:propose <name>` | Create change + all planning artifacts |
| `/opsx:explore <topic>` | Think through ideas before committing |
| `/opsx:apply <name>` | Implement tasks from the change |
| `/opsx:sync <name>` | Merge delta specs into main |
| `/opsx:archive <name>` | Archive completed change |
| `/opsx:new <name>` | Scaffold change only (expanded) |
| `/opsx:continue <name>` | Create next artifact (expanded) |
| `/opsx:ff <name>` | Create all planning artifacts (expanded) |
| `/opsx:verify <name>` | Validate implementation (expanded) |

See [REFERENCE.md](REFERENCE.md) for spec format, delta spec rules, artifact structures, and update-vs-new-change heuristics.