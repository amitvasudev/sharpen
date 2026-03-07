# Prompt Sharpener — How to Use

Two problems this solves:

- **Superwhisper output is sloppy** — rambling transcription needs to become coherent text
- **Prompts lack structure** — even clean text benefits from a role, output format, and constraints before sending to any LLM

---

## Setup (one time)

```bash
# 1. Copy the script to your local bin
cp sharpen-v2.js ~/.local/bin/sharpen
chmod +x ~/.local/bin/sharpen

# 2. Make sure ~/.local/bin is in your PATH (add to ~/.zshrc if not)
export PATH="$HOME/.local/bin:$PATH"

# 3. Make sure your Anthropic API key is set (add to ~/.zshrc)
export ANTHROPIC_API_KEY="your-key-here"

# 4. Install the /sharpen slash command for Claude Code
mkdir -p ~/.claude/commands
cp sharpen.md ~/.claude/commands/sharpen.md
```

---

## The two modes

### `--clean` — Fix voice slop

Strips filler words, merges repeated ideas, reconstructs into coherent sentences. Nothing added that wasn't in the original.

### `--meta` — Add prompt structure

Takes coherent text and wraps it in a proper prompt: adds a role, output format instructions, and constraints. This is the metaprompt layer that gets better results from any LLM.

---

## Workflows

### Superwhisper into any LLM (Claude web, Gemini, ChatGPT, etc.)

Superwhisper puts your transcription on the clipboard automatically. From there:

**Step by step (recommended until you trust it):**
```bash
pbpaste | sharpen --clean --copy
# Read it. If it looks right:
pbpaste | sharpen --meta --copy
# Now paste into Claude web, Gemini, wherever.
```

**Full pipeline (when you trust it):**
```bash
pbpaste | sharpen --clean | sharpen --meta --copy
# Paste result into any LLM.
```

### Typed prompt into any LLM

You've typed something coherent but want the metaprompt structure:
```bash
pbpaste | sharpen --meta --copy
# Paste into Claude web, Gemini, wherever.
```

Or pass it directly:
```bash
sharpen --meta "write a function that parses dates from messy strings" --copy
```

### Inside Claude Code

For complex tasks mid-session, use the slash command instead of the CLI:
```
/sharpen refactor the auth module add error handling
```
Claude will output the sharpened version, explain the key change, and ask you to confirm before executing.

---

## Quick reference

| Command | What it does |
|---|---|
| `pbpaste \| sharpen --clean --copy` | Clean Superwhisper slop, result to clipboard |
| `pbpaste \| sharpen --meta --copy` | Add prompt structure, result to clipboard |
| `pbpaste \| sharpen --clean \| sharpen --meta --copy` | Both steps, result to clipboard |
| `sharpen --clean "text"` | Clean inline text |
| `sharpen --meta "text"` | Add structure to inline text |
| `/sharpen rough idea` | In Claude Code: sharpen before executing |

Add `--raw` to any CLI command to get plain text output with no formatting (useful if you're piping into something else).

---

## Key point on web LLMs

The CLI works for all of them. Sharpen on the command line, paste the result wherever. Claude web, Gemini, ChatGPT — it doesn't matter. The output is just text on your clipboard.
