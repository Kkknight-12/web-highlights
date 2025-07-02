/**
 * Chrome Web Highlighter Namespace
 * Simple global namespace following uBlock Origin's pattern
 */

// Create the global namespace
window.webHighlighter = {
  // Core modules
  core: {},
  
  // Utility modules  
  utils: {},
  
  // Feature modules
  modules: {},
  
  // UI components
  ui: {},
  
  // Configuration
  config: {
    debug: true
  }
};

// Simple logging
window.webHighlighter.log = function(...args) {
  if (window.webHighlighter.config.debug) {
    console.log('[WebHighlighter]', ...args);
  }
};

window.webHighlighter.log('Namespace created');