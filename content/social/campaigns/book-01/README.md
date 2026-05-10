# Book 1 Social Campaign Queue

This folder contains the canonical social posting state for Book 1.

## Source Of Truth

- `queue.json` is the canonical live state for posting automation.
- `platform-settings.json` stores platform/account placeholders only. It must not contain API keys, OAuth tokens, passwords, or secrets.
- `archive/legacy-source-snapshot.json` is historical reference only. It preserves migrated legacy detail so the live queue can stay compact.
- Markdown files under `views/` are human-readable reports or generated views. They are not live state.

## Automation Rule

Automation must read `queue.json` for current posting state. Do not read old campaign files under `content/outputs/marketing/` or other legacy locations unless a human explicitly requests a migration or rebuild.

## Queue Commands

- `npm run social:handoff` returns the next publishable `ready` task and its evidence plan.
- `npm run social:next-blocker` returns the earliest blocked task to fix, checking `needs-account`, then `needs-video-export`, then `error` within each campaign day.
- `npm run social:copy-approved-stills` refreshes approved text-bearing social still copies for Days 03-12 into `C:/Users/outdo/Downloads/ember-approved-social-stills-days-03-12`.
- Use `npm run social:next-blocker` when we are not posting and want to clean up account or video issues instead of advancing to future ready posts.

## Boundaries

Do not use files inside `Ember's Adventures/` for this queue. This campaign queue was built from non-`Ember's Adventures/` sources only.
