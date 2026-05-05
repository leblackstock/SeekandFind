# Failure Reason

Timed out waiting for ChatGPT image generation to complete.

User-observed behavior: ChatGPT did not stay in direct image generation. It displayed `Thinking`, then wrote planning/tool-routing text about creating the Lantern Maker's Workshop scene, checking for the existence of a path, and listing whether the path was available.

Diagnosis: Test 1 used the raw minimal split-test prompt, so this failure happened before Ember reference names, the 50-object rule, scene zones, or the full avoid/format block were introduced. The likely blocker is project-level file/path/source behavior inside the ChatGPT project, not the prompt sections being tested.
