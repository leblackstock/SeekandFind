# Social API + n8n Feasibility - Book 1 Posting

Research date: 2026-05-11
User framing: answer whether, as of 2026-05-10, the currently used Book 1 social posting surfaces can be posted through official APIs using n8n.

## Short Answer

Yes, but not as one simple "post everywhere" button yet.

The practical split is:

- **Most feasible now:** YouTube Shorts upload through n8n's YouTube node; Pinterest still Pins and Pinterest Video Pins through Pinterest API v5 using n8n HTTP Request; Facebook Page posts through n8n's Facebook Graph API node.
- **Feasible but setup-heavy:** Instagram feed/Reels and Facebook Reels through Meta APIs, because account type, app permissions, app mode/review, and media URL/upload requirements matter.
- **Feasible but strict/audit-heavy:** TikTok direct posting through TikTok Content Posting API. Unreviewed clients are restricted, and TikTok requires creator consent/creator-info flow.
- **Likely manual or separate decision:** Instagram Story reshare behavior from the current "Instagram feed post plus story reshare" queue item may not map cleanly to the same simple feed/Reel API path. Treat the feed post as automatable first; verify Stories/reshare separately.

## Platform Table

| Surface we use | Official API possible? | n8n route | Main catch |
| --- | --- | --- | --- |
| Pinterest still Pins | Yes | HTTP Request node to Pinterest API v5 `Create Pin` | Need Pinterest developer app/access token, board IDs, and spam/safety compliance. |
| Pinterest Video Pins | Yes | HTTP Request node: register video, upload to Pinterest media upload URL, poll media status, create Pin | Multi-step upload; needs video plus cover image URL. |
| Instagram feed image/video | Yes, for professional accounts | Facebook Graph API / HTTP Request node | Needs Instagram professional account linked to Facebook Page, Meta app permissions, and usually public HTTPS media URLs. |
| Instagram Reels | Yes, for professional accounts | Facebook Graph API / HTTP Request node | Same Meta requirements; video publishing path is more fragile than still feed posts. |
| Instagram Story reshare | Unclear for our exact "reshare" workflow | Research separately | Do not assume the manual story reshare step is covered by the feed/Reel publishing path. |
| Facebook Page still posts | Yes | n8n Facebook Graph API node | Page posting only, not personal profile posting; needs Page access token/permissions. |
| Facebook Reels | Likely yes, but setup-heavy | n8n Facebook Graph API node with video host/API path | Needs current Meta Page/Reels publishing docs verification, Page token, and app permissions/review. |
| YouTube Shorts | Yes | n8n YouTube node supports video upload | Shorts are uploaded as videos; unverified API projects may force uploads private until audit. |
| TikTok video | Yes, through Content Posting API Direct Post | HTTP Request node, possibly Code/HTTP for chunk upload | Needs app, OAuth scope, creator-info/consent flow, audit for public posting, rate limits, and possibly hosted media or chunk upload. |

## n8n Practicality

n8n is practical as the orchestrator, not as magic platform access.

Recommended shape:

1. Local queue reader returns a task or chunk from `content/social/campaigns/book-01/queue.json`.
2. n8n receives the task/chunk through a local webhook.
3. n8n prepares platform payloads and validation checks.
4. For dry run, n8n writes a draft receipt/evidence plan only.
5. For live run later, n8n calls official platform APIs only after credentials, permissions, and review gates are settled.
6. Local repo receives the platform result and writes receipt JSON/evidence path updates.

## What To Build First

Build a **read-only Day 4-5 chunk dry-run** before any live API publishing.

It should output:

- task id
- platform
- caption
- required hashtags
- media file path
- required media upload form: local binary vs public HTTPS URL
- destination account/board/page placeholder
- intended receipt path
- intended evidence path
- API feasibility bucket: `ready`, `needs credential`, `needs public media URL`, `needs app review`, or `manual`

This gives API research a target and prevents wasting time on abstract platform reading.

## Source Notes

- Pinterest API v5 supports creating image and video Pins. Video Pins require registering media, uploading to Pinterest's provided upload URL, checking media upload status, then creating a Pin with the `media_id`.
- Pinterest Sandbox supports creating Pins/boards for testing without production data.
- n8n's HTTP Request node can call arbitrary REST APIs and send JSON, form-data, binary files, and OAuth/header credentials.
- n8n has a YouTube node with a `Video: Upload a video` operation.
- n8n has a Facebook Graph API node with GET/POST/DELETE operations and a video host option for `graph-video.facebook.com`.
- YouTube Data API supports video upload through `videos.insert`; unverified projects created after 2020-07-28 have uploads restricted to private until audit.
- TikTok Content Posting API supports Direct Post video initialization, file upload or pull-from-URL media transfer, status checks, and returns a `publish_id`; unaudited clients are restricted and public posting requires audit.
- Meta developer docs were rate-limited during this research pass, so Meta Instagram/Facebook conclusions should be verified directly inside Meta's current docs before building live publishing. Existing official Meta doc URLs to verify: Instagram Platform Content Publishing, Pages API Posts, and Video/Reels Publishing.

## Sources

- Pinterest create boards and Pins: https://developers.pinterest.com/docs/work-with-organic-content-and-users/create-boards-and-pins/
- Pinterest Sandbox: https://developers.pinterest.com/docs/developer-tools/sandbox/
- Pinterest API access tiers: https://developers.pinterest.com/docs/key-concepts/access-tiers/
- n8n HTTP Request node: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/
- n8n integrations overview: https://docs.n8n.io/integrations/
- n8n YouTube node: https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.youtube/
- n8n Facebook Graph API node: https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.facebookgraphapi/
- YouTube Data API videos resource: https://developers.google.com/youtube/v3/docs/videos
- YouTube upload guide: https://developers.google.com/youtube/v3/guides/uploading_a_video
- TikTok Direct Post API: https://developers.tiktok.com/doc/content-posting-api-reference-direct-post
- TikTok media transfer guide: https://developers.tiktok.com/doc/content-posting-api-media-transfer-guide
- TikTok video status API: https://developers.tiktok.com/doc/content-posting-api-reference-get-video-status
- Meta Instagram content publishing docs to verify after rate-limit clears: https://developers.facebook.com/docs/instagram-platform/content-publishing/
- Meta Pages API posts docs to verify after rate-limit clears: https://developers.facebook.com/docs/pages-api/posts/
- Meta Reels publishing docs to verify after rate-limit clears: https://developers.facebook.com/docs/video-api/guides/reels-publishing/
