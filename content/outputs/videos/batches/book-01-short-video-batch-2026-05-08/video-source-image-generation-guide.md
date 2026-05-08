# Book 1 Video-Source Image Generation Guide

Batch: `book-01-short-video-batch-2026-05-08`
Scope: Days 3-12 clean no-text video-source images
Save generated pending-review images under:

`content/outputs/images/pending-review/video-source/book-01/`

Do not generate videos from these prompts yet. Do not upload, post, or update `queue.json`.

## Tracking Table

| Day | Slug | Prompt Ready | Generated Image Path Placeholder | Review Status Placeholder | Approved Image Path Placeholder | Notes |
| ---: | --- | --- | --- | --- | --- | --- |
| 3 | `day-03-search-with-ember` | yes | `content/outputs/images/pending-review/video-source/book-01/day-03-search-with-ember-video-source-no-text-v01-2026-05-08T{HH-MM-SS}.png` | pending | `content/outputs/images/approved/video-source/book-01/day-03-search-with-ember-video-source-no-text-approved-YYYY-MM-DD.png` | Remove `Search with Ember!`. |
| 4 | `day-04-baby-flame-lantern` | yes | `content/outputs/images/pending-review/video-source/book-01/day-04-baby-flame-lantern-video-source-no-text-v01-2026-05-08T{HH-MM-SS}.png` | pending | `content/outputs/images/approved/video-source/book-01/day-04-baby-flame-lantern-video-source-no-text-approved-YYYY-MM-DD.png` | Remove `Can you find the Baby Flame Lantern?`. |
| 5 | `day-05-lantern-maker-workshop` | yes | `content/outputs/images/pending-review/video-source/book-01/day-05-lantern-maker-workshop-video-source-no-text-v01-2026-05-08T{HH-MM-SS}.png` | pending | `content/outputs/images/approved/video-source/book-01/day-05-lantern-maker-workshop-video-source-no-text-approved-YYYY-MM-DD.png` | Remove `Can you help Ember find it?`. |
| 6 | `day-06-cozy-dragon-village` | yes | `content/outputs/images/pending-review/video-source/book-01/day-06-cozy-dragon-village-video-source-no-text-v01-2026-05-08T{HH-MM-SS}.png` | pending | `content/outputs/images/approved/video-source/book-01/day-06-cozy-dragon-village-video-source-no-text-approved-YYYY-MM-DD.png` | Remove `Find the tiny treasure`. |
| 7 | `day-07-golden-welcome-bell` | yes | `content/outputs/images/pending-review/video-source/book-01/day-07-golden-welcome-bell-video-source-no-text-v01-2026-05-08T{HH-MM-SS}.png` | pending | `content/outputs/images/approved/video-source/book-01/day-07-golden-welcome-bell-video-source-no-text-approved-YYYY-MM-DD.png` | Remove `Can you find the Golden Welcome Bell?`. |
| 8 | `day-08-firefly-flower-charm` | yes | `content/outputs/images/pending-review/video-source/book-01/day-08-firefly-flower-charm-video-source-no-text-v01-2026-05-08T{HH-MM-SS}.png` | pending | `content/outputs/images/approved/video-source/book-01/day-08-firefly-flower-charm-video-source-no-text-approved-YYYY-MM-DD.png` | Remove `Find the Firefly Flower Charm`. Queue says ready, but no approved video export exists. |
| 9 | `day-09-dragon-door-key` | yes | `content/outputs/images/pending-review/video-source/book-01/day-09-dragon-door-key-video-source-no-text-v01-2026-05-08T{HH-MM-SS}.png` | pending | `content/outputs/images/approved/video-source/book-01/day-09-dragon-door-key-video-source-no-text-approved-YYYY-MM-DD.png` | Remove `Can you find the Dragon Door Key?`. |
| 10 | `day-10-sparkle-market-token` | yes | `content/outputs/images/pending-review/video-source/book-01/day-10-sparkle-market-token-video-source-no-text-v01-2026-05-08T{HH-MM-SS}.png` | pending | `content/outputs/images/approved/video-source/book-01/day-10-sparkle-market-token-video-source-no-text-approved-YYYY-MM-DD.png` | Remove `Find the Sparkle Market Token`. |
| 11 | `day-11-ember-progress-note` | yes | `content/outputs/images/pending-review/video-source/book-01/day-11-ember-progress-note-video-source-no-text-v01-2026-05-08T{HH-MM-SS}.png` | pending | `content/outputs/images/approved/video-source/book-01/day-11-ember-progress-note-video-source-no-text-approved-YYYY-MM-DD.png` | Remove `Meet Ember` and `Your baby dragon guide`. |
| 12 | `day-12-cozy-seek-and-find-adventure` | yes | `content/outputs/images/pending-review/video-source/book-01/day-12-cozy-seek-and-find-adventure-video-source-no-text-v01-2026-05-08T{HH-MM-SS}.png` | pending | `content/outputs/images/approved/video-source/book-01/day-12-cozy-seek-and-find-adventure-video-source-no-text-approved-YYYY-MM-DD.png` | Remove `Search with Ember!`. |

