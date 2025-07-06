#!/bin/bash
# Verify that imports exist before allowing edits

TOOL_INPUT="$1"

# Extract file path from tool input
FILE_PATH=$(echo "$TOOL_INPUT" | jq -r '.file_path // empty' 2>/dev/null)

if [ -z "$FILE_PATH" ]; then
    exit 0  # Not a file operation
fi

# Only check JavaScript files
if [[ ! "$FILE_PATH" =~ \.js$ ]]; then
    exit 0
fi

# Extract new content for Edit/Write operations
NEW_CONTENT=$(echo "$TOOL_INPUT" | jq -r '.new_string // .content // empty' 2>/dev/null)

if [ -z "$NEW_CONTENT" ]; then
    exit 0  # No content to check
fi

# Check for import statements
IMPORTS=$(echo "$NEW_CONTENT" | grep -E "^import .* from ['\"].*['\"]" | sed -E "s/^import .* from ['\"](.+)['\"].*/\1/")

if [ -z "$IMPORTS" ]; then
    exit 0  # No imports to verify
fi

# Check each import
MISSING_IMPORTS=""
while IFS= read -r import_path; do
    # Skip external packages (don't start with . or /)
    if [[ ! "$import_path" =~ ^[./] ]]; then
        continue
    fi
    
    # Resolve relative path
    DIR=$(dirname "$FILE_PATH")
    RESOLVED_PATH=$(cd "$DIR" 2>/dev/null && realpath -q "$import_path" 2>/dev/null || echo "")
    
    if [ -z "$RESOLVED_PATH" ] || [ ! -f "$RESOLVED_PATH" ]; then
        MISSING_IMPORTS="${MISSING_IMPORTS}\n  - $import_path"
    fi
done <<< "$IMPORTS"

if [ -n "$MISSING_IMPORTS" ]; then
    echo "⚠️  WARNING: The following imports may not exist:$MISSING_IMPORTS"
    echo ""
    echo "📝 Before proceeding:"
    echo "   1. Verify these files exist"
    echo "   2. Check that imported functions are exported"
    echo "   3. Consider using existing utilities instead"
    echo ""
    echo "Common locations:"
    echo "  - DOM utilities: dom-safety.js"
    echo "  - Chrome APIs: chrome-api.js"
    echo "  - Sanitization: text-sanitizer.js"
fi

exit 0