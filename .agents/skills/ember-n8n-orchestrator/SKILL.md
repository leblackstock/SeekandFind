---
name: ember-n8n-orchestrator
description: Create, test, and repair local n8n workflow JSON exports for Ember automation. Use for webhook-to-local-API workflows, importable n8n files, localhost testing, and troubleshooting; do not use for prompt generation unless an n8n workflow is the user's target.
---

# Ember n8n Orchestrator

## Required Behavior

Build n8n workflows that route webhook input to the local Ember Content Studio API and return JSON results.

## Standard Flow

```text
Webhook Trigger
  -> Set/Edit Fields when needed
  -> HTTP Request to http://localhost:3333/...
  -> Respond to Webhook
```

## Required Files

- `automation/n8n/workflows/ember-generate-seek-page.workflow.json`
- `automation/n8n/workflows/ember-generate-title-page.workflow.json`
- `automation/n8n/workflows/ember-generate-storyboard.workflow.json`
- `automation/n8n/workflows/ember-generate-marketing-pack.workflow.json`
- `automation/n8n/workflows/ember-kdp-qa.workflow.json`
- `automation/n8n/workflows/ember-discord-command-router.workflow.json`

## Test Rules

- Use n8n test webhook URLs while building.
- Use production webhook URLs only after activation.
- Keep the local API private on localhost.
- Run `npm run n8n:check` before calling the setup complete.

## Failure Conditions

Fail if a workflow is not importable JSON, lacks a webhook trigger, lacks a local API HTTP Request node, lacks a Respond to Webhook node, or points to a public API by default.