## Static Promo Alignment Audit

This audit verifies that each clean video-source prompt is tied to the regular approved static promo art from the queue/manifest. These static promo files are reference-only because each one contains readable marketing text; they are not approved direct image-to-video inputs.

| Day | Short-Video Idempotency Key | Static Promo Reference Image | Static Promo Asset Exists | Appears Approved | Concept Match | Visible Text To Remove | Video-Source Prompt Ready | Notes |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- |
| 3 | `book01-day03-short-video-tiktok-youtube-shorts-instagram-reels-facebook-reels` | `content/outputs/images/approved/book-1-no-blank-promo-batch-02-01-search-with-ember-recovered-2026-05-05T05-21-26-346Z.png` | yes | yes | yes | `Search with Ember!` | yes | Approved static promo path exists; prompt says to use it as visual reference only. |
| 4 | `book01-day04-short-video-tiktok-youtube-shorts-instagram-reels-facebook-reels` | `content/outputs/images/approved/book-1-no-blank-promo-batch-02-02-baby-flame-lantern-teaser-balanced-approved-recovered-2026-05-05T05-47-13-309Z-1.png` | yes | yes | yes | `Can you find the Baby Flame Lantern?` | yes | Approved static promo path exists; prompt says to use it as visual reference only. |
| 5 | `book01-day05-short-video-tiktok-youtube-shorts-instagram-reels-facebook-reels` | `content/outputs/images/approved/book-1-lantern-maker-workshop-promo-batch-01-recovered-chat-02-image-1-2026-05-05T04-51-23-244Z.png` | yes | yes | yes | `Can you help Ember find it?` | yes | Approved static promo path exists; Lantern Maker Workshop concept matches the queue caption and prompt. |
| 6 | `book01-day06-short-video-tiktok-youtube-shorts-instagram-reels-facebook-reels` | `content/outputs/images/approved/book-1-lantern-maker-workshop-promo-batch-01-recovered-chat-03-image-1-2026-05-05T04-51-29-569Z.png` | yes | yes | yes | `Find the tiny treasure` | yes | Approved static promo path exists; queue/media assignment ties the workshop asset to the cozy dragon-village search concept. |
| 7 | `book01-day07-short-video-tiktok-youtube-shorts-instagram-reels-facebook-reels` | `content/outputs/images/approved/book-1-mission-item-promo-batch-03-01-golden-welcome-bell-teaser-recovered-2026-05-05T19-29-49-208Z.png` | yes | yes | yes | `Can you find the Golden Welcome Bell?` | yes | Approved static promo path exists; mission-item concept matches the queue caption and prompt. |
| 8 | `book01-day08-short-video-tiktok-youtube-shorts-instagram-reels-facebook-reels` | `content/outputs/images/approved/book-1-mission-item-promo-batch-03-02-firefly-flower-charm-teaser-recovered-2026-05-05T19-29-49-208Z.png` | yes | yes | yes | `Find the Firefly Flower Charm` | yes | Approved static promo path exists; Day 8 remains a false-ready video task until an approved video export exists. |
| 9 | `book01-day09-short-video-tiktok-youtube-shorts-instagram-reels-facebook-reels` | `content/outputs/images/approved/book-1-mission-item-promo-batch-03-03-dragon-door-key-teaser-retry-recovered-2026-05-05T19-37-48-357Z.png` | yes | yes | yes | `Can you find the Dragon Door Key?` | yes | Approved static promo path exists; mission-item concept matches the queue caption and prompt. |
| 10 | `book01-day10-short-video-tiktok-youtube-shorts-instagram-reels-facebook-reels` | `content/outputs/images/approved/book-1-mission-item-promo-batch-03-04-sparkle-market-token-teaser-recovered-2026-05-05T19-29-49-208Z.png` | yes | yes | yes | `Find the Sparkle Market Token` | yes | Approved static promo path exists; mission-item concept matches the queue caption and prompt. |
| 11 | `book01-day11-short-video-tiktok-youtube-shorts-instagram-reels-facebook-reels` | `content/outputs/images/approved/book-1-no-blank-promo-batch-02-04-meet-ember-guide-recovered-2026-05-05T05-21-47-885Z.png` | yes | yes | yes | `Meet Ember`; `Your baby dragon guide` | yes | Approved static promo path exists; queue/media assignment ties the Meet Ember guide art to the progress-note concept. |
| 12 | `book01-day12-short-video-tiktok-youtube-shorts-instagram-reels-facebook-reels` | `content/outputs/images/approved/book-1-no-blank-promo-batch-02-01-search-with-ember-recovered-2026-05-05T05-21-26-346Z.png` | yes | yes | yes | `Search with Ember!` | yes | Approved static promo path exists; reusable search/adventure concept matches the queue caption and prompt. |

