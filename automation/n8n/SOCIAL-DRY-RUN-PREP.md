# Social Dry-Run n8n Prep

Prepared: Monday, May 11, 2026 at 9:04 PM ET

## Current Safe Lane

Tonight's useful n8n work is prep-only. Do not post Days 6-8 early, do not create credentials, and do not call live platform publishing APIs.

Verified local status:

- `npm run n8n:check`: PASS.
- Existing n8n workflow exports are present and use `http://host.docker.internal:3333`.
- Existing workflow HTTP Request bodies pass the n8n item JSON object expression.
- Local Ember API is healthy at `http://localhost:3333`.
- Docker container `n8n-local` is running at `http://localhost:5678`.

## Existing n8n Coverage

The repo already has importable local workflows for:

- Seek page generation.
- Title page generation.
- Storyboard generation.
- Marketing pack generation.
- KDP QA.
- Discord command routing.

These are local-content workflows. They are not live social posting workflows.

## Social Automation Boundary

First social n8n target should be a read-only dry-run, not a publisher.

The dry-run should:

- Read the canonical Book 1 queue through a local API route or script-backed endpoint.
- Return the next due-date-safe chunk or a requested campaign day.
- Include task id, platform, caption, hashtags, local media path, approved platform asset, destination placeholder, receipt path, evidence path, and feasibility bucket.
- Label each platform with one of: `ready`, `needs credential`, `needs public media URL`, `needs app review`, `needs audit`, `manual`, or `manual-only`.
- Avoid queue status changes.
- Avoid credentials.
- Avoid opening browsers.
- Avoid live publishing calls.

## Needed Before a Social n8n Workflow

Add or expose a local read-only route that n8n can call. Recommended route:

```text
POST /social/dry-run-chunk
```

Suggested request body:

```json
{
  "campaignId": "book-01",
  "mode": "due-date-safe",
  "days": [6, 7],
  "today": "2026-05-11",
  "includeHeldTasks": true
}
```

Suggested response shape:

```json
{
  "ok": true,
  "mode": "prep-only",
  "postingAllowed": false,
  "reason": "Day 6 is scheduled for 2026-05-12; local date is 2026-05-11.",
  "chunk": {
    "days": [6, 7],
    "taskCount": 12,
    "tasks": []
  }
}
```

## First n8n Workflow To Build Later

Proposed file:

```text
automation/n8n/workflows/ember-social-dry-run-chunk.workflow.json
```

Standard flow:

```text
Webhook Trigger
  -> HTTP Request to http://host.docker.internal:3333/social/dry-run-chunk
  -> Respond to Webhook
```

Use test webhook URLs while building:

```text
http://localhost:5678/webhook-test/ember/social-dry-run-chunk
```

Do not activate a production webhook until the local route, workflow JSON, and tests pass.

## Tomorrow-Friendly Next Steps

1. Add the local `/social/dry-run-chunk` route and a small service that reuses `queue.json`, `social:handoff`, or the due-pressure chunk logic without posting.
2. Add tests for date gating, held tasks, required hashtag block, approved 4:5 Meta assets, receipt/evidence path output, and no queue writes.
3. Create the n8n workflow JSON only after the route exists.
4. Run `npm run n8n:check`.
5. Import into n8n and test with `/webhook-test/ember/social-dry-run-chunk`.

## Do Not Do Yet

- Do not post Days 6-8 before their due dates.
- Do not create Pinterest, Meta, YouTube, or TikTok credentials.
- Do not request app review or audits.
- Do not build live publisher workflows.
- Do not activate production social webhooks.
