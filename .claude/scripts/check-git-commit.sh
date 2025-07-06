#!/bin/bash
# Block git commits without explicit permission and clean commit messages

TOOL_INPUT="$1"

# Extract command from tool input
COMMAND=$(echo "$TOOL_INPUT" | jq -r '.command // empty' 2>/dev/null)

if [ -z "$COMMAND" ]; then
    exit 0  # No command to check
fi

# Check for git commit commands
if [[ "$COMMAND" =~ git[[:space:]]+commit ]] || \
   [[ "$COMMAND" =~ git[[:space:]]+push ]] || \
   [[ "$COMMAND" =~ git[[:space:]]+add.*\&\&.*git[[:space:]]+commit ]]; then
    
    # Check if commit message contains Claude references
    if [[ "$COMMAND" =~ "🤖 Generated with [Claude Code]" ]] || \
       [[ "$COMMAND" =~ "Co-Authored-By: Claude" ]] || \
       [[ "$COMMAND" =~ "claude.ai/code" ]] || \
       [[ "$COMMAND" =~ "noreply@anthropic.com" ]]; then
        
        echo "🚫 BLOCKED: Commit message contains Claude references"
        echo ""
        echo "📝 IMPORTANT: Remove these lines from commit message:"
        echo "   - 🤖 Generated with [Claude Code](https://claude.ai/code)"
        echo "   - Co-Authored-By: Claude <noreply@anthropic.com>"
        echo ""
        echo "✅ Create commit without Claude attribution"
        exit 1
    fi
    
    echo "🚫 BLOCKED: Git operations require explicit user permission"
    echo ""
    echo "📝 Before committing:"
    echo "   1. Ensure all tests pass"
    echo "   2. User has verified the fix works"
    echo "   3. Ask: 'Should I commit these changes?'"
    echo "   4. Wait for explicit 'yes' response"
    echo ""
    echo "❌ Command blocked: $COMMAND"
    exit 1
fi

# Check for indirect commit patterns
if [[ "$COMMAND" =~ npm[[:space:]]+run[[:space:]]+commit ]] || \
   [[ "$COMMAND" =~ yarn[[:space:]]+commit ]]; then
    echo "🚫 BLOCKED: Indirect git commit detected"
    echo "Ask user permission before running: $COMMAND"
    exit 1
fi

exit 0