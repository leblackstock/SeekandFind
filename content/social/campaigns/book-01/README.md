# Book 1 Social Campaign Queue

This folder contains the canonical social posting state for Book 1.

## Source Of Truth

- `queue.json` is the canonical live state for posting automation.
- `platform-settings.json` stores platform/account placeholders only. It must not contain API keys, OAuth tokens, passwords, or secrets.
- `archive/legacy-source-snapshot.json` is historical reference only. It preserves migrated legacy detail so the live queue can stay compact.
- Markdown files under `views/` are human-readable reports or generated views. They are not live state.

## Automation Rule

Automation must read `queue.json` for current posting state. Do not read old campaign files under `content/outputs/marketing/` or other legacy locations unless a human explicitly requests a migration or rebuild.

## Posting Rule

- Instagram and Facebook feed, Reel, repost, and scheduled publishing work must use Meta Business Suite / Meta posting tools by default. When the same asset/caption is meant for both Instagram and Facebook, publish them together from one Meta composer action with both destinations selected; do not split them into separate IG/FB posts unless Lauren explicitly asks or Meta blocks the combined post.

## Promo Asset Safety

- Instagram/Facebook feed stills require a separately created native 4:5 promo image. Do not crop, resize, or reuse a 9:16 Pinterest/Shorts/Story image as the 4:5 feed asset.
- A single approved `meta_feed_4x5` image can be reused for both Instagram feed and Facebook Page feed posts if it is approved for both surfaces.
- Text-bearing promo art is not Instagram-safe unless critical text and key art stay inside both the 4:5 feed-safe area and the centered square profile-grid-safe area.
- Queue rows that use Instagram feed stills should point to an Instagram-safe asset or carry a visible blocker/warning before live posting.
- Posting schedules must check the approved 4:5 feed image slot before treating Instagram/Facebook still tasks as live-postable.
- Posting packs must include the approved 4:5 feed image path for each Instagram/Facebook feed task, or show a missing-asset blocker instead of only listing the older vertical campaign image.

## Queue Commands

- `npm run social:today` is the required front door for every social work block. It validates the queue, checks the America/New_York campaign date gate, and prints the compact due-pressure packet. If nothing is due yet but a near-term chunk exists, it returns a `PREP ONLY` packet instead of an empty handoff. Use `-- YYYY-MM-DD` or `-- --today YYYY-MM-DD` only when the campaign clock needs an explicit override.
- `npm run social:start` is an alias for `npm run social:today`.
- `npm run social:done -- <TASK_KEY> <POST_URL>` is the posting finish button. Use it only after a live post URL exists; it writes the receipt, creates the evidence folder, marks `queue.json`, validates the queue, and prints the next compact packet. For Short Video bundles, pass every required surface URL with `--youtube`, `--tiktok`, `--instagram`, `--facebook`, and `--pinterest`.
- `npm run social:status-compact -- day-06` prints one compact day status JSON: ready/posted/blocked counts, ready task keys, and missing Short Video surface URLs.
- `npm run social:post-day -- day-06 --close-short-video --youtube <URL> --tiktok <URL> --instagram <URL> --facebook <URL> --pinterest <URL>` is the day-level compact runner. Use `--dry-run` to verify URL completeness without mutating the queue; omit it only when the URLs are real and ready to close the bundle.
- `npm run social:post-short-video -- <TASK_KEY_OR_DAY> --youtube <URL> --tiktok <URL> --instagram <URL> --facebook <URL> --pinterest <URL>` is the production compact closeout for a Short Video bundle. It resolves a day selector like `day-06`, verifies every required surface URL is present, writes the receipt, updates `queue.json`, validates, logs the run, and prints compact JSON only.
- `npm run social:receipt` remains the lower-level manual/recovery helper when a receipt should be created without changing `queue.json`.
- `npm run social:youtube-dry-run-draft` prepares a YouTube Shorts upload draft only. It can start from an existing YouTube Studio tab or from the durable CDP browser with no YouTube tab open; it must stop before Publish and must not be used to mark the Short Video bundle posted.
- `npm run social:youtube-dry-run-quiet` runs the same no-publish YouTube draft lane with compact stdout plus local full/compact evidence JSON and session logging. Use this for low-token supervised production checks.
- `npm run social:youtube-publish` runs the publish-enabled YouTube lane with compact stdout plus local full/compact evidence JSON and session logging. Use only when Publish is intentionally allowed.
- Production closeout commands reject placeholder/example URLs unless they are explicitly running in `--dry-run`.
- `npm run social:pinterest-publish-quiet` and `npm run social:meta-still-publish-quiet` are compact entry points for the existing Pinterest and Meta production lanes. The Meta quiet lane prints counts/URLs/result path instead of the full caption and screenshot list.
- `npm run social:handoff` returns the next publishable `ready` task and its evidence plan.
- `npm run social:next-blocker` returns the earliest blocked task to fix, checking `needs-account`, then `needs-video-export`, then `error` within each campaign day.
- `npm run social:copy-approved-stills` refreshes approved text-bearing social still copies for Days 03-12 into `C:/Users/outdo/Downloads/ember-approved-social-stills-days-03-12`.
- Use `npm run social:next-blocker` when we are not posting and want to clean up account or video issues instead of advancing to future ready posts.
- Quick operator reference: `content/social/campaigns/book-01/views/production-command-cheatsheet.md`.
- Add `--verbose` to compact commands only when debugging; default production output should stay compact.

## Boundaries

Do not use files inside `Ember's Adventures/` for this queue. This campaign queue was built from non-`Ember's Adventures/` sources only.
