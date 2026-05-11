# Today Start Plan - Book 1 Social Automation

Plan date: Monday, May 11, 2026
Latest live check: Monday, May 11, 2026 at 12:00 AM ET
Canonical source of truth: `content/social/campaigns/book-01/queue.json`

## Required Posting Surfaces

- Every campaign day requires 3 Pinterest still Pins.
- Every short-video bundle requires YouTube Shorts, TikTok, Instagram Reels, Facebook Reels, and Pinterest Video Pin.
- For hashtag-friendly posting surfaces, require both `#dragonbooks` and `#dragonbooksforkids`.
- The hashtag rule applies to open Pinterest, Instagram, and Short Video queue tasks; Facebook can still use the caption naturally without forcing hashtags unless Lauren wants them there too.
- Day 1 has an explicit legacy note because its short-video bundle was posted before Pinterest Video Pin became required. Do not copy that old four-platform pattern for any new video posting.

## Book 1 Completion / Listing Gate

- Book 1 is finally complete.
- Do not publish or announce the Amazon/KDP listing until campaign Day 8.
- Main rule before Day 8: complete campaign Days 1-7 first.
- Listing work is allowed before Day 8 only as quiet prep: gather assets, draft copy, verify metadata, and build checklists without posting the live listing.
- Once Day 8 arrives, the listing can move from prep to posting only after Days 1-7 are complete and the listing assets/copy pass a final check.

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
- Current statuses: `posted=21`, `posted-early=3`, `ready=48`
- Meta account/access blocker: cleared; old `needs-account` statuses were stale and were promoted to `ready`
- Current handoff mode: `ready`
- Next ready task: `book01-day04-instagram-feed-post-plus-story-reshare`
- Scheduled date for next ready task: 2026-05-10
- Next real blocker: none
- Days 1-3 are fully posted, including Meta and short video.
- Day 2 is not missing a video; the approved posted file is `content/outputs/videos/approved/day-2-screen-free-activity-capcut-approved-2026-05-06.mp4`.
- Day 3 short video is posted on YouTube Shorts, TikTok, Instagram Reels, Facebook Reels, and Pinterest Video Pin.
- Open Day 4+ short-video task keys now include Pinterest Video Pin as part of the required bundle.
- `npm run social:handoff` now exposes required hashtags on the next ready hashtag-friendly task.
- Open campaign due dates were rolled forward by 2 days on Monday, May 11, 2026: Day 4 is now due 2026-05-10, Day 5 is due 2026-05-11, Day 6 is due 2026-05-12, Day 7 is due 2026-05-13, and Day 8 is due 2026-05-14.
- Seven-day full pre-launch runway is ready.

## Today Priorities

Rating key: Q1 = important + urgent, Q2 = important + not urgent, Q3 = less important + urgent, Q4 = less important + not urgent. Scores are `importance/5` and `urgency/5`.

Standing prevention check: Every time this rating system is run or updated, ask: "Can any upcoming or looming task be kept from becoming Q1?" If yes, mention the prevention path, especially efficiency or automation ideas such as batching similar platform posts, preparing receipts/evidence folders ahead of time, drafting captions once for all surfaces, using `npm run social:handoff` before browser work, turning repeated manual checks into scripts, or using safe n8n/read-only queue automation before live publishing automation.

Workflow efficiency rule: Do not use one-task handoff loops as the working unit when a due-pressure chunk exists. Build one chunk packet first, then post from that packet and reuse the same format for the next due-soon chunk.

1. Confirm the queue state.
   - Rating: Q1, importance 5/5, urgency 5/5.
   - Re-run validation and handoff.
   - Treat `queue.json` as live truth.
   - Use old marketing calendars and launch-plan markdown only as reference/history.

Before Day 8/listing publication, protect the public wording and automation gates before opening more posting surfaces. Ratings are based on due pressure after the 2-day schedule roll-forward plus the API/n8n feasibility research: behind = Q1, due today = Q1, due soon = Q2, not due yet = Q2. The automation prevention path is to turn today's manual work into reusable dry-run fixtures before building live publishing automation.

2. Check live social account wording.
   - Rating: Q1, importance 4/5, urgency 5/5.
   - This is Q1 because the campaign is close to the Day 8 listing boundary and the wording controls whether public surfaces promise the right thing.
   - Check all active social accounts for the phrase "Coming soon to Amazon".
   - Make sure the wording is present anywhere it is supposed to be present.
   - If an account is missing it, record which account/post/profile needs fixing before changing queue state.
   - Decide whether the wording belongs in bios, pinned posts, banners, captions, or a dedicated still/video promo.
   - Do not use "available now", a buy CTA, or a live Amazon link until the listing actually exists.

