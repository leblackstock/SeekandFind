# Broke Mode Image Generation Report

## Summary

Added a supervised ChatGPT web UI image-generation helper for budget-aware one-image-at-a-time use. It reads saved Ember prompt files, prepares a local Playwright Chromium session, requires human approval before submission by default, saves evidence under image output folders, runs basic local image QA, and logs attempts.

Discord was not touched. Existing n8n workflows were preserved.

## Files Added

- `automation/playwright/recipes/chatgpt-broke-mode-image-generation.md`
- `automation/playwright/scripts/chatgpt-broke-mode-generate.ts`
- `src/core/image-file-manager.ts`
- `src/core/image-qa.ts`
- `tests/image-file-manager.test.ts`
- `tests/image-qa.test.ts`
- `content/outputs/images/pending-review/.gitkeep`
- `content/outputs/images/approved/.gitkeep`
- `content/outputs/images/failed/.gitkeep`
- `content/outputs/image-qa-reports/.gitkeep`

Dry-run artifacts created:

- `content/outputs/images/pending-review/broke-mode-dry-run-2026-05-04T00-42-22-183Z-prompt.md`
- `content/outputs/images/pending-review/broke-mode-dry-run-2026-05-04T00-42-22-183Z-metadata.json`
- `content/outputs/images/pending-review/broke-mode-dry-run-simple-command-2026-05-04T00-43-16-155Z-prompt.md`
- `content/outputs/images/pending-review/broke-mode-dry-run-simple-command-2026-05-04T00-43-16-155Z-metadata.json`

## Files Changed

- `README.md`
- `package.json`
- `src/types.ts`
- `tests/qa-engine.test.ts`
- `content/outputs/session-logs/2026-05-04-session.md`

## Package Scripts Added

- `npm run image:broke-mode`
- `npm run image:qa`
- `npm run image:review`

The scripts include npm argument fallback handling because this Windows/npm setup can strip bare script flags into `npm_config_*` environment values.

## Safety Rules Implemented

- `autoSubmit` defaults to `false`.
- Submission requires typing `YES` unless `--auto-submit=true` is explicitly set.
- `max-attempts` defaults to 1 and is hard-capped at 3.
- No automatic retry happens unless `--max-attempts` is explicitly greater than 1.
- The helper stops at login, CAPTCHA, cooldown, rate-limit, payment, subscription, account verification, account warning, or platform restriction text.
- Persistent browser login data stays under ignored `.cache/playwright-chatgpt-profile/`.
- Failed attempts archive prompt copy, metadata, screenshot when available, QA report when available, and failure reason.
- Download automation falls back to screenshot/manual instructions instead of hacking around the UI.

## QA Behavior

Automated image QA checks:

- file exists
- file is nonzero bytes
- extension is PNG, JPG, JPEG, or WEBP
- dimensions can be detected for PNG, JPEG, or supported WEBP headers
- filename/path is safe enough for local output use
- metadata JSON exists when supplied
- prompt archive exists when supplied
- non-vertical/KDP-unfriendly aspect ratio produces a warning

The QA report includes the required manual visual checklist for Ember canon, no readable text, mission item visibility, clutter, child safety, and KDP composition.

## Playwright Behavior

- Opens `https://chatgpt.com/` in a persistent Playwright Chromium profile.
- `--setup-login` opens the same profile for manual login setup.
- The default run pastes the prompt and pauses before submission.
- The script uses robust textbox/contenteditable locator fallbacks and documents that ChatGPT UI changes may require selector updates.
- If no reliable download button exists, it saves screenshot evidence and gives manual download guidance.

## Dry Run Result

Successful dry run command:

```powershell
npm run image:broke-mode -- --prompt=content/outputs/prompts/book01-page008-glowing-lantern-garden-image-prompt.md --asset-name=broke-mode-dry-run-simple-command --dry-run
```

Result:

- `ok: true`
- `dryRun: true`
- prompt read successfully
- prompt length: 6464 characters
- prompt copy and metadata JSON saved under `content/outputs/images/pending-review/`
- no browser submission occurred

## Build/Test Results

- `npm run build`: passed.
- `npm run test`: passed.
- `npm run n8n:check`: passed.
- Test suite after changes: 9 test files, 33 tests.
- Mojibake scan on edited docs/source/tests: clean.

## Known Limitations

- ChatGPT download selectors may need updates if the web UI changes.
- Full visual/canon QA is intentionally manual for now.
- Dry runs create preparation artifacts and session log entries.
- n8n should not run this browser workflow inside Docker; use the PowerShell command manually unless a supervised local bridge is added later.
- The helper does not solve account limits, cooldowns, payment prompts, CAPTCHA, or warnings; it stops and logs them.

## Manual Steps for Lauren

1. Set up the Playwright ChatGPT login profile:

```powershell
npm run image:broke-mode -- --setup-login --prompt=content/outputs/prompts/book01-page008-glowing-lantern-garden-image-prompt.md
```

2. Run one supervised attempt:

```powershell
npm run image:broke-mode -- --prompt=content/outputs/prompts/book01-page008-glowing-lantern-garden-image-prompt.md --asset-name=book01-page008-glowing-lantern-garden
```

3. Review the pasted prompt in ChatGPT.
4. Type `YES` only if you want the helper to submit.
5. Review any image under `content/outputs/images/pending-review/`.
6. Run `npm run image:qa -- --file=content/outputs/images/pending-review/YOUR-FILE.png` for manually downloaded images.
7. Move approved images with `npm run image:review -- --file=content/outputs/images/pending-review/YOUR-FILE.png --approve=true`.

## Future API Upgrade Path

When paid API credits are available, add an OpenAI Images API generator that reuses:

- saved prompt files
- image output folders
- metadata JSON
- image QA reports
- session logging
- production status updates

Keep Broke Mode as a supervised fallback, not an unattended production renderer.

## Recommended Next Prompt

Use the Broke Mode helper on one real Ember seek-page prompt, manually approve the submission, then review the saved image and QA report before deciding whether to add an API-backed image generator later.
