#!/bin/bash
# Check for incomplete function implementations

TOOL_INPUT="$1"

# Extract file path from tool input
FILE_PATH=$(echo "$TOOL_INPUT" | jq -r '.file_path // empty' 2>/dev/null)

if [ -z "$FILE_PATH" ] || [[ ! "$FILE_PATH" =~ \.js$ ]]; then
    exit 0  # Not a JavaScript file
fi

# Get the actual file content (for Edit operations, we need to check the result)
if [ -f "$FILE_PATH" ]; then
    FILE_CONTENT=$(cat "$FILE_PATH" 2>/dev/null)
else
    # For Write operations, get content from input
    FILE_CONTENT=$(echo "$TOOL_INPUT" | jq -r '.content // empty' 2>/dev/null)
fi

if [ -z "$FILE_CONTENT" ]; then
    exit 0  # No content to check
fi

# Check for common incomplete implementation patterns
ISSUES=""

# Check for TODO comments in functions
if echo "$FILE_CONTENT" | grep -E "function.*\{[^}]*TODO[^}]*\}" > /dev/null; then
    ISSUES="${ISSUES}\n  - Found TODO inside function implementation"
fi

# Check for empty function bodies
if echo "$FILE_CONTENT" | grep -E "function\s+\w+\s*\([^)]*\)\s*\{\s*\}" > /dev/null; then
    ISSUES="${ISSUES}\n  - Found empty function body"
fi

# Check for throw 'Not implemented'
if echo "$FILE_CONTENT" | grep -E "throw.*['\"].*[Nn]ot.*[Ii]mplemented" > /dev/null; then
    ISSUES="${ISSUES}\n  - Found 'Not implemented' error"
fi

# Check for functions that only have comments
if echo "$FILE_CONTENT" | grep -E "function.*\{[^}]*//[^}]*\}" | grep -v "return" > /dev/null; then
    ISSUES="${ISSUES}\n  - Found function with only comments (no implementation)"
fi

# Check for exported functions without implementation
if echo "$FILE_CONTENT" | grep -E "export\s+(async\s+)?function\s+\w+\s*\([^)]*\)\s*\{\s*\}" > /dev/null; then
    ISSUES="${ISSUES}\n  - Found exported function without implementation"
fi

if [ -n "$ISSUES" ]; then
    echo "⚠️  WARNING: Incomplete implementations detected in $FILE_PATH"
    echo "Issues found:$ISSUES"
    echo ""
    echo "📝 Every function needs a complete implementation:"
    echo "   - Return appropriate values"
    echo "   - Handle errors with try-catch"
    echo "   - No empty function bodies"
    echo "   - No TODO placeholders"
    echo ""
    echo "Example of complete implementation:"
    echo "  export async function safeStorageGet(keys) {"
    echo "    try {"
    echo "      return await chrome.storage.local.get(keys)"
    echo "    } catch (error) {"
    echo "      console.error('Storage get failed:', error)"
    echo "      return {}"
    echo "    }"
    echo "  }"
fi

exit 0