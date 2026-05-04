---
name: ember-seedance-storyboard
description: Create Ember Seedance image-to-video storyboard packs, timed 15-second clip prompts, camera notes, CapCut edit notes, and manual upload checklists. Use for short marketing video planning; do not use for still seek-page prompts or KDP layout QA.
---

# Ember Seedance Storyboard

## Required Behavior

Create a short, reviewable storyboard pack for Seedance or similar image-to-video tools.

Read first:

- `content/canon/ember-character-canon.md`
- `content/canon/visual-style-guide.md`
- `content/canon/no-readable-text-policy.md`
- relevant marketing or book files if the video references a specific asset

## Default Output

- 15-second structure by default
- 3-5 storyboard beats
- image reference guidance
- camera movement
- character motion
- scene continuity
- CapCut editing notes
- music/sound suggestion
- manual upload checklist

## Hard Rules

- Keep Ember on-model across every beat.
- Use Ember-001, Ember-002, and Ember-003 references when available.
- Keep motion gentle, warm, and age-appropriate.
- Add any needed captions later with editable typography.
- Stop at payment, CAPTCHA, login, account verification, or platform restriction screens.

## Save Behavior

Use:

```powershell
npm run generate:storyboard -- --scene "<scene>" --goal "<goal>"
```

Save outputs under `content/outputs/storyboards/` and append session/progress logs.

## Failure Conditions

Fail if there is no timing, no camera motion, no reference guidance, no character consistency reminder, no CapCut notes, or if the plan asks automation to bypass platform protections.
