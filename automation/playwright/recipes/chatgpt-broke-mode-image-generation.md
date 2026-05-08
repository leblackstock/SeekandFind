# ChatGPT Broke Mode Image Generation

## Purpose

Use this recipe for one supervised ChatGPT web UI image attempt from an existing Ember prompt file. It is a temporary budget-aware helper for refining prompts before paid API image credits are available.

This recipe does not use the OpenAI API and does not run unattended bulk generation.

Broke Mode pastes clean prompt text only. It does not paste local file links or folder paths into ChatGPT. Character references should be named as Ember-001, Ember-002, and Ember-003.
When reference uploads are enabled, Broke Mode attaches the local character images as real file uploads before it pastes the prompt.

## Prerequisites

- `npm install` has been run.
- Playwright Chromium is installed.
- The prompt file already exists under `content/outputs/prompts/`.
- You are allowed to use your own ChatGPT web session.
- You are ready to review and approve the prompt before submission.

## Login Setup

Broke Mode has three browser strategies:

- `existing`: preferred. Connects to an already-open browser over CDP when available.
- `managed`: fallback. Launches a Playwright-managed browser profile and may be blocked by Google as insecure.
- `manual`: no browser automation; use normal browser copy/paste and local QA.

Existing-browser mode does not copy, scrape, or expose cookies. It only connects to a browser endpoint you intentionally start for this supervised workflow.

Start a normal browser with remote debugging and a separate profile:

```powershell
chrome.exe --remote-debugging-port=9222 --user-data-dir="$env:TEMP\ember-chatgpt-cdp-profile"
```

Log into ChatGPT manually in that browser.

Run setup against the existing browser:

```powershell
npm run image:broke-mode -- --browser-mode=existing --setup-login --prompt=content/outputs/prompts/book01-page008-glowing-lantern-garden-image-prompt.md
```

Log into ChatGPT manually in the browser. Do not store passwords in the repo. If ChatGPT shows CAPTCHA, account verification, warnings, or payment prompts, handle them manually or stop.

Managed fallback:

```powershell
npm run image:broke-mode -- --browser-mode=managed --setup-login --prompt=content/outputs/prompts/book01-page008-glowing-lantern-garden-image-prompt.md --browser-channel=chrome --profile-dir=.cache/playwright-chatgpt-chrome-profile
```

This is not a bypass. It is only a different manually controlled browser profile. Stop if ChatGPT still shows verification, CAPTCHA, rate limits, cooldowns, or warnings.

If Google says `Couldn't sign you in` or `This browser or app may not be secure`, stop. Do not try to bypass it. Use your normal browser manually for that attempt, then save the image into `content/outputs/images/pending-review/` and run local QA with `npm run image:qa`.

## One-Image-At-A-Time Workflow

```powershell
npm run image:broke-mode -- --browser-mode=existing --prompt=content/outputs/prompts/book01-page008-glowing-lantern-garden-image-prompt.md
```

Use the same browser mode/setup values here if you used them during login setup.

Manual mode:

```powershell
npm run image:broke-mode -- --browser-mode=manual --prompt=content/outputs/prompts/book01-page008-glowing-lantern-garden-image-prompt.md
```

If npm strips bare option names on your setup, use:

```powershell
npm run image:broke-mode -- --prompt=content/outputs/prompts/book01-page008-glowing-lantern-garden-image-prompt.md
```

Default behavior:

1. Read the prompt file.
2. Prepare a clean final ChatGPT prompt.
3. Auto-resolve and upload the local reference images when the prompt names canon characters.
4. Open ChatGPT through the selected browser mode.
5. Confirm there is no login, CAPTCHA, cooldown, rate-limit, payment, or warning boundary.
6. Paste the prompt into the ChatGPT composer.
7. Pause for human approval.
8. Submit only if you type `YES`.
9. Rename the new ChatGPT chat to a clear workflow title.
10. Wait for generation.
11. Try to download the image.
12. Save image or screenshot evidence under `content/outputs/images/pending-review/`.
13. Run basic local image QA.
14. Log the attempt.

Chat naming rule:

- Every ChatGPT image-generation chat created by Codex must be renamed before recovery or QA when the page exposes a conversation URL.
- Use compact titles that identify the workflow, batch, slot/page, and object/location, such as `B1 - Promo Batch 03 - Slot 03 - Dragon Door Key`.
- If ChatGPT does not expose the conversation URL in time, record the rename skip as a warning and rename during recovery.
- For one-off Broke Mode runs, override the default title with `--chat-title="<clear title>"` when the asset slug is not human-readable enough.

