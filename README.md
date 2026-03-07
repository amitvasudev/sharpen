# Sharpen

Turn sloppy voice-to-text or loose prompts into precise, structured instructions. Two modes, three workflows.

## Quick start

```bash
# Voice transcription (Superwhisper) -> clipboard -> any LLM
pbpaste | sharpen --clean | sharpen --meta --copy
# Paste into Claude web, Gemini, ChatGPT, whatever.

# Already typed something coherent, just want prompt structure
pbpaste | sharpen --meta --copy

# Inside Claude Code (slash command)
/sharpen refactor the auth module add error handling
```

## Install

```bash
bash install.sh
```

This puts the CLI at `~/.local/bin/sharpen` and the Claude Code slash command at `~/.claude/commands/sharpen.md`.

Requirements:
- Node.js
- `ANTHROPIC_API_KEY` in your environment
- `~/.local/bin` in your `PATH`

## The two modes

### `--clean` — Fix voice slop

Strips filler words ("um", "like", "you know"), merges repeated ideas, reconstructs into coherent sentences. Nothing added that wasn't in the original.

### `--meta` — Add prompt structure

Takes coherent text and wraps it in a proper prompt: adds a role, output format instructions, and constraints. The metaprompt layer that gets better results from any LLM.

## Workflows

### 1. Superwhisper -> any LLM

Superwhisper puts transcription on the clipboard. From there:

**Step by step (until you trust it):**
```bash
pbpaste | sharpen --clean --copy
# Review. If it looks right:
pbpaste | sharpen --meta --copy
# Paste into any LLM.
```

**Full pipeline (when you trust it):**
```bash
pbpaste | sharpen --clean | sharpen --meta --copy
# Paste into any LLM.
```

### 2. Typed prompt -> any LLM

You typed something coherent but want the metaprompt structure:
```bash
pbpaste | sharpen --meta --copy

# Or pass it inline:
sharpen --meta "write a function that parses dates from messy strings" --copy
```

### 3. Inside Claude Code

For complex tasks mid-session, use the slash command:
```
/sharpen refactor the auth module add error handling
```
Claude outputs the sharpened version, explains the key change, and asks you to confirm before executing.

## Flags

| Flag | What it does |
|---|---|
| `--clean` | Strip voice filler, reconstruct into coherent text |
| `--meta` | Add role, output format, and constraints (metaprompt) |
| `--copy` | Copy result to clipboard (macOS) |
| `--raw` | Plain text output, no formatting (for piping) |

## Quick reference

| Command | What it does |
|---|---|
| `pbpaste \| sharpen --clean --copy` | Clean voice slop, result to clipboard |
| `pbpaste \| sharpen --meta --copy` | Add prompt structure, result to clipboard |
| `pbpaste \| sharpen --clean \| sharpen --meta --copy` | Both steps, result to clipboard |
| `sharpen --clean "text"` | Clean inline text |
| `sharpen --meta "text"` | Add structure to inline text |
| `/sharpen rough idea` | In Claude Code: sharpen before executing |
