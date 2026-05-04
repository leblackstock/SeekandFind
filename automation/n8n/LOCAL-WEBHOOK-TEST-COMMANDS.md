# Local Webhook Test Commands

Use these PowerShell commands for n8n test and production webhook verification.

Test webhook pattern:

```text
http://localhost:5678/webhook-test/<path>
```

Production webhook pattern:

```text
http://localhost:5678/webhook/<path>
```

## Seek Page

```powershell
$body = @{
  bookTitle = "Ember and the Sparkleflame Festival Search"
  pageNumber = 8
  location = "Glowing Lantern Garden"
  missionItem = "tiny golden lantern key"
  ageRange = "5-8"
  style = "soft rounded 2.25D children's storybook"
  outputMode = "prompt+qa"
  force = $true
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5678/webhook-test/ember/seek-page" -Method Post -Body $body -ContentType "application/json"
Invoke-RestMethod -Uri "http://localhost:5678/webhook/ember/seek-page" -Method Post -Body $body -ContentType "application/json"
```

## Title Page

```powershell
$body = @{
  bookTitle = "Ember and the Sparkleflame Festival Search"
  theme = "Sparkleflame Festival opening title page"
  ageRange = "5-8"
  style = "soft rounded 2.25D children's storybook"
  outputMode = "prompt+qa"
  force = $true
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5678/webhook-test/ember/title-page" -Method Post -Body $body -ContentType "application/json"
Invoke-RestMethod -Uri "http://localhost:5678/webhook/ember/title-page" -Method Post -Body $body -ContentType "application/json"
```

## Storyboard

```powershell
$body = @{
  clipLength = "15 seconds"
  goal = "promote Ember seek-and-find book"
  scene = "Ember waves, notices a glowing festival clue, follows sparkles, and smiles at the viewer"
  platform = "short-form video"
  outputMode = "storyboard+editing-notes"
  force = $true
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5678/webhook-test/ember/storyboard" -Method Post -Body $body -ContentType "application/json"
Invoke-RestMethod -Uri "http://localhost:5678/webhook/ember/storyboard" -Method Post -Body $body -ContentType "application/json"
```

## Marketing Pack

```powershell
$body = @{
  bookTitle = "Ember and the Sparkleflame Festival Search"
  platforms = @("Pinterest", "Facebook", "Instagram")
  asset = "Book 1 sample seek-and-find page"
  goal = "promote a children's dragon seek-and-find activity book without claiming it is already published"
  audience = "parents and gift-buyers for kids ages 5-8"
  force = $true
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5678/webhook-test/ember/marketing-pack" -Method Post -Body $body -ContentType "application/json"
Invoke-RestMethod -Uri "http://localhost:5678/webhook/ember/marketing-pack" -Method Post -Body $body -ContentType "application/json"
```

## KDP QA

```powershell
$body = @{
  bookTitle = "Ember and the Sparkleflame Festival Search"
  file = "content/outputs/prompts/book01-page008-glowing-lantern-garden-image-prompt.md"
  pageType = "seek-page"
  trimSize = "8.5x11"
  checkMode = "prompt"
  force = $true
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5678/webhook-test/ember/kdp-qa" -Method Post -Body $body -ContentType "application/json"
Invoke-RestMethod -Uri "http://localhost:5678/webhook/ember/kdp-qa" -Method Post -Body $body -ContentType "application/json"
```
