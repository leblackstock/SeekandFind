# Broke Mode Video-Source Workflow

Batch: `book-01-short-video-batch-2026-05-08`

This file makes the existing Broke Mode ChatGPT image-generation process an official execution step for the Book 1 short-video batch.

## Source Of Truth

- Manifest: `content/outputs/videos/batches/book-01-short-video-batch-2026-05-08/batch-manifest.json`
- Guide: `content/outputs/videos/batches/book-01-short-video-batch-2026-05-08/video-source-image-generation-guide.md`
- Tracking: `content/outputs/videos/batches/book-01-short-video-batch-2026-05-08/video-source-broke-mode-state.json`
- Downloads references: `C:/Users/outdo/Downloads/`
- Ember references:
  - `Ember's Adventures/EtD Images/Ember-001.png`
  - `Ember's Adventures/EtD Images/Ember-002.png`
  - `Ember's Adventures/EtD Images/Ember-003.png`

## Commands

Next missing image:

```powershell
npm run social:broke-video-source
```

List the next missing image without opening ChatGPT:

```powershell
npm run social:broke-video-source -- --list
```

Prepare/run up to 4 images:

```powershell
npm run social:broke-video-source -- --max 4
```

Specific day:

```powershell
npm run social:broke-video-source -- --day 03
```

Redo a failed day:

```powershell
npm run social:broke-video-source -- --redo day-03
```

Recover a completed-after-timeout image from the current ChatGPT chat without submitting a new prompt:

```powershell
npm run social:broke-video-source -- --recover day-03
```

Existing-browser Broke Mode uses the already logged-in ChatGPT project tab:

```powershell
npm run social:broke-video-source -- --browser-mode existing --cdp-url http://127.0.0.1:9222
```

## Start Over After A Stuck Browser Upload

If a batch is interrupted or ChatGPT opens a duplicate-file modal, do not click Send and do not continue the batch. Treat the browser state as contaminated if the project composer has mixed day references, more than 4 attachments, an empty prompt with queued images, or a duplicate-file modal blocking the prompt box.

Clean restart procedure for one day:

1. Stop any still-running `social:broke-video-source` / `broke-video-source.ts` node processes.
2. In the ChatGPT project tab, dismiss any duplicate-file modal and remove every queued attachment, or reload the project tab until the composer has an empty prompt and zero attachments.
3. Verify the exact one-day selection without opening/submitting ChatGPT:

```powershell
npm run social:broke-video-source -- --list --redo day-08
```

4. Rerun only that day:

```powershell
npm run social:broke-video-source -- --redo day-08
```

Do not use `--max` again until the contaminated browser state is cleared and the one-day redo succeeds or fails cleanly. Recovery mode is only for a generated image already visible in the current chat; it is not the right tool for a pre-submit duplicate-file modal or mixed-attachment composer.

## Output Rules

Each generation uploads exactly 4 reference images before the prompt is submitted:

1. The day-specific Downloads promo reference for composition and mood.
2. `Ember-001.png` as a character reference.
3. `Ember-002.png` as a character reference.
4. `Ember-003.png` as a character reference.

The prompt tells ChatGPT that the day-specific image is reference-only static promo art and that the three Ember images control Ember's appearance, proportions, scarf, satchel, horns, eyes, and colors. If any of the 4 required references are missing, the runner fails before opening/submitting Broke Mode.

Video-source prompts do not include social captions, CTA text, Amazon availability copy, or publish copy. They keep only safe visual concept context and a hard no-text instruction.

After successful prompt submission, Broke Mode asks ChatGPT to rename the chat with this format:

`Book 1 Day 03 Video Source Image - Search with Ember`

The watcher polls the ChatGPT UI for up to 3 minutes by default, every 15 seconds. It looks for generated image previews, visible download controls, image action controls, image-backed assistant responses, and fetchable image URLs. On timeout it performs one final recovery scan of the current chat before reporting `generated-image-not-detected`. Use `--timeout-minutes 6` only when a longer active watch is intentionally needed.

After submission, the workflow captures the new ChatGPT conversation ID, opens the project list in a second browser page, renames the exact row whose link contains that conversation ID through the row options menu, and verifies that the visible row starts with the expected title. API-only title agreement is not trusted as success. If the visible project-row title cannot be verified, the workflow records a warning/TODO and continues watching the already-submitted generation. Chat rename failure alone must not fail image generation.

Generated images save to:

`content/outputs/images/pending-review/video-source/book-01/`

Approved video-source images later move to:

`content/outputs/images/approved/video-source/book-01/`

Approved video-source images are still not final videos. The Short Video queue task remains blocked until a reviewed approved video export exists later.

## Approval Rules

- Broke Mode may generate pending-review images only.
- Passing local QA does not approve the asset.
- Nothing moves to approved unless the user explicitly approves it.
- `queue.json` is never updated by this workflow.
- This workflow never generates videos and never uploads/posts to social platforms.
- This workflow uses explicit Downloads reference images and existing Ember character reference images. It must not modify `Ember's Adventures/`.
