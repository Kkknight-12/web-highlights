/**
 * Selection Module
 * Handles all text selection operations and validation
 * Following the modular pattern from CHROME_EXTENSION_ARCHITECTURE_GUIDE.md
 */

const SelectionModule = (() => {
  // Private state
  let initialized = false;
  let selectionTimer = null;
  let debouncedHandler = null;

  // Private methods
  function isInputField(element) {
    if (!element || element.nodeType !== Constants.NODE_TYPES.ELEMENT) {
      return false;
    }
    
    const tagName = element.tagName?.toLowerCase();
    const isInput = tagName === 'input' || tagName === 'textarea';
    const isContentEditable = element.contentEditable === 'true';
    const hasEditableParent = element.closest('[contenteditable="true"]');
    
    return isInput || isContentEditable || !!hasEditableParent;
  }

  function getSelectionBounds(range) {
    try {
      const rect = range.getBoundingClientRect();
      return {
        left: rect.left + window.scrollX,
        top: rect.top + window.scrollY,
        right: rect.right + window.scrollX,
        bottom: rect.bottom + window.scrollY,
        width: rect.width,
        height: rect.height
      };
    } catch (error) {
      console.error('Failed to get selection bounds:', error);
      return null;
    }
  }

  function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  }

  // Public API
  return {
    /**
     * Initialize the module
     */
    async init() {
      if (initialized) return;
      
      // Update StateManager if available (already registered by content.js)
      if (typeof StateManager !== 'undefined') {
        StateManager.set('selection', {
          hasSelection: false,
          selectedText: '',
          selectionBounds: null,
          isValid: false
        });
      }
      
      // Create debounced handler
      debouncedHandler = debounce(this.handleTextSelection.bind(this), Constants.DEBOUNCE_DELAY);
      
      // Set up event listeners
      this.setupListeners();
      
      initialized = true;
      EventBus.emit('selection:initialized');
    },

    /**
     * Cleanup the module
     */
    destroy() {
      this.removeListeners();
      if (selectionTimer) {
        clearTimeout(selectionTimer);
        selectionTimer = null;
      }
      debouncedHandler = null;
      initialized = false;
    },

    /**
     * Set up selection event listeners
     */
    setupListeners() {
      // Use both mouseup and selectionchange for better coverage
      document.addEventListener('mouseup', this.handleMouseUp.bind(this));
      document.addEventListener('selectionchange', debouncedHandler);
      
      // Touch support
      document.addEventListener('touchend', this.handleMouseUp.bind(this));
    },

    /**
     * Remove event listeners
     */
    removeListeners() {
      document.removeEventListener('mouseup', this.handleMouseUp.bind(this));
      document.removeEventListener('selectionchange', debouncedHandler);
      document.removeEventListener('touchend', this.handleMouseUp.bind(this));
    },

    /**
     * Handle mouse up event
     * @param {Event} event - Mouse or touch event
     */
    handleMouseUp(event) {
      // Add small delay to ensure selection is complete
      if (selectionTimer) {
        clearTimeout(selectionTimer);
      }
      
      selectionTimer = setTimeout(() => {
        this.handleTextSelection(event);
      }, 50);
    },

    /**
     * Handle text selection
     * @param {Event} event - Optional event object
     */
    handleTextSelection(event) {
      try {
        const selection = window.getSelection();
        const text = selection.toString().trim();
        
        // Clear selection state if no text selected
        if (!text || selection.rangeCount === 0) {
          this.clearSelection();
          return;
        }
        
        // Check if selection is valid
        const range = selection.getRangeAt(0);
        const isValid = this.isValidSelection(range, event);
        
        if (!isValid) {
          this.clearSelection();
          return;
        }
        
        // Get selection info
        const selectionInfo = this.getSelectionInfo(selection, range);
        
        // Update state
        if (typeof StateManager !== 'undefined') {
          StateManager.set('selection', {
            hasSelection: true,
            selectedText: text,
            selectionBounds: selectionInfo.bounds,
            isValid: true
          });
        }
        
        // Emit selection events
        EventBus.emit('selection:changed', selectionInfo);
        EventBus.emit('selection:valid', selectionInfo);
        
      } catch (error) {
        console.error('Error handling text selection:', error);
        this.clearSelection();
      }
    },

    /**
     * Get detailed selection information
     * @param {Selection} selection - Window selection object
     * @param {Range} range - Selection range
     * @returns {Object} Selection information
     */
    getSelectionInfo(selection, range) {
      const text = selection.toString();
      const bounds = getSelectionBounds(range);
      
      return {
        text: text.trim(),
        fullText: text,
        range: range.cloneRange(),
        bounds: bounds,
        startContainer: range.startContainer,
        endContainer: range.endContainer,
        startOffset: range.startOffset,
        endOffset: range.endOffset,
        commonAncestor: range.commonAncestorContainer,
        timestamp: Date.now()
      };
    },

    /**
     * Check if selection is valid for highlighting
     * @param {Range} range - Selection range
     * @param {Event} event - Optional event object
     * @returns {boolean} Whether selection is valid
     */
    isValidSelection(range, event) {
      try {
        // Check if range is collapsed
        if (range.collapsed) {
          return false;
        }
        
        // Check text content
        const text = range.toString().trim();
        if (!text || text.length === 0) {
          return false;
        }
        
        // Check if selection is in input field
        const commonAncestor = range.commonAncestorContainer;
        const parentElement = commonAncestor.nodeType === Constants.NODE_TYPES.TEXT ? 
          commonAncestor.parentElement : commonAncestor;
        
        if (parentElement && isInputField(parentElement)) {
          return false;
        }
        
        // Check event target if available
        if (event && event.target) {
          const target = event.target;
          const element = target.nodeType === Constants.NODE_TYPES.ELEMENT ? 
            target : target.parentElement;
          
          if (element && isInputField(element)) {
            return false;
          }
        }
        
        // Check bounds
        const bounds = getSelectionBounds(range);
        if (!bounds || bounds.width === 0 || bounds.height === 0) {
          return false;
        }
        
        // Check if selection is in extension UI
        const isInExtensionUI = parentElement?.closest('#web-highlighter-button-container') ||
                              parentElement?.closest('#web-highlighter-toolbar');
        if (isInExtensionUI) {
          return false;
        }
        
        return true;
      } catch (error) {
        console.error('Error validating selection:', error);
        return false;
      }
    },

    /**
     * Clear current selection
     */
    clearSelection() {
      // Update state
      if (typeof StateManager !== 'undefined') {
        StateManager.set('selection', {
          hasSelection: false,
          selectedText: '',
          selectionBounds: null,
          isValid: false
        });
      }
      
      // Emit clear event
      EventBus.emit('selection:cleared');
    },

    /**
     * Get current selection text
     * @returns {string} Selected text
     */
    getSelectedText() {
      const selection = window.getSelection();
      return selection.toString().trim();
    },

    /**
     * Get current selection range
     * @returns {Range|null} Selection range or null
     */
    getSelectedRange() {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        return selection.getRangeAt(0);
      }
      return null;
    },

    /**
     * Check if there's currently a valid selection
     * @returns {boolean} Whether there's a valid selection
     */
    hasValidSelection() {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        return false;
      }
      
      const range = selection.getRangeAt(0);
      return this.isValidSelection(range);
    },

    /**
     * Programmatically select text in an element
     * @param {Element} element - Element containing text
     * @param {number} start - Start offset
     * @param {number} end - End offset
     */
    selectText(element, start = 0, end = null) {
      try {
        const selection = window.getSelection();
        const range = document.createRange();
        
        if (element.firstChild && element.firstChild.nodeType === Constants.NODE_TYPES.TEXT) {
          const textNode = element.firstChild;
          const textLength = textNode.textContent.length;
          
          range.setStart(textNode, Math.min(start, textLength));
          range.setEnd(textNode, Math.min(end || textLength, textLength));
          
          selection.removeAllRanges();
          selection.addRange(range);
          
          // Trigger selection change
          this.handleTextSelection();
        }
      } catch (error) {
        console.error('Error selecting text:', error);
      }
    },

    /**
     * Clear browser selection
     */
    clearBrowserSelection() {
      try {
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
        }
      } catch (error) {
        // Ignore errors when clearing selection
      }
    }
  };
})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SelectionModule;
}
// Also attach to window for browser usage
if (typeof window !== 'undefined') {
  window.Selection = SelectionModule;
}
