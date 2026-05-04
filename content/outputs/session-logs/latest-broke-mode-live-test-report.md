# Broke Mode Live Test Report

## Summary

Live setup/login was attempted with the supervised Broke Mode Playwright browser. Google sign-in blocked the controlled browser with `Couldn't sign you in` and `This browser or app may not be secure`. This is a stop condition. No prompt was submitted and no image generation attempt was run.

## Git Checkpoint

- Broke Mode implementation checkpoint: `e022ecb` - `Add supervised Broke Mode ChatGPT image workflow`.
- Follow-up safety/docs changes passed final checks and were committed.

## Setup/Login Result

- Result: blocked.
- Boundary shown: Google sign-in refused the controlled browser as not secure.
- Action taken: stopped; did not bypass login or verification.

## Prompt Used

- Intended prompt: `content/outputs/prompts/book01-page008-glowing-lantern-garden-image-prompt.md`

## Live Attempt Result

- Not run.
- Reason: setup/login did not reach a safe logged-in ChatGPT browser profile.

## Files Created

- `content/outputs/session-logs/latest-broke-mode-live-test-report.md`

## Download Result

- No download attempted.
- No image was generated.

## Basic QA Result

- Not run because no image file was produced.

## Manual Visual QA Needed

Manual visual QA is still required after a future successful image generation:

- Ember appears exactly once
- Ember matches canon
- blue-teal scarf present
- brown satchel present
- tiny golden spiral-comma horns present
- no readable text
- mission item visible
- scene not too cluttered
- child-friendly
- KDP-safe composition

## Problems Found

- Google sign-in can refuse Playwright-controlled Chromium/Chrome profiles with `This browser or app may not be secure`.
- The helper did not previously include this exact text in its stop-condition regex.

## Fixes Applied

- Added explicit insecure-browser Google sign-in wording to the Broke Mode boundary detector.
- Updated README and recipe troubleshooting with the manual normal-browser fallback.

## Remaining Manual Steps

1. Use your normal browser manually if Google blocks the controlled Playwright browser.
2. Generate only one image attempt at a time.
3. Save the downloaded image under `content/outputs/images/pending-review/`.
4. Run:

```powershell
npm run image:qa -- --file=content/outputs/images/pending-review/YOUR-FILE.png
```

5. Do not mark the image approved until manual visual QA passes.

## Recommended Next Step

Use the normal browser manual fallback for this first image attempt, then let the repo handle image QA, pending-review storage, and approval tracking.
