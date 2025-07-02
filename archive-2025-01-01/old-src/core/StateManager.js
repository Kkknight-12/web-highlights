/**
 * StateManager Module
 * Centralized state management for all modules
 * Following the State Management pattern from CHROME_EXTENSION_ARCHITECTURE_GUIDE.md
 */

const StateManager = (() => {
  // Private state
  const modules = new Map();
  const stateHistory = [];
  const maxHistorySize = 20;
  let historyEnabled = true;

  // Private methods
  function recordHistory(moduleName, key, oldValue, newValue) {
    if (!historyEnabled) return;

    stateHistory.push({
      module: moduleName,
      key,
      oldValue,
      newValue,
      timestamp: Date.now()
    });

    if (stateHistory.length > maxHistorySize) {
      stateHistory.shift();
    }
  }

  function notifySubscribers(moduleName, key, value, oldValue) {
    const module = modules.get(moduleName);
    if (!module) return;

    module.subscribers.forEach(({ callback, filter }) => {
      // Apply filter if present
      if (filter && !filter(key, value, oldValue)) return;

      try {
        callback({
          module: moduleName,
          key,
          value,
          oldValue,
          state: module.state
        });
      } catch (error) {
        console.error(`State subscriber error in ${moduleName}:`, error);
      }
    });
  }

  // Public API
  return {
    /**
     * Register a module with initial state
     * @param {string} moduleName - Name of the module
     * @param {Object} initialState - Initial state object
     */
    register(moduleName, initialState = {}) {
      if (modules.has(moduleName)) {
        console.warn(`Module '${moduleName}' already registered`);
        return;
      }

      modules.set(moduleName, {
        state: { ...initialState },
        initialState: { ...initialState },
        subscribers: new Set()
      });
    },

    /**
     * Get state value
     * @param {string} moduleName - Name of the module
     * @param {string} key - State key (supports dot notation)
     * @returns {*} State value
     */
    get(moduleName, key = null) {
      const module = modules.get(moduleName);
      if (!module) {
        console.warn(`Module '${moduleName}' not registered`);
        return undefined;
      }

      // Return entire state if no key
      if (!key) return { ...module.state };

      // Support dot notation (e.g., 'settings.color')
      const keys = key.split('.');
      let value = module.state;

      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = value[k];
        } else {
          return undefined;
        }
      }

      return value;
    },

    /**
     * Set state value
     * @param {string} moduleName - Name of the module
     * @param {string|Object} keyOrUpdates - Key or object with updates
     * @param {*} value - Value (if key is string)
     */
    set(moduleName, keyOrUpdates, value) {
      const module = modules.get(moduleName);
      if (!module) {
        console.warn(`Module '${moduleName}' not registered`);
        return;
      }

      let updates = {};
      
      // Handle both set(module, key, value) and set(module, {key: value})
      if (typeof keyOrUpdates === 'string') {
        updates[keyOrUpdates] = value;
      } else {
        updates = keyOrUpdates;
      }

      // Apply updates and track changes
      Object.entries(updates).forEach(([key, newValue]) => {
        const oldValue = module.state[key];
        
        if (oldValue !== newValue) {
          module.state[key] = newValue;
          recordHistory(moduleName, key, oldValue, newValue);
          notifySubscribers(moduleName, key, newValue, oldValue);
        }
      });
    },

    /**
     * Subscribe to state changes
     * @param {string} moduleName - Name of the module
     * @param {Function} callback - Callback function
     * @param {Object} options - Options: { filter: Function }
     * @returns {Function} Unsubscribe function
     */
    subscribe(moduleName, callback, options = {}) {
      const module = modules.get(moduleName);
      if (!module) {
        console.warn(`Module '${moduleName}' not registered`);
        return () => {};
      }

      const subscriber = {
        callback,
        filter: options.filter || null
      };

      module.subscribers.add(subscriber);

      // Return unsubscribe function
      return () => {
        module.subscribers.delete(subscriber);
      };
    },

    /**
     * Reset module state to initial
     * @param {string} moduleName - Name of the module
     */
    reset(moduleName) {
      const module = modules.get(moduleName);
      if (!module) {
        console.warn(`Module '${moduleName}' not registered`);
        return;
      }

      const oldState = { ...module.state };
      module.state = { ...module.initialState };

      // Notify about all changes
      Object.keys(module.state).forEach(key => {
        if (oldState[key] !== module.state[key]) {
          notifySubscribers(moduleName, key, module.state[key], oldState[key]);
        }
      });
    },

    /**
     * Get all registered modules
     * @returns {string[]} Array of module names
     */
    getModules() {
      return Array.from(modules.keys());
    },

    /**
     * Get state history
     * @param {string} moduleName - Optional: filter by module
     * @returns {Array} State history
     */
    getHistory(moduleName = null) {
      if (moduleName) {
        return stateHistory.filter(entry => entry.module === moduleName);
      }
      return [...stateHistory];
    },

    /**
     * Clear all state and subscribers
     */
    clear() {
      modules.clear();
      stateHistory.length = 0;
    },

    /**
     * Enable/disable history tracking
     * @param {boolean} enabled - Whether to track history
     */
    setHistoryEnabled(enabled) {
      historyEnabled = enabled;
      if (!enabled) {
        stateHistory.length = 0;
      }
    }
  };
})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StateManager;
}

// Also attach to window for browser usage
if (typeof window !== 'undefined') {
  window.StateManager = StateManager;
}