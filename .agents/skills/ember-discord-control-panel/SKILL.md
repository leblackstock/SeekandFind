---
name: ember-discord-control-panel
description: Add or review the Phase 9 Discord slash-command control panel for Ember automation after the local API and n8n workflows are stable. Use for Discord bridge, command routing, signature checks, and n8n handoff; do not use before the core engine and n8n workflows work.
---

# Ember Discord Control Panel

## Phase Rule

Discord is Phase 9. It must not replace n8n, and it must not be built before the local API and n8n workflows are stable.

## Architecture

```text
Discord slash command
  -> discord/discord-bridge.ts
  -> n8n webhook
  -> local Ember API
  -> n8n returns/posts result
  -> Discord result
```

## Required Commands

- `/ember-seek`
- `/ember-title`
- `/ember-storyboard`
- `/ember-marketing`
- `/ember-qa`
- `/ember-status`

## Security Rules

- Validate Discord request signatures.
- Handle Discord PING requests.
- Acknowledge commands quickly.
- Post long-running results through a configured Discord results webhook.
- Never expose the local API publicly.
- Document Cloudflare Tunnel or ngrok only for the Discord bridge.

## Failure Conditions

Fail if Discord bypasses n8n, exposes the local API, stores secrets in the repo, skips signature validation, or tries to perform long workflows synchronously in the initial Discord response.
