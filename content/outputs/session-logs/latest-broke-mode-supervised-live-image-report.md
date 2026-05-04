# Broke Mode Supervised Live Image Report

## Summary

Ran one supervised Broke Mode existing-browser image attempt for Book 1 page 8, Glowing Lantern Garden. The prompt was pasted into ChatGPT and the image request was submitted only after human approval. ChatGPT generated or began generating an image, but the helper could not find a reliable download button, so it archived screenshot evidence and marked the attempt failed/manual-download-required.

During prompt review, Lauren identified that the prompt was still too much of a source packet. It was clean of local links and paths, but included unnecessary production assumptions, marketing rules, and post-approval find-list guidance. Broke Mode has now been patched to compact the final ChatGPT prompt into image-facing sections only.

## Git Push Result

`git push` succeeded before the live attempt.

Remote update:

`cd0219d..de4c7a1  main -> main`

## Preflight Checks

- `npm run build`: passed.
- `npm run test`: passed, 10 test files and 47 tests.
- `npm run n8n:check`: passed.
- Prompt file exists: `content/outputs/prompts/book01-page008-glowing-lantern-garden-image-prompt.md`.

## Prompt Used

Source prompt:

`content/outputs/prompts/book01-page008-glowing-lantern-garden-image-prompt.md`

Archived live-attempt prompt:

`content/outputs/images/failed/book01-page008-glowing-lantern-garden-2026-05-04T02-07-03-697Z/book01-page008-glowing-lantern-garden-2026-05-04T02-07-03-697Z-prompt.md`

Post-fix compact dry-run prompt:

`content/outputs/images/pending-review/book01-page008-glowing-lantern-garden-compact-prompt-2026-05-04T02-25-35-451Z-prompt.md`

## Browser Mode

Existing browser mode:

`--browser-mode=existing`

CDP URL:

`http://127.0.0.1:9222`

## Pasted Prompt Verification

The live pasted prompt included:

- `17:22 aspect ratio`
- `vertical 8.5 x 11 inch page`
- `full-color KDP-style interior page`
- `Ember-001`, `Ember-002`, and `Ember-003`

The live pasted prompt did not include local file paths, folder links, markdown file links, `file:///`, or `/mnt/data`.

Problem found during human review: the prompt still included unnecessary internal sections, including Book 1 production assumptions, marketing prompt policy, and hidden-object category guidance.

Fix verification after patch: the compact dry-run prompt is 2,431 characters and omits those internal sections while preserving essential Ember visual canon, scene details, no-text/overlay rules, and KDP format requirements.

## Approval / Submit Result

The helper used the default supervised behavior, `autoSubmit=false`. The image request was submitted only after human approval in the interactive Broke Mode window.

## Image Generation Result

ChatGPT accepted the prompt and generated or began generating an image. No login, CAPTCHA, payment, account warning, rate-limit, or platform-restriction bypass was attempted.

## Download / Save Result

The helper could not find a reliable ChatGPT image download button.

Archived failed-attempt evidence:

- `content/outputs/images/failed/book01-page008-glowing-lantern-garden-2026-05-04T02-07-03-697Z/book01-page008-glowing-lantern-garden-2026-05-04T02-07-03-697Z-chatgpt-screenshot.png`
- `content/outputs/images/failed/book01-page008-glowing-lantern-garden-2026-05-04T02-07-03-697Z/book01-page008-glowing-lantern-garden-2026-05-04T02-07-03-697Z-metadata.json`
- `content/outputs/images/failed/book01-page008-glowing-lantern-garden-2026-05-04T02-07-03-697Z/book01-page008-glowing-lantern-garden-2026-05-04T02-07-03-697Z-prompt.md`
- `content/outputs/images/failed/book01-page008-glowing-lantern-garden-2026-05-04T02-07-03-697Z/failure-reason.md`

Manual download instructions: download the generated image directly from ChatGPT if it is acceptable, save it under `content/outputs/images/pending-review/`, then run:

```powershell
npm run image:qa -- --file=content/outputs/images/pending-review/YOUR-FILE.png
```

## Basic QA Result

No image file was saved by automation, so basic image QA did not run for the live attempt.

Compact prompt fix checks:

- `npx vitest run tests/image-file-manager.test.ts`: passed, 16 tests.
- `npm run build`: passed.
- Compact dry run: passed.

## Files Created

Live attempt:

- `content/outputs/images/failed/book01-page008-glowing-lantern-garden-2026-05-04T02-07-03-697Z/`

Prompt fix/dry run:

- `content/outputs/images/pending-review/book01-page008-glowing-lantern-garden-compact-prompt-2026-05-04T02-25-35-451Z-prompt.md`
- `content/outputs/images/pending-review/book01-page008-glowing-lantern-garden-compact-prompt-2026-05-04T02-25-35-451Z-metadata.json`

Report:

- `content/outputs/session-logs/latest-broke-mode-supervised-live-image-report.md`

## Manual Visual QA Needed

Do not approve any image automatically. Manual QA must confirm:

- Ember appears exactly once
- Ember is visible, not hidden
- Ember matches canon
- blue-teal scarf present
- brown satchel present
- tiny golden spiral-comma horns present
- no readable generated text
- mission item visible and findable
- scene is rich but not clutter-chaos
- child-friendly ages 5-8
- KDP-safe composition

## Problems Found

- ChatGPT download automation could not find a reliable download button.
- The live pasted prompt was clean of paths and links, but still too verbose and included internal source-packet sections that are not useful for image generation.

## Fixes Applied

- Added compact prompt composition in `automation/playwright/scripts/chatgpt-broke-mode-generate.ts`.
- Added a regression test that blocks Book 1 production assumptions, marketing prompt policy, and hidden-object category guidance from the final ChatGPT prompt.
- Updated README and the Broke Mode recipe to document compact image-facing prompt behavior.

## Remaining Manual Steps

If the generated image is visible in ChatGPT and worth keeping, download it manually, save it under `content/outputs/images/pending-review/`, and run image QA.

Review the compact dry-run prompt before another live attempt. Do not submit another image request unless Lauren approves the compact pasted prompt.

## Recommended Next Step

Use the compact prompt workflow for the next supervised attempt, but first manually review the dry-run prompt artifact:

`content/outputs/images/pending-review/book01-page008-glowing-lantern-garden-compact-prompt-2026-05-04T02-25-35-451Z-prompt.md`
