# Broke Mode Prompt Cleanup Recovery Report

## Summary

Recovered the supervised Broke Mode ChatGPT image-generation workflow after the crash and fixed the prompt-cleanup gap at the paste boundary. Broke Mode now prepares a clean final prompt before dry-run archiving, manual mode, or browser paste.

No Discord files were touched. Existing n8n workflows were preserved.

## What Was Broken

Broke Mode could paste prompt text that still contained repo paths, local file/folder references, markdown links, or image-file links. The page 8 prompt also lacked the explicit `17:22 aspect ratio` instruction in the text that would be pasted.

## Root Cause

The Broke Mode script read the saved prompt file and only normalized `/mnt/data/...` style references. It did not have a final ChatGPT-specific composer/sanitizer to remove local-only source references or enforce all KDP image-generation format requirements.

## Fix Applied

Added a final prompt preparation layer in `automation/playwright/scripts/chatgpt-broke-mode-generate.ts`:

- `preparePromptForChatGPTImageGeneration(...)`
- `sanitizePromptForBrokeMode(...)`
- `ensureImageGenerationPromptRequirements(...)`

The dry-run, manual, and browser-paste paths now use the prepared prompt text.

## Prompt Sanitizer Behavior

The sanitizer removes local file paths, folder references, `file:///` URLs, markdown link targets, and image file extensions from the final ChatGPT prompt. It preserves written canon, scene instructions, location, mission item, no-text rules, and other QA-relevant constraints.

## Aspect Ratio / KDP Format Enforcement

If the source prompt is missing required format language, Broke Mode appends a clear `## Format Requirements` section. The page 8 dry run appended:

- `vertical full-page children's seek-and-find illustration`
- `vertical 8.5 x 11 inch page`
- `17:22 aspect ratio`
- `full-color KDP-style interior page`

Existing requirements are not duplicated when already present in the source prompt.

## Reference Image Name Handling

Character reference handling now uses named project references only:

`Use the character reference images available in this ChatGPT project/source context when available: Ember-001, Ember-002, Ember-003.`

`If references are not available, rely strictly on the written Ember canon below.`

Local links such as `content/...`, `file:///...`, `/mnt/data/...`, and markdown links are stripped or converted to the visible reference names.

## Files Changed

- `automation/playwright/scripts/chatgpt-broke-mode-generate.ts`
- `tests/image-file-manager.test.ts`
- `README.md`
- `automation/playwright/recipes/chatgpt-broke-mode-image-generation.md`
- `content/outputs/session-logs/latest-broke-mode-prompt-cleanup-recovery-report.md`

## Tests Added

- Local file paths are removed from the final Broke Mode prompt.
- Markdown links keep only visible/reference names.
- Folder references are removed.
- Missing aspect ratio gets `17:22 aspect ratio`.
- Missing KDP format gets `vertical 8.5 x 11 inch page`.
- Ember reference names are preserved.
- `No readable generated text` is preserved.
- Mission item and location are preserved.
- Broke Mode still defaults to supervised `autoSubmit=false`.

## Commands Run

- `npx vitest run tests/image-file-manager.test.ts`: passed.
- `npm run build`: passed.
- `npm run test`: passed.
- `npm run n8n:check`: passed.
- `npm run image:broke-mode -- --browser-mode=existing --dry-run --prompt=content/outputs/prompts/book01-page008-glowing-lantern-garden-image-prompt.md --asset-name=book01-page008-glowing-lantern-garden`: passed.

## Dry Run Result

Dry run created:

- `content/outputs/images/pending-review/book01-page008-glowing-lantern-garden-2026-05-04T01-37-56-606Z-prompt.md`
- `content/outputs/images/pending-review/book01-page008-glowing-lantern-garden-2026-05-04T01-37-56-606Z-metadata.json`

Confirmed the final prompt includes:

- `vertical 8.5 x 11 inch page`
- `17:22 aspect ratio`
- `full-color KDP-style interior page`

Confirmed the final prompt does not include local prompt-file paths, `file:///` links, markdown links, image file links, `/mnt/data`, or `Ember's Adventures` folder paths.

## Remaining Manual Steps

Open or use the existing CDP-enabled normal browser session, confirm ChatGPT is logged in without a login/security boundary, then rerun without `--dry-run`. Review the pasted prompt before typing `YES`.

## Recommended Next Step

Run one supervised existing-browser Broke Mode attempt for page 8, stop at any login/CAPTCHA/rate-limit/payment/account-warning boundary, and submit only after manual review of the cleaned prompt.