## Shared Rules For Every Prompt

- Use the static promo image as visual reference only.
- Remove all readable text from the reference.
- Create a clean vertical 9:16 video-source image.
- No new text, captions, labels, signs, UI, logos, watermarks, or decorative lettering.
- Ember must stay on-model.
- No new characters.
- No new story elements.
- Stable composition for gentle push-in/parallax, lantern glow, subtle sparkles, blink, breathing, or tiny head tilt.

## Day 3 Copy/Paste Prompt

Source reference image:
`content/outputs/images/approved/book-1-no-blank-promo-batch-02-01-search-with-ember-recovered-2026-05-05T05-21-26-346Z.png`

Expected pending-review output:
`content/outputs/images/pending-review/video-source/book-01/day-03-search-with-ember-video-source-no-text-v01-2026-05-08T{HH-MM-SS}.png`

Review checklist:
`content/outputs/videos/batches/book-01-short-video-batch-2026-05-08/day-03-search-with-ember/day-03-search-with-ember-review-checklist.md`

```text
Create one clean vertical 9:16 video-source image for a motion-only Ember short video.

Use this static promo image as visual reference only:
content/outputs/images/approved/book-1-no-blank-promo-batch-02-01-search-with-ember-recovered-2026-05-05T05-21-26-346Z.png

The reference image contains readable text: "Search with Ember!" Remove that text completely.

Preserve Ember, the warm Sparkleflame Festival mood, the cozy lantern-market / seek-and-find feeling, the lantern-lit colors, and the child-friendly marketing concept. Keep the composition clean, stable, cinematic, and easy to animate with a gentle push-in, light parallax, cozy lantern glow, subtle sparkles, breathing, blink, or tiny head tilt.

Keep Ember on-model as a tiny adorable reddish-orange baby dragon with soft pumpkin-orange and coral shading, shiny golden spiral-comma horns, large glossy blue-teal eyes, cream belly, plain bright blue-teal scarf, and tiny plain brown crossbody satchel with dull-gold button clasps.

Make clear foreground, midground, and background zones. No new characters. No new story elements. No fake cover, fake listing preview, fake interior page, or sales graphic.

Negative prompt / avoid:
No readable text, title graphics, captions, subtitles, labels, signs, UI, fake logos, watermarks, page numbers, arrows, circles, boxes, answer marks, decorative lettering, or gibberish text.

No scary expression, angry face, smug face, photorealism, flat cartoon style, distorted scarf, missing satchel, extra limbs, muddy glitter fog, heavy sparkle haze, or clutter that makes the scene hard to read.
```

