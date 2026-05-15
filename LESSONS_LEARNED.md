# Lessons Learned

Purpose: Record concise, reusable lessons from real mistakes or inefficient workflows in this workspace.

Only add a lesson when all are true:
- A real failure, mistake, confusion, or inefficiency occurred.
- The cause is understood well enough to prevent it.
- The lesson is likely to apply again.
- The lesson can be written as a specific future rule.

Do not add vague lessons such as:
- "Be careful"
- "Check your work"
- "Do better"
- "Avoid mistakes"

## Entry Template

### YYYY-MM-DD — Short specific title
- Context:
- Mistake:
- Cause:
- Fix:
- Future rule:
- Trigger:

### 2026-05-15 — Quote Git upstream ranges in PowerShell
- Context: Running the commit/sync verification command `git rev-list --left-right --count @{u}...HEAD` from PowerShell.
- Mistake: The command failed before Git ran because PowerShell parsed `@{u}` as a hash literal.
- Cause: Unquoted Git upstream shorthand conflicts with PowerShell syntax.
- Fix: Rerun the command as `git rev-list --left-right --count "@{u}...HEAD"`.
- Future rule: In PowerShell, quote Git revision ranges that contain `@{u}`.
- Trigger: Any git command in PowerShell that references upstream shorthand such as `@{u}`.
