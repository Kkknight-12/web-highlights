# Chrome Web Highlighter - Local Testing & Debugging Guide

## Setting Up Local Testing Environment

### 1. Load Extension in Developer Mode
```bash
1. Open Chrome and go to: chrome://extensions/
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the chrome-web-highlighter folder
5. Extension will load with a unique ID
```

### 2. Key Debugging Locations

#### A. Extension Management Page (chrome://extensions/)
- **Errors Button**: Shows red when there are errors
- **Service Worker**: Click to inspect background script
- **Reload Button**: Use after making code changes

#### B. Content Script Debugging
1. Go to any webpage (not chrome://)
2. Open DevTools (F12)
3. Go to Console tab
4. Filter by extension: Type "Chrome Web Highlighter" in filter

#### C. Service Worker Debugging
1. In chrome://extensions/, find your extension
2. Click "Service worker" link
3. Opens dedicated DevTools for background script
4. **Important**: Keeps service worker alive while open!

### 3. Testing Error Scenarios

#### Test 1: Extension Context Invalidation
```javascript
// To simulate context invalidation:
1. Load extension
2. Open a webpage and create highlights
3. Go back to chrome://extensions/
4. Click "Reload" button on extension
5. Go back to webpage
6. Try to create new highlights
7. Check console for errors
```

#### Test 2: Async Error Handling
```javascript
// Add temporary test code to content.js:
// At line 554 in createHighlight function
console.log('[TEST] createHighlight called');
console.log('[TEST] isOrphaned:', isOrphaned);
console.log('[TEST] chrome.runtime.id:', chrome.runtime?.id);
```

### 4. Error Tracing Techniques

#### A. Using console.error for Persistent Logs
```javascript
// Replace console.log with console.error for important traces
console.error(`[${new Date().toISOString()}] Context check:`, {
    isOrphaned,
    hasRuntime: !!chrome.runtime,
    runtimeId: chrome.runtime?.id
});
```

#### B. Add Breakpoints for Debugging
```javascript
// Add debugger statements to pause execution
async function saveHighlight(highlight) {
    debugger; // Chrome DevTools will pause here
    try {
        if (!chrome.runtime || !chrome.runtime.id) {
            debugger; // Pause when context invalid
            return;
        }
        // ... rest of code
    }
}
```

### 5. Testing Checklist

- [ ] Extension loads without errors
- [ ] Content script initializes (check console)
- [ ] Highlight button appears on text selection
- [ ] Highlights are created successfully
- [ ] Highlights persist after page reload
- [ ] No console errors during normal operation
- [ ] Context invalidation handled gracefully
- [ ] Popup shows highlights correctly

### 6. Common Error Patterns to Watch

1. **"Extension context invalidated"**
   - Happens after extension reload
   - Should be silently handled

2. **"Cannot access chrome.runtime"**
   - Extension unloaded or updated
   - Content script orphaned

3. **Promise rejection errors**
   - Async functions not properly handled
   - Missing await statements

### 7. Performance Monitoring

```javascript
// Add performance markers
console.time('loadHighlights');
await loadHighlights();
console.timeEnd('loadHighlights');

// Monitor memory usage
if (performance.memory) {
    console.log('Memory usage:', {
        used: (performance.memory.usedJSHeapSize / 1048576).toFixed(2) + ' MB',
        total: (performance.memory.totalJSHeapSize / 1048576).toFixed(2) + ' MB'
    });
}
```

### 8. Automated Testing Setup

#### Create test.html for local testing:
```html
<!DOCTYPE html>
<html>
<head>
    <title>Chrome Highlighter Test Page</title>
</head>
<body>
    <h1>Test Page for Chrome Web Highlighter</h1>
    <p id="test1">This is a simple paragraph for testing basic highlighting.</p>
    <p id="test2">This paragraph contains <strong>nested</strong> elements to test complex selections.</p>
    <ul>
        <li>List item 1 for testing</li>
        <li>List item 2 with <em>emphasis</em></li>
    </ul>
    <input type="text" placeholder="Test input field interaction">
    <textarea placeholder="Test textarea interaction"></textarea>
    <div contenteditable="true" style="border: 1px solid #ccc; padding: 10px;">
        This is a contenteditable div for testing.
    </div>
</body>
</html>
```

### 9. Debug Helper Script

Add this to content.js temporarily for better debugging:

```javascript
// Debug helper (remove in production)
window.chromeHighlighterDebug = {
    getState: () => ({
        isOrphaned,
        hasUI: !!highlightButtonContainer,
        highlightsLoaded,
        selectedText,
        hasRuntime: !!chrome.runtime?.id
    }),
    
    testHighlight: async (text) => {
        selectedText = text;
        const range = document.createRange();
        const textNode = document.createTextNode(text);
        document.body.appendChild(textNode);
        range.selectNode(textNode);
        selectedRange = range;
        await createHighlight();
    },
    
    forceReload: () => {
        highlightsLoaded = false;
        loadHighlights();
    }
};

// In console, you can now use:
// chromeHighlighterDebug.getState()
// chromeHighlighterDebug.testHighlight('test')
```

### 10. VS Code Launch Configuration

Create `.vscode/launch.json`:
```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Launch Chrome with Extension",
            "type": "chrome",
            "request": "launch",
            "url": "file:///${workspaceFolder}/test.html",
            "webRoot": "${workspaceFolder}",
            "runtimeArgs": [
                "--load-extension=${workspaceFolder}"
            ]
        }
    ]
}
```

## Debugging Workflow

1. **Initial Load**
   - Check chrome://extensions/ for load errors
   - Open test page
   - Check console for initialization logs

2. **Test Basic Functionality**
   - Select text → highlight button appears
   - Click button → highlight created
   - Reload page → highlights restored

3. **Test Error Scenarios**
   - Reload extension while page is open
   - Try to create highlights (should fail gracefully)
   - Check console for error suppression

4. **Monitor Performance**
   - Use Performance tab in DevTools
   - Check for memory leaks
   - Monitor event listener count

5. **Fix & Iterate**
   - Make code changes
   - Reload extension
   - Refresh test page
   - Verify fix

## Production Build Checklist

Before releasing:
- [ ] Remove all console.log statements (keep only errors)
- [ ] Remove debug helper code
- [ ] Remove debugger statements
- [ ] Test on multiple websites
- [ ] Verify no memory leaks
- [ ] Check error handling is silent