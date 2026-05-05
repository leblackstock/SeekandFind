# Book 1 Prelaunch Rolling Campaign

Audience: children ages 5-8 and adult gift-buyers.
Strategy: Pinterest is the main discovery engine. Instagram, Facebook, Shorts/Reels covers, and Idea Pins reuse the same approved images and copy.
Calendar type: rolling queue. Dates can move; the order is the source of truth.

## Move Rules

If a day is missed, do not skip the post and do not compress two posts into one day. Keep completed posts locked, then slide unfinished posts forward from the next realistic work day.

Regenerate the full queue:

```powershell
npm run generate:marketing-calendar -- -- --start-date 2026-05-05 --force
```

Regenerate after some posts are already done:

```powershell
npm run generate:marketing-calendar -- -- --start-date 2026-05-05 --completed-count <posted-count> --resume-date <next-work-day> --force
```

Example: if the first 3 posts are already done and the next work day is 2026-05-09:

```powershell
npm run generate:marketing-calendar -- -- --start-date 2026-05-05 --completed-count 3 --resume-date 2026-05-09 --force
```

## Posting Queue

| Order | Relative Day | Scheduled Date | Status | Platform | Theme | Asset | Caption | CTA | Notes |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Day 1 | 2026-05-05 | ready-to-schedule | Pinterest primary, Instagram/Facebook secondary | Meet Ember | content/outputs/images/approved/book-1-no-blank-promo-batch-02-04-meet-ember-guide-recovered-2026-05-05T05-21-47-885Z.png | Meet Ember, a tiny baby dragon guide for a cozy seek-and-find adventure made for children ages 5-8. | Follow for more Ember sneak peeks. | Good first pinned or profile-intro post. Keep it as a character intro, not a cover claim. |
| 2 | Day 2 | 2026-05-06 | ready-to-schedule | Pinterest | Screen-free activity idea | content/outputs/images/approved/book-1-no-blank-promo-batch-02-03-screen-free-dragon-fun-recovered-2026-05-05T05-21-40-725Z.png | A warm little search adventure for families who love screen-free kids' activity ideas and gentle fantasy worlds. | Save this for screen-free activity inspiration. | Use on activity-book and screen-free boards. |
| 3 | Day 3 | 2026-05-07 | ready-to-schedule | Instagram/Facebook | Search with Ember | content/outputs/images/approved/book-1-no-blank-promo-batch-02-01-search-with-ember-recovered-2026-05-05T05-21-26-346Z.png | Lanterns, tiny treasures, and one curious baby dragon. Ember's world is built for little seekers. | Share with a little dragon fan. | Simple caption-only post. No added image text required. |
| 4 | Day 4 | 2026-05-08 | ready-to-schedule | Pinterest | Baby Flame Lantern teaser | content/outputs/images/approved/book-1-no-blank-promo-batch-02-02-baby-flame-lantern-teaser-balanced-approved-recovered-2026-05-05T05-47-13-309Z-1.png | Can you find the Baby Flame Lantern hiding in Ember's cozy festival world? | Save this tiny-treasure challenge. | Use the balanced approved regenerate. Avoid the failed muddy-sparkle version. |
| 5 | Day 5 | 2026-05-09 | ready-to-schedule | Facebook | Lantern workshop warmth | content/outputs/images/approved/book-1-lantern-maker-workshop-promo-batch-01-recovered-chat-02-image-1-2026-05-05T04-51-23-244Z.png | The Lantern Maker's Workshop is full of tiny details for young eyes to explore. | Follow for the next Ember progress update. | Approved Batch 01 image with no blank-template issue. |
| 6 | Day 6 | 2026-05-10 | ready-to-schedule | Instagram | Cozy search mood | content/outputs/images/approved/book-1-lantern-maker-workshop-promo-batch-01-recovered-chat-03-image-1-2026-05-05T04-51-29-569Z.png | A cozy dragon-village search scene, made to feel warm, gentle, and findable for young readers. | Save for later if you love hidden-object books. | Approved Batch 01 image with no blank-template issue. |
| 7 | Day 7 | 2026-05-11 | ready-to-schedule | Pinterest | Golden Welcome Bell challenge | content/outputs/images/approved/book-1-mission-item-promo-batch-03-01-golden-welcome-bell-teaser-recovered-2026-05-05T19-29-49-208Z.png | Can your little seeker find the Golden Welcome Bell among the festival decorations? | Save the challenge and try it together. | Mission-item teaser. Keep copy playful and low-pressure. |
| 8 | Day 8 | 2026-05-12 | ready-to-schedule | Instagram Story/Reel cover, YouTube Shorts cover, Pinterest Idea Pin | Firefly Flower Charm vertical teaser | content/outputs/images/approved/book-1-mission-item-promo-batch-03-02-firefly-flower-charm-teaser-recovered-2026-05-05T19-29-49-208Z.png | Find the Firefly Flower Charm. | Tap, pause, and search. | Tall/mobile-first asset. Best for Story, Reel cover, Shorts cover, or Pinterest Idea Pin. |
| 9 | Day 9 | 2026-05-13 | ready-to-schedule | Pinterest and Facebook | Dragon Door Key challenge | content/outputs/images/approved/book-1-mission-item-promo-batch-03-03-dragon-door-key-teaser-retry-recovered-2026-05-05T19-37-48-357Z.png | A tiny Dragon Door Key is tucked somewhere in Ember's festival scene. | Can you spot it? | Mission-item teaser. Do not add answer marks or hint overlays. |
| 10 | Day 10 | 2026-05-14 | ready-to-schedule | Pinterest | Sparkle Market Token challenge | content/outputs/images/approved/book-1-mission-item-promo-batch-03-04-sparkle-market-token-teaser-recovered-2026-05-05T19-29-49-208Z.png | Can you find the Sparkle Market Token among the cozy market treasures? | Save this for a quick seek-and-find break. | Mission-item teaser. Good for hidden-object and activity-book boards. |
| 11 | Day 11 | 2026-05-15 | ready-to-schedule | Instagram/Facebook | Production progress note | content/outputs/images/approved/book-1-no-blank-promo-batch-02-04-meet-ember-guide-recovered-2026-05-05T05-21-47-885Z.png | The seek-page and story/list workflow is working, and Ember's first book world is getting closer one approved asset at a time. | Follow along as the book comes together. | Behind-the-scenes copy. Do not present promo art as an interior sample. |
| 12 | Day 12 | 2026-05-16 | ready-to-schedule | Pinterest primary, Facebook secondary | Giftable cozy adventure | content/outputs/images/approved/book-1-no-blank-promo-batch-02-01-search-with-ember-recovered-2026-05-05T05-21-26-346Z.png | A cozy seek-and-find adventure for kids who love tiny treasures, gentle magic, and baby dragons. | Save for children's book gift ideas. | Gift-buyer angle. Keep links blank until a real store URL exists. |

