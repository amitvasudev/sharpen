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

# 3. Shell aliases
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

# 4. PATH check
if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
  echo ""
  echo "⚠️  Add this to your ~/.zshrc then run: source ~/.zshrc"
  echo '   export PATH="$HOME/.local/bin:$PATH"'
fi

# 5. API key check
if [ -z "$ANTHROPIC_API_KEY" ]; then
  echo ""
  echo "⚠️  Add this to your ~/.zshrc:"
  echo '   export ANTHROPIC_API_KEY="your-key-here"'
fi

echo ""
echo "Done. Run: source ~/.zshrc"
echo ""
echo "Shortcuts:  sv (voice→full)  sp (prompt→structure)  sc (clean only)"
