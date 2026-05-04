# n8n Workflows

These workflows are importable local n8n JSON exports for Ember Content Studio.

## Prerequisites

1. Start Docker Desktop.

2. Start local n8n with Docker. This is the preferred local startup route for this Windows workspace:

   ```powershell
   docker start n8n-local
   ```

   If the container does not exist yet, create it once:

   ```powershell
   docker run -d --name n8n-local -p 5678:5678 -v n8n_data:/home/node/.n8n n8nio/n8n
   ```

   This stores n8n data in the Docker volume `n8n_data` and serves n8n at:

   ```text
   http://localhost:5678
   ```

3. Start the local Ember API on the host:

   ```powershell
   npm run server
   ```

4. Confirm Ember API health:

   ```powershell
   curl http://localhost:3333/health
   ```

5. Import workflow JSON files from `automation/n8n/workflows/`.

Because n8n is running in Docker, imported HTTP Request nodes must call the host API through:

```text
http://host.docker.internal:3333
```

Do not change imported workflow HTTP Request URLs back to `http://localhost:3333`; inside the n8n container, `localhost` means the container itself.

## Test Webhooks

n8n provides separate test and production webhook URLs. Use test URLs while building. Activate the workflow before using production URLs.

Example local API request:

```powershell
curl -X POST http://localhost:3333/generate/seek-page `
  -H "Content-Type: application/json" `
  -d "{\"pageNumber\":6,\"location\":\"Cloud Bakery\",\"missionItem\":\"tiny frosted bell\"}"
```

Example n8n test webhook request after importing the seek-page workflow and clicking "Listen for test event":

```powershell
$body = @{
  bookTitle = "Ember and the Sparkleflame Festival Search"
  pageNumber = 7
  location = "Frosted Cloud Bakery"
  missionItem = "tiny frosted bell"
  ageRange = "5-8"
  style = "soft rounded 2.25D children's storybook"
  outputMode = "prompt+qa"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5678/webhook-test/ember/seek-page" -Method Post -Body $body -ContentType "application/json"
```

## Workflow Files

- `ember-generate-seek-page.workflow.json`
- `ember-generate-title-page.workflow.json`
- `ember-generate-storyboard.workflow.json`
- `ember-generate-marketing-pack.workflow.json`
- `ember-kdp-qa.workflow.json`
- `ember-discord-command-router.workflow.json`

## Troubleshooting

- n8n not reachable at `http://localhost:5678`: start Docker Desktop, then run `docker start n8n-local`.
- Container missing: run the one-time `docker run -d --name n8n-local -p 5678:5678 -v n8n_data:/home/node/.n8n n8nio/n8n` command.
- Bad request in the HTTP Request node: do not use `JSON.stringify(...)` in the JSON body field. Pass an object expression such as `={{ $json.body ?? $json }}`.
- Docker URL issue: HTTP Request nodes inside n8n must call `http://host.docker.internal:3333`, not `http://localhost:3333`.
- No input data: run the workflow from the Webhook Trigger test URL or click "Listen for test event"; do not execute the HTTP Request node alone.
- Connection refused: start `npm run server`.
- File already exists: send `"force": true` only when you intentionally want to overwrite generated outputs.
- Empty webhook response: confirm the Webhook node response mode is `Using Respond to Webhook`.
- Production URL not working: activate the workflow in n8n.
