# Chrome Web Highlighter - Refactoring TODO

## 🚨 IMPORTANT: Chrome Extension Limitations

Based on research, Chrome extensions have specific limitations:

1. **NO ES6 Module Support in Content Scripts**
   - Content scripts cannot use `import/export` statements directly
   - Must use build tools (esbuild, webpack) to bundle into single file
   - Or use dynamic imports with chrome.runtime.getURL()

2. **Code Splitting NOT Recommended**
   - Chrome extensions work best with bundled files
   - Each script (content, popup, background) should be self-contained
   - Shared code must be duplicated or use messaging

3. **Recommended Approach**
   - Keep single-file structure for content.js
   - Extract logic into functions/objects within the file
   - Use build process only if project grows significantly

---

## 📋 Refactoring Tasks (Revised Strategy)

### Priority 1: Code Organization (Keep Single File)

#### Task 1.1: Reorganize content.js Structure
```javascript
// Recommended structure for content.js
(function() {
    'use strict';
    
    // 1. Constants & Configuration
    const CONFIG = {
        HIGHLIGHT_COLORS: { /* ... */ },
        STORAGE_KEY: 'highlights',
        DEBOUNCE_DELAY: 300
    };
    
    // 2. Utility Functions
    const DOMUtils = {
        isValidElement(element) { /* ... */ },
        safeQuerySelector(selector) { /* ... */ }
    };
    
    const StorageManager = {
        async saveHighlight(highlight) { /* ... */ },
        async getHighlights() { /* ... */ }
    };
    
    // 3. UI Components
    const HighlightButton = {
        create() { /* ... */ },
        show(rect) { /* ... */ },
        hide() { /* ... */ }
    };
    
    const MiniToolbar = {
        create() { /* ... */ },
        show(rect) { /* ... */ },
        hide() { /* ... */ }
    };
    
    // 4. Core Highlighting Logic
    const HighlightEngine = {
        createHighlight() { /* ... */ },
        removeHighlight(id) { /* ... */ },
        restoreHighlights() { /* ... */ }
    };
    
    // 5. Event Handlers
    const EventManager = {
        handleTextSelection(e) { /* ... */ },
        handleToolbarAction(e) { /* ... */ }
    };
    
    // 6. Context Validation
    const ContextValidator = {
        isValid() { /* ... */ },
        cleanup() { /* ... */ }
    };
    
    // 7. Initialization
    function initialize() { /* ... */ }
    
    // Start
    initialize();
})();
```

**Status**: ⏳ Not Started  
**Estimated Time**: 3-4 hours  
**Files to Modify**: src/content.js

---

### Priority 2: Remove Over-Engineering

#### Task 2.1: Remove Virtual Scrolling from popup.js
- Delete VirtualScroller class (lines 17-177)
- Use simple DOM rendering for highlights list
- Keep it simple until we have 100+ highlights

**Status**: ⏳ Not Started  
**Estimated Time**: 1 hour  
**Files to Modify**: src/popup.js

#### Task 2.2: Simplify Error Handling
- Create consistent error handling pattern
- Remove repetitive try-catch blocks
- Use single error handler function

**Status**: ⏳ Not Started  
**Estimated Time**: 1 hour  
**Files to Modify**: src/content.js, src/popup.js

---

### Priority 3: Performance Optimizations

#### Task 3.1: Cache DOM Queries
```javascript
// Before
document.getElementById('highlightsList'); // Called multiple times

// After
const elements = {
    highlightsList: document.getElementById('highlightsList'),
    searchInput: document.getElementById('searchInput')
};
```

**Status**: ⏳ Not Started  
**Estimated Time**: 30 minutes  
**Files to Modify**: src/popup.js

#### Task 3.2: Use requestAnimationFrame for UI Updates
- Wrap UI position updates in RAF
- Improve scroll performance
- Reduce layout thrashing

**Status**: ⏳ Not Started  
**Estimated Time**: 1 hour  
**Files to Modify**: src/content.js

