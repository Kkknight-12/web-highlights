/**
 * Highlighter Module
 * Handles all highlight creation, removal, and restoration operations
 * Following the modular pattern from CHROME_EXTENSION_ARCHITECTURE_GUIDE.md
 */

const HighlighterModule = (() => {
  // Private state
  let initialized = false;
  const loadedHighlights = new Set();
  let isLoading = false;

  // Private methods
  function generateHighlightId() {
    return `highlight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  function createHighlightSpan(id, color) {
    const span = document.createElement('span');
    span.className = Constants.HIGHLIGHT_CLASS;
    span.dataset.highlightId = id;
    span.dataset.color = color;
    
    // Apply styles
    const colorConfig = Constants.HIGHLIGHT_COLORS[color] || Constants.HIGHLIGHT_COLORS[Constants.DEFAULT_COLOR];
    span.style.cssText = `
      background-color: ${colorConfig.bg};
      border-bottom: 2px solid ${colorConfig.border};
      cursor: pointer;
      transition: ${Constants.ANIMATION.TRANSITION};
      display: inline;
    `;
    
    // Add hover effects
    span.addEventListener('mouseenter', function() {
      requestAnimationFrame(() => {
        try {
          this.style.filter = `brightness(${Constants.ANIMATION.HOVER_BRIGHTNESS})`;
        } catch (e) {
          // Ignore errors
        }
      });
    });
    
    span.addEventListener('mouseleave', function() {
      requestAnimationFrame(() => {
        try {
          this.style.filter = `brightness(${Constants.ANIMATION.NORMAL_BRIGHTNESS})`;
        } catch (e) {
          // Ignore errors
        }
      });
    });
    
    // Handle click events
    span.addEventListener('click', function(e) {
      e.stopPropagation();
      EventBus.emit('highlight:clicked', {
        id: id,
        element: this,
        rect: this.getBoundingClientRect()
      });
    });
    
    return span;
  }

  function getTextNodesInRange(range) {
    const textNodes = [];
    const commonAncestor = range.commonAncestorContainer;
    
    if (commonAncestor.nodeType === Constants.NODE_TYPES.TEXT) {
      return [commonAncestor];
    }
    
    const walker = document.createTreeWalker(
      commonAncestor,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          const nodeRange = document.createRange();
          nodeRange.selectNodeContents(node);
          
          if (range.compareBoundaryPoints(Range.END_TO_START, nodeRange) <= 0 &&
              range.compareBoundaryPoints(Range.START_TO_END, nodeRange) >= 0) {
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_REJECT;
        }
      }
    );
    
    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node);
    }
    
    return textNodes;
  }

  function wrapTextNode(node, range, span) {
    const nodeRange = document.createRange();
    
    if (node === range.startContainer && node === range.endContainer) {
      nodeRange.setStart(node, range.startOffset);
      nodeRange.setEnd(node, range.endOffset);
    } else if (node === range.startContainer) {
      nodeRange.setStart(node, range.startOffset);
      nodeRange.setEnd(node, node.textContent.length);
    } else if (node === range.endContainer) {
      nodeRange.setStart(node, 0);
      nodeRange.setEnd(node, range.endOffset);
    } else {
      nodeRange.selectNodeContents(node);
    }
    
    try {
      nodeRange.surroundContents(span.cloneNode(true));
    } catch (e) {
      // Fallback for complex selections
      const contents = nodeRange.extractContents();
      const clonedSpan = span.cloneNode(true);
      clonedSpan.appendChild(contents);
      nodeRange.insertNode(clonedSpan);
    }
  }

  function findTextNode(element, text) {
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          return node.textContent.includes(text) ? 
            NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
      }
    );
    
    return walker.nextNode();
  }

  // Public API
  return {
    /**
     * Initialize the module
     */
    async init() {
      if (initialized) return;
      
      // Register with StateManager
      if (typeof StateManager !== 'undefined') {
        StateManager.register('highlighter', {
          isLoading: false,
          loadedCount: 0,
          activeHighlightId: null
        });
      }
      
      // Listen for storage changes
      EventBus.on('storage:changed', () => {
        this.reloadHighlights();
      });
      
      // Listen for navigation
      EventBus.on('navigation:changed', () => {
        loadedHighlights.clear();
        this.loadHighlights();
      });
      
      initialized = true;
      EventBus.emit('highlighter:initialized');
    },

    /**
     * Cleanup the module
     */
    destroy() {
      loadedHighlights.clear();
      isLoading = false;
      initialized = false;
    },

    /**
     * Create a new highlight from a range
     * @param {Range} range - The DOM range to highlight
     * @param {string} text - The text content
     * @param {string} color - The highlight color
     * @returns {Object} Highlight data object
     */
    createHighlight(range, text, color = Constants.DEFAULT_COLOR) {
      if (!initialized) {
        console.warn('Highlighter module not initialized');
        return null;
      }

      if (!range || !text) {
        console.error('Invalid range or text');
        return null;
      }

      const highlightId = generateHighlightId();
      
      // Apply highlight to DOM
      this.applyHighlight(range, highlightId, color);
      
      // Create highlight data
      const highlightData = {
        id: highlightId,
        text: text,
        color: color,
        url: window.location.href,
        timestamp: Date.now(),
        startOffset: range.startOffset,
        endOffset: range.endOffset
      };
      
      // Add to loaded set
      loadedHighlights.add(highlightId);
      
      // Update state
      if (typeof StateManager !== 'undefined') {
        StateManager.set('highlighter', 'loadedCount', loadedHighlights.size);
      }
      
      // Emit event
      EventBus.emit('highlighter:created', highlightData);
      
      return highlightData;
    },

    /**
     * Apply highlight to a range
     * @param {Range} range - The DOM range
     * @param {string} id - Highlight ID
     * @param {string} color - Highlight color
     */
    applyHighlight(range, id, color) {
      try {
        const textNodes = getTextNodesInRange(range);
        const span = createHighlightSpan(id, color);
        
        textNodes.forEach(node => {
          wrapTextNode(node, range, span);
        });
        
        EventBus.emit('highlighter:applied', { id, color });
      } catch (error) {
        console.error('Failed to apply highlight:', error);
        EventBus.emit('highlighter:error', { 
          operation: 'apply', 
          error: error.message 
        });
      }
    },

    /**
     * Remove a highlight by ID
     * @param {string} highlightId - The highlight ID to remove
     */
    removeHighlight(highlightId) {
      if (!highlightId) {
        console.error('Invalid highlight ID');
        return;
      }

      try {
        // Remove from DOM
        const elements = document.querySelectorAll(`[data-highlight-id="${highlightId}"]`);
        elements.forEach(element => {
          const parent = element.parentNode;
          while (element.firstChild) {
            parent.insertBefore(element.firstChild, element);
          }
          parent.removeChild(element);
        });
        
        // Remove from loaded set
        loadedHighlights.delete(highlightId);
        
        // Update state
        if (typeof StateManager !== 'undefined') {
          StateManager.set('highlighter', 'loadedCount', loadedHighlights.size);
        }
        
        // Emit event
        EventBus.emit('highlighter:removed', highlightId);
      } catch (error) {
        console.error('Failed to remove highlight:', error);
        EventBus.emit('highlighter:error', { 
          operation: 'remove', 
          error: error.message 
        });
      }
    },

    /**
     * Remove all highlights from the page
     */
    removeAllHighlights() {
      try {
        const elements = document.querySelectorAll(`.${Constants.HIGHLIGHT_CLASS}`);
        elements.forEach(element => {
          const parent = element.parentNode;
          while (element.firstChild) {
            parent.insertBefore(element.firstChild, element);
          }
          parent.removeChild(element);
        });
        
        // Clear loaded set
        loadedHighlights.clear();
        
        // Update state
        if (typeof StateManager !== 'undefined') {
          StateManager.set('highlighter', 'loadedCount', 0);
        }
        
        // Emit event
        EventBus.emit('highlighter:allRemoved');
      } catch (error) {
        console.error('Failed to remove all highlights:', error);
        EventBus.emit('highlighter:error', { 
          operation: 'removeAll', 
          error: error.message 
        });
      }
    },

    /**
     * Load highlights from storage for current page
     */
    async loadHighlights() {
      if (!initialized || isLoading) return;
      
      // Check if highlights already loaded
      const existingHighlights = document.querySelectorAll(`.${Constants.HIGHLIGHT_CLASS}`);
      if (existingHighlights.length > 0 && loadedHighlights.size > 0) {
        return;
      }
      
      isLoading = true;
      
      // Update state
      if (typeof StateManager !== 'undefined') {
        StateManager.set('highlighter', 'isLoading', true);
      }
      
      try {
        // Get highlights from storage
        const highlights = await StorageModule.getHighlightsByUrl(window.location.href);
        
        // Apply each highlight
        highlights.forEach(highlight => {
          if (!loadedHighlights.has(highlight.id)) {
            this.restoreHighlight(highlight);
          }
        });
        
        // Update state
        if (typeof StateManager !== 'undefined') {
          StateManager.set('highlighter', {
            isLoading: false,
            loadedCount: loadedHighlights.size
          });
        }
        
        EventBus.emit('highlighter:loaded', { count: highlights.length });
      } catch (error) {
        console.error('Failed to load highlights:', error);
        EventBus.emit('highlighter:error', { 
          operation: 'load', 
          error: error.message 
        });
      } finally {
        isLoading = false;
        if (typeof StateManager !== 'undefined') {
          StateManager.set('highlighter', 'isLoading', false);
        }
      }
    },

    /**
     * Reload highlights (e.g., after storage change)
     */
    async reloadHighlights() {
      this.removeAllHighlights();
      await this.loadHighlights();
    },

    /**
     * Restore a single highlight
     * @param {Object} highlight - Highlight data
     */
    restoreHighlight(highlight) {
      try {
        // Skip if already loaded
        if (loadedHighlights.has(highlight.id) || 
            document.querySelector(`[data-highlight-id="${highlight.id}"]`)) {
          return;
        }
        
        // Try text search restoration
        const success = this.restoreByTextSearch(highlight);
        
        if (success) {
          loadedHighlights.add(highlight.id);
        }
      } catch (error) {
        console.error('Failed to restore highlight:', error);
      }
    },

    /**
     * Restore highlight by searching for text
     * @param {Object} highlight - Highlight data
     * @returns {boolean} Success status
     */
    restoreByTextSearch(highlight) {
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: function(node) {
            // Skip already highlighted text
            if (node.parentElement?.classList?.contains(Constants.HIGHLIGHT_CLASS)) {
              return NodeFilter.FILTER_REJECT;
            }
            // Check if contains the highlight text
            return node.textContent.includes(highlight.text) ? 
              NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
          }
        }
      );
      
      let node;
      while (node = walker.nextNode()) {
        const startOffset = node.textContent.indexOf(highlight.text);
        if (startOffset !== -1) {
          const range = document.createRange();
          range.setStart(node, startOffset);
          range.setEnd(node, startOffset + highlight.text.length);
          
          this.applyHighlight(range, highlight.id, highlight.color || Constants.DEFAULT_COLOR);
          return true;
        }
      }
      
      return false;
    },

    /**
     * Get all loaded highlight IDs
     * @returns {Array} Array of highlight IDs
     */
    getLoadedHighlightIds() {
      return Array.from(loadedHighlights);
    },

    /**
     * Check if a highlight is loaded
     * @param {string} highlightId - Highlight ID
     * @returns {boolean} Whether the highlight is loaded
     */
    isHighlightLoaded(highlightId) {
      return loadedHighlights.has(highlightId);
    }
  };
})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = HighlighterModule;
}
// Also attach to window for browser usage
if (typeof window !== 'undefined') {
  window.Highlighter = HighlighterModule;
}
