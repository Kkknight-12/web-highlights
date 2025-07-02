/**
 * Event Bus System for Chrome Extension
 * Provides a centralized event system with memory management
 */

class EventBus extends EventTarget {
  constructor() {
    super()
    this.eventCounts = new Map()
    this.errorCounts = new Map()
    this.debug = false // Set to true for event logging
    this.errorHandlers = []
  }

  /**
   * Emit an event with optional data
   * @param {string} eventName - Name of the event
   * @param {*} data - Data to pass with the event
   */
  emit(eventName, data = null) {
    try {
      if (this.debug) {
        console.log(`[EventBus] Emitting: ${eventName}`, data)
      }

      // Track event counts for debugging
      this.eventCounts.set(eventName, (this.eventCounts.get(eventName) || 0) + 1)

      const event = new CustomEvent(eventName, {
        detail: data,
        bubbles: false,
        cancelable: true
      })

      this.dispatchEvent(event)
    } catch (error) {
      this.handleError(eventName, error, { phase: 'emit', data })
    }
  }

  /**
   * Subscribe to an event
   * @param {string} eventName - Name of the event
   * @param {Function} handler - Event handler function
   * @param {Object} options - addEventListener options
   */
  on(eventName, handler, options = {}) {
    if (this.debug) {
      console.log(`[EventBus] Subscribing to: ${eventName}`)
    }

    // Wrap handler in error boundary
    const safeHandler = this.createSafeHandler(eventName, handler)
    
    // Store original handler reference for removal
    safeHandler._originalHandler = handler
    
    this.addEventListener(eventName, safeHandler, options)
  }

  /**
   * Subscribe to an event once
   * @param {string} eventName - Name of the event
   * @param {Function} handler - Event handler function
   */
  once(eventName, handler) {
    this.on(eventName, handler, { once: true })
  }

  /**
   * Unsubscribe from an event
   * @param {string} eventName - Name of the event
   * @param {Function} handler - Event handler function
   */
  off(eventName, handler) {
    if (this.debug) {
      console.log(`[EventBus] Unsubscribing from: ${eventName}`)
    }

    this.removeEventListener(eventName, handler)
  }

  /**
   * Remove all listeners for a specific event
   * @param {string} eventName - Name of the event
   */
  removeAllListeners(eventName) {
    // Note: This is a simplified version. In production, you'd track listeners
    console.warn(`[EventBus] removeAllListeners not fully implemented for: ${eventName}`)
  }

  /**
   * Get event statistics for debugging
   */
  getStats() {
    return {
      eventCounts: Object.fromEntries(this.eventCounts),
      totalEvents: Array.from(this.eventCounts.values()).reduce((a, b) => a + b, 0),
      errorCounts: Object.fromEntries(this.errorCounts),
      totalErrors: Array.from(this.errorCounts.values()).reduce((a, b) => a + b, 0)
    }
  }

  /**
   * Reset event statistics
   */
  resetStats() {
    this.eventCounts.clear()
  }

  /**
   * Enable/disable debug logging
   */
  setDebug(enabled) {
    this.debug = enabled
  }

  /**
   * Create a safe handler that catches errors
   */
  createSafeHandler(eventName, handler) {
    return (event) => {
      try {
        handler(event)
      } catch (error) {
        this.handleError(eventName, error, { 
          phase: 'handler', 
          handler: handler.name || 'anonymous',
          event: event.detail 
        })
      }
    }
  }

  /**
   * Handle errors in event system
   */
  handleError(eventName, error, context) {
    // Track error counts
    this.errorCounts.set(eventName, (this.errorCounts.get(eventName) || 0) + 1)
    
    // Log error in development
    if (process.env.NODE_ENV === 'development') {
      console.error(`[EventBus] Error in ${context.phase} for event "${eventName}":`, error)
      console.error('Context:', context)
    }
    
    // Call registered error handlers
    this.errorHandlers.forEach(handler => {
      try {
        handler({ eventName, error, context })
      } catch (handlerError) {
        console.error('[EventBus] Error in error handler:', handlerError)
      }
    })
    
    // Emit error event (be careful not to create infinite loop)
    if (eventName !== 'eventbus:error') {
      this.emit('eventbus:error', { eventName, error, context })
    }
  }

  /**
   * Register global error handler
   */
  onError(handler) {
    this.errorHandlers.push(handler)
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    return {
      errorCounts: Object.fromEntries(this.errorCounts),
      totalErrors: Array.from(this.errorCounts.values()).reduce((a, b) => a + b, 0)
    }
  }
}

// Create singleton instance
const eventBus = new EventBus()

// Freeze the instance to prevent modifications
Object.freeze(eventBus)

export { EventBus, eventBus }