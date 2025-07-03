# Chrome Web Highlighter - Development Guide

## Project Overview
- **Purpose**: Free Chrome extension to build audience (5,000 users, 500 emails)
- **Tech Stack**: Vanilla JS, Chrome Extension Manifest V3, Redux for state management
- **Timeline**: 2 days to MVP, 3rd day submit to store
- **Monetization**: Free with $9 pro upgrade (one-time)
- **Next Product**: React Text Annotator ($79-399 via Gumroad)

## Code Quality Standards

### Architecture Principles
1. **Modular Architecture**
   - Each module under 200 lines (single responsibility)
   - Clear naming: `feature-name.js` (e.g., `highlight-engine.js`)
   - NO duplicate files (no file-v2.js, file-simple.js)

2. **Redux State Management**
   - Single source of truth for state
   - Components use Redux store directly (standard pattern)
   - No event-driven architecture (avoid circular dependencies)

3. **Chrome Extension Best Practices**
   - Check extension context validity: `chrome.runtime && chrome.runtime.id`
   - Wrap Chrome API calls in try-catch
   - Use chrome-api.js wrapper for consistency
   - Handle "Extension context invalidated" errors

## Development Rules

### Code Modification
1. **NEVER create new versions of files** - modify existing files
2. **Comment out old code** with explanation when refactoring
3. **Add comments** explaining new approaches
4. **Preserve code history** - don't delete, comment out
5. **Keep changes minimal** - solve the problem simply


### Debugging Approach:
1. **Identify the problem** - User reports specific issue with clear reproduction steps
2. **Read and understand existing code** - Study the current implementation, architecture, and flow
3. **Analyze root cause** - Trace through the code to find where the issue originates
4. **Discuss with user** - Present findings and proposed solution before coding
5. **Code minimal fix** - Keep changes simple and focused, use existing functions/methods
6. **Test with user** - Have user verify fix in Chrome
7. **Commit and continue** - Move to next issue

### Code Understanding Requirements:
- **Read existing code first** - Understand current implementation before making changes
- **Trace the flow** - Follow data/execution from start to end
- **Use existing functions** - Don't recreate functionality that already exists
- **Respect architecture** - Maintain consistency with established patterns
- **Keep it simple** - Minimal changes that solve the problem

### Code Modification Rules:
- **When changing methods/functions** - Comment out old code with explanation of issues
- **Add new code with comments** - Explain why the new approach is better
- **Preserve code history** - Don't delete old implementations, comment them out
- **Document the change** - Add comments explaining what was changed and why

### CRITICAL: Code Implementation Verification
1. **After writing any code, ALWAYS verify**:
   - Check that all functions have complete implementations
   - Verify all imports exist and are correct
   - Ensure no placeholder or incomplete functions
   - Test that the code actually works

2. **Common mistakes to avoid**:
   - Creating functions without bodies (e.g., `safeStorageGet` without implementation)
   - Importing non-existent functions
   - Forgetting to export created functions
   - Using functions before they're defined

3. **Verification checklist**:
   ```javascript
   // BAD - Incomplete implementation
   export function safeStorageGet() {
     // Missing implementation!
   }
   
   // GOOD - Complete implementation
   export async function safeStorageGet(keys = null) {
     try {
       if (!runtime.isContextValid()) {
         console.warn('[Chrome API] Extension context invalid')
         return {}
       }
       return await storage.get(keys)
     } catch (error) {
       console.error('[Chrome API] Storage get error:', error)
       return {}
     }
   }
   ```

4. **After code changes**:
   - Read the file to verify implementation
   - Check all imports are valid
   - Ensure all exported functions are complete
   - Verify no circular dependencies

### DOM Safety
- Always check element existence before using
- Use dom-safety.js utilities for safe operations
- Handle both Element and Text nodes
- Batch DOM operations to minimize reflows

### Security
- No innerHTML usage (prevents XSS)
- Sanitize all user input with text-sanitizer.js
- Content Security Policy in manifest.json
- Safe DOM construction patterns

## Testing Strategy

### Unit Tests
- Test modules independently
- Mock Chrome APIs with jest-webextension-mock
- Write tests for real-world scenarios
- Fix code to pass tests, not tests to pass code

