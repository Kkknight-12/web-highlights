/**
 * Chrome Extension Context Monitor
 * Properly handles context invalidation without polling
 */

import { eventBus } from './event-bus.js'
import { EVENTS } from './events.js'

class ContextMonitor {
  constructor() {
    this.isValid = true
    this.handlers = new Set()
    this.hadSuccessfulConnection = false
  }

  /**
   * Initialize context monitoring
   */
  init() {
    if (typeof chrome === 'undefined' || !chrome.runtime) {
      return
    }

    // Method 1: Listen for port disconnect (most reliable)
    this.setupPortMonitoring()

    // Method 2: Listen for runtime.onSuspend (when available)
    if (chrome.runtime.onSuspend) {
      chrome.runtime.onSuspend.addListener(() => {
        this.handleInvalidation('suspend')
      })
    }

    // Method 3: Listen for runtime errors
    if (chrome.runtime.lastError) {
      this.handleInvalidation('runtime-error')
    }

    // Method 4: Page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.checkContext()
      }
    })

    // Method 5: Window focus (backup check)
    window.addEventListener('focus', () => {
      this.checkContext()
    })
  }

  /**
   * Setup port monitoring for connection state
   */
  setupPortMonitoring() {
    // Delay port creation to allow background script to initialize
    setTimeout(() => {
      try {
        // Check if we still have a valid runtime
        if (!chrome.runtime || !chrome.runtime.id) {
          return
        }
        
        // Create a port to background script
        const port = chrome.runtime.connect({ name: 'context-monitor' })
        
        port.onDisconnect.addListener(() => {
          // Only invalidate if we previously had a successful connection
          // and there's an actual error (not just initial connection failure)
          if (chrome.runtime.lastError && this.hadSuccessfulConnection) {
            this.handleInvalidation('port-disconnect')
          }
        })

        // Mark that we had a successful connection
        this.hadSuccessfulConnection = true
        
        // Keep port alive
        port.postMessage({ keepAlive: true })
        
        // Periodic keepalive (much less frequent than 5s)
        this.keepAliveInterval = setInterval(() => {
          try {
            if (chrome.runtime && chrome.runtime.id) {
              port.postMessage({ keepAlive: true })
            }
          } catch (e) {
            // Only invalidate if we previously had a successful connection
            if (this.hadSuccessfulConnection) {
              this.handleInvalidation('keepalive-failed')
            }
          }
        }, 30000) // 30 seconds instead of 5
        
      } catch (error) {
        // Don't warn on initial connection failure - this is expected
        // when the extension first loads
        if (this.hadSuccessfulConnection) {
          console.warn('[ContextMonitor] Failed to setup port monitoring:', error)
        }
      }
    }, 1000) // Wait 1 second before trying to connect
  }

  /**
   * Check context validity (only when needed)
   */
  checkContext() {
    if (!this.isValid) return

    try {
      // Quick check
      chrome.runtime.getManifest()
    } catch (error) {
      this.handleInvalidation('check-failed')
    }
  }

  /**
   * Handle context invalidation
   */
  handleInvalidation(reason) {
    if (!this.isValid) return

    console.warn(`[ContextMonitor] Context invalidated: ${reason}`)
    this.isValid = false

    // Clear any intervals
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval)
    }

    // Emit event
    eventBus.emit(EVENTS.SYSTEM.CONTEXT_INVALIDATED, { reason })

    // Call registered handlers
    this.handlers.forEach(handler => {
      try {
        handler(reason)
      } catch (error) {
        console.error('[ContextMonitor] Handler error:', error)
      }
    })
  }

  /**
   * Register invalidation handler
   */
  onInvalidated(handler) {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }

  /**
   * Check if context is valid
   */
  isContextValid() {
    return this.isValid
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval)
    }
    this.handlers.clear()
  }
}

// Export singleton
export const contextMonitor = new ContextMonitor()