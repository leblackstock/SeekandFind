# ChatGPT Broke Mode Image Generation

## Purpose

Use this recipe for one supervised ChatGPT web UI image attempt from an existing Ember prompt file. It is a temporary budget-aware helper for refining prompts before paid API image credits are available.

This recipe does not use the OpenAI API and does not run unattended bulk generation.

## Prerequisites

- `npm install` has been run.
- Playwright Chromium is installed.
- The prompt file already exists under `content/outputs/prompts/`.
- You are allowed to use your own ChatGPT web session.
- You are ready to review and approve the prompt before submission.

## Login Setup

The helper uses a persistent local Playwright profile stored under `.cache/playwright-chatgpt-profile/`, which is ignored by git.

Open the login browser:

```powershell
npm run image:broke-mode -- --setup-login --prompt content/outputs/prompts/book01-page008-glowing-lantern-garden-image-prompt.md
```

Log into ChatGPT manually in the browser. Do not store passwords in the repo. If ChatGPT shows CAPTCHA, account verification, warnings, or payment prompts, handle them manually or stop.

If bundled Playwright Chromium gets stuck at normal human verification, you may try a supervised Chrome-channel profile:

```powershell
npm run image:broke-mode -- --setup-login --prompt=content/outputs/prompts/book01-page008-glowing-lantern-garden-image-prompt.md --browser-channel=chrome --profile-dir=.cache/playwright-chatgpt-chrome-profile
```

This is not a bypass. It is only a different manually controlled browser profile. Stop if ChatGPT still shows verification, CAPTCHA, rate limits, cooldowns, or warnings.

If Google says `Couldn't sign you in` or `This browser or app may not be secure`, stop. Do not try to bypass it. Use your normal browser manually for that attempt, then save the image into `content/outputs/images/pending-review/` and run local QA with `npm run image:qa`.

## One-Image-At-A-Time Workflow

```powershell
npm run image:broke-mode -- --prompt content/outputs/prompts/book01-page008-glowing-lantern-garden-image-prompt.md
```

Use the same `--browser-channel` and `--profile-dir` values here if you used them during login setup.

If npm strips bare option names on your setup, use:

```powershell
npm run image:broke-mode -- --prompt=content/outputs/prompts/book01-page008-glowing-lantern-garden-image-prompt.md
```

Default behavior:

1. Read the prompt file.
2. Open ChatGPT in Playwright Chromium.
3. Confirm there is no login, CAPTCHA, cooldown, rate-limit, payment, or warning boundary.
4. Paste the prompt into the ChatGPT composer.
5. Pause for human approval.
6. Submit only if you type `YES`.
7. Wait for generation.
8. Try to download the image.
9. Save image or screenshot evidence under `content/outputs/images/pending-review/`.
10. Run basic local image QA.
11. Log the attempt.

## Manual Approval Requirement

`--auto-submit=false` is the default. The script will paste the prompt and wait. It only submits when you type exactly:

```text
YES
```

Use `--auto-submit=true` only when you are sitting there and have already reviewed the prompt. This is still not an unattended mode.

## Stop Conditions

Stop immediately if ChatGPT shows:

- login boundary
- CAPTCHA
- account verification
- account warning
- payment or subscription prompt
- rate limit
- cooldown
- unusual activity warning
- platform restriction
- UI changes that make selectors unreliable

Do not bypass protections, limits, payment gates, or restrictions.

## Download Behavior

The helper tries to use a visible Download button when one exists. If ChatGPT changes the UI or no reliable download is available, the helper saves a screenshot and archives the attempt with manual instructions.

Manual fallback:

1. Download the image directly from ChatGPT.
2. Move it to `content/outputs/images/pending-review/`.
3. Run:

```powershell
npm run image:qa -- --file content/outputs/images/pending-review/YOUR-FILE.png
```

## QA Behavior

Automated QA checks:

- file exists
- file opens
- extension is PNG, JPG, JPEG, or WEBP
- dimensions can be detected
- file is not zero bytes
- filename is safe
- metadata JSON exists when provided
- prompt archive exists when provided
- aspect ratio warning if not vertical/KDP-friendly

Manual visual QA is still required:

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

## Failure Archive Behavior

Failed attempts are archived under:

```text
content/outputs/images/failed/<asset-name-or-timestamp>/
```

The archive should include:

- prompt copy
- metadata JSON
- screenshot if available
- QA report if available
- failure reason

## Troubleshooting

- Not logged in: run `--setup-login`, log in manually, then rerun.
- Google says browser/app is not secure: stop and use the manual normal-browser fallback; do not bypass the sign-in protection.
- No input box found: ChatGPT UI may have changed; update selectors in `automation/playwright/scripts/chatgpt-broke-mode-generate.ts`.
- Download failed: use the manual fallback above.
- `File already exists`: rerun with `--force` only when you intentionally want to overwrite a verification artifact.
- n8n Docker cannot run local Playwright safely: use the manual command from PowerShell instead of forcing browser automation through n8n.

## Future Upgrade Path

When paid image credits are available, add an OpenAI Images API integration that reuses the same prompt files, image output folders, metadata JSON, QA reports, and session logging. Keep this supervised ChatGPT web UI workflow as a fallback, not the primary production renderer.
