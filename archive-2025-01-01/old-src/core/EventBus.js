/**
 * EventBus Module
 * Central event system for loose coupling between modules
 * Following the Event-Driven Architecture pattern from CHROME_EXTENSION_ARCHITECTURE_GUIDE.md
 */

(function() {
  'use strict';
  
  // Check if namespace exists
  if (typeof self.webHighlighter !== 'object') {
    console.error('EventBus: webHighlighter namespace not found');
    return;
  }
  
  const EventBus = (() => {
  // Private state
  const events = new Map();
  let eventIdCounter = 0;
  const eventHistory = [];
  const maxHistorySize = 50;

  // Private methods
  function logEvent(eventName, data) {
    const entry = {
      id: ++eventIdCounter,
      event: eventName,
      data: data,
      timestamp: Date.now()
    };
    
    eventHistory.push(entry);
    
    // Keep history size manageable
    if (eventHistory.length > maxHistorySize) {
      eventHistory.shift();
    }
  }

  // Public API
  return {
    /**
     * Subscribe to an event
     * @param {string} eventName - Name of the event
     * @param {Function} handler - Handler function
     * @param {Object} options - Options: { once: boolean, filter: Function }
     * @returns {Function} Unsubscribe function
     */
    on(eventName, handler, options = {}) {
      if (!events.has(eventName)) {
        events.set(eventName, new Set());
      }

      const wrappedHandler = {
        handler,
        once: options.once || false,
        filter: options.filter || null
      };

      events.get(eventName).add(wrappedHandler);

      // Return unsubscribe function
      return () => {
        const handlers = events.get(eventName);
        if (handlers) {
          handlers.delete(wrappedHandler);
          if (handlers.size === 0) {
            events.delete(eventName);
          }
        }
      };
    },

    /**
     * Emit an event
     * @param {string} eventName - Name of the event
     * @param {*} data - Data to pass to handlers
     */
    emit(eventName, data = null) {
      logEvent(eventName, data);

      const handlers = events.get(eventName);
      if (!handlers || handlers.size === 0) return;

      // Create a copy to avoid issues if handlers modify the set
      const handlersCopy = new Set(handlers);

      handlersCopy.forEach(({ handler, once, filter }) => {
        // Apply filter if present
        if (filter && !filter(data)) return;

        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for '${eventName}':`, error);
        }

        // Remove if it was a one-time handler
        if (once) {
          handlers.delete({ handler, once, filter });
        }
      });
    },

    /**
     * Subscribe to an event for one emission only
     * @param {string} eventName - Name of the event
     * @param {Function} handler - Handler function
     * @returns {Function} Unsubscribe function
     */
    once(eventName, handler) {
      return this.on(eventName, handler, { once: true });
    },

    /**
     * Remove all handlers for an event
     * @param {string} eventName - Name of the event
     */
    off(eventName) {
      events.delete(eventName);
    },

    /**
     * Get all registered events
     * @returns {string[]} Array of event names
     */
    getEvents() {
      return Array.from(events.keys());
    },

    /**
     * Get handler count for an event
     * @param {string} eventName - Name of the event
     * @returns {number} Number of handlers
     */
    getHandlerCount(eventName) {
      const handlers = events.get(eventName);
      return handlers ? handlers.size : 0;
    },

    /**
     * Clear all events and handlers
     */
    clear() {
      events.clear();
      eventHistory.length = 0;
      eventIdCounter = 0;
    },

    /**
     * Get event history (for debugging)
     * @returns {Array} Recent event history
     */
    getHistory() {
      return [...eventHistory];
    }
  };
})();

  // Register with namespace
  self.webHighlighter.register('core', 'EventBus', EventBus);
  
  // Export for backward compatibility
  if (typeof window !== 'undefined') {
    window.EventBus = EventBus;
  }
  
})();