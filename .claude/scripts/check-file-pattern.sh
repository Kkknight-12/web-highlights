#!/bin/bash
# Check for file versioning patterns that should be blocked

TOOL_INPUT="$1"

# Extract file path from tool input using jq
FILE_PATH=$(echo "$TOOL_INPUT" | jq -r '.file_path // empty' 2>/dev/null)

if [ -z "$FILE_PATH" ]; then
    exit 0  # Not a file operation
fi

# Check for prohibited patterns
if [[ "$FILE_PATH" =~ -v[0-9]+\.(js|css|html)$ ]] || \
   [[ "$FILE_PATH" =~ -(simple|new|old|refactored|updated|copy)\.(js|css|html)$ ]]; then
    echo "❌ ERROR: File versioning detected: $FILE_PATH"
    echo "📝 Instead of creating new file versions:"
    echo "   1. Modify the existing file directly"
    echo "   2. Comment out old code with explanation"
    echo "   3. Add new implementation with comments"
    echo ""
    echo "Example:"
    echo "  // OLD IMPLEMENTATION - ISSUE: Performance problem"
    echo "  // function oldVersion() { ... }"
    echo "  "
    echo "  // NEW IMPLEMENTATION - Optimized algorithm"
    echo "  function improvedVersion() { ... }"
    exit 1
fi

exit 0