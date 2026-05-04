# Discord Phase 9

Discord is a future control panel after the local API and n8n workflows are stable.

Planned route:

```text
Discord slash command
  -> discord/discord-bridge.ts
  -> n8n webhook
  -> local Ember API
  -> n8n result
  -> Discord response or results webhook
```

Do not expose the local API publicly. If Discord is enabled, expose only the Discord bridge through Cloudflare Tunnel or ngrok and keep n8n/local API private unless explicitly changed.

Required slash commands:

- `/ember-seek`
- `/ember-title`
- `/ember-storyboard`
- `/ember-marketing`
- `/ember-qa`
- `/ember-status`

Security requirements before live use:

- Validate Discord signatures.
- Handle PING requests.
- Acknowledge long-running workflows quickly.
- Store secrets only in `.env`.
- Send long results through n8n and a configured Discord results webhook.
