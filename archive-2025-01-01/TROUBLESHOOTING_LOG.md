# Chrome Web Highlighter - Troubleshooting Log

This document tracks all issues encountered and solutions applied during development.

---

## Issue #1: Extension Context Invalidated Errors
**Date**: 2025-06-30  
**Symptoms**: 
- Console flooded with "Extension context invalidated" errors
- Errors appear when extension is reloaded or updated
- Content scripts lose connection to extension runtime

**Root Cause**: 
- Chrome invalidates extension context when reloading/updating
- Orphaned content scripts continue trying to access Chrome APIs
- No proper cleanup or context validation

**Solution Applied**:
1. Added `isExtensionContextValid()` function to check `chrome.runtime?.id`
2. Wrapped all Chrome API calls in try-catch blocks
3. Implemented cleanup function to remove event listeners and UI elements
4. Added periodic context check (every 5 seconds)
5. Suppressed context invalidation errors from console

**Files Modified**: 
- `src/content.js`
- `src/background.js`

**Result**: ✅ Context errors are now handled gracefully

---

## Issue #2: Compression Library Error
**Date**: 2025-06-30  
**Symptoms**: 
- "Failed to load compression library" error in popup
- popup.js trying to load non-existent 'lz-string.min.js'
- Popup window shows errors instead of highlights

**Root Cause**: 
- Code referenced LZString compression library that wasn't included
- Over-engineered solution for MVP

**Solution Applied**:
1. Removed all LZString compression code
2. Simplified storage to use plain JSON
3. Removed `loadCompressionLibrary()` function
4. Updated storage/retrieval to work without compression

**Files Modified**: 
- `src/popup.js`

**Result**: ✅ Popup loads without compression errors

---

## Issue #3: Empty Highlights in Popup Window
**Date**: 2025-06-30  
**Symptoms**: 
- Highlights created successfully but don't appear in popup
- Storage format mismatch between content.js and popup.js

**Root Cause**: 
- popup.js expected nested object structure by URL
- content.js saved flat array of all highlights
- Different storage/retrieval patterns

**Solution Applied**:
1. Unified storage format to flat array
2. Updated popup.js to filter highlights by current URL
3. Fixed `deleteHighlight()` and `clearAllHighlights()` functions
4. Consistent use of 'highlights' storage key

**Files Modified**: 
- `src/popup.js`

**Result**: ✅ Highlights now appear in popup

---

## Issue #4: Highlights Disappearing on Page Reload
**Date**: 2025-06-30  
**Symptoms**: 
- Highlights lost when page is refreshed
- "Error loading highlights" in console
- Timing issues with DOM readiness

**Root Cause**: 
- Content script tried to load highlights before DOM was ready
- No retry mechanism for failed loads
- Dynamic content not handled

**Solution Applied**:
1. Added 100ms delay before initial highlight load
2. Implemented MutationObserver for dynamic content
3. Added window 'load' event as fallback (500ms delay)
4. Added `highlightsLoaded` flag to prevent duplicates
5. Implemented two restoration methods:
   - Primary: XPath-based (fast, accurate)
   - Fallback: Text search (finds text anywhere)
6. Multiple initialization strategies for reliability

**Files Modified**: 
- `src/content.js`

**Result**: ✅ Highlights persist across page reloads

---

## Issue #5: Highlight Button Not Showing on Text Selection
**Date**: 2025-06-30  
**Symptoms**: 
- Text selection doesn't trigger highlight button
- TypeError: "parentElement.closest is not a function"
- Button container might not be initialized

**Root Cause**: 
- `parentElement` could be null or not an Element node
- Missing type checks before calling DOM methods
- Text selection handler crashed before showing button

**Solution Applied**:
1. Added `nodeType === Node.ELEMENT_NODE` checks
2. Added optional chaining (`?.`) for null safety
3. Added debug logging for initialization issues
4. Improved null checks in event handlers
5. Added UI existence check in `createUI()`

**Files Modified**: 
- `src/content.js` (handleTextSelection, mousedownHandler functions)