Prompt preparation:

- strips local paths, folder references, markdown links, and image file links from the final pasted prompt
- keeps named project references such as `Ember-001`, `Ember-002`, and `Ember-003`
- compacts source packets into image-facing prompt sections only
- preserves essential Ember visual canon, scene instructions, mission item, location, and QA-relevant constraints
- omits internal source-packet material such as book-production assumptions, marketing prompt rules, and post-approval find-list guidance
- appends missing format requirements, including `vertical 8.5 x 11 inch page`, `17:22 aspect ratio`, `full-color KDP-style interior page`, and `bleed, trim, and safe-area awareness`

Reference upload behavior:

- Default `--reference-images=auto` resolves images from `Ember's Adventures/EtD Images`
- Ember seek pages upload `Ember-001`, `Ember-002`, and `Ember-003`
- Book 1 social video-source Broke Mode uses explicit references from `automation/social/broke-video-source.ts`: 1 day-specific Downloads promo image for composition/mood plus `Ember-001`, `Ember-002`, and `Ember-003` as character references
- The social video-source prompt must say the day promo image is static promo art for visual reference only, while the three Ember images control Ember's appearance, proportions, scarf, satchel, horns, eyes, and colors
- Book 1 social video-source prompts must not include CTA text, Amazon availability copy, social caption text, or other publish copy that could be rendered into the image
- After successful prompt submission, the social video-source wrapper requests a ChatGPT chat title like `Book 1 Day 03 Video Source Image - Search with Ember`; rename failures are warnings, not generation blockers
- Chat title rename is only reported successful after the active ChatGPT conversation's visible sidebar/chat title shows the requested title. API-only confirmation is a warning (`chat_rename_api_verified: true`, `chat_rename_visible_verified: false`) and must not be reported as full rename success.
- Image generation waits up to 3 minutes by default and polls every 15 seconds for generated image previews, download controls, image action controls, assistant image responses, and fetchable image URLs
- Use `--timeout-minutes 6` only when a longer active watch is intentionally needed
- If a generation finishes after a local timeout, use `npm run social:broke-video-source -- --recover day-03` to inspect the existing ChatGPT chat and save the generated image without uploading files or submitting a new prompt
- If the page includes another named canon character such as `Gemma_Glint`, `HootiePuff`, `Pebblekins`, `Luma_Leafwhisk`, or `Elder_Glowkeeper`, Broke Mode uploads that character's `-001`, `-002`, and `-003` images too
- If any non-Ember canon character is included, Broke Mode also uploads `Ember_Cast_Lineup-001` and `Ember_Cast_Lineup-002`
- Override the default set with `--reference-images=<path1,path2,...>` or disable uploads with `--reference-images=none`
- Override the lookup folder with `--reference-image-root=<relative-folder>`

For split-prompt debugging, use `--raw-prompt` with a prompt file that contains only the exact test section. Raw prompt mode skips compacting and skips appended production requirements, so it can isolate whether a minimal prompt routes into image generation or into project/file/path behavior:

```powershell
npm run image:broke-mode -- --browser-mode=existing --prompt=content/outputs/prompts/book01-page009-lantern-maker-s-workshop-split-test-01-minimal-render.md --asset-name=book01-page009-split-test-01-minimal-render --raw-prompt
```

For split tests, the helper waits 3 minutes for a generated image. If ChatGPT has only reached a placeholder or is still thinking at that point, archive the attempt and move to the next diagnostic prompt instead of burning time on long waits.

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

## Marketing Batch Recovery Note

For multi-image marketing batches, a runner timeout does not prove generation failed. ChatGPT may finish after the local waiter times out, and the Seek and Find Books project chat list may not show the new conversations until the project page is reloaded.

After any marketing batch timeout:

1. Reload the open Seek and Find Books project page.
2. Re-check the project chat list after the reload settles.
3. Open the newest project chats from the top of that list.
4. Confirm each chat has a clear workflow title; rename it before recovery if needed.
5. Recover only real `Generated image` assets.
6. Ignore uploaded reference images.
7. Save recovered files to `content/outputs/images/pending-review/`.
8. Run local image QA and hold the results for owner approval.

## Future Upgrade Path

When paid image credits are available, add an OpenAI Images API integration that reuses the same prompt files, image output folders, metadata JSON, QA reports, and session logging. Keep this supervised ChatGPT web UI workflow as a fallback, not the primary production renderer.
