/**
 * Highlighter Module using Rangy Library
 * Handles text highlighting with proper serialization/deserialization
 */

(function() {
  'use strict';
  
  // Wait for Rangy to be available
  if (!window.rangy) {
    console.error('Rangy library not loaded');
    return;
  }
  
  // Initialize Rangy
  rangy.init();
  
  // Highlight storage
  const highlights = new Map();
  let highlighter = null;
  let highlightIdCounter = 0;
  
  // Highlight colors configuration
  const highlightColors = {
    yellow: { className: 'highlight-yellow', css: 'background: rgba(255, 224, 102, 0.4); border-bottom: 2px solid rgba(255, 224, 102, 0.8);' },
    green: { className: 'highlight-green', css: 'background: rgba(110, 231, 183, 0.4); border-bottom: 2px solid rgba(110, 231, 183, 0.8);' },
    blue: { className: 'highlight-blue', css: 'background: rgba(147, 197, 253, 0.4); border-bottom: 2px solid rgba(147, 197, 253, 0.8);' },
    pink: { className: 'highlight-pink', css: 'background: rgba(252, 165, 165, 0.4); border-bottom: 2px solid rgba(252, 165, 165, 0.8);' }
  };
  
  // Inject CSS for all highlight colors
  function injectHighlightStyles() {
    let css = '.web-highlighter-highlight { cursor: pointer !important; transition: background-color 0.2s ease !important; }\n';
    
    for (const [color, config] of Object.entries(highlightColors)) {
      css += `.${config.className} { ${config.css} }\n`;
    }
    
    // Add hover effect
    css += '.web-highlighter-highlight:hover { filter: brightness(0.9); }\n';
    
    window.webHighlighter.core.vAPI.userStylesheet.add(css);
  }
  
  // Initialize Rangy highlighter
  function initializeHighlighter() {
    highlighter = rangy.createHighlighter();
    
    // Add class appliers for each color
    for (const [color, config] of Object.entries(highlightColors)) {
      const applier = rangy.createClassApplier(config.className, {
        elementTagName: 'span',
        elementProperties: {
          className: 'web-highlighter-highlight'
        },
        onElementCreate: function(element) {
          // Will be set when highlighting
        }
      });
      
      highlighter.addClassApplier(applier);
    }
  }
  
  // Generate unique ID
  function generateId() {
    return `highlight-${Date.now()}-${++highlightIdCounter}`;
  }
  
  // Get page key for storage
  function getPageKey() {
    return window.location.href;
  }
  
  // Create highlight from current selection
  function highlightSelection(color = 'yellow') {
    const selection = rangy.getSelection();
    
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      return null;
    }
    
    const id = generateId();
    const text = selection.toString().trim();
    
    if (!text) {
      return null;
    }
    
    try {
      // Apply highlight using Rangy
      const colorConfig = highlightColors[color];
      highlighter.highlightSelection(colorConfig.className);
      
      // Add data attributes to all highlight elements
      const highlightElements = document.querySelectorAll(`.${colorConfig.className}:not([data-highlight-id])`);
      highlightElements.forEach(element => {
        element.setAttribute('data-highlight-id', id);
        element.setAttribute('data-color', color);
      });
      
      // Serialize the highlight for storage
      const serialized = highlighter.serialize();
      
      // Create highlight object
      const highlight = {
        id: id,
        text: text,
        color: color,
        serialized: serialized,
        timestamp: Date.now(),
        url: getPageKey()
      };
      
      highlights.set(id, highlight);
      
      // Save to storage
      saveHighlight(highlight);
      
      // Clear selection
      selection.removeAllRanges();
      
      window.webHighlighter.log('Created highlight:', id);
      return highlight;
      
    } catch (error) {
      console.error('Failed to create highlight:', error);
      return null;
    }
  }
  
  // Save highlight to storage
  async function saveHighlight(highlight) {
    try {
      const url = getPageKey();
      const result = await chrome.storage.local.get(url);
      const pageHighlights = result[url] || [];
      
      // Add or update highlight
      const existingIndex = pageHighlights.findIndex(h => h.id === highlight.id);
      if (existingIndex >= 0) {
        pageHighlights[existingIndex] = highlight;
      } else {
        pageHighlights.push(highlight);
      }
      
      // Save back to storage
      const data = {};
      data[url] = pageHighlights;
      await chrome.storage.local.set(data);
      
      window.webHighlighter.log('Saved highlight to storage');
    } catch (error) {
      console.error('Failed to save highlight:', error);
    }
  }
  
  // Remove highlight
  async function removeHighlight(id) {
    // Find all elements with this highlight ID
    const elements = document.querySelectorAll(`[data-highlight-id="${id}"]`);
    
    elements.forEach(element => {
      // Unwrap the highlight
      const parent = element.parentNode;
      while (element.firstChild) {
        parent.insertBefore(element.firstChild, element);
      }
      element.remove();
    });
    
    // Remove from local storage
    highlights.delete(id);
    
    try {
      const url = getPageKey();
      const result = await chrome.storage.local.get(url);
      const pageHighlights = result[url] || [];
      
      // Filter out the removed highlight
      const updatedHighlights = pageHighlights.filter(h => h.id !== id);
      
      // Save back to storage
      const data = {};
      data[url] = updatedHighlights;
      await chrome.storage.local.set(data);
    } catch (error) {
      console.error('Failed to remove highlight from storage:', error);
    }
    
    window.webHighlighter.log('Removed highlight:', id);
  }
  
  // Update highlight color
  async function updateHighlightColor(id, newColor) {
    const highlight = highlights.get(id);
    if (!highlight) return;
    
    // Find all elements with this highlight ID
    const elements = document.querySelectorAll(`[data-highlight-id="${id}"]`);
    
    // Remove old color class and add new one
    const oldConfig = highlightColors[highlight.color];
    const newConfig = highlightColors[newColor];
    
    elements.forEach(element => {
      element.classList.remove(oldConfig.className);
      element.classList.add(newConfig.className);
      element.setAttribute('data-color', newColor);
    });
    
    // Update stored highlight
    highlight.color = newColor;
    highlights.set(id, highlight);
    
    // Save to storage
    await saveHighlight(highlight);
    
    window.webHighlighter.log('Updated highlight color:', id, newColor);
  }
  
  // Load highlights for current page
  async function loadHighlights() {
    try {
      const url = getPageKey();
      const result = await chrome.storage.local.get(url);
      const pageHighlights = result[url] || [];
      
      window.webHighlighter.log('Loading highlights for:', url, 'Count:', pageHighlights.length);
      
      // Clear existing highlights
      highlights.clear();
      removeAllHighlights();
      
      // Wait for DOM to stabilize
      setTimeout(() => {
        // Restore each highlight
        for (const highlight of pageHighlights) {
          try {
            highlights.set(highlight.id, highlight);
            restoreHighlight(highlight);
          } catch (error) {
            console.error('Failed to restore highlight:', highlight.id, error);
          }
        }
        
        window.webHighlighter.log('Restored highlights:', highlights.size);
      }, 100);
      
    } catch (error) {
      console.error('Failed to load highlights:', error);
    }
  }
  
  // Restore a highlight from serialized data
  function restoreHighlight(highlight) {
    try {
      if (!highlight.serialized) {
        window.webHighlighter.log('No serialized data for highlight:', highlight.id);
        return;
      }
      
      // Deserialize and apply the highlight
      highlighter.deserialize(highlight.serialized);
      
      // Add data attributes to restored elements
      const colorConfig = highlightColors[highlight.color];
      const elements = document.querySelectorAll(`.${colorConfig.className}:not([data-highlight-id])`);
      
      elements.forEach(element => {
        element.setAttribute('data-highlight-id', highlight.id);
        element.setAttribute('data-color', highlight.color);
      });
      
      window.webHighlighter.log('Restored highlight:', highlight.id);
      
    } catch (error) {
      window.webHighlighter.log('Failed to restore highlight:', highlight.id, error.message);
      // Could implement fallback text search here
    }
  }
  
  // Remove all highlights from DOM
  function removeAllHighlights() {
    const elements = document.querySelectorAll('.web-highlighter-highlight');
    elements.forEach(element => {
      const parent = element.parentNode;
      while (element.firstChild) {
        parent.insertBefore(element.firstChild, element);
      }
      element.remove();
    });
  }
  
  // Initialize module
  function init() {
    // Initialize Rangy highlighter
    initializeHighlighter();
    
    // Inject styles
    injectHighlightStyles();
    
    // Load existing highlights
    loadHighlights();
    
    // Handle clicks on highlights
    document.addEventListener('click', function(e) {
      const highlight = e.target.closest('.web-highlighter-highlight');
      if (highlight) {
        const id = highlight.dataset.highlightId;
        if (id && window.webHighlighter.ui.miniToolbar) {
          const rect = highlight.getBoundingClientRect();
          window.webHighlighter.ui.miniToolbar.show(rect, id);
        }
      }
    });
    
    window.webHighlighter.log('Rangy Highlighter initialized');
  }
  
  // Export API
  window.webHighlighter.modules.highlighter = {
    init: init,
    highlightSelection: highlightSelection,
    removeHighlight: removeHighlight,
    updateHighlightColor: updateHighlightColor,
    loadHighlights: loadHighlights,
    highlights: highlights
  };
  
})();