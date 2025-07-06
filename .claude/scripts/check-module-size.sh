#!/bin/bash
# Check if modules exceed 200 lines

TOOL_INPUT="$1"

# Extract file path from tool input
FILE_PATH=$(echo "$TOOL_INPUT" | jq -r '.file_path // empty' 2>/dev/null)

if [ -z "$FILE_PATH" ] || [ ! -f "$FILE_PATH" ]; then
    exit 0  # File doesn't exist yet or not a file operation
fi

# Only check JavaScript and CSS files
if [[ ! "$FILE_PATH" =~ \.(js|css)$ ]]; then
    exit 0
fi

# Count lines in the file
LINE_COUNT=$(wc -l < "$FILE_PATH" 2>/dev/null || echo "0")

if [ "$LINE_COUNT" -gt 200 ]; then
    echo "⚠️  WARNING: Module size violation detected!"
    echo "📊 File: $FILE_PATH has $LINE_COUNT lines (limit: 200)"
    echo ""
    echo "📝 To fix this:"
    echo "   1. Split into smaller, focused modules"
    echo "   2. Each module = single responsibility"
    echo "   3. Extract reusable utilities"
    echo ""
    echo "Suggested refactoring:"
    
    # Analyze the file for potential splits
    if [[ "$FILE_PATH" =~ highlight ]]; then
        echo "  - highlight-creator.js (creation logic)"
        echo "  - highlight-finder.js (search logic)"
        echo "  - highlight-restorer.js (restoration logic)"
    fi
    
    if [[ "$FILE_PATH" =~ toolbar ]]; then
        echo "  - toolbar-actions.js (button handlers)"
        echo "  - toolbar-template.js (UI creation)"
        echo "  - toolbar-positioning.js (placement logic)"
    fi
    
    echo ""
    echo "Remember: Smaller modules = easier debugging & testing"
fi

# Also check for very long functions
LONG_FUNCTIONS=$(awk '/function.*\{/ {start=NR} /^}/ {if(start && NR-start>50) print "Line " start ": Function with " NR-start " lines"}' "$FILE_PATH" 2>/dev/null)

if [ -n "$LONG_FUNCTIONS" ]; then
    echo ""
    echo "⚠️  Long functions detected (>50 lines):"
    echo "$LONG_FUNCTIONS"
    echo ""
    echo "Consider breaking these into smaller functions"
fi

exit 0