# OpenSpec Reference

## Spec Format

Specs live in `openspec/specs/<domain>/spec.md`. Each spec contains:

```markdown
# <domain> Specification

## Purpose
High-level description of this spec's domain.

## Requirements

### Requirement: <name>
The system SHALL/MUST/SHOULD <behavior>.

#### Scenario: <name>
- GIVEN <precondition>
- WHEN <action>
- THEN <outcome>
- AND <additional outcome>
```

**RFC 2119 keywords:**
- **MUST/SHALL** — absolute requirement
- **SHOULD** — recommended, exceptions exist
- **MAY** — optional

**Specs describe behavior, not implementation.** No class names, library choices, or step-by-step plans. Those belong in `design.md` and `tasks.md`.

Quick test: if implementation can change without changing externally visible behavior, it does not belong in the spec.

## Delta Specs

Delta specs live in `openspec/changes/<name>/specs/<domain>/spec.md`. They show changes relative to current specs:

```markdown
# Delta for <domain>

## ADDED Requirements

### Requirement: <name>
The system SHALL <new behavior>.

#### Scenario: <name>
- GIVEN ...
- WHEN ...
- THEN ...

## MODIFIED Requirements

### Requirement: <name>
The system SHALL <updated behavior>.
(Previously: <old behavior>)

#### Scenario: <name>
- GIVEN ...
- WHEN ...
- THEN ...

## REMOVED Requirements

### Requirement: <name>
(Reason for removal)
```

**On archive:** ADDED → appended to main spec. MODIFIED → replaces existing. REMOVED → deleted from main spec.

## Artifacts

Each change folder (`openspec/changes/<name>/`) contains:

| Artifact | Purpose | Content |
|----------|---------|---------|
| `proposal.md` | Why and what | Intent, scope, approach, in/out of scope |
| `specs/` | What's changing | Delta specs (ADDED/MODIFIED/REMOVED) |
| `design.md` | How (technical) | Architecture decisions, approach, trade-offs |
| `tasks.md` | Steps to take | Checkbox list `[ ]` / `[x]` |

Artifact dependency flow:

```
proposal ──► specs ──► design ──► tasks ──► implement
```

Each artifact provides context for the next. You can always go back and update earlier artifacts.

## Update vs. New Change

**Update the existing change when:**
- Same intent, refined execution
- Scope narrows (shipping MVP first)
- Learning-driven corrections (codebase isn't structured as expected)

**Start a new change when:**
- Intent fundamentally changed (different problem)
- Scope exploded (>50% of original would be unrecognizable)
- Original is completable and new work stands alone

## Project Config

Optional `openspec/config.yaml`:

```yaml
schema: spec-driven

context: |
  Tech stack: TypeScript, React, Node.js
  Testing: Vitest for unit, Playwright for e2e

rules:
  proposal:
    - Include rollback plan
  specs:
    - Use Given/When/Then format
  design:
    - Include sequence diagrams for complex flows
```

Context is injected into all artifact instructions. Rules are injected per-artifact.

## CLI Quick Reference

| Command | Purpose |
|---------|---------|
| `openspec init` | Initialize OpenSpec in a project |
| `openspec update` | Regenerate AI guidance and slash commands |
| `openspec config profile` | Select workflow profile (core/expanded) |
| `openspec schemas --json` | List available schemas and artifact IDs |

Install: `npm install -g @fission-ai/openspec@latest`
Docs: https://openspec.dev/

## Progressive Rigor

**Lite spec (default):** Short behavior-first requirements, clear scope, a few acceptance checks. Most changes stay here.

**Full spec (higher risk):** Cross-team/cross-repo changes, API/contract changes, migrations, security/privacy concerns. Use when ambiguity is likely to cause expensive rework.
