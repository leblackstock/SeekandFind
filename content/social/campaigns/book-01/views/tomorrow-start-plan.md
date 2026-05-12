# Current Start Plan - Book 1 Social Automation

Plan date: Monday, May 11, 2026
Latest live check: Monday, May 11, 2026 at 8:57 PM ET
Canonical source of truth: `content/social/campaigns/book-01/queue.json`

## Lauren's Note
 - Do not remove this - Per Lauren
  - What is the smallest improvement we can make to gain the biggest impact on efficiency, consistency, flow, and token use?

## Verified Live State

Fresh command checks:

```powershell
npm run validate:social-queue
npm run social:handoff
npm run social:what-next
```

Current verified result:

- `npm run validate:social-queue`: PASS.
- Campaign posts: 12/12.
- Platform tasks: 72/72.
- Queue statuses: `posted=27`, `posted-early=3`, `ready=42`.
- Current handoff mode: `ready`.
- Next publishable task: `book01-day06-pinterest-dragon-books-for-kids`.
- Next real blocker: none.
- Tool recommendation: Day 6-7 is the next due-pressure chunk.
- Quadrant: Q2, importance 4/5, urgency 3/5.
- Owner scheduling rule: do not post Days 6-8 before their scheduled dates unless Lauren explicitly gives a go-ahead.
- Local clock at verification: Monday, May 11, 2026 at 8:57 PM ET.
- Day 6 is scheduled for Tuesday, May 12, 2026.
- Day 7 is scheduled for Wednesday, May 13, 2026.
- Day 8 is scheduled for Thursday, May 14, 2026.
- Prevention path: prepare packets, assets, captions, and receipt folders now; hold live publishing until the due date or an explicit override.

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
- Do not publish or announce the Amazon/KDP listing until campaign Day 8, and only after Days 1-7 are complete or explicitly deferred.
- Do not automate bypassing login, payment, CAPTCHA, rate limits, platform restrictions, or sensitive account boundaries.

## Active Todo

1. Confirm date and queue gates before browser work.
   - Run `npm run validate:social-queue`.
   - Run `npm run social:handoff`.
   - Run `npm run social:what-next`.
   - Check the local date against each task's `scheduled_date`.
   - Stop live posting if the next task is not due yet, even if it is technically `ready`.
   - Stop if any approved asset shows `missing`.

2. Tighten receipt handling before more posting.
   - Latest result: receipt helper added as `npm run social:receipt`.
   - Still post receipt pattern: `npm run social:receipt -- <TASK_KEY> <POST_URL>`.
   - Short-video receipt pattern: `npm run social:receipt -- <TASK_KEY> --youtube <YOUTUBE_SHORTS_URL> --tiktok <TIKTOK_URL> --instagram <INSTAGRAM_REEL_URL> --facebook <FACEBOOK_REEL_URL> --pinterest <PINTEREST_VIDEO_PIN_URL>`.
   - The helper writes the receipt JSON, creates the evidence folder, and prints the exact `npm run social:mark-result` command.
   - It does not publish, open browsers, or mutate `queue.json`; use the printed mark command only after reviewing the receipt.

3. Use compact posting packets instead of long chat handoffs.
   - Latest result: compact packet script added as `npm run social:packet`.
   - Latest improvement: `npm run social:today` now auto-selects the due-pressure chunk. If nothing is due yet but a near-term chunk exists, it prints a `PREP ONLY` packet instead of an empty handoff.
   - Dry-run prep packets were saved for Day 6 and Day 7:
     - `content/social/campaigns/book-01/views/day-06-prep-compact-packet.md`
     - `content/social/campaigns/book-01/views/day-07-prep-compact-packet.md`
   - At the start of any social work block, use the shortest no-context command: `npm run social:today`.
   - Prep a future day without posting: `npm run social:packet -- prep 6`.
   - On the due date, run `npm run social:packet -- 6` for the paste-friendly live checklist.
   - Save a packet only when useful: `npm run social:packet -- prep 6 write`.
   - The script includes caption, approved asset, receipt path, evidence path, receipt-helper command, video surfaces, and a date gate in one compact Markdown packet.
   - The receipt helper prints the exact result-marking command after receipt creation, so packets do not carry duplicate long mark commands.
   - If the day is not due yet, the packet says `HOLD / PREP ONLY`.

