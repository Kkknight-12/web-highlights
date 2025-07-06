#!/bin/bash
# Check for theme consistency violations

TOOL_INPUT="$1"

# Extract file path from tool input
FILE_PATH=$(echo "$TOOL_INPUT" | jq -r '.file_path // empty' 2>/dev/null)

if [ -z "$FILE_PATH" ]; then
    exit 0  # Not a file operation
fi

# Only check relevant files
if [[ ! "$FILE_PATH" =~ \.(js|css)$ ]]; then
    exit 0
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

# Check for white/light backgrounds in CSS or JS
if echo "$FILE_CONTENT" | grep -E "background.*:.*white|background.*:.*#fff|background.*:.*rgb\(255" > /dev/null; then
    ISSUES="${ISSUES}\n  - Found white background (should be dark glassmorphic)"
fi

# Check for missing backdrop-filter
if echo "$FILE_CONTENT" | grep -E "background.*rgba" | grep -v "backdrop-filter" > /dev/null; then
    ISSUES="${ISSUES}\n  - Found rgba background without backdrop-filter"
fi

# Check for inconsistent opacity
if echo "$FILE_CONTENT" | grep -E "rgba\([0-9]+,\s*[0-9]+,\s*[0-9]+,\s*(0\.[0-9]|1\.0)" | grep -v "0.75\|0.1\|0.2" > /dev/null; then
    ISSUES="${ISSUES}\n  - Found non-standard opacity (use 0.75 for backgrounds, 0.1 for borders)"
fi

# Check for missing stroke color on dark backgrounds
if echo "$FILE_CONTENT" | grep -E "stroke=\"currentColor\"" | grep -v "stroke=\"white\"\|stroke=\"#fff\"" > /dev/null; then
    if echo "$FILE_CONTENT" | grep -E "background.*rgba\(1,\s*22,\s*39" > /dev/null; then
        ISSUES="${ISSUES}\n  - SVG icons need explicit white stroke on dark backgrounds"
    fi
fi

# Check for light theme class names
if echo "$FILE_CONTENT" | grep -E "light-theme|white-bg|light-mode" > /dev/null; then
    ISSUES="${ISSUES}\n  - Found light theme references (should be dark theme only)"
fi

if [ -n "$ISSUES" ]; then
    echo "⚠️  WARNING: Theme consistency issues in $FILE_PATH"
    echo "Issues found:$ISSUES"
    echo ""
    echo "📝 Dark glassmorphic theme requirements:"
    echo "   background: rgba(1, 22, 39, 0.75);"
    echo "   backdrop-filter: blur(10px);"
    echo "   border: 1px solid rgba(255, 255, 255, 0.1);"
    echo "   color: white;"
    echo ""
    echo "For SVG icons on dark backgrounds:"
    echo "   stroke=\"white\" or stroke=\"#ffffff\""
    echo ""
    echo "Consistent opacity values:"
    echo "   - Backgrounds: 0.75"
    echo "   - Borders: 0.1"
    echo "   - Hover states: 0.2"
fi

exit 0