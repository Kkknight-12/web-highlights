/**
 * vAPI client - Following uBlock Origin's exact pattern
 * Provides messaging and CSS injection capabilities
 */

(function() {
  'use strict';
  
  // Check if namespace exists
  if (typeof self.webHighlighter !== 'object') {
    console.error('vAPI: webHighlighter namespace not found');
    return;
  }
  
  const vAPI = {};
  
  // Random token generator - exact copy from uBlock
  vAPI.randomToken = function() {
    const n = Math.random();
    return String.fromCharCode(n * 25 + 97) +
      Math.floor(
        (0.25 + n * 0.75) * Number.MAX_SAFE_INTEGER
      ).toString(36).slice(-8);
  };
  
  // Generate session ID
  vAPI.sessionId = vAPI.randomToken();
  
  // User stylesheet management - exact copy from uBlock
  vAPI.userStylesheet = {
    added: new Set(),
    removed: new Set(),
    
    apply: function(callback) {
      if (this.added.size === 0 && this.removed.size === 0) { return; }
      
      vAPI.messaging.send('vapi', {
        what: 'userCSS',
        add: Array.from(this.added),
        remove: Array.from(this.removed),
      }).then(() => {
        if (callback instanceof Function === false) { return; }
        callback();
      });
      
      this.added.clear();
      this.removed.clear();
    },
    
    add: function(cssText, now) {
      if (cssText === '') { return; }
      this.added.add(cssText);
      if (now) { this.apply(); }
    },
    
    remove: function(cssText, now) {
      if (cssText === '') { return; }
      this.removed.add(cssText);
      if (now) { this.apply(); }
    }
  };
  
  // Messaging system - simplified for our use case
  vAPI.messaging = {
    send: function(channel, message) {
      return new Promise((resolve) => {
        // Check if extension context is still valid
        if (!chrome.runtime || !chrome.runtime.id) {
          console.error('vAPI.messaging: Extension context invalidated');
          resolve(null);
          return;
        }
        
        chrome.runtime.sendMessage({
          channel: channel,
          msg: message
        }, response => {
          // Check for runtime errors
          if (chrome.runtime.lastError) {
            console.error('vAPI.messaging:', chrome.runtime.lastError);
            resolve(null);
            return;
          }
          resolve(response || { success: true });
        });
      });
    }
  };
  
  // Register with namespace
  self.webHighlighter.register('core', 'vAPI', vAPI);
  
  // Export for backward compatibility
  if (typeof window !== 'undefined') {
    window.vAPI = vAPI;
  }
  
})();