4. Move the Day 6-7 prep packet to tomorrow.
   - Prefer the compact script over a hand-written packet unless a special edge case needs narrative notes.
   - Day 6: `npm run social:packet -- 6`.
   - Day 7: `npm run social:packet -- 7`.
   - Do not open live posting surfaces until the scheduled date arrives.

5. Skip Day 8 listing prep tonight unless Lauren asks for it.
   - Day 8 is scheduled for 2026-05-14.
   - Quiet prep is allowed: gather assets, draft listing copy, verify metadata, build KDP checklists, and prepare launch/link update copy.
   - Do not publish the listing, live link, "available now" copy, or buy CTA before the Day 8 gate is actually cleared.

6. Hold live posting until the due date.
   - Day 6 posting opens on Tuesday, May 12, 2026, unless Lauren explicitly says to post early.
   - Day 7 posting opens on Wednesday, May 13, 2026, unless Lauren explicitly says to post early.
   - Day 8 posting/listing work opens on Thursday, May 14, 2026, after Days 1-7 are complete or explicitly deferred.
   - If a helper says "next publishable" before the due date, treat that as queue readiness, not permission to publish early.

## Day 6 Prepared Work Order - Hold Until May 12

- Scheduled date: 2026-05-12.
- Status: ready-to-schedule.
- Live posting gate: HOLD. Do not publish before Tuesday, May 12, 2026 unless Lauren explicitly approves early posting.
- Still asset: `content/outputs/images/approved/book-1-lantern-maker-workshop-promo-batch-01-recovered-chat-03-image-1-2026-05-05T04-51-29-569Z.png`.
- Video asset: `content/outputs/videos/approved/day-6-tiny-treasure-veo31-canva-approved-2026-05-10.mp4`.
- Shared Meta 4:5 feed asset: `content/outputs/images/approved/meta-feed-4x5/book-01/day-06-meta-feed-4x5-approved.png`.

Caption:

```text
A cozy dragon-village search scene, made to feel warm, gentle, and findable for young readers.

Coming soon to Amazon.

Save for later if you love hidden-object books.

#SeekAndFind #KidsActivityBook #ChildrensBooks #ScreenFreeFun #BabyDragon #HiddenObjectBook #KidsBooks #FamilyReading #EmberDragonBooks #dragonbooks #dragonbooksforkids
```

Tasks:

- `book01-day06-pinterest-dragon-books-for-kids` - board `Dragon Books for Kids`.
- `book01-day06-pinterest-children-s-activity-books` - board `Children's Activity Books`.
- `book01-day06-pinterest-seek-and-find-books-for-kids` - board `Seek-and-Find Books for Kids`.
- `book01-day06-instagram-feed-post-plus-story-reshare`.
- `book01-day06-facebook-page-post`.
- `book01-day06-short-video-youtube-shorts-public-tiktok-public-instagram-reels-public-facebook-reels-public-pinterest-video-pin-public`.

When the gate opens:

- Post the 3 Pinterest still Pins first.
- Post Instagram and Facebook stills from one Meta composer action using the approved 4:5 image.
- Post the short-video bundle to YouTube Shorts, TikTok, Instagram Reels, Facebook Reels, and Pinterest Video Pin.
- Record receipts/evidence through canonical helper paths.
- Re-run queue validation after marking results.

## Day 7 Prepared Work Order - Hold Until May 13

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

Tasks:

