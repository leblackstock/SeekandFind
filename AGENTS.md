# AGENTS.md

## Project Identity

This repo contains the Ember seek-and-find source files plus `ember-content-studio`, a local automation and Codex skills system for Lauren's children's seek-and-find book workflows.

## Prime Directives

- Do not invent Ember canon.
- Read the relevant files in `content/canon/` before generating creative outputs.
- Treat `Ember's Adventures/Rules and Instructions/seek-and-find-rules-consolidated-4-files/` and `CHATGPT_PROJECT_SYSTEM_INSTRUCTIONS.md` as the upstream canon sources for mirrored automation canon.
- All generated prompts must preserve Ember's approved character design.
- Do not generate or request readable text inside AI images unless explicitly instructed for post-layout or marketing typography work.
- Keep outputs kid-friendly for ages 5-8.
- Prefer free/local tooling.
- Do not automate bypassing payment, login protections, CAPTCHA, rate limits, free-credit limits, or platform restrictions.
- Browser automation must be transparent, reviewable, and stopped at any sensitive account/payment boundary.

## Workflow Constraints

- Token efficiency: When summarizing file contents, use a diff format, bullet points, or a short targeted excerpt. Do not rewrite an entire file in chat unless Lauren explicitly asks to see the full code.
- Self-correction: If a command returns a 404, 500, missing-file, or missing-route error, immediately list or inspect the parent directory or route group before trying a new path. Do not keep guessing alternate paths without verifying what actually exists.
- YouTube upload screens only: if automation attempts a reload/refresh/navigation while a YouTube Studio upload or draft is open, immediately cancel/dismiss the possible reload/leave-page warning and continue the current YouTube upload flow. Do this even if the automation did not detect a dialog event; detection is not required before canceling. Do not inspect, re-verify, or retry anything before canceling.
- For any Instagram or Facebook live posting, reposting, or scheduling, use Meta Business Suite / Meta posting tools by default. When the same asset/caption is meant for both Instagram and Facebook, post them together from one Meta composer action with both destinations selected; do not split them into separate IG/FB posts unless Lauren explicitly asks or Meta blocks the combined post.

## Self-Correction Protocol

Use this loop during workspace tasks: Plan → Act → Verify → Reflect → Record reusable lesson → Continue.

- Verify before claiming success. Check files, command output, tests, generated artifacts, or browser state as appropriate to the task.
- When a command, edit, test, generation, or workflow step fails, identify the exact failure, diagnose the likely cause, attempt the smallest safe fix, and rerun the relevant verification.
- If the failure reveals a reusable lesson, record it in `LESSONS_LEARNED.md` using the template there.
- Add a lesson only when it is specific, reusable, tied to a trigger condition, and based on a real failure, mistake, confusion, or inefficient workflow.
- Do not add generic lessons such as "be careful," "check your work," "do better," or "avoid mistakes."
- Prefer updating an existing related lesson over creating a duplicate.
- If a lesson becomes obsolete, mark it as superseded instead of leaving conflicting guidance.
- Escalate to Lauren before risky, destructive, account-sensitive, payment-related, or broad cross-workspace actions.
- Use `prompts/reflect-and-fix.md` when a task needs an explicit reflection pass before continuing.

## Lesson Hygiene

Do not add a new rule or lesson for every minor issue.

Add a lesson only when it prevents a likely future mistake.

Keep lessons:
- short
- specific
- action-oriented
- tied to a trigger condition

Prefer updating an existing related lesson over creating a duplicate.
If a lesson becomes obsolete, mark it as superseded instead of leaving conflicting guidance.

## Promo Art Format Rules

- Create platform-specific promo art at the needed aspect ratio instead of relying on later crops.
- 4:5 Instagram/Facebook feed images must be created separately as native 4:5 compositions. Do not crop, resize, or repurpose a 9:16 Pinterest/Shorts/Story asset into a 4:5 feed asset.
- One separately created, approved `meta_feed_4x5` image may serve both Instagram feed and Facebook Page feed posts when it is approved for both surfaces.
- For text-bearing promo art, keep critical text and key art inside the 4:5 feed-safe area and the centered square profile-grid-safe area before using it for Instagram.
- Treat 9:16 text-bearing stills as unsafe for Instagram feed/grid unless a separate Instagram-safe 4:5 asset or shared `meta_feed_4x5` asset passes QA or Lauren explicitly approves the risk.

## Build Standards

- Use TypeScript.
- Prefer simple, boring architecture over clever framework soup.
- Keep scripts runnable from `package.json`.
- Add meaningful tests for template rendering, naming, QA checks, file writing, API routes, and workflow exports.
- Do not overwrite existing outputs unless a `--force` flag is used.
- Every workflow should write a session log.
- Preserve UTF-8 text and fix mojibake in any file edited.

## Commands

Use these scripts when available:

- `npm run dev`
- `npm run build`
- `npm run test`
- `npm run lint`
- `npm run generate:seek`
- `npm run generate:title`
- `npm run generate:storyboard`
- `npm run generate:marketing`
- `npm run qa:kdp`
- `npm run server`
- `npm run n8n:check`

## Done Means

A task is done only when:

- files are created in the expected folders
- tests pass or any test blocker is clearly reported
- README or relevant docs are updated
- generated output is saved
- session/progress log is updated
