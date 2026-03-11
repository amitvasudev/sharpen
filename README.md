# Sharpen

Cleans up sloppy voice-to-text and adds prompt structure before you send it to any LLM.

---

## Install (one time)

1. Open **Terminal**
2. Run these three commands:

```bash
cd ~/projects/sharpen
bash install.sh
source ~/.zshrc
```

Done. You need Node.js and an `ANTHROPIC_API_KEY` in your `~/.zshrc`.

---

## When to use sharpen vs just dictating

Superwhisper types your transcription wherever your cursor is. If your cursor is in an LLM chat box, the text goes straight there — no sharpen needed.

Use `sv` when the transcription is **rambling or complex**. Clean + structure gets noticeably better LLM output. For simple, clear asks, just dictate directly.

---

## "I dictated something with Superwhisper"

Superwhisper already put your transcription on the clipboard. Now:

**Step 1.** Open **Terminal**

**Step 2.** Type `sv` and hit Enter

```
sv
```

**Step 3.** Wait a few seconds. You'll see output confirming it worked. Your clipboard now has a clean, structured prompt.

**Step 4.** Go to **Claude web / Gemini / ChatGPT** (or any LLM)

**Step 5.** Cmd+V to paste. Send it.

That's the whole thing. Two letters in Terminal, then paste.

### Want to review before sending?

Do it in two steps instead of one:

**Step 1.** Type `sc` in **Terminal** — this only cleans the voice slop

```
sc
```

**Step 2.** Cmd+V somewhere to read what it cleaned up. Happy with it?

**Step 3.** Type `sp` in **Terminal** — this adds prompt structure

```
sp
```

**Step 4.** Go to your LLM. Cmd+V to paste. Send it.

---

## "I typed a prompt and want to make it better"

You wrote something in a text editor, notes app, whatever. You selected it and hit Cmd+C.

**Step 1.** Open **Terminal**

**Step 2.** Type `sp` and hit Enter

```
sp
```

**Step 3.** Your clipboard now has a structured version of your prompt.

**Step 4.** Go to any LLM. Cmd+V to paste. Send it.

### Don't want to copy first?

Type your prompt directly in the command:

```
sharpen --meta "write a function that parses dates from messy strings" --copy
```

Then Cmd+V to paste the result wherever.

---

## "I'm already in Claude Code"

Type your rough idea right after `/sharpen`:

```
/sharpen refactor the auth module add error handling
```

Claude sharpens it (cleans + adds structure), shows you the result, and asks you to confirm before doing anything. No Terminal needed. No clipboard. No API cost.

### Just want to clean up voice slop? (no prompt structure)

```
/sharpen-clean my rambling voice transcription here
```

Same idea, but it only fixes the transcription — no role, format, or constraints added. Like `sc` in Terminal.

### Big task? Use `/sharpen-sub`

For large tasks that would normally require a lot of back-and-forth (and blow up your context window), use `/sharpen-sub` instead:

```
/sharpen-sub add 8sleep data ingestion to the health platform, pull from their API, store in the same DB pattern as oura, filter to my side of the bed
```

It does everything `/sharpen` does, plus decomposes the research phase into parallel subagents. The output is a two-phase prompt:

- **Phase 1**: Parallel subagents gather context (read files, check state, find patterns) — chosen dynamically based on your task
- **Phase 2**: Execute the actual work with all research already loaded

All subagent findings get written to `/tmp/` scratch files so they survive context compaction. The main thread stays lean.

### It learns from your corrections

**Step 1.** You run `/sharpen` and Claude shows you the sharpened version.

**Step 2.** It's not quite right. You tell Claude what to change — e.g. "don't expand vague references, I know what I mean" or "too wordy, keep it shorter."

**Step 3.** Claude fixes it AND saves the lesson to `~/.claude/sharpen-prefs.md` — a file on your machine (never in the repo).

**Step 4.** Next time you run `/sharpen` (or `sv`/`sp`/`sc` in Terminal), that rule is applied automatically. Same mistake doesn't happen again.

You never edit the prefs file yourself. It builds up over time from your corrections.

---

## The three shortcuts

| You type | Where | What happens |
|---|---|---|
| `sv` | Terminal | Grabs clipboard, cleans voice slop, adds prompt structure, result back to clipboard |
| `sp` | Terminal | Grabs clipboard, adds prompt structure, result back to clipboard |
| `sc` | Terminal | Grabs clipboard, cleans voice slop only, result back to clipboard |
| `/sharpen` | Claude Code | Cleans + adds structure, inline |
| `/sharpen-clean` | Claude Code | Cleans only, no structure, inline |
| `/sharpen-sub` | Claude Code | Sharpens + adds subagent execution plan for big tasks |

## Reference: flags for the full `sharpen` command

You don't need these if you use `sv`/`sp`/`sc`. They're for building custom pipelines.

| Flag | What it does |
|---|---|
| `--clean` | Fix voice slop (filler words, repeated ideas, fragments) |
| `--meta` | Add prompt structure (role, format, constraints) |
| `--copy` | Put the result on your clipboard |
| `--raw` | Plain text output, no formatting (for piping) |
