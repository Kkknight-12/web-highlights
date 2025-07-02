/**
 * Module Loader for Chrome Extension
 * Ensures modules are properly loaded and available in the content script context
 */

// Create a global namespace for our modules if it doesn't exist
window.ChromeHighlighter = window.ChromeHighlighter || {};

// Module loading helper
window.ChromeHighlighter.loadModule = function(name, module) {
  // Attach to both window and our namespace
  window[name] = module;
  window.ChromeHighlighter[name] = module;
  
  console.log(`✓ Module loaded: ${name}`);
};

// Verify module is loaded
window.ChromeHighlighter.verifyModule = function(name) {
  return typeof window[name] !== 'undefined';
};

// Get all loaded modules
window.ChromeHighlighter.getLoadedModules = function() {
  const modules = [
    'EventBus', 'StateManager', 'Constants', 'ErrorHandler',
    'Storage', 'Highlighter', 'Selection', 'Navigation', 'DOMUtils'
  ];
  
  const loaded = modules.filter(m => window.ChromeHighlighter.verifyModule(m));
  const missing = modules.filter(m => !window.ChromeHighlighter.verifyModule(m));
  
  return { loaded, missing };
};