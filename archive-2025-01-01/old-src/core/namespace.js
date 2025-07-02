/**
 * Chrome Web Highlighter Namespace
 * Following uBlock Origin's pattern for module management
 * This file must be loaded first to establish the global namespace
 */

(function() {
  'use strict';
  
  // Check if already initialized (prevents double injection)
  if (typeof self.webHighlighter === 'object') {
    console.warn('Chrome Web Highlighter already initialized');
    return;
  }
  
  // Create the global namespace
  self.webHighlighter = {
    // Extension info
    version: '1.0.0',
    initialized: false,
    
    // Module containers
    modules: {},
    ui: {},
    core: {},
    utils: {},
    
    // Module registration helper
    register: function(type, name, module) {
      if (!this[type]) {
        console.error(`Invalid module type: ${type}`);
        return false;
      }
      
      if (this[type][name]) {
        console.warn(`Module already registered: ${type}.${name}`);
        return false;
      }
      
      this[type][name] = module;
      console.log(`✓ Registered: ${type}.${name}`);
      
      // Also expose at window level for backward compatibility
      if (typeof window !== 'undefined') {
        window[name] = module;
      }
      
      return true;
    },
    
    // Check if all required modules are loaded
    checkModules: function() {
      const required = {
        core: ['EventBus', 'StateManager', 'Constants'],
        modules: ['ErrorHandler', 'Storage', 'Highlighter', 'Selection', 'Navigation'],
        utils: ['DOMUtils']
      };
      
      let allLoaded = true;
      
      for (const [type, modules] of Object.entries(required)) {
        for (const module of modules) {
          if (!this[type][module]) {
            console.warn(`Missing module: ${type}.${module}`);
            allLoaded = false;
          }
        }
      }
      
      return allLoaded;
    },
    
    // Initialize the extension
    init: function() {
      if (this.initialized) return;
      
      console.log('Chrome Web Highlighter - Initializing...');
      
      // Check if all modules are loaded
      if (!this.checkModules()) {
        console.error('Not all modules are loaded');
        return;
      }
      
      this.initialized = true;
      console.log('Chrome Web Highlighter - Ready!');
    }
  };
  
  // Alias for easier access
  self.wh = self.webHighlighter;
  
  console.log('Chrome Web Highlighter namespace created');
})();