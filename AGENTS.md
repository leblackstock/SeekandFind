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
