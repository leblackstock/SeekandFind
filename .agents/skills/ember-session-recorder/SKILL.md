---
name: ember-session-recorder
description: Record Ember workflow progress, completed assets, generated files, failed steps, warnings, and next actions into production-status and session logs. Use whenever a workflow run creates or reviews outputs; do not use as a replacement for creative generation or QA.
---

# Ember Session Recorder

## Required Behavior

Record durable workflow state in markdown after every generator, QA, API, or n8n workflow run.

Update:

- `content/workflows/book-01/production-status.md`
- `content/outputs/session-logs/YYYY-MM-DD-session.md`

## Log Fields

- timestamp
- workflow name
- inputs
- assumptions
- outputs created
- warnings
- QA result
- next manual step

## Rules

- Keep logs readable and durable.
- Do not hide failed steps.
- Do not mark generated assets as final-approved unless the user explicitly approved them.
- Do not overwrite old session logs.

## Failure Conditions

Fail if a workflow creates files but does not record the output paths, warnings, QA state, and next manual step.