## Day 4 Copy/Paste Prompt

Source reference image:
`content/outputs/images/approved/book-1-no-blank-promo-batch-02-02-baby-flame-lantern-teaser-balanced-approved-recovered-2026-05-05T05-47-13-309Z-1.png`

Expected pending-review output:
`content/outputs/images/pending-review/video-source/book-01/day-04-baby-flame-lantern-video-source-no-text-v01-2026-05-08T{HH-MM-SS}.png`

Review checklist:
`content/outputs/videos/batches/book-01-short-video-batch-2026-05-08/day-04-baby-flame-lantern/day-04-baby-flame-lantern-review-checklist.md`

```text
Create one clean vertical 9:16 video-source image for a motion-only Ember short video.

Use this static promo image as visual reference only:
content/outputs/images/approved/book-1-no-blank-promo-batch-02-02-baby-flame-lantern-teaser-balanced-approved-recovered-2026-05-05T05-47-13-309Z-1.png

The reference image contains readable text: "Can you find the Baby Flame Lantern?" Remove that text completely.

Preserve Ember, the Lantern Maker's Workshop mood, the cozy festival lighting, the Baby Flame Lantern challenge concept, and the phone-friendly vertical composition. Keep the image clean, stable, cinematic, and easy to animate with a gentle push-in, light parallax, cozy lantern glow, subtle sparkles, breathing, blink, or tiny head tilt.

Keep Ember on-model as a tiny adorable reddish-orange baby dragon with soft pumpkin-orange and coral shading, shiny golden spiral-comma horns, large glossy blue-teal eyes, cream belly, plain bright blue-teal scarf, and tiny plain brown crossbody satchel with dull-gold button clasps.

Make clear foreground, midground, and background zones. No new characters. No new story elements. No fake cover, fake listing preview, fake interior page, or sales graphic.

Negative prompt / avoid:
No readable text, title graphics, captions, subtitles, labels, signs, UI, fake logos, watermarks, page numbers, arrows, circles, boxes, answer marks, decorative lettering, or gibberish text.

No scary expression, angry face, smug face, photorealism, flat cartoon style, distorted scarf, missing satchel, extra limbs, muddy glitter fog, heavy sparkle haze, or clutter that makes the scene hard to read.
```

## Day 5 Copy/Paste Prompt

Source reference image:
`content/outputs/images/approved/book-1-lantern-maker-workshop-promo-batch-01-recovered-chat-02-image-1-2026-05-05T04-51-23-244Z.png`

Expected pending-review output:
`content/outputs/images/pending-review/video-source/book-01/day-05-lantern-maker-workshop-video-source-no-text-v01-2026-05-08T{HH-MM-SS}.png`

Review checklist:
`content/outputs/videos/batches/book-01-short-video-batch-2026-05-08/day-05-lantern-maker-workshop/day-05-lantern-maker-workshop-review-checklist.md`

