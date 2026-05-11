# Production Activation Checklist

Use this checklist when promoting Ember Content Studio n8n workflows from test webhooks to production webhooks.

Do not activate Discord yet. Discord remains Phase 9.

## Prerequisites

- Docker Desktop is running.
- n8n container `n8n-local` is running.
- Ember API is running on the Windows host at `http://localhost:3333`.
- Workflow JSON exports in `automation/n8n/workflows/` pass `npm run n8n:check`.
- Each workflow has passed test-mode verification before production activation.

## Q1 Prevention Gate

Before building or activating any social-posting n8n flow, run the rating-efficiency question:

```powershell
npm run social:what-next
npm run social:handoff
```

Ask: can any upcoming or looming posting task be kept from becoming Q1?

- If `social:handoff` returns a `due_pressure_chunk`, use that chunk as the fixture for dry-run payloads, receipt paths, evidence paths, hashtags, media paths, and platform gate labels.
- Do not use overdue live posts as the first true automated publish test.
- Do not start credential setup, app review, OAuth work, or live publishing until a read-only dry run can produce the complete chunk packet.
- Stop at the first platform gate that is `needs credential`, `needs public media URL`, `needs app review`, `needs audit`, or `manual-only`; record the gate instead of trying to work around it.
- Prefer one useful read-only chunk dry run over several platform-specific experiments that do not update the canonical queue or handoff notes.

## Confirm Local API

```powershell
Invoke-RestMethod -Uri "http://localhost:3333/health" -Method Get
```

Expected:

```json
{"ok":true}
```

## Confirm n8n Docker

```powershell
docker ps --filter "name=^/n8n-local$" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
Invoke-WebRequest -Uri "http://localhost:5678" -UseBasicParsing
```

## Docker Host API Rule

n8n runs inside Docker. Inside the container, `localhost` means the container itself, not Windows.

Workflow HTTP Request nodes must call:

```text
http://host.docker.internal:3333
```

Never use `http://localhost:3333` inside imported n8n workflow HTTP Request nodes.

## Publish One Workflow At A Time

1. Open n8n: `http://localhost:5678`.
2. Open one workflow.
3. Confirm the HTTP Request node URL uses `http://host.docker.internal:3333`.
4. Confirm the HTTP Request JSON body uses an object expression like `={{ $json.body ?? $json }}`.
5. Confirm there is no `JSON.stringify(...)`.
6. Publish/activate that workflow.
7. Copy or derive its production webhook URL.
8. Send one production webhook request.
9. Confirm `200 OK` and `ok: true`.
10. Confirm expected files were created or updated.
11. Move to the next workflow only after success.

## Production Webhook URLs

Production webhooks use:

```text
http://localhost:5678/webhook/<workflow-path>
```

Examples:

- `http://localhost:5678/webhook/ember/seek-page`
- `http://localhost:5678/webhook/ember/title-page`
- `http://localhost:5678/webhook/ember/storyboard`
- `http://localhost:5678/webhook/ember/marketing-pack`
- `http://localhost:5678/webhook/ember/kdp-qa`

## Confirm Output Files

Check the response body and confirm files under:

- `content/outputs/prompts/`
- `content/outputs/storyboards/`
- `content/outputs/marketing/`
- `content/outputs/qa-reports/`
- `content/outputs/session-logs/`
- `content/workflows/book-01/production-status.md`

## Rollback

To unpublish a workflow:

```powershell
docker exec n8n-local n8n unpublish:workflow --id=<workflow-id>
```

To restart n8n:

```powershell
docker restart n8n-local
```

To restore from repo workflow JSON, re-import the relevant export:

```powershell
docker cp automation/n8n/workflows/<workflow>.workflow.json n8n-local:/tmp/<workflow>.workflow.json
docker exec n8n-local n8n import:workflow --input=/tmp/<workflow>.workflow.json
```

## Troubleshooting

- Wrong URL: use `host.docker.internal:3333` inside Docker n8n, not `localhost:3333`.
- Bad JSON body: do not use `JSON.stringify(...)`; pass an object expression such as `={{ $json.body ?? $json }}`.
- No input data: execute from the Webhook Trigger/test URL, not by running a middle HTTP Request node alone.
- Webhook not listening: test URLs require "Execute workflow" / "Listen for test event"; production URLs require the workflow to be published.
- Production vs test URL confusion: test uses `/webhook-test/...`; production uses `/webhook/...`.
- Ember API not running: start it with `npm run server`.
- Duplicate output file: pass `force: true` only when intentionally overwriting generated test files.
