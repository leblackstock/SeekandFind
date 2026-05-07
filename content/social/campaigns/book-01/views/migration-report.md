# Book 1 Social Queue Migration Report

Status: complete

## Files Created

- `content/social/campaigns/book-01/README.md`
- `content/social/campaigns/book-01/queue.json`
- `content/social/campaigns/book-01/platform-settings.json`
- `content/social/campaigns/book-01/receipts/`
- `content/social/campaigns/book-01/evidence/`
- `content/social/campaigns/book-01/views/migration-report.md`
- `content/social/campaigns/book-01/archive/legacy-source-snapshot.json`

## Source Files Used

- `content/outputs/marketing/calendar/book-1-prelaunch-rolling-campaign.json`
- `content/outputs/marketing/calendar/book-1-prelaunch-rolling-campaign.md`
- `content/outputs/marketing/launch-plan/book-1-prelaunch-rolling-campaign-full-launch-plan.md`
- `content/outputs/session-logs/2026-05-06-session.md`
- `content/workflows/book-01/production-status.md`
- `content/outputs/marketing/posts/`

No files inside `Ember's Adventures/` were used.

## Migrated Counts

- Posts migrated: 12
- Platform tasks migrated: 72
- Status counts: `posted=12`, `posted-early=3`, `ready=28`, `needs-account=20`, `needs-video-export=9`

## Uncertainties

- Scheduled times are unknown and set to `null`.
- Receipt files are future placeholders; old post records and screenshots were referenced, not moved.
- Evidence folders are future canonical locations; legacy audit evidence remains in the old audit folder and is listed in the archive snapshot.
- Some platform account/API readiness is still manual and placeholder-only.

## Recommended Next Step

Add a small queue validator that checks status values, unique platform-task idempotency keys, and post/task counts before any n8n or Playwright integration reads the queue.
