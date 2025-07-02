# Module Update Pattern

Based on uBlock Origin's architecture, all modules need to follow this pattern:

## 1. Wrap module in IIFE with namespace check:
```javascript
(function() {
  'use strict';
  
  // Check if namespace exists
  if (typeof self.webHighlighter !== 'object') {
    console.error('ModuleName: webHighlighter namespace not found');
    return;
  }
  
  // Your existing module code here
  const ModuleName = (() => {
    // ... existing code ...
  })();
  
  // Register with namespace
  self.webHighlighter.register('type', 'ModuleName', ModuleName);
  
  // Export for backward compatibility
  if (typeof window !== 'undefined') {
    window.ModuleName = ModuleName;
  }
})();
```

## 2. For Web Components, wrap customElements.define:
```javascript
if (typeof customElements !== 'undefined' && customElements.define) {
  customElements.define('component-name', ComponentClass);
} else {
  console.error('ComponentName: customElements API not available');
}
```

## 3. Update content.js to use namespace:
Instead of checking `window.ModuleName`, check:
- `self.webHighlighter.core.EventBus`
- `self.webHighlighter.modules.Storage`
- etc.

## Files to Update:
- ✅ src/core/EventBus.js
- ✅ src/ui/HighlightButton.js
- ⏳ src/core/StateManager.js
- ⏳ src/core/Constants.js
- ⏳ src/utils/domUtils.js
- ⏳ src/modules/errorHandler.js
- ⏳ src/modules/storage.js
- ⏳ src/modules/highlighter.js
- ⏳ src/modules/selection.js
- ⏳ src/modules/navigation.js
- ⏳ src/ui/MiniToolbar.js
- ⏳ src/ui/ColorPicker.js
- ⏳ src/content.js