- `book01-day07-pinterest-hidden-object-books-for-kids` - board `Hidden Object Books for Kids`.
- `book01-day07-pinterest-fantasy-activity-books-for-kids` - board `Fantasy Activity Books for Kids`.
- `book01-day07-pinterest-seek-and-find-books-for-kids` - board `Seek-and-Find Books for Kids`.
- `book01-day07-instagram-feed-post-plus-story-reshare`.
- `book01-day07-facebook-page-post`.
- `book01-day07-short-video-youtube-shorts-public-tiktok-public-instagram-reels-public-facebook-reels-public-pinterest-video-pin-public`.

When the gate opens:

- Post the 3 Pinterest still Pins first.
- Post Instagram and Facebook stills from one Meta composer action using the approved 4:5 image.
- Post the short-video bundle to YouTube Shorts, TikTok, Instagram Reels, Facebook Reels, and Pinterest Video Pin.
- Record receipts/evidence through canonical helper paths.
- Re-run queue validation after marking results.

## Day 8 Boundary - Hold Until May 14

- Scheduled date: 2026-05-14.
- Status: ready-to-schedule.
- Live posting/listing gate: HOLD. Do not post Day 8 or publish/announce the listing before Thursday, May 14, 2026 unless Lauren explicitly changes the schedule.
- Quiet prep is allowed before the gate: KDP upload checklist, cover/interior PDF QA, listing copy draft, metadata review, and launch/link update copy.
- Day 8 social assets are ready in `queue.json`, but readiness does not equal permission to publish early.

## Long-Term Planning - n8n/API Automation

- n8n/API posting is parked for later, not part of tonight's active work.
- Current n8n status: `npm run n8n:check` passed on Monday, May 11, 2026 at 9:04 PM ET, and Docker reported `n8n-local` at `http://localhost:5678`.
- Planning note: `automation/n8n/SOCIAL-DRY-RUN-PREP.md`.
- Research baseline: `content/outputs/research/social-api-n8n-feasibility-2026-05-11.md`.
- Future build target: local `POST /social/dry-run-chunk`, then an n8n test workflow that calls it.
- Keep this lane read-only until credentials, public media URLs, app review/audit, and platform-specific behavior are intentionally cleared.
- No live publishing, credential experiments, browser posting, production webhook activation, or queue status changes belong in the long-term n8n lane.

## Verified Complete Context

- Days 1-3 are fully posted, including Meta and short video.
- Day 4 short-video bundle is posted across all five required video surfaces.
- Day 5 Instagram and Facebook stills were posted together through Meta Business Suite using the approved 4:5 image.
- Day 5 short-video bundle is posted across all five required video surfaces.
- Day 5 Pinterest Video Pin caption was fixed after publish; the receipt records before/edit/after evidence.
- Public social wording check is complete: Pinterest, Instagram, Facebook, YouTube, and TikTok use prelaunch wording for `Adventures With Ember: The Sparkleflame Festival` and `Coming soon to Amazon`.
- Day 1 Instagram, Day 4 Instagram, and Day 4 Facebook cut-off stills were removed and replaced with approved 4:5 stills.
- The 7-day full pre-launch runway is ready, and all Days 1-12 static, Pinterest, Meta, and video assets are prepared.

## Receipt Index

Day 3 short video:

- YouTube Shorts: `https://youtube.com/shorts/KbtLI34bE24?feature=share`.
- TikTok: `https://www.tiktok.com/@emberdragonbooks/video/7638457876247252255`.
- Instagram Reel: `https://www.instagram.com/reel/DYLqNdBFHTw/`.
- Facebook Reel: `https://www.facebook.com/reel/1755780122056361`.
- Pinterest Video Pin: `https://www.pinterest.com/pin/1148417973750567056/`.
- Receipt: `content/social/campaigns/book-01/receipts/day-03/short-video-youtube-shorts-public-tiktok-public-instagram-reels-public-facebook-reels-public-pinterest-video-pin-public.json`.

Day 4 short video:

