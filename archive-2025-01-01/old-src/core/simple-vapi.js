/**
 * Simple vAPI implementation following uBlock's pattern
 * Provides messaging and CSS injection
 */

(function() {
  'use strict';
  
  // Generate random token for session
  function randomToken() {
    const n = Math.random();
    return String.fromCharCode(n * 25 + 97) +
      Math.floor((0.25 + n * 0.75) * Number.MAX_SAFE_INTEGER).toString(36).slice(-8);
  }
  
  // Create vAPI object
  const vAPI = {
    sessionId: randomToken(),
    
    // Simple messaging to background
    messaging: {
      send: function(channel, message) {
        return new Promise((resolve) => {
          if (!chrome.runtime || !chrome.runtime.id) {
            resolve(null);
            return;
          }
          
          chrome.runtime.sendMessage({
            channel: channel,
            msg: message
          }, response => {
            if (chrome.runtime.lastError) {
              console.error('Messaging error:', chrome.runtime.lastError);
              resolve(null);
              return;
            }
            resolve(response || { success: true });
          });
        });
      }
    },
    
    // Direct CSS injection - simple like uBlock
    userStylesheet: {
      styles: new Map(),
      
      add: function(cssText) {
        if (!cssText) return;
        
        // Create unique ID for this style
        const id = 'wh-style-' + this.styles.size;
        
        // Check if already exists
        if (document.getElementById(id)) return;
        
        // Create and inject style element
        const style = document.createElement('style');
        style.id = id;
        style.textContent = cssText;
        
        // Add to head or documentElement
        (document.head || document.documentElement).appendChild(style);
        
        // Track it
        this.styles.set(id, style);
      },
      
      remove: function(id) {
        const style = this.styles.get(id);
        if (style && style.parentNode) {
          style.parentNode.removeChild(style);
          this.styles.delete(id);
        }
      },
      
      removeAll: function() {
        for (const [id, style] of this.styles) {
          if (style.parentNode) {
            style.parentNode.removeChild(style);
          }
        }
        this.styles.clear();
      }
    }
  };
  
  // Add to namespace
  window.webHighlighter.core.vAPI = vAPI;
  window.webHighlighter.log('vAPI initialized');
  
})();