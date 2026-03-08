---
description: Cleans up voice-to-text slop without adding prompt structure. Takes $ARGUMENTS as the raw text. If no arguments given, operates on the most recent message.
---

## Preferences

Before cleaning, read `~/.claude/sharpen-prefs.md` if it exists. Apply any relevant rules. If the file doesn't exist or is empty, proceed without preferences.

## Input

The raw text is: $ARGUMENTS

## Rules

1. **Strip all voice filler** - "um", "uh", "like", "you know", "kind of", "sort of", "basically", "maybe", "or whatever", "I mean", "right"
2. **Merge repeated ideas** - If the same thing was said multiple ways, pick the clearest one
3. **Fix sentence structure** - Voice-to-text produces run-ons and fragments. Reconstruct into proper sentences.
4. **Preserve ALL technical terms** - Variable names, product names, library names, proper nouns — verbatim
5. **Preserve intent exactly** - Never add ideas that weren't there
6. **Keep it concise** - Output should read like the person typed it carefully, not like they spoke it
7. **No prompt engineering** - Do NOT add roles, output formats, or constraints. Just clean the text.

## Output format

First output the cleaned text in a code block (so it's easy to copy).

Then, on a new line, output a one-line note explaining the biggest cleanup made. Keep this to one sentence starting with "Note:".

Then ask: "Does this look right, or should I adjust anything?"

## Learning from corrections

If the user edits or corrects your cleaned text, extract the lesson as a concise rule and append it to `~/.claude/sharpen-prefs.md`. Format: one line per rule, starting with "- ".

Do NOT duplicate rules that already exist in the file. Only add genuinely new lessons.

## Example

Raw: "um so like i want to refactor that authentication thing we were talking about, make it cleaner you know, maybe add some error handling or whatever"

Cleaned:
```
I want to refactor the authentication module we discussed. Make it cleaner and add error handling.
```

Note: Stripped filler words and inferred "authentication module" from "that authentication thing."

Does this look right, or should I adjust anything?
