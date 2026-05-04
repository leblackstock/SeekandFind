---
name: ember-kdp-qa
description: QA Ember prompts, generated image notes, and KDP-readiness text for page format, safe areas, readable-text problems, Ember consistency, scene density, and child-safe tone. Use for final prompt/page review; do not use to generate new creative prompts from scratch.
---

# Ember KDP QA

## Required Behavior

Review prompts or final image notes for KDP-readiness and Ember rule compliance.

Read first:

- `content/canon/ember-character-canon.md`
- `content/canon/visual-style-guide.md`
- `content/canon/no-readable-text-policy.md`
- relevant book workflow files

## Checks

- page size/aspect intent
- bleed, trim, gutter, and safe-area reminder
- no important details near trim
- no readable generated text
- no labels, arrows, circles, boxes, answer marks, watermarks, or fake text
- Ember consistency
- scene density and readability
- child-safe tone

## Save Behavior

Use:

```powershell
npm run qa:kdp -- --file <path>
```

Save QA reports under `content/outputs/qa-reports/` and append session/progress logs.

## Failure Conditions

Fail loudly for missing KDP format, missing safe-area language, readable generated text, answer marks, off-canon Ember, excessive clutter, unsafe tone, or stale book-structure claims.