```text
Create one clean vertical 9:16 video-source image for a motion-only Ember short video.

Use this static promo image as visual reference only:
content/outputs/images/approved/book-1-lantern-maker-workshop-promo-batch-01-recovered-chat-02-image-1-2026-05-05T04-51-23-244Z.png

The reference image contains readable text: "Can you help Ember find it?" Remove that text completely.

Preserve Ember, the Lantern Maker's Workshop setting, warm lantern shelves, craft-table details, tiny treasures, and cozy seek-and-find feeling. Keep the image clean, stable, cinematic, and easy to animate with a gentle push-in, light parallax, cozy lantern glow, subtle sparkles, breathing, blink, or tiny head tilt.

Keep Ember on-model as a tiny adorable reddish-orange baby dragon with soft pumpkin-orange and coral shading, shiny golden spiral-comma horns, large glossy blue-teal eyes, cream belly, plain bright blue-teal scarf, and tiny plain brown crossbody satchel with dull-gold button clasps.

Make clear foreground, midground, and background zones. No new characters. No new story elements. No fake cover, fake listing preview, fake interior page, or sales graphic.

Negative prompt / avoid:
No readable text, title graphics, captions, subtitles, labels, signs, UI, fake logos, watermarks, page numbers, arrows, circles, boxes, answer marks, decorative lettering, or gibberish text.

No scary expression, angry face, smug face, photorealism, flat cartoon style, distorted scarf, missing satchel, extra limbs, muddy glitter fog, heavy sparkle haze, or clutter that makes the scene hard to read.
```

## Day 6 Copy/Paste Prompt

Source reference image:
`content/outputs/images/approved/book-1-lantern-maker-workshop-promo-batch-01-recovered-chat-03-image-1-2026-05-05T04-51-29-569Z.png`

Expected pending-review output:
`content/outputs/images/pending-review/video-source/book-01/day-06-cozy-dragon-village-video-source-no-text-v01-2026-05-08T{HH-MM-SS}.png`

Review checklist:
`content/outputs/videos/batches/book-01-short-video-batch-2026-05-08/day-06-cozy-dragon-village/day-06-cozy-dragon-village-review-checklist.md`

```text
Create one clean vertical 9:16 video-source image for a motion-only Ember short video.

Use this static promo image as visual reference only:
content/outputs/images/approved/book-1-lantern-maker-workshop-promo-batch-01-recovered-chat-03-image-1-2026-05-05T04-51-29-569Z.png

The reference image contains readable text: "Find the tiny treasure" Remove that text completely.

Preserve Ember, the cozy dragon-village / Lantern Maker's Workshop mood, the warm festival lights, shelves of tiny objects, and the hidden-treasure challenge feeling. Keep the image clean, stable, cinematic, and easy to animate with a gentle push-in, light parallax, cozy lantern glow, subtle sparkles, breathing, blink, or tiny head tilt.

Keep Ember on-model as a tiny adorable reddish-orange baby dragon with soft pumpkin-orange and coral shading, shiny golden spiral-comma horns, large glossy blue-teal eyes, cream belly, plain bright blue-teal scarf, and tiny plain brown crossbody satchel with dull-gold button clasps.

Make clear foreground, midground, and background zones. No new characters. No new story elements. No fake cover, fake listing preview, fake interior page, or sales graphic.

Negative prompt / avoid:
No readable text, title graphics, captions, subtitles, labels, signs, UI, fake logos, watermarks, page numbers, arrows, circles, boxes, answer marks, decorative lettering, or gibberish text.

No scary expression, angry face, smug face, photorealism, flat cartoon style, distorted scarf, missing satchel, extra limbs, muddy glitter fog, heavy sparkle haze, or clutter that makes the scene hard to read.
```

## Day 7 Copy/Paste Prompt

Source reference image:
`content/outputs/images/approved/book-1-mission-item-promo-batch-03-01-golden-welcome-bell-teaser-recovered-2026-05-05T19-29-49-208Z.png`

Expected pending-review output:
`content/outputs/images/pending-review/video-source/book-01/day-07-golden-welcome-bell-video-source-no-text-v01-2026-05-08T{HH-MM-SS}.png`

Review checklist:
`content/outputs/videos/batches/book-01-short-video-batch-2026-05-08/day-07-golden-welcome-bell/day-07-golden-welcome-bell-review-checklist.md`

