# Day 1 Posting Methods And Workarounds

Status: recorded
Campaign: Book 1 Prelaunch Rolling Campaign
Campaign day: Day 1
Campaign date: 2026-05-05
Record date: 2026-05-06

This is the compact handoff for what worked, what blocked, and what workaround was used while posting Day 1 across the live platforms.

## What Worked

| Platform | Working method | Result | Source record |
| --- | --- | --- | --- |
| Pinterest | Use Pinterest Pin creation with the approved image, visible title/description fields, the visible alt-text textarea, and no destination link. Repeat the Day 1 theme as three distinct Pins across three boards. | 3 required Day 1 Pins posted and verified. | `content/outputs/marketing/posts/2026-05-05-meet-ember-pinterest.md` |
| YouTube Shorts | Owner created/confirmed the channel and handled account/security steps. Upload the approved PixVerse MP4 as a Short with the planned title/description and made-for-kids setting. | Final replacement Short is public at `https://youtube.com/shorts/HSCae6g57M0?feature=share`. | `content/outputs/marketing/posts/2026-05-06-youtube-shorts-day-1-meet-ember.md` |
| Instagram | Use the logged-in `@emberdragonbooks` account in the existing browser session. Post the approved image as a feed post, then post the approved PixVerse MP4 as a Reel with platform-native caption text. | Feed post and Reel are live. | `content/outputs/marketing/posts/2026-05-06-instagram-day-1-meet-ember.md` |
| Facebook | Use the accessible `Ember Dragon Books` Page in the existing browser session. Create a Page photo/feed post from the approved image, then create a Reel from the approved PixVerse MP4. Check that boost is off before publishing the Reel. | Facebook Page post and Reel are live/ready to view. | `content/outputs/marketing/posts/2026-05-06-facebook-day-1-meet-ember.md` |
| TikTok | Use TikTok Studio after owner-side access is available. Upload the approved PixVerse MP4, add the planned caption, keep visibility public, post now, and refresh Studio if the live row does not appear immediately. | TikTok video is live at `https://www.tiktok.com/@emberdragonbooks/video/7636862024382811422`. | `content/outputs/marketing/posts/2026-05-06-tiktok-day-1-meet-ember.md` |

## Difficulties And Workarounds

| Platform | Difficulty | Workaround / Rule |
| --- | --- | --- |
| Pinterest | Inline browser snippets failed when TypeScript-only syntax was used. | Keep inline runner snippets plain JavaScript. |
| Pinterest | Pinterest has a hidden `g-recaptcha-response` textarea, so filling the last textarea can target the wrong field. | After clicking `Add alt text`, target the visible textarea with placeholder `Explain what people can see in the Pin`. |
| Pinterest | Pinterest warned that the approved image was under 1000 px wide. | Record the warning and continue only because posting succeeded and the approved asset remained acceptable. |
| YouTube Shorts | Original upload was unlisted/superseded. | Owner provided the corrected public replacement URL; the public replacement is now the Day 1 source of truth. |
| YouTube Shorts | Account creation, login, 2FA, CAPTCHA, ownership, and compliance prompts are sensitive boundaries. | Lauren handles those directly; Codex records status and resumes only after access is visible. |
| Instagram | Story reshare/highlights were not completed in the Day 1 pass. | Record as optional later setup, not a blocker for Day 1 tracked posting. |
| Facebook | First Facebook check stopped at login/password/Page setup boundary. | Resume only after owner-side access to the Page is available in the browser. |
| Facebook | A file-picker attempt attached the image to the cover-photo edit surface instead of the intended post flow. | Cancel the picker, verify the cover edit surface is closed, then create the real feed post separately. The Facebook cover is now scheduled for Day 3, 2026-05-07. |
| Facebook | Facebook offered a WhatsApp/contact upsell after posting. | Select `Not now`; do not enter contact or payment/ads setup unless explicitly chosen. |
| Facebook | Reel boost/ad controls appeared during posting. | Confirm boost is off; avoid ads, boost, and payment surfaces unless explicitly chosen. |
| TikTok | Initial TikTok check stopped at login/sign-up boundary. | Resume only after owner-side access is available. |
| TikTok | TikTok automatic content-checks upsell appeared. | Cancel it instead of changing persistent account settings. |
| TikTok | TikTok Studio guided-tour overlay appeared. | Dismiss with `Got it`. |
| TikTok | Upload showed `Video published`, then the post needed a Studio refresh to appear. | Refresh/check the Studio content list before recording final URL status. |
| TikTok | TikTok suggested a location chip. | Leave location blank unless Lauren explicitly approves a location. |

## Standing Guardrails

- Do not handle passwords, login recovery, 2FA, CAPTCHA, payment, identity verification, security, or account-ownership prompts.
- Do not add a landing/store link until a real approved destination exists.
- Do not use buy-now, available-now, published, launch-day, or inside-the-book claims until production status supports them.
- Keep all captions platform-native/editable; do not add baked-in video text for the clean short-video lane.
- Treat fresh promo art as promo art only, not as a real cover, real interior sample, listing preview, or product mockup.
