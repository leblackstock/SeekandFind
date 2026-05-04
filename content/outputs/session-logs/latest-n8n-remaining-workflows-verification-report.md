# n8n Remaining Workflows Verification Report

## Summary

Verified the remaining non-Discord n8n workflows in test mode using Playwright:

- `Ember Generate Title Page`
- `Ember Generate Storyboard`
- `Ember Generate Marketing Pack`
- `Ember KDP QA`

Each workflow was imported from the fixed repo export, opened in the n8n UI, armed with `Execute workflow`, and triggered through its `/webhook-test/...` URL.

## Environment

- n8n URL: `http://localhost:5678`
- n8n container: `n8n-local`
- Ember API URL from n8n Docker: `http://host.docker.internal:3333`
- Ember API URL from host: `http://localhost:3333`

## Commands And Checks

```powershell
docker exec n8n-local n8n list:workflow
docker cp automation/n8n/workflows/<workflow>.workflow.json n8n-local:/tmp/<workflow>.workflow.json
docker exec n8n-local n8n import:workflow --input=/tmp/<workflow>.workflow.json
npm run build
npm run test
npm run n8n:check
```

All passed:

- `npm run build`
- `npm run test`
- `npm run n8n:check`
- Docker container to host API health check

## Results

### Title Page

Webhook:

```text
http://localhost:5678/webhook-test/ember/title-page
```

Result: `200 OK`, API response `ok: true`.

Files created/updated:

- `content/outputs/prompts/title-page-ember-and-the-sparkleflame-festival-search-frosted-cloud-bakery-title-moment-prompt.md`
- `content/outputs/session-logs/2026-05-03-session.md`
- `content/workflows/book-01/production-status.md`

### Storyboard

Webhook:

```text
http://localhost:5678/webhook-test/ember/storyboard
```

Result: `200 OK`, API response `ok: true`.

Files created/updated:

- `content/outputs/storyboards/seedance-promote-ember-seek-and-find-book-storyboard.md`
- `content/outputs/session-logs/2026-05-03-session.md`
- `content/workflows/book-01/production-status.md`

### Marketing Pack

Webhook:

```text
http://localhost:5678/webhook-test/ember/marketing-pack
```

Result: `200 OK`, API response `ok: true`.

During the first run, the marketing QA falsely flagged the guardrail line `Do not say available now...` as a publication claim. The QA checker was fixed to ignore claim language inside negative/guardrail instructions, the Ember API was restarted, and the workflow then passed cleanly.

Files created/updated:

- `content/outputs/marketing/marketing-book-1-page-7-frosted-cloud-bakery-promote-ember-seek-and-find-book.md`
- `content/outputs/session-logs/2026-05-03-session.md`
- `content/workflows/book-01/production-status.md`

### KDP QA

Webhook:

```text
http://localhost:5678/webhook-test/ember/kdp-qa
```

Result: `200 OK`, API response `ok: true`.

Files created/updated:

- `content/outputs/qa-reports/content-outputs-prompts-book01-page007-frosted-cloud-bakery-image-prompt-kdp-qa.md`
- `content/outputs/session-logs/2026-05-03-session.md`
- `content/workflows/book-01/production-status.md`

## Fixes Made During Verification

- Tightened `runMarketingQa` so publication-claim guardrail text does not fail QA as if it were actual marketing copy.
- Restarted the local Ember API so n8n used the updated QA code.

## Remaining Manual Steps

- Keep workflows in test mode until you are ready to publish them.
- Clean up duplicate seek-page workflow imports in n8n later if desired.
- Repeat this pattern whenever a workflow export changes: import, arm test listener, post payload, confirm files.

## Recommended Next Step

Review the generated prompt/marketing/storyboard outputs, then decide which n8n workflows should be activated for production webhook URLs.