### E2E Testing (End of Development)
- Use Playwright/Puppeteer with real Chrome
- Test full user flows
- Verify persistence across reloads
- Test on multiple websites

## Current Architecture

```
src/
├── background/
│   └── index.js          # Service worker
├── content/
│   ├── highlighting/     # Core highlight logic
│   │   ├── highlight-engine.js
│   │   ├── dom-highlighter.js
│   │   ├── text-finder.js
│   │   └── highlight-restorer.js
│   ├── features/         # UI components
│   │   ├── highlight-button.js
│   │   ├── mini-toolbar.js
│   │   └── color-picker.js
│   └── ui/              # UI utilities
│       ├── templates/    # Safe DOM construction
│       └── helpers/      # Position, visibility
├── store/               # Redux store
│   ├── store.js
│   ├── highlightsSlice.js
│   └── uiSlice.js
└── utils/              # Shared utilities
    ├── chrome-api.js   # Chrome API wrapper
    ├── dom-safety.js   # Safe DOM operations
    └── text-sanitizer.js # XSS prevention
```

## Performance Optimizations

### DOM Batching
- `wrapTextNodes()` - Two-phase approach
- `removeHighlightElements()` - DocumentFragment pattern
- `changeHighlightColor()` - requestAnimationFrame
- `restoreHighlights()` - Batch all operations

### Storage Optimization
- Batched saves with 1-second delay
- Only save dirty URLs
- Save on unload for data safety
- Handle Chrome storage limits (120 writes/min)

## Common Issues & Solutions

### Extension Context Invalidated
- Check `chrome.runtime && chrome.runtime.id`
- Wrap Chrome APIs in try-catch
- Graceful degradation

### DOM Errors
- Use defensive programming
- Check element existence
- Safe DOM utilities

### Selection Complexity
- Multiple fallback strategies
- Handle cross-element selections
- 50ms timeout for stability

## Debugging Process
1. **Identify problem** - Clear reproduction steps
2. **Read existing code** - Understand implementation
3. **Analyze root cause** - Trace execution flow
4. **Discuss solution** - Before coding
5. **Code minimal fix** - Simple and focused
6. **Test with user** - Verify in Chrome
7. **Commit changes** - Clean commits

## Project Status

### Completed
- ✅ Core highlighting functionality
- ✅ Redux state management
- ✅ DOM batching optimization
- ✅ Security improvements (XSS prevention)
- ✅ Chrome API wrapper
- ✅ DOM safety utilities

### TODO (Low Priority)
- Refactor long functions (marked for later):
  - createHighlight() - 84 lines
  - createMultipleHighlights() - 68 lines
  - getBlockElementsInRange() - 50 lines
  - findTextInContainer() - 89 lines

## Key Files
- **TROUBLESHOOTING_LOG.md** - All bugs and fixes
- **CODE_QUALITY_ANALYSIS.md** - Architecture analysis
- **HIGHLIGHT_TEST_CASES.md** - Test scenarios
- **PROJECT_CONTEXT.md** - Business context

## Remember
- NO over-engineering
- Redux only (no event-driven)
- Keep it simple and working
- Ship in 3 days, not 3 months
- ALWAYS verify code implementation after writing

## Example of Code Verification Failure

### What went wrong:
```javascript
// highlightsSlice.js was importing:
import { safeStorageGet, safeStorageSet } from '../utils/chrome-api.js'

// But chrome-api.js only had:
export const storage = {
  get(keys) { return chrome.storage.local.get(keys) },
  set(data) { return chrome.storage.local.set(data) }
}
// Missing: safeStorageGet and safeStorageSet functions!
```

### How to prevent:
1. After creating/modifying any file, ALWAYS:
   - Read the file again
   - Check all exports match imports
   - Verify functions have implementations
   - Test that imports resolve correctly

2. Use search to verify:
   - Search for function usage before assuming it exists
   - Check if imports match exports
   - Verify no missing dependencies

3. When creating wrapper functions:
   - Write the complete implementation
   - Add error handling
   - Export the function
   - Verify it's imported correctly