3. Verify official API gates for live publishing.
   - Rating: Q2, importance 4/5, urgency 2/5.
   - Time-box this to a 30-45 minute gate checklist, not a build session.
   - For each platform, answer only: can official API/n8n publish this surface, what blocks it, and should the current campaign use manual posting, dry-run automation, or later live automation?
   - Blocker labels to use: `needs credential`, `needs public media URL`, `needs app review`, `needs audit`, `manual-only`, or `ready for dry-run`.
   - Confirm Meta Instagram/Facebook docs directly after the previous rate-limit clears.
   - Confirm whether Instagram Story reshare can be automated or must remain manual.
   - Confirm YouTube audit/private-upload requirements before public Shorts automation.
   - Confirm TikTok Direct Post audit, creator-consent, and privacy-level requirements before public TikTok automation.
   - Confirm Pinterest board IDs, access tier, Sandbox path, and video-cover requirements.
   - Stop when the gate matrix is filled; do not build credentials, n8n workflows, or live publishing calls in this step.
   - Do not use unofficial login scraping, CAPTCHA workarounds, payment-boundary automation, or platform-restriction bypasses.

4. Build the Day 4-5 chunk handoff packet.
   - Rating: Q1, importance 5/5, urgency 5/5.
   - Day 4 is now due 2026-05-10 and is behind; Day 5 is now due 2026-05-11 and is due today.
   - Pinterest still Pins for Days 4-5 are already posted.
   - Gather Day 4 and Day 5 Instagram captions, Facebook captions, image assets, video assets, required hashtags, receipt paths, and evidence paths before opening browsers.
   - This packet replaces the inefficient loop of one-task handoff, browser work, receipt lookup, next handoff, and repeated setup.
   - Use this packet as the manual posting checklist and as the first read-only automation fixture.
   - Reuse this exact packet format for Days 6-7 so those due-soon tasks do not become Q1.
   - Use `#dragonbooks` and `#dragonbooksforkids` wherever hashtags are supported.

5. Post the Day 4-5 Meta still tasks.
   - Rating: Q1, importance 5/5, urgency 5/5.
   - Post Day 4 Instagram, Day 4 Facebook, Day 5 Instagram, and Day 5 Facebook from the chunk packet.
   - This clears the fastest, lowest-friction part of the current Q1 backlog.
   - Use `#dragonbooks` and `#dragonbooksforkids` wherever hashtags are supported.
   - Record receipts/evidence through canonical helper paths for every completed platform task.

6. Prepare the Day 4-5 short-video bundle packet.
   - Rating: Q1, importance 5/5, urgency 4/5.
   - Remaining Day 4 short-video bundle: YouTube Shorts, TikTok, Instagram Reels, Facebook Reels, and Pinterest Video Pin.
   - Remaining Day 5 short-video bundle: YouTube Shorts, TikTok, Instagram Reels, Facebook Reels, and Pinterest Video Pin.
   - Gather MP4s, captions, required hashtags, destination surfaces, cover-image needs, and receipt/evidence paths.
   - Do not use Q1 live posts as the first true API-publishing test; use this as a dry-run fixture first.

7. Build the read-only n8n/API dry-run from the Day 4-5 packet.
   - Rating: Q2, importance 4/5, urgency 3/5.
   - Start only after the Day 4-5 packet exists; the packet is the fixture and the dry-run is the automation rehearsal.
   - Use `content/outputs/research/social-api-n8n-feasibility-2026-05-11.md` as the research baseline.
   - Output task id, platform, caption, hashtags, local media path, whether the API needs a public HTTPS media URL, destination account placeholder, receipt path, evidence path, and feasibility bucket.
   - Feasibility buckets: `ready`, `needs credential`, `needs public media URL`, `needs app review`, or `manual`.
   - Keep this read-only: no live publishing, no queue status changes, and no credential experiments yet.

8. Posting chunk: due-soon catch-up for Days 6-7.
   - Rating: Q2, importance 5/5, urgency 3/5.
   - Day 6 is now due 2026-05-12 and Day 7 is now due 2026-05-13, so this chunk is due soon.
   - Day 6 needs 3 Pinterest still Pins, Instagram, Facebook, and the full short-video bundle.
   - Day 7 needs 3 Pinterest still Pins, Instagram, Facebook, and the full short-video bundle.
   - Prevention path: use the Day 4-5 chunk packet format so Days 6-7 do not become Q1.
   - Within this chunk, do Pinterest still Pins first, then Meta still posts, then video bundles.
   - Use `#dragonbooks` and `#dragonbooksforkids` wherever hashtags are supported.

