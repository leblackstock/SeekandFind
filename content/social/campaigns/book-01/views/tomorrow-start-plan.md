# Today Start Plan - Book 1 Social Automation

Plan date: Friday, May 8, 2026
Canonical source of truth: `content/social/campaigns/book-01/queue.json`

## Morning Start

Run these first, before opening any posting browser or changing queue state:

```powershell
npm run validate:social-queue
npm run social:handoff
```

Latest early-morning check on 2026-05-08 passed:

- `npm run validate:social-queue`: PASS
- Campaign posts: 12/12
- Platform tasks: 72/72
- Current statuses: `posted=20`, `posted-early=3`, `ready=21`, `needs-account=18`, `needs-video-export=10`
- Current handoff mode: `ready`
- Next ready task: `book01-day06-pinterest-dragon-books-for-kids`
- Scheduled date for next ready task: 2026-05-10
- Platform/board: Pinterest / `Dragon Books for Kids`

## Today Priorities

1. Confirm the queue state.
   - Re-run validation and handoff.
   - Treat `queue.json` as live truth.
   - Use old marketing calendars and launch-plan markdown only as reference/history.

2. Decide whether to post or hold the next Pinterest item.
   - The next ready task is Day 6 Pinterest, scheduled for Sunday, May 10.
   - Do not auto-post it on Friday, May 8 unless Lauren explicitly wants early Pinterest posting.
   - If posting is approved, keep the controlled cap at `--max 3` and record receipts through the canonical helper paths.

3. Main blocker: turn the short-video lane into a real runway.
   - Days 3-12 now have pending-review no-text video-source images.
   - Owner visual QA is required before any pending-review image moves to approved.
   - Start with Day 3, "Search with Ember."
   - After Day 3 image approval, export a 5-second vertical 9:16 motion-only clip.
   - Use closed-mouth language: no talking, no lip movement, no jaw movement, no lip sync.
   - Do not mark a short-video queue task `ready` until the approved video file exists under `content/outputs/videos/approved/`.

4. Second blocker: resolve Meta account/access.
   - Future Instagram and Facebook tasks are still blocked as `needs-account`.
   - Start with a supervised Meta Business Suite dry-run for the Facebook Page and Instagram Business flow.
   - Stop at login, account verification, permission, payment, CAPTCHA, or sensitive account boundaries.
   - Do not treat TikTok/YouTube-style work as the main next step until account and video-export blockers are clearer.

5. Recheck full-platform runway.
   - Static/Pinterest runway is healthy.
   - Full-platform runway is not healthy until Meta and video exports move forward.
   - The goal is at least 7 fully prepared campaign days, not just 7 days of static images.

## Day 3 Video Work Order

Use the existing Day 3 prep package:

- `content/outputs/videos/pending-review/day-03-search-with-ember/day-03-search-with-ember-video-generation-prompt.md`
- `content/outputs/videos/pending-review/day-03-search-with-ember/day-03-search-with-ember-review-checklist.md`

Day 3 steps:

1. Owner visual QA the pending no-text Day 3 video-source image.
2. If approved, move/copy the approved asset through the approved-image path used by the workflow.
3. Generate a 5-second 9:16 motion-only clip from the approved no-text source image.
4. Review for Ember model accuracy, no mouth movement, no readable text, no fake UI, no labels, no watermarks, no extra characters, and no scary/frantic motion.
5. If the video passes owner review, place the approved export under `content/outputs/videos/approved/`.
6. Then update the canonical queue task from `needs-video-export` to `ready` in a separate, receipt-aware step.

## What Not To Do First

- Do not start by making more random marketing assets.
- Do not use old campaign markdown as the live queue.
- Do not mark videos ready from prompts alone.
- Do not animate the original Day 3 promo image with readable "Search with Ember!" text unless Lauren explicitly approves that exception.
- Do not post Day 6 Pinterest early without a deliberate go-ahead.

## Watch Items

- Duplicate Pinterest posts if manual recovery or queue receipts drift.
- Pinterest board-name punctuation and exact board matching.
- Meta access friction around Facebook/Instagram Business.
- Short-video drift: mouth movement, weird final eyes, extra limbs, distorted scarf, missing satchel, or generated text.
- Queue/result drift if any live post is recorded outside `npm run social:mark-result`.

## Recommended First Action

Run:

```powershell
npm run validate:social-queue
npm run social:handoff
```

Then work Day 3 video approval/export before widening the lane.