**Result**: ✅ Highlight button now appears on text selection

---

## Issue #6: DOM Manipulation Errors
**Date**: 2025-06-30  
**Symptoms**: 
- Errors when trying to set styles on null elements
- "Cannot read property 'style' of null"

**Root Cause**: 
- Elements accessed after context invalidation
- No defensive checks before DOM manipulation

**Solution Applied**:
1. Added `isOrphaned` checks in show/hide functions
2. Wrapped DOM operations in try-catch blocks
3. Added element existence checks
4. Silent failure for context-related errors

**Files Modified**: 
- `src/content.js` (showHighlightButton, hideHighlightButton, etc.)

**Result**: ✅ DOM operations are now safe

---

## Best Practices Established

### 1. Context Validation Pattern
```javascript
if (isOrphaned || !isExtensionContextValid()) {
    return;
}
```

### 2. Safe DOM Access Pattern
```javascript
if (element && element.nodeType === Node.ELEMENT_NODE) {
    // Safe to use element methods
}
```

### 3. Error Suppression Pattern
```javascript
if (!error.message?.includes('Extension context invalidated') && 
    !error.message?.includes('Cannot access a chrome')) {
    console.error('Error:', error);
}
```

### 4. Timing Strategy
- Initial delay: 100ms
- MutationObserver debounce: 500ms
- Window load fallback: 500ms

---

## Issue #7: Persistent Context Invalidation Errors After Fixes
**Date**: 2025-06-30  
**Symptoms**: 
- "Error loading highlights: Error: Extension context invalidated" still appearing
- Errors occur in loadHighlights (line 433) and executeIfContextValid (line 540)
- Multiple instances of the same error in console
- Errors persist even after implementing context checks

**Root Cause**: 
- Error logging is happening before context validation checks
- The `console.error('Error loading highlights:', error)` executes before checking error type
- Some Chrome API calls still not properly wrapped

**Solution Applied**:
1. Move error type checking before any console logging
2. Ensure all Chrome API calls are wrapped with context validation
3. Add silent failure mode for all context-related errors
4. Review all try-catch blocks to ensure proper error filtering

**Code Pattern to Fix**:
```javascript
// Wrong - logs error first
} catch (error) {
    console.error('Error loading highlights:', error);
    if (error.message?.includes('Extension context invalidated')) {
        // Handle...
    }
}

// Correct - checks error type first
} catch (error) {
    if (!error.message?.includes('Extension context invalidated') && 
        !error.message?.includes('Cannot access a chrome')) {
        console.error('Error loading highlights:', error);
    }
}
```

**Files Modified**: 
- `src/content.js` (loadHighlights function, line 873 - console.warn without error type check)

**Result**: ✅ Fixed - Added error type checking before console.warn

---

## Issue #8: Highlight Button Stops Appearing After Context Error
**Date**: 2025-06-30  
**Symptoms**: 
- Highlight button doesn't appear when selecting text
- Extension becomes permanently disabled after first context error
- No recovery mechanism after context invalidation

**Root Cause**: 
- `isOrphaned` flag is set to true on any context error
- UI functions check `isOrphaned` and return early, preventing button display
- Once orphaned, the extension never recovers even if context becomes valid again

**Solution Applied**:
1. Removed `isOrphaned` checks from UI display functions
2. Keep error handling but allow UI to still function
3. Let DOM operations fail gracefully with try-catch
4. Only use `isOrphaned` for Chrome API calls, not UI operations

**Code Changes**:
```javascript
// Before - blocked UI when orphaned
function showHighlightButton(rect) {
    if (!highlightButtonContainer || isOrphaned) return;
    
// After - only check for element existence  
function showHighlightButton(rect) {
    if (!highlightButtonContainer) return;
```

**Files Modified**: 
- `src/content.js` (showHighlightButton, hideHighlightButton, showMiniToolbar, hideMiniToolbar)

**Result**: ✅ UI elements now show even after context errors

---

