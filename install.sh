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
echo "✓ Slash command installed → ~/.claude/commands/sharpen.md"

# 3. PATH check
if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
  echo ""
  echo "⚠️  Add this to your ~/.zshrc then run: source ~/.zshrc"
  echo '   export PATH="$HOME/.local/bin:$PATH"'
fi

# 4. API key check
if [ -z "$ANTHROPIC_API_KEY" ]; then
  echo ""
  echo "⚠️  Add this to your ~/.zshrc:"
  echo '   export ANTHROPIC_API_KEY="your-key-here"'
fi

echo ""
echo "Done. See HOWTO.md for usage."
