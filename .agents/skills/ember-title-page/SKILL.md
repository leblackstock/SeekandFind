---
name: ember-title-page
description: Generate Ember title-page image prompts and title-page QA notes. Use for book title pages, cover-adjacent title art, and opening-page composition; do not use for hidden-object seek pages, marketing packs, or video storyboards.
---

# Ember Title Page

## Required Behavior

Create a title-page image prompt that supports later layout typography and keeps Ember on-model. This is not a hidden-object page.

Read first:

- `content/canon/ember-character-canon.md`
- `content/canon/visual-style-guide.md`
- `content/canon/no-readable-text-policy.md`
- relevant book canon under `content/canon/`

## Required Inputs

- book title
- theme or visual direction
- audience
- page format

## Hard Rules

- Ember must be clear, friendly, and on-model.
- Use Ember-001, Ember-002, and Ember-003 references when available.
- Do not ask the image model to invent title text, fake text, labels, or page numbers.
- Exact title typography should be added later in layout unless the user explicitly requests exact text generation.
- Preserve vertical 8.5x11 KDP-style safe-area awareness.

## Save Behavior

Use:

```powershell
npm run generate:title -- --book "<book title>" --theme "<theme>"
```

Save prompt output under `content/outputs/prompts/` and append session/progress logs.

## Failure Conditions

Fail if the prompt treats the title page as a hidden-object puzzle, leaves unresolved title placeholders, invents fake readable text, omits Ember references, or contradicts Ember canon.