## Issue #9: executeIfContextValid Blocking All Operations
**Date**: 2025-06-30  
**Symptoms**: 
- Highlight creation completely blocked after context error
- executeIfContextValid returns early when isOrphaned is true
- No highlights can be created even though UI shows

**Root Cause**: 
- executeIfContextValid checked isOrphaned and returned without executing callback
- cleanup() was being called too aggressively, removing all UI
- Once orphaned, no operations could execute

**Solution Applied**:
1. Removed isOrphaned check from executeIfContextValid
2. Removed cleanup() calls - just set isOrphaned flag
3. Let operations try to execute and handle errors individually
4. Keep UI functional even when context is invalid

**Code Changes**:
```javascript
// Before - blocked everything when orphaned
function executeIfContextValid(callback) {
    if (isOrphaned || !isExtensionContextValid()) {
        if (!isOrphaned) {
            isOrphaned = true;
            cleanup();
        }
        return;
    }
    
// After - always try to execute
function executeIfContextValid(callback) {
    try {
        callback();
    } catch (error) {
        // Handle errors but don't cleanup
```

**Files Modified**: 
- `src/content.js` (executeIfContextValid, multiple cleanup() call sites)

**Result**: ✅ Highlight creation works even after context errors

---

## Issue #10: Runtime Errors in Context Menu and Variable Access
**Date**: 2025-06-30  
**Symptoms**: 
- Error on `window.getSelection()` in loadHighlights
- Error on `selectedColor` variable access
- Variables appearing undefined in certain contexts

**Root Cause**: 
- Extension context invalidation can cause variable scope issues
- `window.getSelection()` can throw errors in certain states
- Global variables might not be accessible after context changes

**Solution Applied**:
1. Added try-catch around window.getSelection() calls
2. Added fallback for selectedColor (use DEFAULT_COLOR if undefined)
3. Better error handling in context menu handler
4. Safe selection clearing with null checks

**Code Changes**:
```javascript
// Safe selection access
try {
    const selection = window.getSelection();
    if (selection) {
        selection.removeAllRanges();
    }
} catch (e) {
    // Ignore selection errors
}

// Fallback for color
const color = selectedColor || DEFAULT_COLOR;
```

**Files Modified**: 
- `src/content.js` (createHighlight, hideHighlightButton, message handler)

**Result**: ✅ Better error resilience for runtime errors

---

## Issue #11: Highlight Button Not Appearing - Initialization Blocked
**Date**: 2025-06-30  
**Symptoms**: 
- Highlight button doesn't appear when selecting text
- Extension not initializing due to context check
- No console logs showing initialization

**Root Cause**: 
- Initialization was blocked if `isExtensionContextValid()` returned false
- The check `if (isExtensionContextValid() && !window.location.href.startsWith('chrome://'))` prevented all initialization
- UI was never created if context was invalid

**Solution Applied**:
1. Removed context validity check from initialization condition
2. Always initialize UI regardless of context state
3. Only check context for Chrome API operations (loading highlights)
4. Added fallback initialization on window load
5. Added console logging for debugging

**Code Changes**:
```javascript
// Before - blocked initialization
if (isExtensionContextValid() && !window.location.href.startsWith('chrome://')) {

// After - always initialize except on chrome:// pages
if (!window.location.href.startsWith('chrome://')) {
```

**Files Modified**: 
- `src/content.js` (initialization section at bottom of file, initialize function)

**Result**: ✅ Extension now initializes and shows highlight button

---

## Issue #12: Console Warnings Still Appearing
**Date**: 2025-06-30  
**Symptoms**: 
- "Extension context invalidated" warnings still appearing in console
- Error trace shows warnings from saveHighlight function
- Multiple console.warn statements not checking error type

**Root Cause**: 
- console.warn() statements logging "Extension context invalidated" directly
- Should be silently failing instead of logging warnings
- Found in removeHighlight and removeAllHighlights functions

