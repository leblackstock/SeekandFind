# Today Start Plan - Book 1 Social Automation

Plan date: Saturday, May 9, 2026
Latest live check: Saturday, May 9, 2026 at 2:01 AM ET
Canonical source of truth: `content/social/campaigns/book-01/queue.json`

## Morning Start

Run these first, before opening any posting browser or changing queue state:

```powershell
npm run validate:social-queue
npm run social:handoff
npm run social:what-next
```

Latest check passed:

- `npm run validate:social-queue`: PASS
- Campaign posts: 12/12
- Platform tasks: 72/72
- Current statuses: `posted=20`, `posted-early=3`, `ready=39`, `needs-video-export=10`
- Meta account/access blocker: cleared; old `needs-account` statuses were stale and were promoted to `ready`
- Current handoff mode: `ready`
- Next ready task: `book01-day04-instagram-feed-post-plus-story-reshare`
- Scheduled date for next ready task: 2026-05-08
- Next real blocker: `book01-day03-short-video-tiktok-youtube-shorts-instagram-reels-facebook-reels`
- Days 1-2 are fully posted, including Meta and short video.
- Day 3 still/static posts are complete; Day 3 only still needs the short-video export.

## Today Priorities

1. Confirm the queue state.
   - Re-run validation and handoff.
   - Treat `queue.json` as live truth.
   - Use old marketing calendars and launch-plan markdown only as reference/history.

2. Check live social account wording.
   - Check all active social accounts for the phrase "Coming soon to Amazon".
   - Make sure the wording is present anywhere it is supposed to be present.
   - If an account is missing it, record which account/post/profile needs fixing before changing queue state.
   - Ask tomorrow before deciding placement:
     - Should profile pictures or banners say "Coming soon to Amazon"?
     - Would a pinned post be better?
     - Should we make a special promo still for this wording?
     - Should we make a special promo video for this wording?
     - Should the wording live in account bios, post captions, pinned content, visual assets, or some combination?
     - Which social accounts should carry the wording: Pinterest, Instagram, Facebook, TikTok, YouTube, or all of them?
     - Should the wording be exactly "Coming soon to Amazon" everywhere, or should each platform use a slightly different version?
     - Should the wording point to a future Amazon page, a temporary landing page, or no link until the listing exists?
     - Should the pinned/static/video promo use existing approved Ember art, or should it get a dedicated new asset?
     - Should this be a one-time announcement, a pinned evergreen notice, or a recurring line in campaign captions?
     - What should be removed or changed once the Amazon listing is live?

3. Decide whether to catch up ready Meta/static posts.
   - The next ready task is Day 4 Instagram, scheduled for Friday, May 8.
   - Meta access is not currently the blocker.
   - Do not publish catch-up posts unless Lauren explicitly wants to proceed.
   - If posting is approved, record receipts through the canonical helper paths.

4. Main production blocker: short-video exports.
   - Days 3-12 still need finished video exports.
   - Days 3-12 now have approved start/end-frame still packages.
   - Start with Day 3, "Search with Ember"; its still/static posts are already complete.
   - Use closed-mouth language: no talking, no lip movement, no jaw movement, no lip sync.
   - Do not mark a short-video queue task `ready` until the approved video file exists under `content/outputs/videos/approved/`.

5. Keep the full-platform runway honest.
   - Static/Pinterest/Meta runway is healthy after clearing stale account statuses.
   - Full-platform runway is not healthy until video exports move forward.
   - The goal is at least 7 fully prepared campaign days, not just 7 days of static images.

## Day 3 Video Work Order

Day 3 still/static posting is already complete across Pinterest, Instagram, and Facebook. This work order is for the missing short-video export only.

Use the current Day 3 start/end-frame package:

- `content/outputs/videos/batches/book-01-short-video-batch-2026-05-08/start-end-frames/day-03-search-with-ember/day-03-search-with-ember-start-frame.png`
- `content/outputs/videos/batches/book-01-short-video-batch-2026-05-08/start-end-frames/day-03-search-with-ember/day-03-search-with-ember-end-frame-prompt.md`
- `content/outputs/videos/batches/book-01-short-video-batch-2026-05-08/start-end-frames/day-03-search-with-ember/day-03-search-with-ember-keyframe-image-to-video-prompt.md`
- `content/outputs/videos/batches/book-01-short-video-batch-2026-05-08/start-end-frames/day-03-search-with-ember/day-03-search-with-ember-start-end-frame-review-checklist.md`

Day 3 steps:

1. Generate/export a 5-second 9:16 motion-only clip from the approved start/end-frame stills.
2. Review for Ember model accuracy, no mouth movement, no readable text, no fake UI, no labels, no watermarks, no extra characters, and no scary/frantic motion.
3. If the video passes owner review, place the approved export under `content/outputs/videos/approved/`.
4. Then update the canonical queue task from `needs-video-export` to `ready` in a separate, receipt-aware step.

## What Not To Do First

- Do not treat Meta access as blocked unless a fresh live platform check shows a real login, permission, verification, payment, CAPTCHA, or account boundary.
- Do not start by making more random marketing assets.
- Do not use old campaign markdown as the live queue.
- Do not mark videos ready from prompts or stills alone.
- Do not publish overdue ready tasks without a deliberate go-ahead.

## Watch Items

- Duplicate Pinterest or Meta posts if manual recovery or queue receipts drift.
- Pinterest board-name punctuation and exact board matching.
- Short-video drift: mouth movement, weird final eyes, extra limbs, distorted scarf, missing satchel, frozen held items, or generated text.
- Queue/result drift if any live post is recorded outside `npm run social:mark-result`.

## Recommended First Action

If posting catch-up static content:

```powershell
npm run social:handoff
```

If building runway:

```powershell
npm run social:what-next
```

Then work Day 3 video export before widening the video lane.
