#!/bin/bash
# Enforce proper development workflow: discuss -> approve -> code -> test -> commit

TOOL_INPUT="$1"

# Extract tool type and content
TOOL_TYPE=$(echo "$TOOL_INPUT" | jq -r '.tool // empty' 2>/dev/null)
FILE_PATH=$(echo "$TOOL_INPUT" | jq -r '.file_path // empty' 2>/dev/null)
NEW_STRING=$(echo "$TOOL_INPUT" | jq -r '.new_string // empty' 2>/dev/null)

# Check if this is a code modification tool (Edit, MultiEdit, Write)
if [[ "$TOOL_TYPE" == "Edit" ]] || [[ "$TOOL_TYPE" == "MultiEdit" ]] || [[ "$TOOL_TYPE" == "Write" ]]; then
    
    # Check if the code contains implementation without discussion markers
    if [[ ! "$NEW_STRING" =~ "DISCUSSED:" ]] && [[ ! "$NEW_STRING" =~ "APPROVED:" ]]; then
        
        # Check if this is creating a new function/feature
        if [[ "$NEW_STRING" =~ "function " ]] || [[ "$NEW_STRING" =~ "class " ]] || [[ "$NEW_STRING" =~ "export " ]]; then
            
            echo "🚫 BLOCKED: Code implementation without discussion"
            echo ""
            echo "📋 REQUIRED WORKFLOW:"
            echo "   1. User asks for information on topic"
            echo "   2. Discuss approach and solution"
            echo "   3. User explicitly asks to code"
            echo "   4. Check existing code first"
            echo "   5. Write code with clear comments"
            echo "   6. Re-check implementation completeness"
            echo "   7. User tests the code"
            echo "   8. User asks to commit (no AI references)"
            echo ""
            echo "❌ Add discussion markers in comments:"
            echo "   // DISCUSSED: [what was discussed]"
            echo "   // APPROVED: [user approval]"
            echo ""
            echo "🔄 Please discuss the approach first before coding."
            exit 1
        fi
    fi
    
    # Check for file duplication attempts
    if [[ "$TOOL_TYPE" == "Write" ]] && [[ -f "$FILE_PATH" ]]; then
        # Check if trying to create a duplicate file
        if [[ "$FILE_PATH" =~ -v[0-9]+\. ]] || [[ "$FILE_PATH" =~ -new\. ]] || [[ "$FILE_PATH" =~ -copy\. ]]; then
            echo "🚫 BLOCKED: Attempting to create duplicate file"
            echo ""
            echo "📝 RULES:"
            echo "   - NEVER create new versions of existing files"
            echo "   - Modify existing files directly"
            echo "   - Create new files only for new features/modules"
            echo ""
            echo "✅ Use the existing file instead: ${FILE_PATH%%-*}.*"
            exit 1
        fi
    fi
fi

# Remind about workflow for any code changes
if [[ "$TOOL_TYPE" == "Edit" ]] || [[ "$TOOL_TYPE" == "MultiEdit" ]] || [[ "$TOOL_TYPE" == "Write" ]]; then
    echo "📋 WORKFLOW REMINDER:"
    echo "   ✓ Discuss first"
    echo "   ✓ Get approval"
    echo "   ✓ Check existing code"
    echo "   ✓ Code with comments"
    echo "   ✓ Verify completeness"
    echo "   ✓ Test with user"
    echo "   ✓ Commit only when asked"
fi

exit 0