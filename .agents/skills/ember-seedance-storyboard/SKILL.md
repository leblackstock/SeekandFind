---
name: ember-seedance-storyboard
description: Create Ember Seedance image-to-video storyboard packs, timed 15-second clip prompts, camera notes, CapCut edit notes, and manual upload checklists. Use for short marketing video planning; do not use for still seek-page prompts or KDP layout QA.
---

# Ember Seedance Storyboard

## Required Behavior

Create a short, reviewable storyboard pack for Seedance or similar image-to-video tools.

Separate two short-video types before generating or using a storyboard:

- `motion-only image-to-video`: the model receives a visual prompt and should not create on-screen words.
- `captioned narration short`: CapCut storyboard/script blocks intentionally create visible bottom text, useful for narrated/descriptive Shorts/Reels/TikToks.

Do not paste timed beat text into CapCut storyboard/script blocks for a motion-only video. CapCut renders those block words across the bottom of the video.

For CapCut/Dreamina, do not use `Full video` as the default motion-only lane. The first Day 1 test turned a 15-second brief into a multi-clip storyboard with visible text and off-model/generated media. For clean no-caption Ember motion tests, prefer `Video clip` / single-scene image-to-video, even if that means using a shorter clip under 15 seconds.

The `captioned narration short` lane may also become an AI-animation workflow later, but that path is not proven yet. Until tested, treat it as a separate caption/narration marketing subtype, not the default clean Seedance motion workflow.

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
- If using CapCut storyboard/script blocks, classify the output as a `captioned narration short`, not as a clean motion-only Seedance export.
- If using CapCut/Dreamina for clean motion-only output, use the single-scene `Video clip` lane rather than `Full video` unless a later successful test proves otherwise.
- Stop at payment, CAPTCHA, login, account verification, or platform restriction screens.

## Save Behavior

Use:

```powershell
npm run generate:storyboard -- --scene "<scene>" --goal "<goal>"
```

Save outputs under `content/outputs/storyboards/` and append session/progress logs.

## Failure Conditions

Fail if there is no timing, no camera motion, no reference guidance, no character consistency reminder, no CapCut notes, or if the plan asks automation to bypass platform protections.