```text
Create one clean vertical 9:16 video-source image for a motion-only Ember short video.

Use this static promo image as visual reference only:
content/outputs/images/approved/book-1-mission-item-promo-batch-03-01-golden-welcome-bell-teaser-recovered-2026-05-05T19-29-49-208Z.png

The reference image contains readable text: "Can you find the Golden Welcome Bell?" Remove that text completely.

Preserve Ember, the Sparkleflame Festival welcome arch mood, warm hanging lanterns, bells, flowers, ribbons, and the Golden Welcome Bell search concept. Keep the image clean, stable, cinematic, and easy to animate with a gentle push-in, light parallax, cozy lantern glow, subtle sparkles, breathing, blink, or tiny head tilt.

Keep Ember on-model as a tiny adorable reddish-orange baby dragon with soft pumpkin-orange and coral shading, shiny golden spiral-comma horns, large glossy blue-teal eyes, cream belly, plain bright blue-teal scarf, and tiny plain brown crossbody satchel with dull-gold button clasps.

Make clear foreground, midground, and background zones. No new characters. No new story elements. No fake cover, fake listing preview, fake interior page, or sales graphic.

Negative prompt / avoid:
No readable text, title graphics, captions, subtitles, labels, signs, UI, fake logos, watermarks, page numbers, arrows, circles, boxes, answer marks, decorative lettering, or gibberish text.

No scary expression, angry face, smug face, photorealism, flat cartoon style, distorted scarf, missing satchel, extra limbs, muddy glitter fog, heavy sparkle haze, or clutter that makes the scene hard to read.
```

## Day 8 Copy/Paste Prompt

Source reference image:
`content/outputs/images/approved/book-1-mission-item-promo-batch-03-02-firefly-flower-charm-teaser-recovered-2026-05-05T19-29-49-208Z.png`

Expected pending-review output:
`content/outputs/images/pending-review/video-source/book-01/day-08-firefly-flower-charm-video-source-no-text-v01-2026-05-08T{HH-MM-SS}.png`

Review checklist:
`content/outputs/videos/batches/book-01-short-video-batch-2026-05-08/day-08-firefly-flower-charm/day-08-firefly-flower-charm-review-checklist.md`

```text
Create one clean vertical 9:16 video-source image for a motion-only Ember short video.

Use this static promo image as visual reference only:
content/outputs/images/approved/book-1-mission-item-promo-batch-03-02-firefly-flower-charm-teaser-recovered-2026-05-05T19-29-49-208Z.png

The reference image contains readable text: "Find the Firefly Flower Charm" Remove that text completely.

Preserve Ember, the glowing festival garden mood, lanterns, flowers, soft firefly lights, gem details, and the Firefly Flower Charm search concept. Keep the image clean, stable, cinematic, and easy to animate with a gentle push-in, light parallax, cozy lantern glow, subtle sparkles, breathing, blink, or tiny head tilt.

Keep Ember on-model as a tiny adorable reddish-orange baby dragon with soft pumpkin-orange and coral shading, shiny golden spiral-comma horns, large glossy blue-teal eyes, cream belly, plain bright blue-teal scarf, and tiny plain brown crossbody satchel with dull-gold button clasps.

Make clear foreground, midground, and background zones. No new characters. No new story elements. No fake cover, fake listing preview, fake interior page, or sales graphic.

Negative prompt / avoid:
No readable text, title graphics, captions, subtitles, labels, signs, UI, fake logos, watermarks, page numbers, arrows, circles, boxes, answer marks, decorative lettering, or gibberish text.

No scary expression, angry face, smug face, photorealism, flat cartoon style, distorted scarf, missing satchel, extra limbs, muddy glitter fog, heavy sparkle haze, or clutter that makes the scene hard to read.
```

## Day 9 Copy/Paste Prompt

Source reference image:
`content/outputs/images/approved/book-1-mission-item-promo-batch-03-03-dragon-door-key-teaser-retry-recovered-2026-05-05T19-37-48-357Z.png`

Expected pending-review output:
`content/outputs/images/pending-review/video-source/book-01/day-09-dragon-door-key-video-source-no-text-v01-2026-05-08T{HH-MM-SS}.png`

Review checklist:
`content/outputs/videos/batches/book-01-short-video-batch-2026-05-08/day-09-dragon-door-key/day-09-dragon-door-key-review-checklist.md`