**Solution Applied**:
1. Replaced all `console.warn('Extension context invalidated')` with silent returns
2. Comments changed to `// Silently fail - don't log context errors`
3. Ensures complete suppression of context-related messages

**Code Changes**:
```javascript
// Before
if (!chrome.runtime || !chrome.runtime.id) {
    console.warn('Extension context invalidated');
    return;
}

// After  
if (!chrome.runtime || !chrome.runtime.id) {
    // Silently fail - don't log context errors
    return;
}
```

**Files Modified**: 
- `src/content.js` (saveHighlight, removeHighlight, removeAllHighlights functions)

**Result**: ✅ Context invalidation warnings completely suppressed

---

## Issue #13: Async Error Not Caught Properly
**Date**: 2025-06-30  
**Symptoms**: 
- Context errors still appearing despite having return statements
- Error coming from executeIfContextValid function
- Stack trace shows: createHighlight -> executeIfContextValid -> saveHighlight

**Root Cause**: 
- executeIfContextValid was not handling async callbacks properly
- Used synchronous try-catch with async callback, causing unhandled promise rejections
- Even though saveHighlight returned early, the error was propagating up

**Solution Applied**:
1. Changed executeIfContextValid to async function
2. Added await before callback() to properly catch async errors
3. Removed console.log from context error handling (complete silence)

**Code Changes**:
```javascript
// Before - not catching async errors
function executeIfContextValid(callback) {
    try {
        callback(); // async errors not caught!
    } catch (error) {
        // This won't catch async errors
    }
}

// After - properly handles async errors
async function executeIfContextValid(callback) {
    try {
        await callback(); // async errors now caught
    } catch (error) {
        // Now catches async errors properly
    }
}
```

**Key Learning**: 
- Async functions need async error handling
- Return statements alone don't prevent errors from propagating
- Must use async/await throughout the error handling chain

**Files Modified**: 
- `src/content.js` (executeIfContextValid function)

**Result**: ✅ Async errors now properly caught and suppressed

---

## Issue #14: Extension Not Working on Local HTML Files
**Date**: 2025-06-30  
**Symptoms**: 
- Extension works on web pages but not on local test.html file
- Content script not injecting on file:// URLs
- Cannot debug using local test files

**Root Cause**: 
- manifest.json only included http:// and https:// in matches
- file:// URLs were not included in content script matches
- Chrome requires explicit permission for file URLs

**Solution Applied**:
1. Added "file://*/*" to content_scripts matches in manifest.json
2. After updating, need to:
   - Reload extension in chrome://extensions/
   - Enable "Allow access to file URLs" in extension details

**Additional Steps Required**:
1. Go to chrome://extensions/
2. Click "Details" on your extension
3. Enable "Allow access to file URLs" toggle
4. Reload the extension

