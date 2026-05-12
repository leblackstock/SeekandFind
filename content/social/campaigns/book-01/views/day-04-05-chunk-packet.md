# Day 4-5 Chunk Packet - Book 1 Social Campaign

Created: Monday, May 11, 2026 at 4:22 PM ET
Source of truth: `content/social/campaigns/book-01/queue.json`
Handoff source: `npm run social:handoff`

## Scope

- Work unit: Day 4 and Day 5 due-pressure chunk.
- Quadrant: Q1, importance 5/5, urgency 5/5.
- Tasks in packet: 6.
- Live publishing mode: manual posting only.
- Automation mode: read-only fixture only; no credentials, no live API calls, no queue status changes.
- Required hashtags on hashtag-friendly surfaces: `#dragonbooks`, `#dragonbooksforkids`.
- Feed-still asset rule: Instagram/Facebook still posts require a separately approved native 4:5 image in the posting pack. One shared approved `meta_feed_4x5` image can serve both Meta feed tasks. If that asset is missing, stop the still post instead of using the old 9:16 vertical campaign image.

## Current Decision

Keep live Day 4-5 posting manual. Use this packet as the first read-only automation fixture before any live API publishing. No surface is cleared for live API publishing yet because credentials, public media URLs, app review, audit, or exact Story-reshare behavior still gate live automation.

## Posting Order

1. Day 4 Instagram feed post plus Story reshare.
2. Day 4 Facebook Page post.
3. Day 5 Instagram feed post plus Story reshare.
4. Day 5 Facebook Page post.
5. Day 4 short-video bundle.
6. Day 5 short-video bundle.

## Day 4 Assets

- Image: `content/outputs/images/approved/book-1-no-blank-promo-batch-02-02-baby-flame-lantern-teaser-balanced-approved-recovered-2026-05-05T05-47-13-309Z-1.png`
- Video: `content/outputs/videos/approved/day-4-find-the-dragonflame-lantern-veo31-canva-approved-2026-05-10.mp4`
- Shared Meta native 4:5 feed image: `content/outputs/images/approved/meta-feed-4x5/book-01/day-04-meta-feed-4x5-approved.png`
- Instagram/Facebook feed image status: APPROVED by Lauren on 2026-05-11.
- Note: Use the balanced approved regenerate. Avoid the failed muddy-sparkle version.

### Day 4 Caption

```text
Can you find the Baby Flame Lantern hiding in Ember's cozy festival world?

Coming soon to Amazon.

Save this tiny-treasure challenge.
```

For Instagram and short-video surfaces, add:

```text
#dragonbooks #dragonbooksforkids
```

### Day 4 Instagram

- Task key: `book01-day04-instagram-feed-post-plus-story-reshare`
- Platform: Instagram
- Status before posting: `ready`
- Receipt path: `content/social/campaigns/book-01/receipts/instagram/book01-day-04/book01-day04-instagram-feed-post-plus-story-reshare.json`
- Evidence screenshot path: `content/social/campaigns/book-01/evidence/instagram/book01-day-04/book01-day04-instagram-feed-post-plus-story-reshare-2026-05-11T20-22-15Z.png`
- Error path if blocked: `content/social/campaigns/book-01/evidence/instagram/book01-day-04/book01-day04-instagram-feed-post-plus-story-reshare-2026-05-11T20-22-15Z-error.json`
- Required approved image: `content/outputs/images/approved/meta-feed-4x5/book-01/day-04-meta-feed-4x5-approved.png`
- Manual action: publish the approved 4:5 feed image post, then do the Story reshare manually.

### Day 4 Facebook

- Task key: `book01-day04-facebook-page-post`
- Platform: Facebook
- Status before posting: `ready`
- Receipt path: `content/social/campaigns/book-01/receipts/facebook/book01-day-04/book01-day04-facebook-page-post.json`
- Evidence screenshot path: `content/social/campaigns/book-01/evidence/facebook/book01-day-04/book01-day04-facebook-page-post-2026-05-11T20-22-15Z.png`
- Error path if blocked: `content/social/campaigns/book-01/evidence/facebook/book01-day-04/book01-day04-facebook-page-post-2026-05-11T20-22-15Z-error.json`
- Required approved image: `content/outputs/images/approved/meta-feed-4x5/book-01/day-04-meta-feed-4x5-approved.png`
- Manual action: publish Page still post using the approved 4:5 feed image. Facebook hashtags are optional unless Lauren wants them there too.

### Day 4 Short Video Bundle

- Task key: `book01-day04-short-video-youtube-shorts-public-tiktok-public-instagram-reels-public-facebook-reels-public-pinterest-video-pin-public`
- Platform group: Short Video
- Status before posting: `ready`
- Required surfaces: YouTube Shorts, TikTok, Instagram Reels, Facebook Reels, Pinterest Video Pin.
- Receipt path: `content/social/campaigns/book-01/receipts/short-video/book01-day-04/book01-day04-short-video-youtube-shorts-public-tiktok-public-instagram-reels-public-facebook-reels-public-pinterest-video-pin-public.json`
- Evidence screenshot path: `content/social/campaigns/book-01/evidence/short-video/book01-day-04/book01-day04-short-video-youtube-shorts-public-tiktok-public-instagram-reels-public-facebook-reels-public-pinterest-video-pin-public-2026-05-11T20-22-15Z.png`
- Error path if blocked: `content/social/campaigns/book-01/evidence/short-video/book01-day-04/book01-day04-short-video-youtube-shorts-public-tiktok-public-instagram-reels-public-facebook-reels-public-pinterest-video-pin-public-2026-05-11T20-22-15Z-error.json`
- Manual action: post the approved MP4 to all required video surfaces and save each public URL into the bundled receipt.