```text
Create one clean vertical 9:16 video-source image for a motion-only Ember short video.

Use this static promo image as visual reference only:
content/outputs/images/approved/book-1-mission-item-promo-batch-03-03-dragon-door-key-teaser-retry-recovered-2026-05-05T19-37-48-357Z.png

The reference image contains readable text: "Can you find the Dragon Door Key?" Remove that text completely.

Preserve Ember, the cozy dragon cottage doorway, festival ribbons, lanterns, flower pots, cupcakes, and Dragon Door Key search concept. Keep the image clean, stable, cinematic, and easy to animate with a gentle push-in, light parallax, cozy lantern glow, subtle sparkles, breathing, blink, or tiny head tilt.

Keep Ember on-model as a tiny adorable reddish-orange baby dragon with soft pumpkin-orange and coral shading, shiny golden spiral-comma horns, large glossy blue-teal eyes, cream belly, plain bright blue-teal scarf, and tiny plain brown crossbody satchel with dull-gold button clasps.

Make clear foreground, midground, and background zones. No new characters. No new story elements. No fake cover, fake listing preview, fake interior page, or sales graphic.

Negative prompt / avoid:
No readable text, title graphics, captions, subtitles, labels, signs, UI, fake logos, watermarks, page numbers, arrows, circles, boxes, answer marks, decorative lettering, or gibberish text.

No scary expression, angry face, smug face, photorealism, flat cartoon style, distorted scarf, missing satchel, extra limbs, muddy glitter fog, heavy sparkle haze, or clutter that makes the scene hard to read.
```

## Day 10 Copy/Paste Prompt

Source reference image:
`content/outputs/images/approved/book-1-mission-item-promo-batch-03-04-sparkle-market-token-teaser-recovered-2026-05-05T19-29-49-208Z.png`

Expected pending-review output:
`content/outputs/images/pending-review/video-source/book-01/day-10-sparkle-market-token-video-source-no-text-v01-2026-05-08T{HH-MM-SS}.png`

Review checklist:
`content/outputs/videos/batches/book-01-short-video-batch-2026-05-08/day-10-sparkle-market-token/day-10-sparkle-market-token-review-checklist.md`

```text
Create one clean vertical 9:16 video-source image for a motion-only Ember short video.

Use this static promo image as visual reference only:
content/outputs/images/approved/book-1-mission-item-promo-batch-03-04-sparkle-market-token-teaser-recovered-2026-05-05T19-29-49-208Z.png

The reference image contains readable text: "Find the Sparkle Market Token" Remove that text completely.

Preserve Ember, the lively Sparkleflame Festival market table, warm lanterns, ribbons, gems, cupcakes, coins, and the Sparkle Market Token search concept. Keep the image clean, stable, cinematic, and easy to animate with a gentle push-in, light parallax, cozy lantern glow, subtle sparkles, breathing, blink, or tiny head tilt.

Keep Ember on-model as a tiny adorable reddish-orange baby dragon with soft pumpkin-orange and coral shading, shiny golden spiral-comma horns, large glossy blue-teal eyes, cream belly, plain bright blue-teal scarf, and tiny plain brown crossbody satchel with dull-gold button clasps.

Make clear foreground, midground, and background zones. No new characters. No new story elements. No fake cover, fake listing preview, fake interior page, or sales graphic.

Negative prompt / avoid:
No readable text, title graphics, captions, subtitles, labels, signs, UI, fake logos, watermarks, page numbers, arrows, circles, boxes, answer marks, decorative lettering, or gibberish text.

No scary expression, angry face, smug face, photorealism, flat cartoon style, distorted scarf, missing satchel, extra limbs, muddy glitter fog, heavy sparkle haze, or clutter that makes the scene hard to read.
```

## Day 11 Copy/Paste Prompt

Source reference image:
`content/outputs/images/approved/book-1-no-blank-promo-batch-02-04-meet-ember-guide-recovered-2026-05-05T05-21-47-885Z.png`

