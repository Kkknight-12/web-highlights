/**
 * Simple Content Script
 * Main initialization following uBlock's pattern
 */

(function() {
  'use strict';
  
  // Skip if already initialized
  if (window.__webHighlighterInitialized) {
    return;
  }
  window.__webHighlighterInitialized = true;
  
  // Skip chrome:// pages
  if (window.location.href.startsWith('chrome://')) {
    return;
  }
  
  // Wait for DOM ready
  function domReady(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback);
    } else {
      callback();
    }
  }
  
  // Initialize all modules
  function initialize() {
    const wh = window.webHighlighter;
    
    if (!wh) {
      console.error('WebHighlighter namespace not found');
      return;
    }
    
    wh.log('Initializing...');
    
    // Initialize modules in order
    if (wh.modules.highlighter) {
      wh.modules.highlighter.init();
    }
    
    if (wh.ui.highlightButton) {
      wh.ui.highlightButton.init();
    }
    
    if (wh.ui.miniToolbar) {
      wh.ui.miniToolbar.init();
    }
    
    if (wh.ui.colorPicker) {
      wh.ui.colorPicker.init();
    }
    
    // Setup navigation detection
    setupNavigationDetection();
    
    wh.log('Initialization complete');
  }
  
  // Detect navigation changes (for SPAs) - keep it simple
  function setupNavigationDetection() {
    let lastUrl = window.location.href;
    
    // Simple check for URL changes
    const checkUrlChange = () => {
      const currentUrl = window.location.href;
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        window.webHighlighter.log('Navigation detected:', currentUrl);
        
        // Just reload highlights
        if (window.webHighlighter.modules.highlighter) {
          window.webHighlighter.modules.highlighter.loadHighlights();
        }
      }
    };
    
    // Listen for back/forward
    window.addEventListener('popstate', checkUrlChange);
    
    // Simple interval check
    setInterval(checkUrlChange, 1000);
  }
  
  // Start initialization
  domReady(initialize);
  
})();