# Debug Guide - Highlight Button Not Appearing

## Quick Debug Steps

### 1. Check Console for Errors
Open Chrome DevTools (F12) and check the Console tab for any errors when:
- The page loads
- You select text

### 2. Check if Modules Are Loading
In the Console, type these commands to verify modules are loaded:
```javascript
// Check core modules
EventBus
StateManager
Constants

// Check feature modules
Selection
Highlighter
Storage
Navigation

// Check UI components
document.querySelector('highlight-button')
```

### 3. Test Selection Events Manually
In the Console, run:
```javascript
// Check if selection module is initialized
Selection

// Manually trigger a selection event
EventBus.emit('selection:valid', {
  text: 'test',
  bounds: {
    top: 100,
    left: 100,
    width: 100,
    height: 20
  }
});

// Check if button appears
document.querySelector('highlight-button')
```

### 4. Common Issues and Solutions

#### Issue: "Cannot read properties of undefined"
**Solution**: Some modules aren't loading. Check the Console for which modules are missing.

#### Issue: No console logs appearing
**Solution**: The extension might not be loading at all. Check:
- Chrome Extensions page (chrome://extensions/)
- Look for errors on your extension
- Try reloading the extension

#### Issue: "EventBus is not defined"
**Solution**: The loading order might be wrong. The manifest should load files in this order:
1. Core modules first (EventBus, StateManager, Constants)
2. Utils (domUtils)
3. Feature modules
4. UI components
5. content.js last

### 5. Enable Debug Mode
Add this to the Console to see more logs:
```javascript
// Enable verbose logging
EventBus.on('*', (data) => console.log('Event:', data));
```

### 6. Test Selection Detection
Try selecting text and run:
```javascript
// Get current selection
window.getSelection().toString()

// Check selection module state
StateManager.get('selection')
```

### 7. Quick Fix Attempt
If nothing works, try this in the Console:
```javascript
// Manually create and show the button
const button = document.createElement('highlight-button');
document.body.appendChild(button);
button.show({ top: 100, left: 100, width: 100, height: 20 });
```

## Report Back With:
1. Any errors in the Console
2. Which modules are undefined
3. Whether the manual button creation works
4. Any other unusual behavior

This will help identify the exact issue!