9. Day 8 listing boundary and Amazon/KDP readiness.
   - Rating: Q2, importance 5/5, urgency 3/5.
   - Day 8 is now scheduled for 2026-05-14, so this is due soon but not immediate.
   - Do not publish or announce the Amazon/KDP listing until Days 1-7 posting chunks are complete or explicitly deferred.
   - Download or confirm the current KDP cover calculator/template for the final trim, page count, paper, ink, and bleed choices.
   - Build/export the final upload-ready cover PDF and interior PDF from the completed approved files.
   - Run final KDP/safe-area QA on the cover and interior PDFs.
   - Draft listing title, subtitle, series/volume fields if used, author name, description, keywords, categories, age/grade range, and pricing.
   - Prepare Day 8 launch/link update copy, but keep it in "Coming soon to Amazon" mode until the listing is actually live.
   - After the listing exists, save the final live Amazon URL in the canonical campaign files.

10. Keep the full-platform runway honest.
   - Rating: Q2, importance 4/5, urgency 2/5.
   - Static/Pinterest/Meta runway is healthy after clearing stale account statuses.
   - Full-platform runway is healthy through at least Day 8.
   - The goal is completing Days 1-7 before using the Day 8 listing moment.
   - Use small prep blocks between posting tasks.
   - Do not post the listing, live link, "available now" copy, or buy CTA before Day 8.
   - Keep social copy in "Coming soon to Amazon" mode until the listing is actually live.
   - Keep a visible checklist of what is ready, what needs owner approval, and what must wait for Day 8.

## Day 3 Posting Receipt

Day 3 is complete across tracked platforms.

Short-video URLs:

- YouTube Shorts: `https://youtube.com/shorts/KbtLI34bE24?feature=share`
- TikTok: `https://www.tiktok.com/@emberdragonbooks/video/7638457876247252255`
- Instagram Reel: `https://www.instagram.com/reel/DYLqNdBFHTw/`
- Facebook Reel: `https://www.facebook.com/reel/1755780122056361`
- Pinterest Video Pin: `https://www.pinterest.com/pin/1148417973750567056/`

Saved records:

- Receipt: `content/social/campaigns/book-01/receipts/day-03/short-video-youtube-shorts-public-tiktok-public-instagram-reels-public-facebook-reels-public-pinterest-video-pin-public.json`
- Evidence: `content/social/campaigns/book-01/evidence/day-03/short-video-youtube-shorts-public-tiktok-public-instagram-reels-public-facebook-reels-public-pinterest-video-pin-public/`
- Post notes: `content/outputs/marketing/posts/2026-05-10-day-3-search-with-ember-short-video-platform-posts.md`

## Day 4 Next Posting Work Order

The next ready task from `npm run social:handoff` is:

- Task: `book01-day04-instagram-feed-post-plus-story-reshare`
- Platform: Instagram
- Scheduled date: 2026-05-10
- Required hashtags: `#dragonbooks`, `#dragonbooksforkids`
- Image asset: `content/outputs/images/approved/book-1-no-blank-promo-batch-02-02-baby-flame-lantern-teaser-balanced-approved-recovered-2026-05-05T05-47-13-309Z-1.png`
- Video asset available for later short-video posting: `content/outputs/videos/approved/day-4-find-the-dragonflame-lantern-veo31-canva-approved-2026-05-10.mp4`
- Caption: `Can you find the Baby Flame Lantern hiding in Ember's cozy festival world?\n\nComing soon to Amazon.`
- CTA: `Save this tiny-treasure challenge.`
- Note: Use the balanced approved regenerate. Avoid the failed muddy-sparkle version.

Live upload recovery rule:

- If a YouTube/TikTok/Meta upload draft is open, use only the controlled recovery helper for inspection.
- Do not call `reload`, `goto`, back, forward, or close the attached browser session.
- If a reload warning appears during inspection, cancel it immediately and verify the draft is still visible.

```powershell
npm run social:live-upload-recovery -- --match-url studio.youtube.com
```

- For other open upload pages, change only `--match-url`; do not navigate away from the active draft.

## What Not To Do First

- Do not treat Meta access as blocked unless a fresh live platform check shows a real login, permission, verification, payment, CAPTCHA, or account boundary.
- Do not start by making more random marketing assets.
- Do not use old campaign markdown as the live queue.
- Do not publish the Amazon/KDP listing before Day 8.
- Do not use "available now" or buy-link language before the listing is live.
- Do not publish overdue ready tasks without a deliberate go-ahead.

## Watch Items

- Duplicate Pinterest or Meta posts if manual recovery or queue receipts drift.
- Pinterest board-name punctuation and exact board matching.
- Short-video drift: mouth movement, weird final eyes, extra limbs, distorted scarf, missing satchel, frozen held items, or generated text.
- Queue/result drift if any live post is recorded outside `npm run social:mark-result`.

## Recommended First Action

If posting the next ready campaign task:

```powershell
npm run social:handoff
```

If building runway:

```powershell
npm run social:what-next
```

Then finish Days 1-7 before using Day 8 as the listing/posting moment.