## Step Readiness Procedure

When Lauren asks about any campaign step, treat the question as a readiness check and output the useful posting information, not just a yes/no answer.

For the requested date or step:

1. Read the matching calendar row from this file or the JSON manifest.
2. Verify the approved asset file exists.
3. Check basic image facts when possible: file type, dimensions, and file size.
4. Confirm the row has platform, theme, caption, CTA, and notes.
5. Add practical posting copy for the platform: Pinterest title/description, Instagram/Facebook caption, alt text, hashtags, and link status.
6. Call out anything missing as a blocker or warning.
7. Keep prelaunch guardrails active: use follow/save/progress wording only until production status confirms stronger sales or listing language.

Readiness answer format:

- Readiness: ready, ready with warning, or blocked.
- Art: approved asset path plus verified image facts.
- Words: platform-specific title, caption/description, CTA, alt text, hashtags.
- Missing or warnings: link, dimensions, approval, copy, or status gaps.
- Next action: the exact thing Lauren should do next.

## Batch Rules

- Use only approved images listed in this calendar unless a later human approval tracker adds more.
- The Firefly Flower Charm image is tall/mobile-first; prioritize Story, Reel cover, Shorts cover, and Pinterest Idea Pin use.
- Do not add overlay text to assets that were approved as no-added-text images.
- For images with generated text, the text must be exact, readable, and approved before posting.
- Keep links blank until a real store or landing URL exists.

## Platform Defaults

Pinterest: publish the main image as a Pin with a curiosity title, a concise description, and no store link until the link is real.

Instagram: use caption-first posts, Reels covers, or Stories. Do not depend on Lauren adding image text.

Facebook: use warmer progress-note copy and family/gift-buyer framing.

Short video covers: use the tall Firefly Flower Charm asset first, then generate more vertical covers only after this queue needs them.

## CTA Bank

- Follow for more Ember sneak peeks.
- Save this tiny-treasure challenge.
- Share with a little dragon fan.
- Save for screen-free activity inspiration.
- Follow along as the book comes together.

## Publication Claim Guardrail

Do not say available now, buy now, order today, on Amazon, published, launch day, or inside the book unless production status confirms that wording. Fresh promo art is not a real cover, real interior sample, real listing preview, or real product mockup.

## Automation Notes

- Calendar slug: book-1-prelaunch-rolling-campaign
- Source behavior: order-first movable queue.
- Missed-day behavior: keep completed rows locked, then reschedule open rows from the next work day.
- Human approval remains required before any new image enters this calendar.
