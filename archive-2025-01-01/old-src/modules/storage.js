/**
 * Storage Module
 * Handles all Chrome storage operations for highlights
 * Following the modular pattern from CHROME_EXTENSION_ARCHITECTURE_GUIDE.md
 */

const StorageModule = (() => {
  // Private state
  let initialized = false;
  let cache = null;
  let cacheTimestamp = 0;
  const CACHE_DURATION = 5000; // 5 seconds cache

  // Private methods
  function isContextValid() {
    try {
      return !!(chrome && chrome.runtime && chrome.runtime.id);
    } catch (e) {
      return false;
    }
  }

  function validateHighlight(highlight) {
    if (!highlight || typeof highlight !== 'object') {
      throw new Error('Invalid highlight: must be an object');
    }
    
    const required = ['id', 'text', 'url'];
    for (const field of required) {
      if (!highlight[field]) {
        throw new Error(`Invalid highlight: missing required field '${field}'`);
      }
    }
    
    return true;
  }

  function shouldUseCache() {
    return cache !== null && (Date.now() - cacheTimestamp) < CACHE_DURATION;
  }

  function updateCache(highlights) {
    cache = highlights;
    cacheTimestamp = Date.now();
  }

  function clearCache() {
    cache = null;
    cacheTimestamp = 0;
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
        StateManager.register('storage', {
          isLoading: false,
          lastError: null,
          highlightCount: 0
        });
      }
      
      // Listen for storage changes
      if (chrome.storage && chrome.storage.onChanged) {
        chrome.storage.onChanged.addListener((changes, areaName) => {
          if (areaName === 'local' && changes[Constants.STORAGE_KEY]) {
            clearCache();
            EventBus.emit('storage:changed', {
              oldValue: changes[Constants.STORAGE_KEY].oldValue,
              newValue: changes[Constants.STORAGE_KEY].newValue
            });
          }
        });
      }
      
      initialized = true;
      EventBus.emit('storage:initialized');
    },

    /**
     * Cleanup the module
     */
    destroy() {
      clearCache();
      initialized = false;
    },

    /**
     * Save a highlight to storage
     * @param {Object} highlight - Highlight object to save
     * @returns {Promise<boolean>} Success status
     */
    async saveHighlight(highlight) {
      if (!initialized) {
        console.warn('Storage module not initialized');
        return false;
      }

      try {
        if (!isContextValid()) {
          throw new Error(Constants.ERRORS.CONTEXT_INVALIDATED);
        }

        // Validate highlight data
        validateHighlight(highlight);

        // Update state
        if (typeof StateManager !== 'undefined') {
          StateManager.set('storage', 'isLoading', true);
        }

        // Get existing highlights
        const highlights = await this.getHighlights();
        
        // Check for duplicates
        const exists = highlights.some(h => h.id === highlight.id);
        if (exists) {
          console.warn(`Highlight ${highlight.id} already exists`);
          return false;
        }

        // Add new highlight
        highlights.push(highlight);
        
        // Save to storage
        await chrome.storage.local.set({ 
          [Constants.STORAGE_KEY]: highlights 
        });
        
        // Update cache
        updateCache(highlights);
        
        // Update state
        if (typeof StateManager !== 'undefined') {
          StateManager.set('storage', {
            isLoading: false,
            highlightCount: highlights.length,
            lastError: null
          });
        }

        // Emit event
        EventBus.emit('storage:highlight:saved', highlight);
        EventBus.emit('storage:highlightSaved', highlight);
        
        return true;
      } catch (error) {
        console.error('Failed to save highlight:', error);
        
        if (typeof StateManager !== 'undefined') {
          StateManager.set('storage', {
            isLoading: false,
            lastError: error.message
          });
        }
        
        EventBus.emit('storage:error', { 
          operation: 'save', 
          error: error.message 
        });
        
        return false;
      }
    },

    /**
     * Get all highlights from storage
     * @returns {Promise<Array>} Array of highlights
     */
    async getHighlights() {
      if (!isContextValid()) {
        return [];
      }

      try {
        // Return cached value if available
        if (shouldUseCache()) {
          return [...cache];
        }

        const result = await chrome.storage.local.get(Constants.STORAGE_KEY);
        const highlights = result[Constants.STORAGE_KEY] || [];
        
        // Update cache
        updateCache(highlights);
        
        // Update state
        if (typeof StateManager !== 'undefined') {
          StateManager.set('storage', 'highlightCount', highlights.length);
        }
        
        return highlights;
      } catch (error) {
        console.error('Failed to get highlights:', error);
        
        if (error.message?.includes('Extension context invalidated')) {
          EventBus.emit('storage:context:invalidated');
        }
        
        return [];
      }
    },

    /**
     * Get highlights for a specific URL
     * @param {string} url - URL to filter by
     * @returns {Promise<Array>} Filtered highlights
     */
    async getHighlightsByUrl(url) {
      const highlights = await this.getHighlights();
      return highlights.filter(h => h.url === url);
    },

    /**
     * Remove a specific highlight
     * @param {string} highlightId - ID of highlight to remove
     * @returns {Promise<boolean>} Success status
     */
    async removeHighlight(highlightId) {
      if (!initialized) {
        console.warn('Storage module not initialized');
        return false;
      }

      try {
        if (!isContextValid()) {
          throw new Error(Constants.ERRORS.CONTEXT_INVALIDATED);
        }

        if (!highlightId) {
          throw new Error('Invalid highlight ID');
        }

        // Update state
        if (typeof StateManager !== 'undefined') {
          StateManager.set('storage', 'isLoading', true);
        }

        const highlights = await this.getHighlights();
        const initialLength = highlights.length;
        const filtered = highlights.filter(h => h.id !== highlightId);
        
        if (filtered.length === initialLength) {
          console.warn(`Highlight ${highlightId} not found`);
          return false;
        }

        await chrome.storage.local.set({ 
          [Constants.STORAGE_KEY]: filtered 
        });
        
        // Update cache
        updateCache(filtered);
        
        // Update state
        if (typeof StateManager !== 'undefined') {
          StateManager.set('storage', {
            isLoading: false,
            highlightCount: filtered.length,
            lastError: null
          });
        }

        // Emit event
        EventBus.emit('storage:highlight:removed', highlightId);
        EventBus.emit('storage:highlightRemoved', { id: highlightId });
        
        return true;
      } catch (error) {
        console.error('Failed to remove highlight:', error);
        
        if (typeof StateManager !== 'undefined') {
          StateManager.set('storage', {
            isLoading: false,
            lastError: error.message
          });
        }
        
        EventBus.emit('storage:error', { 
          operation: 'remove', 
          error: error.message 
        });
        
        return false;
      }
    },

    /**
     * Update an existing highlight
     * @param {string} highlightId - ID of highlight to update
     * @param {Object} updates - Fields to update
     * @returns {Promise<boolean>} Success status
     */
    async updateHighlight(highlightId, updates) {
      if (!initialized) {
        console.warn('Storage module not initialized');
        return false;
      }

      try {
        if (!isContextValid()) {
          throw new Error(Constants.ERRORS.CONTEXT_INVALIDATED);
        }

        if (!highlightId || !updates) {
          throw new Error('Invalid parameters');
        }

        const highlights = await this.getHighlights();
        const index = highlights.findIndex(h => h.id === highlightId);
        
        if (index === -1) {
          console.warn(`Highlight ${highlightId} not found`);
          return false;
        }

        // Update highlight
        highlights[index] = { ...highlights[index], ...updates };
        
        // Validate updated highlight
        validateHighlight(highlights[index]);

        await chrome.storage.local.set({ 
          [Constants.STORAGE_KEY]: highlights 
        });
        
        // Update cache
        updateCache(highlights);
        
        // Emit event
        EventBus.emit('storage:highlight:updated', {
          id: highlightId,
          updates
        });
        
        return true;
      } catch (error) {
        console.error('Failed to update highlight:', error);
        
        EventBus.emit('storage:error', { 
          operation: 'update', 
          error: error.message 
        });
        
        return false;
      }
    },

    /**
     * Remove all highlights for current URL
     * @param {string} url - URL to clear highlights for
     * @returns {Promise<number>} Number of highlights removed
     */
    async clearHighlightsByUrl(url) {
      if (!initialized) {
        console.warn('Storage module not initialized');
        return 0;
      }

      try {
        if (!isContextValid()) {
          throw new Error(Constants.ERRORS.CONTEXT_INVALIDATED);
        }

        if (!url) {
          throw new Error('Invalid URL');
        }

        const highlights = await this.getHighlights();
        const filtered = highlights.filter(h => h.url !== url);
        const removedCount = highlights.length - filtered.length;

        if (removedCount > 0) {
          await chrome.storage.local.set({ 
            [Constants.STORAGE_KEY]: filtered 
          });
          
          // Update cache
          updateCache(filtered);
          
          // Update state
          if (typeof StateManager !== 'undefined') {
            StateManager.set('storage', 'highlightCount', filtered.length);
          }

          // Emit event
          EventBus.emit('storage:highlights:cleared', {
            url,
            count: removedCount
          });
        }

        return removedCount;
      } catch (error) {
        console.error('Failed to clear highlights:', error);
        
        EventBus.emit('storage:error', { 
          operation: 'clear', 
          error: error.message 
        });
        
        return 0;
      }
    },

    /**
     * Get storage statistics
     * @returns {Promise<Object>} Storage stats
     */
    async getStats() {
      const highlights = await this.getHighlights();
      const byUrl = {};
      const byColor = {};

      highlights.forEach(h => {
        // Count by URL
        byUrl[h.url] = (byUrl[h.url] || 0) + 1;
        
        // Count by color
        const color = h.color || Constants.DEFAULT_COLOR;
        byColor[color] = (byColor[color] || 0) + 1;
      });

      return {
        total: highlights.length,
        byUrl,
        byColor,
        cacheActive: shouldUseCache()
      };
    }
  };
})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageModule;
}
// Also attach to window for browser usage
if (typeof window !== 'undefined') {
  window.Storage = StorageModule;
}
