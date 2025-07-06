#!/bin/bash
# Check for Chrome API safety violations

TOOL_INPUT="$1"

# Extract file path from tool input
FILE_PATH=$(echo "$TOOL_INPUT" | jq -r '.file_path // empty' 2>/dev/null)

if [ -z "$FILE_PATH" ] || [[ ! "$FILE_PATH" =~ \.js$ ]]; then
    exit 0  # Not a JavaScript file
fi

# Get file content
if [ -f "$FILE_PATH" ]; then
    FILE_CONTENT=$(cat "$FILE_PATH" 2>/dev/null)
else
    FILE_CONTENT=$(echo "$TOOL_INPUT" | jq -r '.content // empty' 2>/dev/null)
fi

if [ -z "$FILE_CONTENT" ]; then
    exit 0
fi

ISSUES=""

# Check for direct Chrome API calls without context check
CHROME_APIS="chrome\.storage|chrome\.runtime|chrome\.tabs|chrome\.windows|chrome\.action"
if echo "$FILE_CONTENT" | grep -E "$CHROME_APIS" | grep -v "chrome\.runtime.*&&.*chrome\.runtime\.id" > /dev/null; then
    # Check if there's no context validation nearby
    if ! echo "$FILE_CONTENT" | grep -B5 -E "$CHROME_APIS" | grep -E "chrome\.runtime.*&&.*chrome\.runtime\.id|isValidContext|checkExtensionContext" > /dev/null; then
        ISSUES="${ISSUES}\n  - Chrome API calls without context validation"
    fi
fi

# Check for Chrome API calls without try-catch
if echo "$FILE_CONTENT" | grep -E "$CHROME_APIS" | while read -r line; do
    if ! echo "$FILE_CONTENT" | grep -B10 "$line" | grep -E "try\s*\{" > /dev/null; then
        echo "$line"
    fi
done | head -n1 > /dev/null; then
    ISSUES="${ISSUES}\n  - Chrome API calls without try-catch blocks"
fi

# Check if chrome-api.js wrapper is being used
if echo "$FILE_CONTENT" | grep -E "$CHROME_APIS" > /dev/null; then
    if ! echo "$FILE_CONTENT" | grep -E "import.*chrome-api|from.*chrome-api" > /dev/null; then
        ISSUES="${ISSUES}\n  - Not using chrome-api.js wrapper (recommended)"
    fi
fi

# Check for missing error handling in async Chrome operations
if echo "$FILE_CONTENT" | grep -E "await\s+chrome\." | grep -v -E "try.*\{|\.catch\(" > /dev/null; then
    ISSUES="${ISSUES}\n  - Async Chrome operations without error handling"
fi

if [ -n "$ISSUES" ]; then
    echo "⚠️  WARNING: Chrome API safety issues in $FILE_PATH"
    echo "Issues found:$ISSUES"
    echo ""
    echo "📝 Chrome API best practices:"
    echo "   1. Always check context before API calls:"
    echo "      if (chrome.runtime && chrome.runtime.id) {"
    echo "        // Safe to use Chrome APIs"
    echo "      }"
    echo ""
    echo "   2. Wrap in try-catch blocks:"
    echo "      try {"
    echo "        await chrome.storage.local.get(keys)"
    echo "      } catch (error) {"
    echo "        console.error('Chrome API error:', error)"
    echo "        // Fallback behavior"
    echo "      }"
    echo ""
    echo "   3. Use chrome-api.js wrapper for consistency:"
    echo "      import { storage } from '../utils/chrome-api.js'"
    echo ""
    echo "   4. Handle 'Extension context invalidated' errors gracefully"
fi

exit 0