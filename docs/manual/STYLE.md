# GleeWorld Manual — House Style Guide

This guide governs every page under `docs/manual/`. It exists so the manual
reads as one professionally published voice regardless of who (or which expert
lens) authored a section.

## Voice & tone

- **Task-oriented.** Titles and sections answer "How do I…?" Lead with what the
  reader wants to accomplish.
- **Second person, imperative.** "Open **Settings**," not "The user can open
  settings" or "We open settings."
- **Plain and warm.** Written for a busy choir director or a first-time student,
  not an engineer. Prefer short sentences. Define a term the first time it
  appears; link it to the Glossary.
- **Confident, not hedging.** State how the product works. If you cannot confirm
  it, mark it `[VERIFY: ...]` (see below) — do not guess.

## Page structure

Every page starts with YAML frontmatter, then an `# H1` matching the title, then
a one- or two-sentence intro, then the content.

### Frontmatter contract (required on every page)

```yaml
---
title: Inviting students to your roster
audience: tenant          # one of: tenant | student | fan | all
order: 3                  # integer; reading order within the section
summary: Add students to your program and send their invitations.
updated: 2026-07-08
---
```

### Writing steps

- **One action per numbered step.** Break "Open Settings and click Save" into
  two steps.
- **Prerequisites first.** State what the reader needs before the steps (a role,
  an activated add-on, a plan) in a short "Before you start" line.
- **Bold UI labels.** Buttons, menu items, and fields in **bold**: click
  **Add student**.
- **Callouts** for warnings or tips, as a blockquote prefixed with `**Note:**`,
  `**Tip:**`, or `**Warning:**`.
- **Screenshots** where they materially help. If a screenshot is needed but not
  yet captured, insert `![VERIFY: screenshot of the roster screen]()` so it is
  tracked.

## Terminology (enforced by `manual-lint`)

- **GleeWorld** is the platform. Individual choirs, bands, and schools are
  **tenants**. Never hardcode one tenant's name (e.g., "Spelman") in shared copy;
  use "your program" or "your organization."
- Say **students** — not "singers" or "members" — for the people in a program.
- Say **graduates** — not "alumnae," "alumna," or "alumni." (Hard-fail in lint.)
- A student's login is a **sub-account** under a tenant.
- Optional paid features are **add-ons**; their availability is
  **plan/entitlement-dependent** — never describe an add-on as always present.

## The `[VERIFY]` convention

When you cannot confirm behavior from the product/repo, write
`[VERIFY: the specific question]` inline. These are collected and surfaced to the
owner for answers; they are **never** silently guessed. `manual-lint --strict`
fails while any remain.

## Accuracy

Every product claim must trace to a fact sheet in `docs/manual/_factsheets/`.
Fact sheets are internal (not shipped to readers) and carry `file:line`
provenance from the codebase.

## Page template

```markdown
---
title: <Task-oriented title>
audience: <tenant|student|fan|all>
order: <n>
summary: <one line>
updated: 2026-07-08
---

# <Task-oriented title>

<One or two sentences: what this page helps the reader do.>

**Before you start:** <prerequisites, if any.>

## <Sub-task>

1. <One action.>
2. <One action.>

> **Tip:** <optional.>

**See also:** [<related page>](../section/page.md)
```
