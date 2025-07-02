# Quick Test for Highlight Button

After reloading the extension, try these commands in the Console:

## 1. Check if Web Component is registered:
```javascript
customElements.get('highlight-button')
```

## 2. Create button manually:
```javascript
// Create and test the button
const testButton = document.createElement('highlight-button');
document.body.appendChild(testButton);

// Check if it has the show method
console.log('Has show method?', typeof testButton.show === 'function');

// Try to show it
if (testButton.show) {
  testButton.show({ top: 100, left: 100, width: 100, height: 20 });
}
```

## 3. Check what's actually in the DOM:
```javascript
// Find the button that content.js created
const existingButton = document.querySelector('highlight-button');
console.log('Button exists?', !!existingButton);
console.log('Button type:', existingButton?.constructor.name);
console.log('Has show method?', typeof existingButton?.show);
```

## 4. Force re-registration:
```javascript
// If button exists but doesn't have methods, try this:
if (window.HighlightButton && customElements) {
  customElements.define('highlight-button-test', window.HighlightButton);
  const newButton = document.createElement('highlight-button-test');
  document.body.appendChild(newButton);
  newButton.show({ top: 50, left: 50, width: 100, height: 20 });
}
```

This will help identify exactly where the issue is!