Expected pending-review output:
`content/outputs/images/pending-review/video-source/book-01/day-11-ember-progress-note-video-source-no-text-v01-2026-05-08T{HH-MM-SS}.png`

Review checklist:
`content/outputs/videos/batches/book-01-short-video-batch-2026-05-08/day-11-ember-progress-note/day-11-ember-progress-note-review-checklist.md`

```text
Create one clean vertical 9:16 video-source image for a motion-only Ember short video.

Use this static promo image as visual reference only:
content/outputs/images/approved/book-1-no-blank-promo-batch-02-04-meet-ember-guide-recovered-2026-05-05T05-21-47-885Z.png

The reference image contains readable text: "Meet Ember" and "Your baby dragon guide" Remove that text completely.

Preserve Ember, the cozy Sparkleflame Festival village, warm lantern strings, friendly guide feeling, and production-progress / follow-along mood. Keep the image clean, stable, cinematic, and easy to animate with a gentle push-in, light parallax, cozy lantern glow, subtle sparkles, breathing, blink, or tiny head tilt.

Keep Ember on-model as a tiny adorable reddish-orange baby dragon with soft pumpkin-orange and coral shading, shiny golden spiral-comma horns, large glossy blue-teal eyes, cream belly, plain bright blue-teal scarf, and tiny plain brown crossbody satchel with dull-gold button clasps.

Make clear foreground, midground, and background zones. No new characters. No new story elements. No fake cover, fake listing preview, fake interior page, or sales graphic.

Negative prompt / avoid:
No readable text, title graphics, captions, subtitles, labels, signs, UI, fake logos, watermarks, page numbers, arrows, circles, boxes, answer marks, decorative lettering, or gibberish text.

No scary expression, angry face, smug face, photorealism, flat cartoon style, distorted scarf, missing satchel, extra limbs, muddy glitter fog, heavy sparkle haze, or clutter that makes the scene hard to read.
```

## Day 12 Copy/Paste Prompt

Source reference image:
`content/outputs/images/approved/book-1-no-blank-promo-batch-02-01-search-with-ember-recovered-2026-05-05T05-21-26-346Z.png`

Expected pending-review output:
`content/outputs/images/pending-review/video-source/book-01/day-12-cozy-seek-and-find-adventure-video-source-no-text-v01-2026-05-08T{HH-MM-SS}.png`

Review checklist:
`content/outputs/videos/batches/book-01-short-video-batch-2026-05-08/day-12-cozy-seek-and-find-adventure/day-12-cozy-seek-and-find-adventure-review-checklist.md`

```text
Create one clean vertical 9:16 video-source image for a motion-only Ember short video.

Use this static promo image as visual reference only:
content/outputs/images/approved/book-1-no-blank-promo-batch-02-01-search-with-ember-recovered-2026-05-05T05-21-26-346Z.png

The reference image contains readable text: "Search with Ember!" Remove that text completely.

Preserve Ember, the warm Sparkleflame Festival mood, the cozy lantern-market / seek-and-find feeling, tiny treasures, gentle magic, and children's-book giftable adventure mood. Keep the image clean, stable, cinematic, and easy to animate with a gentle push-in, light parallax, cozy lantern glow, subtle sparkles, breathing, blink, or tiny head tilt.

Keep Ember on-model as a tiny adorable reddish-orange baby dragon with soft pumpkin-orange and coral shading, shiny golden spiral-comma horns, large glossy blue-teal eyes, cream belly, plain bright blue-teal scarf, and tiny plain brown crossbody satchel with dull-gold button clasps.

Make clear foreground, midground, and background zones. No new characters. No new story elements. No fake cover, fake listing preview, fake interior page, or sales graphic.

Negative prompt / avoid:
No readable text, title graphics, captions, subtitles, labels, signs, UI, fake logos, watermarks, page numbers, arrows, circles, boxes, answer marks, decorative lettering, or gibberish text.

No scary expression, angry face, smug face, photorealism, flat cartoon style, distorted scarf, missing satchel, extra limbs, muddy glitter fog, heavy sparkle haze, or clutter that makes the scene hard to read.
```
