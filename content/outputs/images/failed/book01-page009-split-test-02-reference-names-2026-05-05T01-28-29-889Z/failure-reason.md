# Failure Reason

Timed out waiting for ChatGPT image generation to complete.

User-observed behavior: ChatGPT displayed `Thinking`, then wrote that it needed to make a vertical children's seek-and-find image and use `Ember-001`, `Ember-002`, and `Ember-003` as visual references. It then said no user-uploaded images were provided in this turn and that it would proceed with the developer's referenced images for this call.

Diagnosis: plain reference-name wording was not specific enough for the ChatGPT project. It made the model reason about whether images were uploaded in the current turn instead of immediately using the already-saved project Sources.
