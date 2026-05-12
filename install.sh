#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Installing prompt sharpener..."

# 1. CLI tool
mkdir -p "$HOME/.local/bin"
cp "$SCRIPT_DIR/sharpen.js" "$HOME/.local/bin/sharpen"
chmod +x "$HOME/.local/bin/sharpen"
echo "✓ CLI installed → ~/.local/bin/sharpen"

# 2. Claude Code slash command
mkdir -p "$HOME/.claude/commands"
cp "$SCRIPT_DIR/sharpen.md" "$HOME/.claude/commands/sharpen.md"
cp "$SCRIPT_DIR/sharpen-clean.md" "$HOME/.claude/commands/sharpen-clean.md"
cp "$SCRIPT_DIR/sharpen-sub.md" "$HOME/.claude/commands/sharpen-sub.md"
echo "✓ Slash commands installed → ~/.claude/commands/sharpen.md, sharpen-clean.md, sharpen-sub.md"

# 3. Preferences file (user-local, never in repo)
PREFS="$HOME/.claude/sharpen-prefs.md"
if [ ! -f "$PREFS" ]; then
  touch "$PREFS"
  echo "✓ Preferences file created → ~/.claude/sharpen-prefs.md"
else
  echo "✓ Preferences file already exists"
fi

# 4. Shell aliases
ALIASES='
alias sv='"'"'pbpaste | sharpen --clean | sharpen --meta --copy'"'"'  # voice → full pipeline
alias sp='"'"'pbpaste | sharpen --meta --copy'"'"'                    # prompt → add structure
alias sc='"'"'pbpaste | sharpen --clean --copy'"'"'                   # clean only (review step)'

if ! grep -q "alias sv=" "$HOME/.zshrc" 2>/dev/null; then
  echo "$ALIASES" >> "$HOME/.zshrc"
  echo "✓ Aliases added to ~/.zshrc (sv, sp, sc)"
else
  echo "✓ Aliases already in ~/.zshrc"
fi

# 5. PATH check
if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
  echo ""
  echo "⚠️  Add this to your ~/.zshrc then run: source ~/.zshrc"
  echo '   export PATH="$HOME/.local/bin:$PATH"'
fi

# 6. Ollama check (local-first model)
echo ""
echo "Checking local model runtime (Ollama)..."
if ! command -v ollama >/dev/null 2>&1; then
  echo "⚠️  Ollama not installed. Sharpen will use cloud (Haiku) fallback by default."
  echo "   To run locally (free, private, fast):"
  echo "     brew install ollama"
  echo "     brew services start ollama"
  echo "     ollama pull qwen3:8b"
else
  echo "✓ Ollama installed: $(ollama --version 2>&1 | head -1)"
  # Check server reachable
  if curl -s --max-time 2 http://localhost:11434/api/tags >/dev/null 2>&1; then
    echo "✓ Ollama server running on localhost:11434"
    # Check if qwen3:8b is pulled
    if curl -s http://localhost:11434/api/tags | grep -q '"qwen3:8b"'; then
      echo "✓ qwen3:8b model present"
    else
      echo "⚠️  qwen3:8b not pulled yet. Run: ollama pull qwen3:8b  (~5GB)"
    fi
  else
    echo "⚠️  Ollama installed but server not running. Run: brew services start ollama"
  fi
fi

# 7. API key check (for cloud fallback)
echo ""
if [ -z "$ANTHROPIC_API_KEY" ]; then
  echo "⚠️  ANTHROPIC_API_KEY not set — cloud fallback (Haiku) won't work."
  echo "   Add this to your ~/.zshrc:"
  echo '   export ANTHROPIC_API_KEY="your-key-here"'
else
  echo "✓ ANTHROPIC_API_KEY set (cloud fallback available)"
fi

echo ""
echo "Done. Run: source ~/.zshrc"
echo ""
echo "Shortcuts:  sv (voice→full)  sp (prompt→structure)  sc (clean only)"
echo "Models:     sharpen --list-models"
echo "Override:   sharpen --clean --model haiku \"text\"  (or set SHARPEN_MODEL env var)"
