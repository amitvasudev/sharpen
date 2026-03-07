---
description: Sharpens a rough voice-to-text or loose prompt into a precise, actionable instruction for Claude. Takes $ARGUMENTS as the raw prompt. If no arguments given, operates on the most recent message.
---

## Preferences

Before sharpening, read `~/.claude/sharpen-prefs.md` if it exists. Each line is a learned rule about how this user wants prompts sharpened. Apply every rule. If the file doesn't exist or is empty, proceed without preferences.

## Input

The raw prompt is: $ARGUMENTS

## Rules

1. **Preserve intent** - Never change what the person is asking for, only how it's expressed
2. **Add specificity** - Replace vague words ("thing", "stuff", "it", "that") with specific references
3. **Add context cues** - Infer and make explicit: what files/code are relevant, what format the output should be, what success looks like
4. **Strip filler** - Remove verbal tics from voice transcription ("um", "like", "kind of", "sort of", "you know", "basically")
5. **Structured when complex** - If the task has multiple steps, break them into a numbered list
6. **Short when simple** - If it's a single task, keep it to 1-3 clean sentences
7. **Preserve technical terms** - Never paraphrase code, variable names, library names, or proper nouns
8. **Don't add fluff** - No "Please", "Could you", "I'd like you to". Direct imperative only.

## Output format

First output the sharpened prompt in a code block (so it's easy to copy).

Then, on a new line, output a one-line note explaining the **key clarification** you made (the most important change). Keep this to one sentence starting with "Note:".

Then ask: "Does this look right, or should I adjust anything?" — wait for a yes/no/edit before proceeding to execute the task.

## Learning from corrections

If the user edits or corrects your sharpened prompt, extract the lesson as a concise rule and append it to `~/.claude/sharpen-prefs.md`. Format: one line per rule, starting with "- ". Example:

- Don't expand vague references when context is obvious from the conversation
- Prefer "Build X" over "Design and implement X"

Do NOT duplicate rules that already exist in the file. Only add genuinely new lessons.

## Example

Raw: "um so like i want to refactor that authentication thing we were talking about, make it cleaner you know, maybe add some error handling or whatever"

Sharpened:
```
Refactor the authentication module. Improve code clarity (extract functions, reduce nesting), add proper error handling with specific error types for auth failures, and ensure all edge cases (expired token, invalid credentials, missing headers) return informative errors.
```

Note: Inferred "authentication module" as the target and expanded "error handling" to cover the three most likely auth failure cases.

Does this look right, or should I adjust anything?
