# Claude Code Hooks Configuration

This directory contains hooks configuration to enforce coding standards for the Chrome Web Highlighter project.

## 📁 Structure

```
.claude/
├── hooks.json          # Hook configuration
├── scripts/           # Verification scripts
│   ├── check-file-pattern.sh      # Blocks file versioning
│   ├── verify-imports.sh          # Checks imports exist
│   ├── check-git-commit.sh        # Blocks unauthorized commits
│   ├── verify-implementation.sh   # Finds incomplete functions
│   ├── check-module-size.sh       # Enforces 200-line limit
│   ├── check-theme-consistency.sh # Verifies dark theme
│   └── check-chrome-safety.sh     # Chrome API safety
└── README.md          # This file
```

## 🚀 How Hooks Work

Hooks run automatically when Claude Code performs actions:

### PreToolUse Hooks (Before Action)
- **File Creation**: Blocks versioned files (-v2.js, -simple.js)
- **Code Edits**: Warns about missing imports
- **Git Commands**: Blocks commits without permission
  - Also blocks commits containing Claude attribution
  - Ensures clean commit messages without AI references

### PostToolUse Hooks (After Action)
- **Code Changes**: Checks for incomplete implementations
- **Module Size**: Warns if files exceed 200 lines
- **Theme**: Ensures dark glassmorphic consistency
- **Chrome APIs**: Verifies proper error handling

## 📋 Reference Documents

1. **PROJECT_HOOKS.md** - Complete coding principles and rules
2. **TESTING_CHECKLIST.md** - Required tests before commits
3. **COMMON_PITFALLS.md** - Real issues and solutions

## 🔧 Testing Hooks

To test if hooks are working:

```bash
# This should be blocked
claude-code "Create a new file called highlighter-v2.js"

# This should show warnings
claude-code "Edit file without checking imports"

# This should be blocked
claude-code "Run git commit -m 'test'"
```

## ⚙️ Customization

To modify hook behavior, edit:
1. `hooks.json` - Change when hooks run
2. Scripts in `scripts/` - Modify validation logic

## 🎯 Purpose

These hooks help:
- Maintain code quality
- Prevent common mistakes
- Enforce consistent patterns
- Speed up development
- Reduce debugging time

## 💡 Tips

1. Hooks provide guidance, not restrictions
2. Read the warnings carefully
3. Follow the suggested fixes
4. Ask if you need to override a rule

---

Remember: Hooks are here to help you write better code faster!