- YouTube Shorts: `https://youtube.com/shorts/t3I5Jz3gKyU`.
- TikTok: `https://www.tiktok.com/@emberdragonbooks/video/7638771089514024223`.
- Instagram Reel: `https://www.instagram.com/emberdragonbooks/reel/DYN1dBNDrAj/`.
- Facebook Reel: `https://www.facebook.com/reel/1425014576131222/`.
- Pinterest Video Pin: `https://www.pinterest.com/pin/1148417973750620024/`.
- Receipt: `content/social/campaigns/book-01/receipts/short-video/book01-day-04/book01-day04-short-video-youtube-shorts-public-tiktok-public-instagram-reels-public-facebook-reels-public-pinterest-video-pin-public.json`.

Day 5 short video:

- YouTube Shorts: `https://youtube.com/shorts/wx5iuwZJ_xc`.
- TikTok: `https://www.tiktok.com/@emberdragonbooks/video/7638784548569926942`.
- Instagram Reel: `https://www.instagram.com/emberdragonbooks/reel/DYN7cIogtL9/`.
- Facebook Reel: `https://www.facebook.com/reel/1109238345604139/`.
- Pinterest Video Pin: `https://www.pinterest.com/pin/1148417973750622588/`.
- Receipt: `content/social/campaigns/book-01/receipts/short-video/book01-day-05/book01-day05-short-video-youtube-shorts-public-tiktok-public-instagram-reels-public-facebook-reels-public-pinterest-video-pin-public.json`.

Meta crop cleanup:

- Day 1 Instagram replacement receipt: `content/social/campaigns/book-01/receipts/day-01/instagram-feed-post-replacement-2026-05-11.json`.
- Day 4 Instagram replacement receipt: `content/social/campaigns/book-01/receipts/day-04/instagram-feed-post-plus-story-reshare-replacement-2026-05-11.json`.
- Day 4 Facebook replacement receipt: `content/social/campaigns/book-01/receipts/day-04/facebook-page-post-replacement-2026-05-11.json`.
- Evidence folder: `content/social/campaigns/book-01/evidence/meta-feed-4x5-replacement-2026-05-11/`.

## Watch Items

- Duplicate Pinterest or Meta posts if manual recovery or queue receipts drift.
- Pinterest board-name punctuation and exact board matching.
- Instagram Story reshare may remain manual unless a fresh official API gate confirms otherwise.
- 9:16 text-bearing promo stills are unsafe for Instagram/Facebook feed posts.
- If an approved 4:5 asset is missing from any Meta still posting pack, stop before posting.
- Short-video drift: mouth movement, weird final eyes, extra limbs, distorted scarf, missing satchel, frozen held items, or generated text.
- Queue/result drift if any live post is recorded outside `npm run social:mark-result`.

## Live Upload Recovery Rule

If a YouTube/TikTok/Meta upload draft is open, use only the controlled recovery helper for inspection.

```powershell
npm run social:live-upload-recovery -- --match-url studio.youtube.com
```

- Do not call `reload`, `goto`, back, forward, or close the attached browser session.
- If a reload warning appears during inspection, cancel it immediately and verify the draft is still visible.
- For other open upload pages, change only `--match-url`; do not navigate away from the active draft.

## What Not To Do First

- Do not post Days 6-8 before their scheduled dates unless Lauren explicitly says to.
- Do not treat Meta access as blocked unless a fresh live platform check shows a real login, permission, verification, payment, CAPTCHA, or account boundary.
- Do not start by making more random marketing assets.
- Do not use old campaign markdown as the live queue.
- Do not publish the Amazon/KDP listing before Day 8.
- Do not use "available now" or buy-link language before the listing is live.
- Do not publish overdue or due-soon ready tasks without a deliberate go-ahead.

## Recommended First Action

Use the compact packet script when posting or prepping, so the work does not require long chat handoffs:

```powershell
npm run social:today
```

After each completed posting block:

```powershell
npm run social:receipt -- <TASK_KEY> <POST_URL>
npm run validate:social-queue
npm run social:what-next
```
