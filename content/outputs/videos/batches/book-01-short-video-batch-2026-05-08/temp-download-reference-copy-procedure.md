# Temporary Downloads Reference Copy Procedure

Batch: `book-01-short-video-batch-2026-05-08`

## Purpose

This temporary procedure explains how to copy the approved static promo reference images for Book 1 Short Video Days 3-12 into `C:/Users/outdo/Downloads/` with simple day-based filenames.

These copied files are convenience upload/reference copies only. They are intended to make manual clean no-text video-source image generation easier.

## Source Of Truth

Use the refreshed batch manifest and guide in:

- `content/outputs/videos/batches/book-01-short-video-batch-2026-05-08/batch-manifest.json`
- `content/outputs/videos/batches/book-01-short-video-batch-2026-05-08/video-source-image-generation-guide.md`

The canonical approved static promo images remain in:

- `content/outputs/images/approved/`

Do not treat Downloads copies as canonical assets. Do not use them as approved video-source images or approved video exports.

## Destination Folder

Copy temporary reference images to:

`C:/Users/outdo/Downloads/`

## Naming Convention

Use:

`day-XX-reference-{campaign-slug}.png`

Examples:

- `day-03-reference-search-with-ember.png`
- `day-04-reference-baby-flame-lantern.png`
- `day-05-reference-lantern-maker-workshop.png`

## Safety Rules

- Do not run this procedure automatically.
- Surface or run this procedure only when explicitly requested.
- Do not modify `content/social/campaigns/book-01/queue.json`.
- Do not generate images.
- Do not generate videos.
- Do not upload or post anything.
- Do not touch `Ember's Adventures/`.
- Do not overwrite existing Downloads files unless the user explicitly asks for overwrite behavior.
- The copied Downloads files are temporary reference-upload helpers only.

## Copy Script To Run Later On Explicit Request Only

This script is intentionally not run by batch prep. It should be run only after the user explicitly asks to copy the reference files.

```powershell
$repoRoot = "C:\Users\outdo\Documents\Seek and Find Books"
$destinationFolder = "C:\Users\outdo\Downloads"

$copies = @(
  @{
    Source = "content/outputs/images/approved/book-1-no-blank-promo-batch-02-01-search-with-ember-recovered-2026-05-05T05-21-26-346Z.png"
    Name = "day-03-reference-search-with-ember.png"
  }
  @{
    Source = "content/outputs/images/approved/book-1-no-blank-promo-batch-02-02-baby-flame-lantern-teaser-balanced-approved-recovered-2026-05-05T05-47-13-309Z-1.png"
    Name = "day-04-reference-baby-flame-lantern.png"
  }
  @{
    Source = "content/outputs/images/approved/book-1-lantern-maker-workshop-promo-batch-01-recovered-chat-02-image-1-2026-05-05T04-51-23-244Z.png"
    Name = "day-05-reference-lantern-maker-workshop.png"
  }
  @{
    Source = "content/outputs/images/approved/book-1-lantern-maker-workshop-promo-batch-01-recovered-chat-03-image-1-2026-05-05T04-51-29-569Z.png"
    Name = "day-06-reference-cozy-dragon-village.png"
  }
  @{
    Source = "content/outputs/images/approved/book-1-mission-item-promo-batch-03-01-golden-welcome-bell-teaser-recovered-2026-05-05T19-29-49-208Z.png"
    Name = "day-07-reference-golden-welcome-bell.png"
  }
  @{
    Source = "content/outputs/images/approved/book-1-mission-item-promo-batch-03-02-firefly-flower-charm-teaser-recovered-2026-05-05T19-29-49-208Z.png"
    Name = "day-08-reference-firefly-flower-charm.png"
  }
  @{
    Source = "content/outputs/images/approved/book-1-mission-item-promo-batch-03-03-dragon-door-key-teaser-retry-recovered-2026-05-05T19-37-48-357Z.png"
    Name = "day-09-reference-dragon-door-key.png"
  }
  @{
    Source = "content/outputs/images/approved/book-1-mission-item-promo-batch-03-04-sparkle-market-token-teaser-recovered-2026-05-05T19-29-49-208Z.png"
    Name = "day-10-reference-sparkle-market-token.png"
  }
  @{
    Source = "content/outputs/images/approved/book-1-no-blank-promo-batch-02-04-meet-ember-guide-recovered-2026-05-05T05-21-47-885Z.png"
    Name = "day-11-reference-ember-progress-note.png"
  }
  @{
    Source = "content/outputs/images/approved/book-1-no-blank-promo-batch-02-01-search-with-ember-recovered-2026-05-05T05-21-26-346Z.png"
    Name = "day-12-reference-cozy-seek-and-find-adventure.png"
  }
)

Push-Location $repoRoot
try {
  foreach ($copy in $copies) {
    $sourcePath = Resolve-Path -LiteralPath $copy.Source -ErrorAction Stop
    $destinationPath = Join-Path $destinationFolder $copy.Name

    if (Test-Path -LiteralPath $destinationPath) {
      throw "Destination already exists: $destinationPath"
    }

    Copy-Item -LiteralPath $sourcePath -Destination $destinationPath -ErrorAction Stop
    Write-Host "Copied $($copy.Source) -> $destinationPath"
  }
}
finally {
  Pop-Location
}
```

## Reminder

This procedure is a saved temporary helper only. It is not part of the automatic batch prep workflow and should not run unless the user explicitly requests the copy step.