---

### Priority 4: Memory Management

#### Task 4.1: Fix Event Listener Cleanup
- Store references to all event listeners
- Remove them properly on cleanup
- Disconnect MutationObserver on unload

**Status**: ⏳ Not Started  
**Estimated Time**: 1 hour  
**Files to Modify**: src/content.js

#### Task 4.2: Fix ResizeObserver in popup.js
- Properly disconnect observer on popup close
- Clean up virtual scroller resources

**Status**: ⏳ Not Started  
**Estimated Time**: 30 minutes  
**Files to Modify**: src/popup.js

---

### Priority 5: Code Quality

#### Task 5.1: Add JSDoc Comments
```javascript
/**
 * Creates a highlight for the selected text
 * @param {Range} range - The text range to highlight
 * @param {string} color - The highlight color
 * @returns {string} The highlight ID
 */
function createHighlight(range, color) { /* ... */ }
```

**Status**: ⏳ Not Started  
**Estimated Time**: 2 hours  
**Files to Modify**: All JS files

#### Task 5.2: Add Input Validation
- Validate highlight data before storage
- Sanitize user input properly
- Add bounds checking for offsets

**Status**: ⏳ Not Started  
**Estimated Time**: 1 hour  
**Files to Modify**: src/content.js, src/popup.js

---

### Priority 6: Security Enhancements

#### Task 6.1: Update manifest.json with CSP
```json
{
    "content_security_policy": {
        "extension_pages": "script-src 'self'; object-src 'self'"
    }
}
```

**Status**: ⏳ Not Started  
**Estimated Time**: 15 minutes  
**Files to Modify**: manifest.json

#### Task 6.2: Improve HTML Escaping
- Use more robust escaping function
- Prevent XSS in all user content
- Validate URLs before display

**Status**: ⏳ Not Started  
**Estimated Time**: 30 minutes  
**Files to Modify**: src/popup.js

---

## 🚀 Implementation Order

1. **Week 1**: Code Organization (Priority 1)
   - Reorganize content.js into logical sections
   - Keep single file but improve structure

2. **Week 1**: Remove Over-Engineering (Priority 2)
   - Simplify popup.js
   - Streamline error handling

3. **Week 2**: Performance & Memory (Priority 3-4)
   - Cache DOM queries
   - Fix memory leaks
   - Add RAF for animations

4. **Week 2**: Quality & Security (Priority 5-6)
   - Add documentation
   - Improve validation
   - Enhance security

---

## 📝 Notes for Future Reference

### Build Process (If Needed Later)
If the project grows and requires modules:
1. Use esbuild for fast bundling
2. Create separate bundles for content.js, popup.js, background.js
3. Keep Chrome API calls in main files (not modules)

### Testing Strategy
1. Manual testing on various websites
2. Test with Chrome DevTools Performance tab
3. Check memory usage over time
4. Test on slow connections

### Chrome Extension Best Practices
1. Keep content scripts lightweight
2. Use message passing for complex operations
3. Store minimal data in chrome.storage
4. Always check chrome.runtime.lastError

---

## ✅ Definition of Done

For each task:
- [ ] Code refactored and working
- [ ] No new console errors
- [ ] Performance not degraded
- [ ] Memory leaks fixed (if applicable)
- [ ] Comments added where needed
- [ ] Tested on 3+ different websites

---

## 🎯 Success Metrics

After refactoring:
- content.js organized into logical sections
- No memory leaks in DevTools
- Popup loads instantly (< 100ms)
- Extension works on all websites
- Code is maintainable for future features

---

## 🔗 Reference Links

- [Chrome Extension Best Practices](https://developer.chrome.com/docs/extensions/develop/concepts/best-practices)
- [Service Worker Basics](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/basics)
- [Content Script Limitations](https://stackoverflow.com/questions/48104433/how-to-import-es6-modules-in-content-script-for-chrome-extension)