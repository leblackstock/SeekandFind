# Broke Mode Existing Browser Fix Report

## Summary

Updated Broke Mode so browser control is strategy-based instead of managed-Chromium-only. The preferred mode is now `--browser-mode=existing`, which connects to an explicitly available CDP browser endpoint when present. Managed Playwright Chromium remains a fallback, and manual mode provides a no-browser copy/paste plus local QA path.

No Discord changes were made. Existing verified n8n workflows were preserved.

## Browser Modes Added

- `existing`: preferred; connects to an already-open browser at a CDP endpoint such as `http://127.0.0.1:9222`.
- `managed`: fallback; keeps the previous Playwright-managed Chromium/Chrome profile behavior.
- `manual`: no browser automation; saves prompt/metadata and prints manual download/QA steps.

Default mode is `existing`.

## Existing Browser Setup

Expected setup for existing mode:

```powershell
chrome.exe --remote-debugging-port=9222 --user-data-dir="$env:TEMP\ember-chatgpt-cdp-profile"
```

Then log into ChatGPT manually in that browser. The helper does not copy cookies, scrape secrets, or automate Google login.

## Files Changed

- `automation/playwright/scripts/chatgpt-broke-mode-generate.ts`
- `src/core/image-file-manager.ts`
- `tests/image-file-manager.test.ts`
- `README.md`
- `automation/playwright/recipes/chatgpt-broke-mode-image-generation.md`

## Tests Added

- Browser mode parsing.
- Existing mode default selection.
- Managed insecure-browser boundary wording.
- Manual mode fallback messaging.
- Existing `autoSubmit=false` default remains covered.

## Dry Run Result

Command:

```powershell
npm run image:broke-mode -- --browser-mode=existing --dry-run --prompt=content/outputs/prompts/book01-page008-glowing-lantern-garden-image-prompt.md
```

Result:

- `ok: true`
- `browserMode: existing`
- prompt read successfully
- prompt length: 6464 characters
- no browser opened
- no prompt submitted
- files created:
  - `content/outputs/images/pending-review/book01-page008-glowing-lantern-garden-image-prompt-2026-05-04T01-07-44-115Z-prompt.md`
  - `content/outputs/images/pending-review/book01-page008-glowing-lantern-garden-image-prompt-2026-05-04T01-07-44-115Z-metadata.json`

## Setup/Login Check Result

CDP endpoint was reachable:

```text
http://127.0.0.1:9222
```

Chrome reported:

```text
Chrome/147.0.7727.138
```

The setup check connected to the existing browser, opened ChatGPT, and stopped because ChatGPT showed a login/security boundary. No prompt was pasted or submitted.

## Live Attempt Result

Not run.

Reason: ChatGPT was not already logged in inside the CDP-connected browser session. Per safety rules, the helper stopped and instructed manual login in the normal browser.

## Safety Rules Preserved

- No login bypass.
- No CAPTCHA bypass.
- No rate-limit or cooldown bypass.
- No payment/subscription bypass.
- No account-warning bypass.
- No unattended bulk generation.
- `autoSubmit=false` remains the default.
- `max-attempts` remains capped at 3.

## Build/Test Results

- `npm run build`: passed.
- `npm run test`: passed, 9 test files and 37 tests.
- `npm run n8n:check`: passed.

## Remaining Manual Steps

1. Open the CDP-enabled normal browser:

```powershell
chrome.exe --remote-debugging-port=9222 --user-data-dir="$env:TEMP\ember-chatgpt-cdp-profile"
```

2. Log into ChatGPT manually in that browser.
3. Confirm ChatGPT opens without login/security boundaries.
4. Rerun:

```powershell
npm run image:broke-mode -- --browser-mode=existing --prompt=content/outputs/prompts/book01-page008-glowing-lantern-garden-image-prompt.md --asset-name=book01-page008-glowing-lantern-garden
```

5. Review the pasted prompt and type `YES` only if you want to submit.

## Recommended Next Step

Log into ChatGPT manually in the CDP-enabled normal browser, then rerun the existing-browser supervised attempt. If login remains blocked, use `--browser-mode=manual` and let the repo handle prompt archiving, pending-review storage, and local image QA after manual download.
