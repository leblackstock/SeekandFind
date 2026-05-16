# Current Start Plan - Book 1 Social Automation

Plan date: Friday, May 15, 2026
Latest live check: Friday, May 15, 2026 at 11:47 PM ET
Canonical source of truth: `content/social/campaigns/book-01/queue.json`

## Lauren's Note

- Do not remove this - Per Lauren.
- What is the smallest improvement we can make to gain the biggest impact on efficiency, consistency, flow, and token use?

## Active Todo

1. Start every social work block from the compact front door.
   - Run `npm run social:today`.
   - Confirm the displayed America/New_York date.
   - Treat `PREP ONLY` as a hard hold for future scheduled days.

2. Work the due-pressure posting chunk before opening new browser tabs.
   - Current chunk: Day 8 and Day 9.
   - Day 7 is fully posted.
   - Day 8 is partially posted: all three Pinterest still Pins, Instagram feed, Facebook page post, YouTube Shorts, Instagram Reels, Facebook Reels, and Pinterest Video Pin are posted/recorded.
   - Day 8 still needs TikTok before the bundled short-video task can close.
   - Before posting Day 9, first retry Day 8 TikTok recovery: Lauren saw TikTok's normal "video published" popup after the manual Post click, so check Studio/public profile for delayed visibility and recover the URL before any Day 9 posting.
   - Day 9 still needs its full social posting set.

3. Keep the Amazon/KDP release as quiet prep only until campaign Day 12, Monday, May 18, 2026.
   - Day 8 through Day 11 social posting may proceed when their campaign gates are open, but the listing/release moment stays held.
   - Quiet prep can include KDP checklist, listing copy draft, metadata review, launch/link update copy, and asset checks.
   - Do not publish the listing, use a buy CTA, or switch to "available now" wording before the Day 12 release gate is cleared.

4. After the live book link is available, update every social account.
   - Add the book link anywhere the platform supports it.
   - Remove "Coming soon" wording from bios, pinned/profile text, banners, and reusable public copy.
   - Make sure profile images, header/banner art, and visible account branding are current.
   - Check Pinterest, Instagram, Facebook, YouTube, TikTok, and any other active Ember social surface.

5. Close completed live posts with the finish-button helpers.
   - Still post pattern: `npm run social:done -- <TASK_KEY> <POST_URL>`.
   - Short-video bundle pattern: `npm run social:done -- <TASK_KEY> --youtube <YOUTUBE_SHORTS_URL> --tiktok <TIKTOK_URL> --instagram <INSTAGRAM_REEL_URL> --facebook <FACEBOOK_REEL_URL> --pinterest <PINTEREST_VIDEO_PIN_URL>`.
   - The helper writes the receipt, creates evidence, marks `queue.json`, validates, and prints the next compact packet.
   - Use `npm run social:receipt` only for lower-level manual or recovery cases.

6. Keep this plan compact.
   - Record only current gates, next actions, receipts, and watch items here.
   - Use generated compact packets for full task detail instead of adding long chat-style handoffs.

## Implemented Workflow Decisions

- Decision implemented: make `npm run social:today` the required front door for every social work block, then close each posted task with `npm run social:done`.
- Date-drift fix implemented: social packet and due-pressure helpers use the America/New_York campaign clock for date gates.

## Verified Live State

Fresh command checks:

```powershell
npm run validate:social-queue
npm run social:today
npm run social:status-compact -- day-07
npm run social:status-compact -- day-08
```

Current verified result:

- `npm run validate:social-queue`: PASS.
- Campaign posts: 12/12.
- Platform tasks: 72/72.
- Queue statuses: `posted=44`, `posted-early=3`, `ready=25`.
- `npm run social:today`: PASS.
- Today in campaign clock: 2026-05-15.
- Current mode: `LIVE POSTING OK`.
- Current due-pressure chunk: Day 8 and Day 9.
- Day 7 status: 6/6 posted, 0 ready, 0 blocked.
- Day 8 status: 5/6 posted, 1 ready, 0 blocked.
- Day 8 short-video partial: YouTube Shorts `https://youtube.com/shorts/T3YI9t7_v0Y`, Instagram Reels `https://www.instagram.com/emberdragonbooks/reel/DYYWwnDDbaT/`, Facebook Reels `https://www.facebook.com/reel/737527209411899`, and Pinterest Video Pin `https://www.pinterest.com/pin/1148417973750883260/` are recorded; missing TikTok only.
- Day 9 status: 0/6 posted, 6 ready, 0 blocked.
- Next real blocker: TikTok did not recover the Day 8 Firefly video during the watch window after the manual Post click, but Lauren saw TikTok's normal "video published" popup. Treat this as likely delayed/hidden visibility first: retry recovery at the start of Day 9 before any Day 9 posting.
- Automation note: fixed the Day 8 Instagram queue key to `book01-day08-instagram-feed-post-plus-story-reshare`. `validate:social-queue` now treats a ready Facebook page-post without a matching ready Instagram feed-post-plus-story-reshare task as a hard Meta still production blocker before browser automation.

