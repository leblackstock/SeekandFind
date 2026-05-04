---
name: ember-seek-page
description: Generate production-ready Ember children's seek-and-find page prompts, mission-item plans, QA reports, and saved output files. Use for Ember book interior seek pages and hidden-object page generation; do not use for title pages, marketing posts, video storyboards, or KDP final-layout QA.
---

# Ember Seek Page

## Required Behavior

Create a polished seek-and-find illustration prompt for an Amazon KDP-style children's activity book page.

Read first:

- `content/canon/ember-character-canon.md`
- `content/canon/book-01-sparkleflame-canon.md`
- `content/canon/visual-style-guide.md`
- `content/canon/no-readable-text-policy.md`
- relevant files under `content/workflows/`

## Required Inputs

- book title
- page number
- location/theme
- mission item
- audience age range
- page format
- scene purpose

Infer safe defaults from `content/canon/` and clearly mark assumptions.

## Hard Rules

- Ember appears exactly once.
- Ember is visible as guide/helper, not hidden.
- Ember must match canon exactly.
- Include source/reference guidance for Ember-001, Ember-002, and Ember-003 when available.
- No readable generated text.
- Mission item appears exactly once and is findable.
- Rich but readable for ages 5-8.
- Vertical 8.5x11 KDP-style layout with safe-area awareness.
- No horror, danger, weapons focus, creepy lighting, protected brand imitation, or answer marks.

## Output

Create:

1. final image-generation prompt
2. mission item note
3. hidden object category guidance
4. negative prompt / avoid list
5. QA checklist
6. save-path summary

## Save Behavior

Use the local generator when possible:

```powershell
npm run generate:seek -- --page <page> --place "<location>" --mission "<mission item>"
```

Use `--place` in npm scripts because some npm versions reserve `--location` as their own config flag.

Save outputs to:

- `content/outputs/prompts/`
- `content/outputs/qa-reports/`
- `content/workflows/book-01/production-status.md`
- `content/outputs/session-logs/YYYY-MM-DD-session.md`

Do not overwrite existing output unless the user explicitly approves `--force`.

## Failure Conditions

Stop or fail QA if Ember is duplicated, hidden, off-canon, missing references, missing no-readable-text rules, missing page format, missing age range, or if the mission item is marked with a circle, square, box, arrow, outline, highlight, label, or answer mark.
