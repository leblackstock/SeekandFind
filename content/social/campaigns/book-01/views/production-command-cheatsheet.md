# Book 1 Production Command Cheatsheet

Use these commands first. They print compact JSON and keep full evidence in files.

## Status

```powershell
npm run social:status-compact -- day-06
npm run social:status-compact -- day-06 --verbose
```

## YouTube Shorts

No-publish check:

```powershell
npm run social:youtube-dry-run-quiet
```

Publish-enabled run:

```powershell
npm run social:youtube-publish
```

Add `--verbose` to either command only when debugging.

## Pinterest And Meta

```powershell
npm run social:pinterest-publish-quiet
npm run social:meta-still-publish-quiet
```

These are live-lane entry points. Use only with the correct logged-in browser session and intentional publish boundary.

## Short Video Bundle Closeout

Dry-run URL completeness check:

```powershell
npm run social:post-day -- day-06 --close-short-video --youtube <YOUTUBE_SHORTS_URL> --tiktok <TIKTOK_URL> --instagram <INSTAGRAM_REEL_URL> --facebook <FACEBOOK_REEL_URL> --pinterest <PINTEREST_VIDEO_PIN_URL> --dry-run
```

Real closeout after all five URLs are live:

```powershell
npm run social:post-day -- day-06 --close-short-video --youtube <YOUTUBE_SHORTS_URL> --tiktok <TIKTOK_URL> --instagram <INSTAGRAM_REEL_URL> --facebook <FACEBOOK_REEL_URL> --pinterest <PINTEREST_VIDEO_PIN_URL>
```

Production closeout rejects placeholder, example, local, or wrong-platform URLs. Use `--dry-run` for fake URL smoke tests only.
