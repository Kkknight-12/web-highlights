# Highlight Persistence Issue - Troubleshooting Guide

## Problem
Highlights are not restored when the page is refreshed.

## Root Causes Identified

1. **No Initial Restoration Call**
   - `restoreHighlights()` was only called on URL changes, not on initial page load
   - Fixed by adding restoration in `initializeHighlighter()`

2. **Timing Issues**
   - DOM might not be ready when trying to restore
   - Rangy might not be fully initialized
   - Added multiple delays to ensure proper timing

3. **Rangy Serialization**
   - Rangy serializes highlights based on DOM structure
   - If the DOM changes between sessions, restoration can fail
   - This is a fundamental limitation of Rangy's approach

## Current Fixes Applied

1. **Added initial restoration**:
```javascript
// In highlighter.js initializeHighlighter()
setTimeout(() => {
  const state = store.getState()
  if (state.highlights.byUrl[window.location.href]) {
    restoreHighlights()
  }
}, 200)
```

2. **Added force restoration**:
```javascript
// In content/index.js after initialization
setTimeout(() => {
  if (window.__highlighter && window.__highlighter.restoreHighlights) {
    window.__highlighter.restoreHighlights()
  }
}, 500)
```

3. **Added debugging logs** to trace the restoration process

## Testing Steps

1. **Reload extension** in Chrome
2. **Open Console** (F12) and filter by "Highlighter"
3. **Create highlights** on a page
4. **Check console** for save confirmation
5. **Refresh page** (F5)
6. **Check console** for restoration logs

## Expected Console Output

On page refresh, you should see:
```
[Web Highlighter] Initializing...
[Highlighter] Initialized
[Web Highlighter] Ready!
[Highlighter] Restoring highlights on page load
[Highlighter] Restoring highlights for URL: https://example.com
[Highlighter] Found highlights: 1
[Highlighter] Deserializing: highlight-xxx
[Highlighter] Successfully restored: highlight-xxx
```

## If Still Not Working

1. **Check Chrome Storage**:
   - Open DevTools → Application → Storage → Local Storage
   - Look for your URL as a key
   - Verify highlights are saved

2. **Check Rangy Loading**:
   - In console, type: `window.rangy`
   - Should return the Rangy object

3. **DOM Changes**:
   - Some dynamic websites change their DOM structure
   - Rangy may not find the same text nodes
   - This is a limitation of the serialization approach

## Alternative Solutions

If Rangy serialization continues to fail:

1. **Text Search Approach** (like old simple-highlighter.js):
   - Store text + surrounding context
   - Search for text on page load
   - More resilient to DOM changes

2. **XPath + Text Approach**:
   - Store XPath to parent element
   - Store text offset within element
   - Fallback to text search

3. **Hybrid Approach**:
   - Try Rangy deserialization first
   - Fallback to text search if it fails

## Next Steps

Test the current fixes first. If highlights still don't persist reliably, we may need to implement a fallback text search approach alongside Rangy.