## Recommended First Action

Before any Day 9 posting, retry Day 8 TikTok recovery and close the short-video bundle if a URL appears:

```powershell
npm run social:tiktok-recover-url -- --day=day-08
npm run social:post-day -- day-08 --close-short-video --tiktok <TIKTOK_URL>
```

After each completed posting block:

```powershell
npm run social:done -- <TASK_KEY> <POST_URL>
```

## Day 7 Work Order - Hold Until May 13

- Scheduled date: 2026-05-13.
- Status: ready-to-schedule.
- Live posting gate: HOLD. Do not publish before Wednesday, May 13, 2026 unless Lauren explicitly approves early posting.
- Still asset: `content/outputs/images/approved/book-1-mission-item-promo-batch-03-01-golden-welcome-bell-teaser-recovered-2026-05-05T19-29-49-208Z.png`.
- Video asset: `content/outputs/videos/approved/day-7-golden-welcome-bell-veo31-canva-approved-2026-05-10.mp4`.
- Shared Meta 4:5 feed asset: `content/outputs/images/approved/meta-feed-4x5/book-01/day-07-meta-feed-4x5-approved.png`.

Caption:

```text
Can your little seeker find the Golden Welcome Bell among the festival decorations?

Coming soon to Amazon.

Save the challenge and try it together.

#SeekAndFind #KidsActivityBook #ChildrensBooks #ScreenFreeFun #BabyDragon #HiddenObjectBook #KidsBooks #FamilyReading #EmberDragonBooks #dragonbooks #dragonbooksforkids
```

Posting order:

1. Pinterest still Pins:
   - `book01-day07-pinterest-hidden-object-books-for-kids` - board `Hidden Object Books for Kids`.
   - `book01-day07-pinterest-fantasy-activity-books-for-kids` - board `Fantasy Activity Books for Kids`.
   - `book01-day07-pinterest-seek-and-find-books-for-kids` - board `Seek-and-Find Books for Kids`.

2. Meta still post:
   - `book01-day07-instagram-feed-post-plus-story-reshare`.
   - `book01-day07-facebook-page-post`.
   - Use one Meta Business Suite composer action with both Instagram and Facebook selected.

3. Short-video bundle:
   - `book01-day07-short-video-youtube-shorts-public-tiktok-public-instagram-reels-public-facebook-reels-public-pinterest-video-pin-public`.
   - Required surfaces: YouTube Shorts, TikTok, Instagram Reels, Facebook Reels, Pinterest Video Pin.

When the gate opens:

- Run `npm run social:packet -- 7`.
- Post the 3 Pinterest still Pins first.
- Post Instagram and Facebook stills from one Meta composer action using the approved 4:5 image.
- Post the short-video bundle to all five required video surfaces.
- Run the matching `social:done` helper only after the live URL or full URL set exists.
- Re-run `npm run validate:social-queue` after marking results.

## Social Boundary / Day 12 Release Hold

- Scheduled date: 2026-05-14.
- Status: ready-to-schedule.
- Day 8 social gate: opens on Thursday, May 14, 2026.
- Day 9 social gate: opens on Friday, May 15, 2026.
- Amazon/KDP listing/release gate: HOLD until campaign Day 12, Monday, May 18, 2026, unless Lauren explicitly changes the schedule.
- Day 8 and Day 9 are included by `npm run social:today` because they are behind or due today.
- Quiet prep is allowed before the gate: KDP upload checklist, cover/interior PDF QA, listing copy draft, metadata review, and launch/link update copy.
- Day 8 and Day 9 social assets are ready in `queue.json`, but readiness does not equal permission to publish the listing early.

Day 8 caption from the current compact packet:

```text
Find the Firefly Flower Charm.

Coming soon to Amazon.

Tap, pause, and search.

#SeekAndFind #KidsActivityBook #ChildrensBooks #ScreenFreeFun #BabyDragon #HiddenObjectBook #KidsBooks #FamilyReading #EmberDragonBooks #dragonbooks #dragonbooksforkids
```

## Completed Context

- Days 1-3 are fully posted, including Meta and short video.
- Day 4 short-video bundle is posted across all five required video surfaces.
- Day 5 Instagram and Facebook stills were posted together through Meta Business Suite using the approved 4:5 image.
- Day 5 short-video bundle is posted across all five required video surfaces.
- Day 5 Pinterest Video Pin caption was fixed after publish; the receipt records before/edit/after evidence.
- Day 6 is fully posted, including all three Pinterest still Pins, Meta stills, and the short-video bundle across all five required video surfaces.
- Public social wording check is complete: Pinterest, Instagram, Facebook, YouTube, and TikTok use prelaunch wording for `Adventures With Ember: The Sparkleflame Festival` and `Coming soon to Amazon`.
- Day 1 Instagram, Day 4 Instagram, and Day 4 Facebook cut-off stills were removed and replaced with approved 4:5 stills.
- The 7-day full pre-launch runway is ready, and all Days 1-12 static, Pinterest, Meta, and video assets are prepared.

