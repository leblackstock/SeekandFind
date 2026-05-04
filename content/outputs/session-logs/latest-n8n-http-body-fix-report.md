# n8n HTTP Body Fix Report

## Problem

The n8n HTTP Request nodes were returning `Bad request - please check your parameters` when the seek-page webhook received a valid POST payload.

## Root Cause

The exported HTTP Request nodes were configured with:

```text
={{ JSON.stringify($json.body ?? $json) }}
```

That risks sending the payload as a JSON string instead of a JSON object. The exported workflows also used `http://localhost:3333`, which is wrong when n8n runs inside Docker because `localhost` means the n8n container, not the Windows host.

The seek-page workflow also had an empty Set Fields node between Webhook Trigger and HTTP Request. That node was unnecessary and made input mapping less reliable.

## Fix Applied

- Replaced HTTP Request node URLs with `http://host.docker.internal:3333/...`.
- Replaced stringified body expressions with object expressions:

  ```text
  ={{ $json.body ?? $json }}
  ```

- Removed the empty Set Fields node from the seek-page workflow export.
- Added top-level workflow IDs so current n8n CLI import accepts the JSON exports.
- Added stable `webhookId` values so current n8n versions can register imported Webhook Trigger nodes reliably.
- Updated `npm run n8n:check` to fail when workflow JSON contains:
  - `localhost:3333`
  - `JSON.stringify($json`
  - stringified HTTP Request body expressions
- Updated n8n troubleshooting docs with Docker URL and object-body guidance.

## Workflow Files Updated

- `automation/n8n/workflows/ember-generate-seek-page.workflow.json`
- `automation/n8n/workflows/ember-generate-title-page.workflow.json`
- `automation/n8n/workflows/ember-generate-storyboard.workflow.json`
- `automation/n8n/workflows/ember-generate-marketing-pack.workflow.json`
- `automation/n8n/workflows/ember-kdp-qa.workflow.json`
- `automation/n8n/workflows/ember-discord-command-router.workflow.json`

Only the n8n Discord router export was touched so the checker would not fail on stale URL/body patterns. Discord app/bridge code was not changed.

## Docker URL Check

Passed. `npm run n8n:check` confirms every workflow HTTP Request node uses:

```text
http://host.docker.internal:3333
```

Docker-to-host API connectivity also passed:

```powershell
docker exec n8n-local wget -qO- http://host.docker.internal:3333/health
```

Returned:

```json
{"ok":true,"service":"ember-content-studio"}
```

## Body Expression Check

Passed. `npm run n8n:check` confirms every workflow HTTP Request JSON body passes an object expression:

```text
={{ $json.body ?? $json }}
```

No workflow export contains `JSON.stringify($json`.

## Commands Run

```powershell
npm run build
npm run test
npm run n8n:check
docker exec n8n-local wget -qO- http://host.docker.internal:3333/health
docker cp automation/n8n/workflows/ember-generate-seek-page.workflow.json n8n-local:/tmp/ember-generate-seek-page.workflow.json
docker exec n8n-local n8n import:workflow --input=/tmp/ember-generate-seek-page.workflow.json
docker exec n8n-local n8n list:workflow
Invoke-RestMethod -Uri "http://localhost:5678/webhook-test/ember/seek-page" -Method Post -Body $body -ContentType "application/json"
```

## Test Results

- `npm run build`: passed.
- `npm run test`: passed, 7 test files, 24 tests.
- `npm run n8n:check`: passed.
- Docker container can reach host Ember API through `host.docker.internal:3333`.
- Fixed seek-page workflow export imported successfully into n8n after adding top-level workflow IDs.
- The signed-in n8n workflow ID `NwGcDtELY6VJFkfi` was updated with the fixed seek-page JSON so the UI tab used for testing no longer had the stale `JSON.stringify(...)` body or empty Set Fields node.

## End-to-End Webhook Result

Final Playwright-assisted test succeeded. The browser was attached through Chrome remote debugging, the fixed n8n seek workflow was opened, and the main "Execute workflow" button was clicked to arm the test listener.

The test webhook call used:

```text
http://localhost:5678/webhook-test/ember/seek-page
```

Payload:

```powershell
$body = @{
  bookTitle = "Ember and the Sparkleflame Festival Search"
  pageNumber = 7
  location = "Frosted Cloud Bakery"
  missionItem = "tiny frosted bell"
  ageRange = "5-8"
  style = "soft rounded 2.25D children's storybook"
  outputMode = "prompt+qa"
} | ConvertTo-Json
```

Result:

```json
[
  {
    "ok": true,
    "workflow": "seek-page",
    "summary": "Generated seek-page prompt and QA report.",
    "files": [
      "content/outputs/prompts/book01-page007-frosted-cloud-bakery-image-prompt.md",
      "content/outputs/qa-reports/book01-page007-frosted-cloud-bakery-qa.md",
      "content/outputs/session-logs/2026-05-03-session.md",
      "content/workflows/book-01/production-status.md"
    ],
    "warnings": [],
    "nextStep": "Generate the image, then run KDP QA."
  }
]
```

The n8n UI showed one item flowing through the workflow after execution.

Exact PowerShell command to run after clicking "Execute workflow" / "Listen for test event" in n8n:

```powershell
$body = @{
  bookTitle = "Ember and the Sparkleflame Festival Search"
  pageNumber = 7
  location = "Frosted Cloud Bakery"
  missionItem = "tiny frosted bell"
  ageRange = "5-8"
  style = "soft rounded 2.25D children's storybook"
  outputMode = "prompt+qa"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5678/webhook-test/ember/seek-page" -Method Post -Body $body -ContentType "application/json"
```

## Files Created By Test

The successful test created or updated:

- `content/outputs/prompts/book01-page007-frosted-cloud-bakery-image-prompt.md`
- `content/outputs/qa-reports/book01-page007-frosted-cloud-bakery-qa.md`
- `content/outputs/session-logs/2026-05-03-session.md`
- `content/workflows/book-01/production-status.md`

## Remaining Manual Steps

1. Keep using test mode while iterating; do not publish workflows yet.
2. If duplicate `Ember Generate Seek Page` workflows appear from earlier imports, keep the fixed workflow ID `NwGcDtELY6VJFkfi` or re-import the fixed JSON cleanly.
3. Repeat the same import/test pattern for title page, storyboard, marketing pack, and KDP QA workflows.

## Recommended Next Step

Verify the remaining n8n workflows one at a time in test mode using their fixed exported JSON.
