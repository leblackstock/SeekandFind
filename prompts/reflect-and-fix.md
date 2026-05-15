# /reflect-and-fix

Review the current task execution.

Find:
1. What failed, broke, or became inefficient
2. Why it happened
3. Whether the result is now correct
4. What exact rule would prevent this next time

Then:
- Fix the issue if safe.
- Run the smallest relevant verification.
- Add a concise lesson to `LESSONS_LEARNED.md` only if reusable.
- Do not add generic advice.
- Do not rewrite broad project rules unless the lesson affects future work broadly.
