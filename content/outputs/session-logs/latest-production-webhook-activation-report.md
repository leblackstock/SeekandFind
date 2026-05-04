# Production Webhook Activation Report

## Summary

Prepared production activation docs, created a git checkpoint, activated the five non-Discord n8n workflows, and verified production webhook calls against the local Ember API. Discord remains Phase 9 and was not activated.

## Preflight Results

- `npm run build`: passed.
- `npm run test`: passed.
- `npm run n8n:check`: passed.
- Ember API health check at `http://localhost:3333/health`: passed.
- n8n reachability at `http://localhost:5678`: passed.
- Playwright smoke check loaded n8n at `http://localhost:5678` with no obvious login boundary.

## Git Checkpoint

- Created pre-activation checkpoint commit `fb6f63c` with message: `Verify Ember content studio n8n workflows`.
- Created final activation checkpoint commit with message: `Activate Ember n8n production workflows`.

## Documentation Added or Updated

- Added `automation/n8n/PRODUCTION-ACTIVATION-CHECKLIST.md`.
- Added `automation/n8n/LOCAL-WEBHOOK-TEST-COMMANDS.md`.
- Updated `README.md` with `## Verified Local n8n Workflow Usage`.

## Workflows Activated

- `Ember Generate Seek Page`
- `Ember Generate Title Page`
- `Ember Generate Storyboard`
- `Ember Generate Marketing Pack`
- `Ember KDP QA`

The active seek-page workflow is the existing signed-in n8n workflow ID `NwGcDtELY6VJFkfi`. The duplicate imported seek workflow was not used for production activation.

## Production Webhook URLs Tested

- `http://localhost:5678/webhook/ember/seek-page`
- `http://localhost:5678/webhook/ember/title-page`
- `http://localhost:5678/webhook/ember/storyboard`
- `http://localhost:5678/webhook/ember/marketing-pack`
- `http://localhost:5678/webhook/ember/kdp-qa`

## Test Payloads Used

- Seek page: page 8, `Glowing Lantern Garden`, mission item `tiny golden lantern key`.
- Title page: `Sparkleflame Festival opening title page`.
- Storyboard: 15-second short-form video where Ember follows a glowing festival clue.
- Marketing pack: Pinterest, Facebook, and Instagram copy for `Book 1 sample seek-and-find page`.
- KDP QA: prompt QA for `content/outputs/prompts/book01-page008-glowing-lantern-garden-image-prompt.md`.

Each production test used `force: true` to avoid overwrite protection during repeated verification.

## Test Results

- Seek page: `200 OK`, `ok: true`.
- Title page: `200 OK`, `ok: true`.
- Storyboard: `200 OK`, `ok: true`.
- Marketing pack: first production call reached the API but returned `ok: false` due to a QA false positive; after the fix, retest returned `200 OK`, `ok: true`.
- KDP QA: `200 OK`, `ok: true`.

## Files Created or Updated

- `content/outputs/prompts/book01-page008-glowing-lantern-garden-image-prompt.md`
- `content/outputs/qa-reports/book01-page008-glowing-lantern-garden-qa.md`
- `content/outputs/prompts/title-page-ember-and-the-sparkleflame-festival-search-sparkleflame-festival-opening-title-page-prompt.md`
- `content/outputs/storyboards/seedance-promote-ember-seek-and-find-book-storyboard.md`
- `content/outputs/marketing/marketing-book-1-sample-seek-and-find-page-promote-a-children-s-dragon-seek-and-find-activity-book-without-claiming-it-is-already-published.md`
- `content/outputs/qa-reports/content-outputs-prompts-book01-page008-glowing-lantern-garden-image-prompt-kdp-qa.md`
- `content/outputs/session-logs/2026-05-04-session.md`
- `content/workflows/book-01/production-status.md`

## Build/Test Results

Final verification passed:

- `npm run build`
- `npm run test`
- `npm run n8n:check`

Workflow string guard passed:

- no `localhost:3333` found in workflow JSON exports
- no `JSON.stringify($json` found in workflow JSON exports
- no `JSON.stringify($json.body` found in workflow JSON exports

## Problems Found

- n8n production webhook listeners sometimes returned `404` immediately after activation/restart, then worked after active-state export/retry. This appears to be local n8n listener startup timing, not workflow logic.
- Marketing QA treated the negative phrase `without claiming it is already published` as a publication claim.
- A temporary title-page `Ping` webhook probe created an unwanted output; it was removed from outputs, session log, and production status.

## Fixes Applied

- Updated `src/core/qa-engine.ts` so marketing QA ignores explicit no-claim phrasing such as `without claiming ... published`.
- Restarted the local Ember API so the production webhook used the fixed QA logic.
- Removed the accidental `title-page-ping-ping-prompt.md` probe artifact and its log/status entries.

## Remaining Manual Steps

- Leave Discord inactive until Phase 9.
- Use the seek-page production webhook for one actual Ember page before adding Discord.
- In n8n, keep these workflows active only while you want production webhook listeners running.

## Rollback Notes

To roll back a workflow, open n8n at `http://localhost:5678`, deactivate the workflow toggle, and test that its production webhook no longer responds. If using the Docker CLI for local maintenance, restart `n8n-local` after activation/deactivation changes so production listeners refresh.

## Recommended Next Step

Use `http://localhost:5678/webhook/ember/seek-page` for one real Ember page generation, confirm the files, then decide whether to keep production webhooks active for day-to-day use.