Day 6 short-video URLs:

- YouTube Shorts: `https://youtube.com/shorts/dDfQf-6o3MA`.
- TikTok: `https://www.tiktok.com/@emberdragonbooks/video/7639144191909514527`.
- Instagram Reel: `https://www.instagram.com/emberdragonbooks/reel/DYQaUlJjkKd/`.
- Facebook Reel: `https://www.facebook.com/reel/981569931298346/`.
- Pinterest Video Pin: `https://www.pinterest.com/pin/1148417973750686253/`.
- Receipt: `content/social/campaigns/book-01/receipts/short-video/book01-day-06/book01-day06-short-video-youtube-shorts-public-tiktok-public-instagram-reels-public-facebook-reels-public-pinterest-video-pin-public.json`.
- Evidence folder: `content/social/campaigns/book-01/evidence/short-video/book01-day-06/`.

## Standing Rules

- Treat `queue.json` as live truth. Use old marketing calendars and launch-plan markdown only as reference/history.
- Every campaign day requires 3 Pinterest still Pins.
- Every new short-video bundle requires YouTube Shorts, TikTok, Instagram Reels, Facebook Reels, and Pinterest Video Pin.
- Use the full hashtag block on hashtag-friendly open posting tasks: `#SeekAndFind #KidsActivityBook #ChildrensBooks #ScreenFreeFun #BabyDragon #HiddenObjectBook #KidsBooks #FamilyReading #EmberDragonBooks #dragonbooks #dragonbooksforkids`.
- `#dragonbooks` and `#dragonbooksforkids` are additions, not replacements.
- Instagram/Facebook feed stills require the approved native 4:5 `meta_feed_4x5` asset. Do not use 9:16 Pinterest/Shorts/Story art for feed stills.
- Use Meta Business Suite / Meta posting tools for Instagram and Facebook feed, Reel, repost, and scheduled work.
- When the same asset/caption is meant for Instagram and Facebook, use one Meta composer action with both destinations selected unless Lauren asks to split them or Meta blocks the combined post.
- Keep public wording in "Coming soon to Amazon" mode until the listing is live.
- Do not publish or announce the Amazon/KDP listing until campaign Day 12, Monday, May 18, 2026, and only after Days 1-11 are complete or explicitly deferred.
- Do not automate bypassing login, payment, CAPTCHA, rate limits, platform restrictions, or sensitive account boundaries.

## Watch Items

- Duplicate Pinterest or Meta posts if manual recovery or queue receipts drift.
- Pinterest board-name punctuation and exact board matching, including `Children's Activity Books`.
- Instagram Story reshare may remain manual unless a fresh official API gate confirms otherwise.
- 9:16 text-bearing promo stills are unsafe for Instagram/Facebook feed posts.
- If an approved 4:5 asset is missing from any Meta still posting pack, stop before posting.
- Short-video drift: mouth movement, weird final eyes, extra limbs, distorted scarf, missing satchel, frozen held items, or generated text.
- Queue/result drift if any live post is recorded outside `npm run social:done` or the lower-level receipt helpers.

## Live Upload Recovery Rule

If a YouTube/TikTok/Meta upload draft is open, use only the controlled recovery helper for inspection.

```powershell
npm run social:live-upload-recovery -- --match-url studio.youtube.com
```

- Do not call `reload`, `goto`, back, forward, or close the attached browser session.
- If a reload warning appears during inspection, cancel it immediately and verify the draft is still visible.
- For other open upload pages, change only `--match-url`; do not navigate away from the active draft.

## Long-Term Planning - n8n/API Automation

- n8n/API posting is parked for later, not part of the active Day 7/8 posting work.
- Current n8n status: `npm run n8n:check` passed on Monday, May 11, 2026 at 9:04 PM ET, and Docker reported `n8n-local` at `http://localhost:5678`.
- Planning note: `automation/n8n/SOCIAL-DRY-RUN-PREP.md`.
- Research baseline: `content/outputs/research/social-api-n8n-feasibility-2026-05-11.md`.
- Future build target: local `POST /social/dry-run-chunk`, then an n8n test workflow that calls it.
- Keep this lane read-only until credentials, public media URLs, app review/audit, and platform-specific behavior are intentionally cleared.
- No live publishing, credential experiments, browser posting, production webhook activation, or queue status changes belong in the long-term n8n lane.

## What Not To Do First

- Do not post Day 7 before Wednesday, May 13, 2026 unless Lauren explicitly says to.
- Do not post Day 8 before Thursday, May 14, 2026 unless Lauren explicitly says to.
- Do not treat Meta access as blocked unless a fresh live platform check shows a real login, permission, verification, payment, CAPTCHA, or account boundary.
- Do not start by making more random marketing assets.
- Do not use old campaign markdown as the live queue.
- Do not publish the Amazon/KDP listing before Day 12.
- Do not use "available now" or buy-link language before the listing is live.
- Do not publish overdue or due-soon ready tasks without a deliberate go-ahead.