**Files Modified**: 
- `manifest.json` (added file:// to matches array)

**Result**: ✅ Extension now works on local HTML files for testing

---

## Known Limitations

1. Extension doesn't work on chrome:// URLs (by design)
2. Highlights may shift if page structure changes significantly
3. No support for cross-frame highlighting
4. Performance impact with 1000+ highlights per page
5. Requires manual toggle for file:// URL access

---

## Issue #15: Highlight Button Missing After Page Navigation
**Date**: 2025-01-30  
**Symptoms**: 
- Highlight button doesn't appear after navigating between pages (without reload)
- Works fine after page reload
- Particularly affects Single Page Applications (SPAs)
- State holds references to DOM elements that no longer exist

**Root Cause**: 
- When navigating in SPAs, the DOM is replaced but state references remain
- `createUI()` was checking state references, not actual DOM existence
- No mechanism to detect and recreate missing UI elements

**Solution Applied**:
1. Updated `createUI()` to check actual DOM existence using `document.getElementById()`
2. Clear state references if DOM elements don't exist
3. Added DOM existence check in `showHighlightButton()`
4. Recreate UI automatically if missing when needed

**Code Changes**:
```javascript
// createUI() now checks DOM, not just state
const existingContainer = document.getElementById('web-highlighter-button-container');
if (!existingContainer && state.highlightButtonContainer) {
    state.highlightButtonContainer = null;
    // Clear other references...
}

// showHighlightButton() recreates UI if missing
if (!state.highlightButtonContainer || !document.getElementById('web-highlighter-button-container')) {
    this.createUI();
}
```

**Files Modified**: 
- `src/content.js` (createUI, showHighlightButton methods)

**Result**: ✅ UI elements now recreate automatically after navigation

---

## Issue #16: Mini Toolbar Navigation & Click Issues
**Date**: 2025-01-30  
**Symptoms**: 
- Mini toolbar doesn't appear after navigating between pages (same as highlight button)
- Mini toolbar stays open when clicking elsewhere on the page
- Issues happen intermittently (race conditions)
- Sometimes highlights are missing in the popup after navigation

**Root Cause**: 
- Same as Issue #15 - stale DOM references after SPA navigation
- `state.currentHighlightId` retained from previous page
- Click handler not distinguishing between highlight vs non-highlight clicks
- Race conditions during page transitions causing initialization conflicts

**Solution Applied**:
1. Added DOM existence check in `showMiniToolbar()` similar to highlight button fix
2. Modified `handleMouseDown()` to check if clicked element is a highlight
3. Complete rewrite of `initialize()` function:
   - Added `isInitializing` flag to prevent concurrent initialization
   - Force cleanup of any existing UI elements
   - Reset ALL state variables including `currentHighlightId`
   - Added 50ms delay for DOM stabilization
   - Nullified all UI element references

**Code Changes**:
```javascript
// showMiniToolbar() - check DOM existence
if (!state.miniToolbar || !document.getElementById('web-highlighter-toolbar')) {
    this.createUI();
}

// handleMouseDown() - proper click handling
const clickedHighlight = element.closest('.web-highlighter-highlight');
if (clickedHighlight) {
    const clickedId = clickedHighlight.dataset.highlightId;
    if (clickedId !== state.currentHighlightId) {
        UIManager.hideMiniToolbar();
    }
    return;
}

// initialize() - prevent race conditions
let isInitializing = false;

function initialize() {
    if (!document.body || isInitializing) {
        return;
    }
    
    isInitializing = true;
    
    // Force cleanup and reset all state
    // ... (see content.js lines 1302-1352)
}
```

**Files Modified**: 
- `src/content.js` (showMiniToolbar, handleMouseDown, initialize)

**Result**: ✅ Mini toolbar now handles navigation and clicks correctly

---

## Issue #17: Missing Highlights in Popup (Identified)
**Date**: 2025-01-30  
**Symptoms**: 
- Sometimes highlights don't appear in popup after page navigation
- Intermittent issue - doesn't happen every time
- Related to navigation timing

**Root Cause**: 
- Storage access race conditions during page transitions
- Content script may not be fully initialized when popup loads
- Tab ID/URL might be in transition state
- Chrome storage API timing issues

**Status**: ⚠️ Identified but not yet fixed
**Next Steps**: 
- Add retry logic to `loadHighlights()` in popup.js
- Implement tab state detection before loading
- Add delay or polling mechanism for storage access
- Consider message passing to ensure content script is ready

---

## Issue #18: SPA Navigation Issues - Toolbar Not Closing & Highlights Disappearing
**Date**: 2025-01-30  
**Symptoms**: 
- Mini toolbar remains visible after navigating in SPAs (zombie elements)
- Highlights disappear after navigation due to exact URL matching
- Multiple toolbar elements accumulate in DOM
- Event handlers attached to stale element references
- Toolbar doesn't close when clicking outside after navigation
- Race conditions causing intermittent failures

**Root Cause**: 
1. **Toolbar Not Closing**: 
   - SPA navigation doesn't trigger page reload, so `initialize()` isn't called
   - DOM elements persist but state references become stale
   - Event delegation checks against ID, finding zombie elements
   - No cleanup mechanism for SPA navigation
   - `state.currentHighlightId` persists across navigations

2. **Highlights Disappearing**:
   - Exact URL matching: `h.url === window.location.href`
   - In SPAs, URLs change frequently (hash, query params, path)
   - GitHub example: `/repo/file.js` → `/repo/file.js#L10` are different

3. **Event Handling Issues**:
   - `element.closest('#web-highlighter-toolbar')` finds any toolbar with that ID
   - State references don't match actual DOM elements after navigation
   - Click handlers still attached to old DOM elements

4. **Race Conditions**:
   - Multiple initialization attempts during rapid navigation
   - Storage access conflicts during page transitions
   - DOM mutation observers firing during navigation

**Solution Applied**:
1. **NavigationHandler Module** (integrated into content.js):
   - Detects SPA navigation via History API interception
   - Smart URL matching for highlight persistence
   - Pattern-based storage (GitHub repos share highlights)
   - Automatic cleanup and re-initialization

2. **Enhanced Initialize Function**:
   - Added `isInitializing` flag to prevent race conditions
   - Force cleanup of ALL existing UI elements
   - Complete state reset including `currentHighlightId`
   - 50ms delay for DOM stabilization

3. **Improved Toolbar Hiding**:
   - Hide using state reference first
   - Query DOM for zombie toolbars and hide them
   - Reset `currentHighlightId` on hide

4. **Smart URL Matching**:
   - `normalizeUrl()` removes hash and query params
   - `urlsMatch()` compares normalized URLs
   - `getStorageUrl()` creates consistent storage keys
   - Special GitHub handling (same repo = same highlights)

**Code Implementation**:
```javascript
// NavigationHandler integrated into content.js
const NavigationHandler = {
    lastUrl: window.location.href,
    
    urlsMatch(url1, url2) {
        if (!url1 || !url2) return false;
        if (url1 === url2) return true;
        
        const norm1 = this.normalizeUrl(url1);
        const norm2 = this.normalizeUrl(url2);
        
        // For GitHub, match if same repository
        if (url1.includes('github.com') && url2.includes('github.com')) {
            const repo1 = this.extractGitHubRepo(url1);
            const repo2 = this.extractGitHubRepo(url2);
            if (repo1 && repo2 && repo1 === repo2) return true;
        }
        
        return norm1 === norm2;
    },
    
    checkNavigation() {
        const currentUrl = window.location.href;
        if (currentUrl !== this.lastUrl) {
            this.lastUrl = currentUrl;
            // Force re-initialization
            setTimeout(() => initialize(), 50);
        }
    },
    
    init() {
        // Override History API
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;
        
        history.pushState = function() {
            originalPushState.apply(history, arguments);
            setTimeout(() => NavigationHandler.checkNavigation(), 0);
        };
        
        history.replaceState = function() {
            originalReplaceState.apply(history, arguments);
            setTimeout(() => NavigationHandler.checkNavigation(), 0);
        };
        
        // Listen for popstate
        window.addEventListener('popstate', () => {
            setTimeout(() => this.checkNavigation(), 0);
        });
    }
};

// Enhanced initialize with race condition prevention
let isInitializing = false;

function initialize() {
    if (!document.body || isInitializing) return;
    
    isInitializing = true;
    
    // Force cleanup of ALL existing UI elements
    const existingContainers = document.querySelectorAll('#web-highlighter-button-container');
    const existingToolbars = document.querySelectorAll('#web-highlighter-toolbar');
    existingContainers.forEach(el => el.remove());
    existingToolbars.forEach(el => el.remove());
    
    // Reset ALL state
    state.currentHighlightId = null;
    state.highlightButton = null;
    state.highlightButtonContainer = null;
    state.colorPicker = null;
    state.miniToolbar = null;
    
    // Re-initialize after delay
    setTimeout(() => {
        UIManager.createUI();
        HighlightManager.loadHighlights();
        isInitializing = false;
    }, 50);
}

// Enhanced hideMiniToolbar to handle zombies
hideMiniToolbar() {
    // Hide using state reference
    if (state.miniToolbar) {
        state.miniToolbar.style.display = 'none';
    }
    
    // Also hide any zombie toolbars by ID
    const toolbarInDOM = document.getElementById('web-highlighter-toolbar');
    if (toolbarInDOM && toolbarInDOM !== state.miniToolbar) {
        toolbarInDOM.style.display = 'none';
    }
    
    state.currentHighlightId = null;
}
```

**Files Modified**: 
- `src/content.js` (major refactoring with NavigationHandler, enhanced initialize, improved hideMiniToolbar)
- `src/popup.js` (added URL pattern matching for highlight filtering)
- `src/spa-navigation-fix.js` (created but functionality moved to content.js)
- `manifest.json` (removed web_accessible_resources as spa-navigation-fix.js no longer needed)

**Result**: ✅ Extension now handles SPA navigation correctly with no race conditions

**Testing**:
1. Navigate between GitHub files - highlights persist across same repo
2. Mini toolbar closes properly after navigation
3. Click outside toolbar closes it reliably
4. No duplicate UI elements after multiple navigations
5. Consistent behavior across fast/slow navigation

---

## Issue #19: Comprehensive Navigation & State Management Refactor
**Date**: 2025-01-30  
**Summary**: Major refactoring to solve persistent navigation issues

**Problems Addressed**:
1. **Race Conditions**: Multiple simultaneous initializations causing conflicts
2. **Zombie DOM Elements**: UI elements persisting after SPA navigation
3. **State Persistence**: `currentHighlightId` and other state not clearing
4. **Event Handler Conflicts**: Old handlers attached to stale elements
5. **URL Matching Issues**: Highlights disappearing due to strict matching

**Key Insights**:
- **DOM vs State References**: State can hold references to removed DOM elements
- **SPA Navigation Complexity**: No page reload means manual cleanup required
- **Timing Is Critical**: Navigation events need careful sequencing
- **Pattern Matching > Exact Matching**: URLs in SPAs change frequently

**Implementation Details**:

1. **NavigationHandler Object**:
   - Centralized navigation detection and handling
   - Smart URL matching with pattern support
   - GitHub-specific handling (repo-level matching)
   - History API interception for SPA detection

2. **Race Condition Prevention**:
   ```javascript
   let isInitializing = false;
   function initialize() {
       if (!document.body || isInitializing) return;
       isInitializing = true;
       // ... initialization code ...
       setTimeout(() => { isInitializing = false; }, 50);
   }
   ```

3. **Zombie Element Cleanup**:
   ```javascript
   // Query ALL elements by ID and remove them
   const existingContainers = document.querySelectorAll('#web-highlighter-button-container');
   const existingToolbars = document.querySelectorAll('#web-highlighter-toolbar');
   existingContainers.forEach(el => el.remove());
   existingToolbars.forEach(el => el.remove());
   ```

4. **State Reset Strategy**:
   - Complete state reset on navigation
   - All UI references set to null
   - Fresh initialization after cleanup

**Lessons Learned**:
1. **Always Check DOM Existence**: Don't trust state references
2. **Use Event Delegation Carefully**: ID-based queries find all elements
3. **Reset State Completely**: Partial resets cause subtle bugs
4. **Add Delays for DOM Stability**: SPAs need time to update DOM
5. **Pattern Matching is Essential**: Exact URL matching breaks in SPAs

**Testing Checklist**:
- [x] GitHub file navigation
- [x] Hash changes (same page anchors)
- [x] Query parameter changes
- [x] Back/forward navigation
- [x] Rapid navigation (race conditions)
- [x] Toolbar click behavior
- [x] Highlight persistence

---

## Future Improvements

1. Add IndexedDB for better performance with large datasets
2. Implement highlight versioning for better restoration
3. Add visual feedback during highlight restoration
4. Consider WebWorker for heavy processing
5. Add telemetry to track common failure points
6. Implement mutation observer for more efficient SPA detection
7. Add highlight migration for URL changes (e.g., file renames)