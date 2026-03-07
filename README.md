# Sharpen

Cleans up sloppy voice-to-text and adds prompt structure before you send it to any LLM.

## Install

Open **Terminal** and run:

```bash
cd ~/projects/sharpen
bash install.sh
source ~/.zshrc
```

That's it. You now have a `sharpen` command in Terminal and a `/sharpen` slash command in Claude Code.

Requirements: Node.js and `ANTHROPIC_API_KEY` in your `~/.zshrc`.

---

## Usage A: Voice-to-text (Superwhisper) into any LLM

You dictated something with Superwhisper. It's on your clipboard now. You want to clean it up and send it to Claude web / Gemini / ChatGPT / whatever.

### In Terminal, type:

```bash
pbpaste | sharpen --clean | sharpen --meta --copy
```

What just happened:
1. `pbpaste` — grabs your Superwhisper transcription from the clipboard
2. `sharpen --clean` — strips the "um"s, "like"s, and repeated ideas
3. `sharpen --meta` — wraps it in a proper prompt with role, format, and constraints
4. `--copy` — puts the final result back on your clipboard

### In your browser (Claude web, Gemini, ChatGPT, etc.):

Cmd+V to paste. Send it. Done.

### Want to review between steps?

```bash
# Step 1: clean the voice slop, result goes to clipboard
pbpaste | sharpen --clean --copy

# Read what's on your clipboard. Happy with it? Step 2:
pbpaste | sharpen --meta --copy

# Now paste into your LLM of choice.
```

---

## Usage B: You typed a prompt, want to make it better

You typed something in a text editor or chat box. You copied it to your clipboard (Cmd+C).

### In Terminal, type:

```bash
pbpaste | sharpen --meta --copy
```

No `--clean` needed — your text isn't voice slop, it just needs structure.

### Then paste (Cmd+V) into any LLM.

### Or skip the clipboard entirely:

```bash
sharpen --meta "write a function that parses dates from messy strings" --copy
```

You type the prompt right there in the Terminal command. Result goes to clipboard. Paste it wherever.

---

## Usage C: Inside Claude Code

You're in a Claude Code session and want to sharpen a rough idea before Claude executes it.

### In Claude Code, type:

```
/sharpen refactor the auth module add error handling
```

You type your rough idea right after `/sharpen`. Claude sharpens it, shows you the result, and asks for confirmation before doing anything.

No clipboard, no Terminal — this all happens inside Claude Code. No API key cost either (it uses the Claude Code session).

---

## Flags

| Flag | What it does |
|---|---|
| `--clean` | Fix voice slop (filler words, repeated ideas, fragments) |
| `--meta` | Add prompt structure (role, format, constraints) |
| `--copy` | Put the result on your clipboard |
| `--raw` | Plain text output, no formatting (for piping into other tools) |

## Cheat sheet

| You have... | In Terminal, run... | Then... |
|---|---|---|
| Superwhisper transcription on clipboard | `pbpaste \| sharpen --clean \| sharpen --meta --copy` | Paste into any LLM |
| Superwhisper, want to review first | `pbpaste \| sharpen --clean --copy` then `pbpaste \| sharpen --meta --copy` | Paste into any LLM |
| A typed prompt on clipboard | `pbpaste \| sharpen --meta --copy` | Paste into any LLM |
| A typed prompt, no clipboard | `sharpen --meta "your prompt here" --copy` | Paste into any LLM |
| A rough idea in Claude Code | `/sharpen your rough idea here` | Claude handles it |
