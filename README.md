# Ember Content Studio

`ember-content-studio` is a local TypeScript automation layer for Ember children's seek-and-find book production. It turns repeatable creative work into Codex skills, CLI commands, local API routes, n8n workflows, and safe Playwright helpers.

It does not make paid image or video models free. It automates the planning, prompting, QA, logging, and browser-assist work around the paid/manual render step so credits are spent only on final candidates.

## Architecture

```text
Codex IDE + repo-local skills
  -> CLI or local API
  -> Markdown generators + QA engine
  -> content/outputs/*
  -> production status + session logs
  -> n8n webhook workflows
  -> optional safe Playwright browser helpers
  -> Discord bridge later as Phase 9
```

## Setup

```powershell
npm install
npm run build
npm run test
```

Run the local API:

```powershell
npm run server
```

Check health:

```powershell
curl http://localhost:3333/health
```

## CLI Examples

Generate a seek page pack:

```powershell
npm run generate:seek -- --page 6 --place "Cloud Bakery" --mission "tiny frosted bell"
```

`--place` is the npm-safe alias for `--location`; some npm versions treat `--location` as npm's own config flag before the CLI receives it.

Generate a title page prompt:

```powershell
npm run generate:title -- --book "Ember and the Sparkleflame Festival Search" --theme "festival entrance"
```

Generate a Seedance storyboard:

```powershell
npm run generate:storyboard -- --scene "Ember waves, finds a glowing festival clue, smiles at viewer" --goal "promote Ember seek-and-find book"
```

Run KDP QA on a prompt file:

```powershell
npm run qa:kdp -- --file content/outputs/prompts/book01-page006-cloud-bakery-image-prompt.md
```

## API Examples

```powershell
curl -X POST http://localhost:3333/generate/seek-page `
  -H "Content-Type: application/json" `
  -d "{\"pageNumber\":6,\"location\":\"Cloud Bakery\",\"missionItem\":\"tiny frosted bell\",\"outputMode\":\"prompt+qa\"}"
```

Response shape:

```json
{
  "ok": true,
  "workflow": "seek-page",
  "summary": "Generated seek-page prompt and QA report.",
  "files": [
    "content/outputs/prompts/book01-page006-cloud-bakery-image-prompt.md",
    "content/outputs/qa-reports/book01-page006-cloud-bakery-qa.md"
  ],
  "warnings": [],
  "nextStep": "Generate the image, then run KDP QA."
}
```

## Codex Skills

Repo-local skills live under `.agents/skills/`. Mention them directly in Codex:

```text
Use $ember-seek-page to create Book 1 page 6: Cloud Bakery.
```

Available skills:

- `$ember-seek-page`
- `$ember-title-page`
- `$ember-seedance-storyboard`
- `$ember-marketing-pack`
- `$ember-kdp-qa`
- `$ember-session-recorder`
- `$ember-n8n-orchestrator`
- `$ember-discord-control-panel`

## n8n

Import workflow JSON files from `automation/n8n/workflows/`.

Preferred local startup is Docker, because `npx n8n start` was very slow on this Windows setup during first install.

Start Docker Desktop, then run:

```powershell
docker start n8n-local
```

If the container does not exist yet, create it once:

```powershell
docker run -d --name n8n-local -p 5678:5678 -v n8n_data:/home/node/.n8n n8nio/n8n
```

n8n should then be available at:

```text
http://localhost:5678
```

Use test webhook URLs while building, then production webhook URLs after activating each workflow. The workflows call the local API at `http://localhost:3333`, so keep `npm run server` running.

Check local readiness:

```powershell
npm run n8n:check
```

## Playwright Helpers

Playwright helper scripts and recipes live under `automation/playwright/`.

Examples:

```powershell
npm run playwright:open -- --tool seedance
npm run playwright:screenshot -- --name seedance-login-check
```

The helpers are reviewable browser assistance only. They stop at login, CAPTCHA, payment/subscription prompts, account verification, or unreliable UI changes.

## Discord Phase 9

Discord is intentionally not the first control layer. The planned flow is:

```text
Discord slash command
  -> Discord bridge
  -> n8n webhook
  -> local Ember API
  -> n8n response/result webhook
  -> Discord response
```

Keep the local API and n8n private unless you explicitly choose otherwise. If Discord is enabled later, expose only the Discord bridge with a tunnel such as Cloudflare Tunnel or ngrok.

## Safety Boundaries

- Never store passwords in the repo.
- Never bypass CAPTCHA, payment, subscription, account verification, free-credit, platform, or rate-limit protections.
- Do not claim the book is published unless production status confirms it.
- Do not use fresh promo art as Amazon listing previews or inside-the-book samples.
- Do not request readable generated text in AI interior images.

## Troubleshooting

- `File already exists`: rerun with `--force` only when you intentionally want to replace a generated output.
- API route fails: check `npm run server` and `curl http://localhost:3333/health`.
- n8n webhook returns connection errors: make sure the local API is running at `LOCAL_API_BASE_URL`.
- Playwright cannot open a browser: run `npx playwright install chromium`.
- Codex does not show new skills: restart Codex from this repo root.

## Verified Local n8n Workflow Usage

Start the local Ember API:

```powershell
npm run server
```

Start n8n with Docker:

```powershell
docker start n8n-local
```

n8n runs at:

```text
http://localhost:5678
```

Because n8n is inside Docker, workflow HTTP Request nodes must call the host API with:

```text
http://host.docker.internal:3333
```

Test workflow usage:

1. Open a workflow in n8n.
2. Click `Execute workflow` / `Listen for test event`.
3. Post to `http://localhost:5678/webhook-test/<path>`.
4. Confirm `200 OK`, `ok: true`, and created output files.

Production workflow usage:

1. Confirm the workflow passed test mode.
2. Publish one workflow at a time.
3. Post to `http://localhost:5678/webhook/<path>`.
4. Confirm outputs under `content/outputs/` and status/log updates.

Outputs are saved under:

- `content/outputs/prompts/`
- `content/outputs/storyboards/`
- `content/outputs/marketing/`
- `content/outputs/qa-reports/`
- `content/outputs/session-logs/`
- `content/workflows/book-01/production-status.md`

Discord remains Phase 9 and is not active. Playwright helpers are reviewable browser assistance only and must stop at login, CAPTCHA, payment, subscription, account verification, rate limits, or platform restrictions.
