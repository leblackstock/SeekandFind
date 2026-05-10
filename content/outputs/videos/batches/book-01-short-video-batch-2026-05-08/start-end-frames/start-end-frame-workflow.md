# Start/End Frame Workflow

This is a standalone prep lane for motion-only video generation from approved no-text video-source images.

Hard rule: if a generated approved text-less still exists, that still is the start frame. The tool copies/stages that still as-is; do not regenerate a start frame unless the approved still needs an explicit repair.

Fallback rule: if no generated approved text-less still exists, create both a start frame and end frame from the saved prompts. The start frame must be approved before using it as the anchor for the end frame.

## Command

```powershell
npm run social:start-end-frames -- --day 03
npm run social:start-end-frames -- --from-day 03 --to-day 12
```

Use `--dry-run` to preview, and `--force` to overwrite an existing prep package.

## Copy Unapproved Frames For Review

Use this whenever you need review copies of only the still-unapproved days. It creates or refreshes one folder under Downloads, copies each selected day’s start frame and pending-review end frame directly into that folder, and never moves or edits the originals.

```powershell
npm run social:copy-unapproved-frames
```

The copy folder is `C:\Users\outdo\Downloads\ember-unapproved-start-end-frames`. It also includes `README.md` and `copy-manifest.json`. Days with already-approved end frames are skipped automatically.

To copy only the approved start/end-frame pairs into Downloads for video upload:

```powershell
npm run social:copy-approved-frames
```

The approved copy folder is `C:\Users\outdo\Downloads\ember-approved-start-end-frames`. It includes `README.md` and `copy-manifest.json`; days without an approved end frame are skipped.

## Motion Object Rule

For each approved start/end-frame still, record the chosen motion object for the later video render. The chosen motion object must be one separate scene object, not Ember, not Ember's body parts, and not anything Ember is holding, wearing, carrying, touching, or otherwise attached to, such as his scarf, satchel, horns, paws, tail, or held lantern. Ember and anything he is holding, wearing, carrying, touching, or otherwise attached to should move visibly between the start frame and end frame. Ember-held, Ember-worn, Ember-carried, and Ember-attached items do not count as the chosen scene-object motion.

## Output

For each day, the tool:

- stages the approved video-source image as the start frame when one exists
- writes a start-frame prompt for reference/repair, or for creation when no approved still exists
- writes an end-frame prompt for a matched final keyframe
- writes a keyframe image-to-video prompt
- writes a review checklist

## Boundary

The tool does not submit image generation, video generation, social posting, or queue status updates. End-frame generation and video export remain separate reviewable steps.
