---
description: Sharpens a rough voice-to-text or loose prompt into a precise, actionable instruction for Claude. Takes $ARGUMENTS as the raw prompt. If no arguments given, operates on the most recent message.
---

## Preferences

Before sharpening, read `~/.claude/sharpen-prefs.md` if it exists. Each line is a learned rule about how this user wants prompts sharpened. Apply every rule. If the file doesn't exist or is empty, proceed without preferences.

## Input

The raw prompt is: $ARGUMENTS

## Rules

1. **Classify intent type first** - Before rewriting anything, determine what the user is doing. Tag the output with one of:
   - `[TASK]` — User wants something built, executed, or done
   - `[QUESTION]` — User is asking for input, advice, or opinions ("what do you think?", "how should we...?")
   - `[APPROVAL]` — User is signing off on a prior plan, possibly with caveats or additions
   - `[DISCUSSION]` — User is thinking aloud, exploring options, wants collaborative back-and-forth before committing to action
   The sharpened output MUST match this intent type. A question stays a question. A "what do you think?" does NOT become "Build X." An approval does NOT become a new task — it becomes confirmation with any added constraints highlighted.
2. **Preserve intent** - Never change what the person is asking for, only how it's expressed
3. **Add specificity** - Replace vague words ("thing", "stuff", "it", "that") with specific references
4. **Add context cues** - Infer and make explicit: what files/code are relevant, what format the output should be, what success looks like
5. **Strip filler** - Remove verbal tics from voice transcription ("um", "like", "kind of", "sort of", "you know", "basically")
6. **Structured when complex** - If the task has multiple steps, break them into a numbered list
7. **Short when simple** - If it's a single task, keep it to 1-3 clean sentences
8. **Preserve technical terms** - Never paraphrase code, variable names, library names, or proper nouns
9. **Don't add fluff** - No "Please", "Could you", "I'd like you to" — but only for TASK intents. Questions and discussions should retain their natural form.

## Output format

First output the sharpened prompt in a code block (so it's easy to copy).

Then, on a new line, output a one-line note explaining the **key clarification** you made (the most important change). Keep this to one sentence starting with "Note:".

Then ask: "Does this look right, or should I adjust anything?" — wait for a yes/no/edit before proceeding to execute the task.

## Learning from corrections

If the user edits or corrects your sharpened prompt, extract the lesson as a concise rule and append it to `~/.claude/sharpen-prefs.md`. Format: one line per rule, starting with "- ". Example:

- Don't expand vague references when context is obvious from the conversation
- Prefer "Build X" over "Design and implement X"

Do NOT duplicate rules that already exist in the file. Only add genuinely new lessons.

## Examples

### Task intent
Raw: "um so like i want to refactor that authentication thing we were talking about, make it cleaner you know, maybe add some error handling or whatever"

Sharpened:
```
[TASK] Refactor the authentication module. Improve code clarity (extract functions, reduce nesting), add proper error handling with specific error types for auth failures, and ensure all edge cases (expired token, invalid credentials, missing headers) return informative errors.
```

Note: Classified as TASK (clear "I want to" directive). Inferred "authentication module" and expanded error handling to cover likely auth failure cases.

### Question intent
Raw: "um so like I don't know if we should use Postgres or SQLite for this, like what do you think? I'm not sure if the extra complexity is worth it for what we're doing"

Sharpened:
```
[QUESTION] Should we use Postgres or SQLite for this project? I'm not sure the added complexity of Postgres is justified for our use case. What's your recommendation?
```

Note: Classified as QUESTION (user is asking for advice, not commanding a choice). Preserved the uncertainty — this is a genuine "help me decide," not a "go do this."

### Approval intent
Raw: "yeah that looks good, the one thing is like if we make this public we need to make sure the user's local files don't get committed, you know what I mean"

Sharpened:
```
[APPROVAL] Looks good, proceed. One constraint: if the repo goes public, ensure user-local files (prefs, logs) are gitignored and never committed.
```

Note: Classified as APPROVAL (user is green-lighting a plan with a caveat, not requesting a new task).

Does this look right, or should I adjust anything?
