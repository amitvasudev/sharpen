# Sharpen - Session Context

## Project
CLI tool + Claude Code slash command for cleaning voice-to-text output and adding prompt structure before sending to any LLM.

## Repo
- GitHub: https://github.com/amitvasudev/sharpen (private)
- Local: ~/projects/sharpen/

## Architecture
- `sharpen.js` — Node CLI, no dependencies. Calls Anthropic API (Haiku 4.5) with two modes:
  - `--clean`: strip voice filler, reconstruct coherent text
  - `--meta`: wrap in prompt structure (role, format, constraints)
  - `--copy`: result to clipboard (pbcopy)
  - `--raw`: plain text, no formatting
- `sharpen.md` — Claude Code slash command (`/sharpen`), runs inline within CC session (no API key needed)
- `install.sh` — copies CLI to ~/.local/bin/sharpen, slash command to ~/.claude/commands/sharpen.md

## Installed Locations
- CLI: ~/.local/bin/sharpen
- Slash command: ~/.claude/commands/sharpen.md
- PATH added to ~/.zshrc
- ANTHROPIC_API_KEY added to ~/.zshrc

## Current Status (2026-03-07)
- Fully installed and pushed to GitHub
- Model: claude-haiku-4-5-20251001 (switched from Sonnet for cost)
- README with workflow docs is live
- Not yet tested end-to-end (need to run `source ~/.zshrc` first)

## Files
- sharpen.js — main CLI script
- sharpen.md — CC slash command
- install.sh — installer
- HOWTO.md — original usage docs (kept for reference, README is the primary doc now)
- README.md — GitHub-facing docs with workflows
