/**
 * Base Component Class
 * Provides lifecycle management and automatic event cleanup
 */

import { eventBus } from './event-bus.js'

class BaseComponent {
  constructor(name = 'Component') {
    this.name = name
    this.eventBus = eventBus
    this.abortController = new AbortController()
    this.isDestroyed = false
    this.listeners = new Map()
  }

  /**
   * Subscribe to an event with automatic cleanup
   * @param {string} eventName - Name of the event
   * @param {Function} handler - Event handler (will be bound to this)
   * @param {Object} options - Additional options for addEventListener
   */
  on(eventName, handler, options = {}) {
    if (this.isDestroyed) {
      console.warn(`[${this.name}] Cannot add listener after destroy`)
      return
    }

    // Bind handler to component instance
    const boundHandler = handler.bind(this)
    
    // Store for debugging
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set())
    }
    this.listeners.get(eventName).add(boundHandler)

    // Add listener with abort signal for automatic cleanup
    this.eventBus.on(eventName, boundHandler, {
      ...options,
      signal: this.abortController.signal
    })
  }

  /**
   * Subscribe to an event once
   * @param {string} eventName - Name of the event
   * @param {Function} handler - Event handler
   */
  once(eventName, handler) {
    this.on(eventName, handler, { once: true })
  }

  /**
   * Emit an event
   * @param {string} eventName - Name of the event
   * @param {*} data - Data to emit
   */
  emit(eventName, data) {
    if (this.isDestroyed) {
      console.warn(`[${this.name}] Cannot emit after destroy`)
      return
    }

    this.eventBus.emit(eventName, data)
  }

  /**
   * Remove a specific event listener
   * @param {string} eventName - Name of the event
   * @param {Function} handler - Original handler function
   */
  off(eventName, handler) {
    // Find the bound handler
    const listeners = this.listeners.get(eventName)
    if (listeners) {
      for (const boundHandler of listeners) {
        if (boundHandler.name === handler.name) {
          this.eventBus.off(eventName, boundHandler)
          listeners.delete(boundHandler)
          break
        }
      }
    }
  }

  /**
   * Initialize the component
   * Override this in subclasses
   */
  init() {
    console.log(`[${this.name}] Initializing`)
  }

  /**
   * Destroy the component and clean up all listeners
   */
  destroy() {
    if (this.isDestroyed) {
      return
    }

    console.log(`[${this.name}] Destroying`)
    
    // Abort all listeners at once
    this.abortController.abort()
    
    // Clear internal tracking
    this.listeners.clear()
    
    // Mark as destroyed
    this.isDestroyed = true
    
    // Call cleanup hook for subclasses
    this.onDestroy()
  }

  /**
   * Cleanup hook for subclasses
   * Override this to add custom cleanup logic
   */
  onDestroy() {
    // Override in subclasses
  }

  /**
   * Check if component is destroyed
   */
  isAlive() {
    return !this.isDestroyed
  }

  /**
   * Safe execution wrapper
   * @param {Function} fn - Function to execute
   * @param {*} fallback - Fallback value on error
   */
  safeExecute(fn, fallback = null) {
    if (this.isDestroyed) {
      return fallback
    }

    try {
      return fn()
    } catch (error) {
      this.handleError(error, { method: 'safeExecute' })
      return fallback
    }
  }

  /**
   * Safe async execution wrapper
   * @param {Function} fn - Async function to execute
   * @param {*} fallback - Fallback value on error
   */
  async safeExecuteAsync(fn, fallback = null) {
    if (this.isDestroyed) {
      return fallback
    }

    try {
      return await fn()
    } catch (error) {
      this.handleError(error, { method: 'safeExecuteAsync' })
      return fallback
    }
  }

  /**
   * Centralized error handler
   * @param {Error} error - The error object
   * @param {Object} context - Additional context
   */
  handleError(error, context = {}) {
    // Don't log errors if component is destroyed
    if (this.isDestroyed) {
      return
    }

    const errorInfo = {
      component: this.name,
      error: error.message,
      stack: error.stack,
      ...context
    }

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${this.name}] Error:`, error)
      console.error('Context:', errorInfo)
    }

    // Emit component error event
    this.eventBus.emit('component:error', errorInfo)
  }

  /**
   * Get component info for debugging
   */
  getInfo() {
    return {
      name: this.name,
      isDestroyed: this.isDestroyed,
      listenerCount: Array.from(this.listeners.values())
        .reduce((total, set) => total + set.size, 0),
      events: Array.from(this.listeners.keys())
    }
  }
}

export { BaseComponent }