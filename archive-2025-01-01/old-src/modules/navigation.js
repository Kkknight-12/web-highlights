/**
 * Navigation Module
 * Handles SPA navigation, URL matching, and page change detection
 * Following the modular pattern from CHROME_EXTENSION_ARCHITECTURE_GUIDE.md
 */

const NavigationModule = (() => {
  // Private state
  let initialized = false;
  let lastUrl = '';
  let checkInterval = null;
  let navigationListeners = new Set();

  // Private methods
  function normalizeUrl(url) {
    try {
      const parsed = new URL(url);
      // Remove trailing slash
      let pathname = parsed.pathname.replace(/\/$/, '') || '/';
      // Normalize search params
      const params = parsed.searchParams;
      params.sort(); // Sort for consistency
      
      return `${parsed.origin}${pathname}${params.toString() ? '?' + params.toString() : ''}${parsed.hash}`;
    } catch (error) {
      console.error('Failed to normalize URL:', error);
      return url;
    }
  }

  function detectSPAFramework() {
    // Check for common SPA frameworks
    try {
      if (window.React || document.querySelector('[data-reactroot]')) return 'react';
      
      // Safely check for Vue
      const vueApp = document.querySelector('#app');
      if (window.Vue || (vueApp && vueApp.__vue__)) return 'vue';
      
      if (window.angular || document.querySelector('[ng-app]')) return 'angular';
      if (window.Ember) return 'ember';
    } catch (e) {
      // Framework detection failed, not critical
    }
    return 'unknown';
  }

  function setupHistoryListener() {
    // Override pushState and replaceState
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(...args) {
      try {
        originalPushState.apply(history, args);
      } catch (e) {
        // Ignore errors in file:// protocol or other restricted contexts
        console.warn('pushState failed:', e.message);
      }
      handleNavigation('pushState');
    };

    history.replaceState = function(...args) {
      try {
        originalReplaceState.apply(history, args);
      } catch (e) {
        // Ignore errors in file:// protocol or other restricted contexts
        console.warn('replaceState failed:', e.message);
      }
      handleNavigation('replaceState');
    };

    // Listen for popstate (back/forward buttons)
    window.addEventListener('popstate', () => {
      handleNavigation('popstate');
    });
  }

  function handleNavigation(trigger) {
    const currentUrl = window.location.href;
    
    // Check if URL actually changed
    if (currentUrl === lastUrl) {
      return;
    }

    const previousUrl = lastUrl;
    lastUrl = currentUrl;

    // Update state
    if (typeof StateManager !== 'undefined') {
      StateManager.set('navigation', {
        currentUrl: currentUrl,
        previousUrl: previousUrl,
        lastNavigationTime: Date.now()
      });
    }

    // Emit navigation event
    EventBus.emit('navigation:changed', {
      currentUrl,
      previousUrl,
      trigger
    });

    // Call registered listeners
    navigationListeners.forEach(listener => {
      try {
        listener({ currentUrl, previousUrl, trigger });
      } catch (error) {
        console.error('Navigation listener error:', error);
      }
    });
  }

  function startUrlPolling() {
    // Fallback for SPAs that don't use History API
    checkInterval = setInterval(() => {
      const currentUrl = window.location.href;
      if (currentUrl !== lastUrl) {
        handleNavigation('polling');
      }
    }, 1000);
  }

  function stopUrlPolling() {
    if (checkInterval) {
      clearInterval(checkInterval);
      checkInterval = null;
    }
  }

  // Public API
  return {
    /**
     * Initialize the module
     */
    async init() {
      if (initialized) return;

      // Set initial URL
      lastUrl = window.location.href;

      // Update StateManager if available (already registered by content.js)
      if (typeof StateManager !== 'undefined') {
        StateManager.set('navigation', {
          currentUrl: lastUrl,
          previousUrl: null,
          framework: detectSPAFramework(),
          lastNavigationTime: Date.now()
        });
      }

      // Set up navigation detection
      setupHistoryListener();
      
      // Start URL polling as fallback
      startUrlPolling();

      // Listen for page visibility changes
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          // Check for URL changes when page becomes visible
          const currentUrl = window.location.href;
          if (currentUrl !== lastUrl) {
            handleNavigation('visibility');
          }
        }
      });

      initialized = true;
      EventBus.emit('navigation:initialized');
    },

    /**
     * Cleanup the module
     */
    destroy() {
      stopUrlPolling();
      navigationListeners.clear();
      initialized = false;
    },

    /**
     * Register a navigation listener
     * @param {Function} callback - Function to call on navigation
     * @returns {Function} Unsubscribe function
     */
    onNavigation(callback) {
      navigationListeners.add(callback);
      return () => navigationListeners.delete(callback);
    },

    /**
     * Get the current URL
     * @returns {string} Current URL
     */
    getCurrentUrl() {
      return window.location.href;
    },

    /**
     * Get normalized URL for storage
     * @param {string} url - URL to normalize
     * @returns {string} Normalized URL
     */
    getStorageUrl(url = window.location.href) {
      // Normalize URL for consistent storage keys
      return normalizeUrl(url);
    },

    /**
     * Check if two URLs match (considering SPA routing)
     * @param {string} url1 - First URL
     * @param {string} url2 - Second URL
     * @returns {boolean} Whether URLs match
     */
    urlsMatch(url1, url2) {
      // Basic exact match
      if (url1 === url2) return true;

      // Normalize and compare
      const normalized1 = normalizeUrl(url1);
      const normalized2 = normalizeUrl(url2);
      
      if (normalized1 === normalized2) return true;

      // Compare without hash (for SPAs that use hash routing)
      try {
        const parsed1 = new URL(url1);
        const parsed2 = new URL(url2);
        
        // Compare origin and pathname
        if (parsed1.origin === parsed2.origin && 
            parsed1.pathname === parsed2.pathname) {
          
          // Check if search params are the same
          const params1 = Array.from(parsed1.searchParams.entries()).sort();
          const params2 = Array.from(parsed2.searchParams.entries()).sort();
          
          return JSON.stringify(params1) === JSON.stringify(params2);
        }
      } catch (error) {
        console.error('Error comparing URLs:', error);
      }

      return false;
    },

    /**
     * Filter highlights by current URL
     * @param {Array} highlights - All highlights
     * @param {string} currentUrl - Current page URL
     * @returns {Array} Filtered highlights
     */
    filterHighlightsByUrl(highlights, currentUrl = window.location.href) {
      if (!highlights || !Array.isArray(highlights)) {
        return [];
      }

      return highlights.filter(highlight => {
        if (!highlight.url) return false;
        return this.urlsMatch(highlight.url, currentUrl);
      });
    },

    /**
     * Check if navigation is to a different page
     * @param {string} newUrl - New URL
     * @returns {boolean} Whether it's a different page
     */
    isDifferentPage(newUrl) {
      try {
        const current = new URL(lastUrl);
        const next = new URL(newUrl);
        
        // Different origin or pathname means different page
        return current.origin !== next.origin || 
               current.pathname !== next.pathname;
      } catch (error) {
        return true;
      }
    },

    /**
     * Force a navigation check
     */
    checkNavigation() {
      const currentUrl = window.location.href;
      if (currentUrl !== lastUrl) {
        handleNavigation('manual');
      }
    },

    /**
     * Get navigation statistics
     * @returns {Object} Navigation stats
     */
    getStats() {
      const state = StateManager ? StateManager.get('navigation') : {};
      return {
        currentUrl: window.location.href,
        framework: state.framework || 'unknown',
        listenersCount: navigationListeners.size,
        pollingActive: !!checkInterval
      };
    }
  };
})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NavigationModule;
}
// Also attach to window for browser usage
if (typeof window !== 'undefined') {
  window.Navigation = NavigationModule;
}