## Day 5 Assets

- Image: `content/outputs/images/approved/book-1-lantern-maker-workshop-promo-batch-01-recovered-chat-02-image-1-2026-05-05T04-51-23-244Z.png`
- Video: `content/outputs/videos/approved/day-5-help-ember-find-it-veo31-canva-approved-2026-05-10.mp4`
- Shared Meta native 4:5 feed image: `content/outputs/images/approved/meta-feed-4x5/book-01/day-05-meta-feed-4x5-approved.png`
- Instagram/Facebook feed image status: APPROVED by Lauren on 2026-05-11.
- Note: Approved Batch 01 image with no blank-template issue. Approved short-video MP4 uses the title Help Ember find it.

### Day 5 Caption

```text
The Lantern Maker’s Workshop is full of tiny details for young eyes to explore.

Coming soon to Amazon.

Follow for the next Ember progress update.
```

For Instagram and short-video surfaces, add:

```text
#dragonbooks #dragonbooksforkids
```

### Day 5 Instagram

- Task key: `book01-day05-instagram-feed-post-plus-story-reshare`
- Platform: Instagram
- Status before posting: `ready`
- Receipt path: `content/social/campaigns/book-01/receipts/instagram/book01-day-05/book01-day05-instagram-feed-post-plus-story-reshare.json`
- Evidence screenshot path: `content/social/campaigns/book-01/evidence/instagram/book01-day-05/book01-day05-instagram-feed-post-plus-story-reshare-2026-05-11T20-22-15Z.png`
- Error path if blocked: `content/social/campaigns/book-01/evidence/instagram/book01-day-05/book01-day05-instagram-feed-post-plus-story-reshare-2026-05-11T20-22-15Z-error.json`
- Required approved image: `content/outputs/images/approved/meta-feed-4x5/book-01/day-05-meta-feed-4x5-approved.png`
- Manual action: publish the approved 4:5 feed image post, then do the Story reshare manually.

### Day 5 Facebook

- Task key: `book01-day05-facebook-page-post`
- Platform: Facebook
- Status before posting: `ready`
- Receipt path: `content/social/campaigns/book-01/receipts/facebook/book01-day-05/book01-day05-facebook-page-post.json`
- Evidence screenshot path: `content/social/campaigns/book-01/evidence/facebook/book01-day-05/book01-day05-facebook-page-post-2026-05-11T20-22-15Z.png`
- Error path if blocked: `content/social/campaigns/book-01/evidence/facebook/book01-day-05/book01-day05-facebook-page-post-2026-05-11T20-22-15Z-error.json`
- Required approved image: `content/outputs/images/approved/meta-feed-4x5/book-01/day-05-meta-feed-4x5-approved.png`
- Manual action: publish Page still post using the approved 4:5 feed image. Facebook hashtags are optional unless Lauren wants them there too.

### Day 5 Short Video Bundle

- Task key: `book01-day05-short-video-youtube-shorts-public-tiktok-public-instagram-reels-public-facebook-reels-public-pinterest-video-pin-public`
- Platform group: Short Video
- Status before posting: `ready`
- Required surfaces: YouTube Shorts, TikTok, Instagram Reels, Facebook Reels, Pinterest Video Pin.
- Receipt path: `content/social/campaigns/book-01/receipts/short-video/book01-day-05/book01-day05-short-video-youtube-shorts-public-tiktok-public-instagram-reels-public-facebook-reels-public-pinterest-video-pin-public.json`
- Evidence screenshot path: `content/social/campaigns/book-01/evidence/short-video/book01-day-05/book01-day05-short-video-youtube-shorts-public-tiktok-public-instagram-reels-public-facebook-reels-public-pinterest-video-pin-public-2026-05-11T20-22-15Z.png`
- Error path if blocked: `content/social/campaigns/book-01/evidence/short-video/book01-day-05/book01-day05-short-video-youtube-shorts-public-tiktok-public-instagram-reels-public-facebook-reels-public-pinterest-video-pin-public-2026-05-11T20-22-15Z-error.json`
- Manual action: post the approved MP4 to all required video surfaces and save each public URL into the bundled receipt.

## Read-Only Automation Fixture Fields

For dry-run automation, each task should output:

- task id
- campaign day
- platform or required video surface
- caption
- required hashtags
- local media path
- approved platform-safe image path, or a `missing` approved-image blocker
- whether a public HTTPS media URL is required
- destination account, board, Page, or channel placeholder
- intended receipt path
- intended evidence path
- feasibility bucket from `content/outputs/research/social-api-n8n-feasibility-2026-05-11.md`

## Safety Notes

- Do not publish the Amazon/KDP listing before Day 8.
- Do not use "available now", buy CTA wording, or a live Amazon link until the listing exists.
- Do not use unofficial login scraping, CAPTCHA workarounds, payment-boundary automation, or platform-restriction bypasses.
- If any platform opens an existing upload draft, use recovery-only inspection and do not navigate away from the draft.
