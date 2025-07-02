/**
 * Test file to verify modules are loading correctly
 * Add this temporarily to manifest.json to debug
 */

console.log('=== Chrome Web Highlighter Module Test ===');

// Test 1: Check if modules exist
const modules = [
  'EventBus',
  'StateManager', 
  'Constants',
  'ErrorHandler',
  'Storage',
  'Highlighter',
  'Selection',
  'Navigation',
  'DOMUtils'
];

console.log('Module Loading Status:');
modules.forEach(moduleName => {
  const exists = typeof window[moduleName] !== 'undefined';
  console.log(`${exists ? '✓' : '✗'} ${moduleName}: ${exists ? 'Loaded' : 'Not loaded'}`);
});

// Test 2: Try to use EventBus
if (typeof window.EventBus !== 'undefined') {
  console.log('\nTesting EventBus:');
  
  // Subscribe to a test event
  window.EventBus.on('test:event', (data) => {
    console.log('✓ EventBus working! Received:', data);
  });
  
  // Emit a test event
  window.EventBus.emit('test:event', { message: 'Hello from test!' });
} else {
  console.error('✗ EventBus not available for testing');
}

// Test 3: Check Web Components
console.log('\nWeb Components Status:');
const components = ['highlight-button', 'mini-toolbar', 'color-picker'];
components.forEach(tag => {
  const isDefined = customElements.get(tag) !== undefined;
  console.log(`${isDefined ? '✓' : '✗'} <${tag}>: ${isDefined ? 'Registered' : 'Not registered'}`);
});

// Test 4: Create highlight button manually
if (customElements.get('highlight-button')) {
  console.log('\nCreating test highlight button...');
  const button = document.createElement('highlight-button');
  document.body.appendChild(button);
  button.show({ top: 50, left: 50, width: 100, height: 20 });
  console.log('✓ Test button created and shown at (50, 50)');
} else {
  console.error('✗ Cannot create button - component not registered');
}

console.log('\n=== Test Complete ===');
console.log('If you see the button at top-left, the UI components are working.');
console.log('Check for any ✗ marks above to identify issues.');