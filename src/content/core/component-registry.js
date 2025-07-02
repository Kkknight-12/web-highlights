/**
 * Component Registry
 * Manages lifecycle of all components in the system
 */

import { eventBus } from './event-bus.js'
import { EVENTS } from './events.js'

class ComponentRegistry {
  constructor() {
    this.components = new Map()
    this.initOrder = []
    this.isInitialized = false
  }

  /**
   * Register a component
   * @param {string} name - Unique component name
   * @param {BaseComponent} component - Component instance
   * @param {Object} options - Registration options
   */
  register(name, component, options = {}) {
    if (this.components.has(name)) {
      console.warn(`[ComponentRegistry] Component "${name}" already registered`)
      return false
    }

    this.components.set(name, {
      component,
      options,
      initialized: false
    })

    // Track initialization order
    if (options.priority !== undefined) {
      this.initOrder.push({ name, priority: options.priority })
      this.initOrder.sort((a, b) => b.priority - a.priority)
    } else {
      this.initOrder.push({ name, priority: 0 })
    }

    // Emit registration event
    eventBus.emit(EVENTS.SYSTEM.COMPONENT_REGISTERED, { name, component })

    console.log(`[ComponentRegistry] Registered: ${name}`)
    return true
  }

  /**
   * Get a component by name
   * @param {string} name - Component name
   */
  get(name) {
    const entry = this.components.get(name)
    return entry ? entry.component : null
  }

  /**
   * Check if a component is registered
   * @param {string} name - Component name
   */
  has(name) {
    return this.components.has(name)
  }

  /**
   * Initialize all components in order
   */
  async initializeAll() {
    if (this.isInitialized) {
      console.warn('[ComponentRegistry] Already initialized')
      return
    }

    console.log('[ComponentRegistry] Initializing all components')
    
    for (const { name } of this.initOrder) {
      await this.initialize(name)
    }

    this.isInitialized = true
    eventBus.emit(EVENTS.SYSTEM.INITIALIZED)
  }

  /**
   * Initialize a specific component
   * @param {string} name - Component name
   */
  async initialize(name) {
    const entry = this.components.get(name)
    if (!entry) {
      console.error(`[ComponentRegistry] Component "${name}" not found`)
      return false
    }

    if (entry.initialized) {
      console.warn(`[ComponentRegistry] Component "${name}" already initialized`)
      return true
    }

    try {
      console.log(`[ComponentRegistry] Initializing: ${name}`)
      
      // Call component's init method
      if (typeof entry.component.init === 'function') {
        await entry.component.init()
      }
      
      entry.initialized = true
      return true
    } catch (error) {
      console.error(`[ComponentRegistry] Failed to initialize "${name}":`, error)
      return false
    }
  }

  /**
   * Destroy a specific component
   * @param {string} name - Component name
   */
  destroy(name) {
    const entry = this.components.get(name)
    if (!entry) {
      return false
    }

    try {
      // Call component's destroy method
      if (typeof entry.component.destroy === 'function') {
        entry.component.destroy()
      }

      // Remove from registry
      this.components.delete(name)
      this.initOrder = this.initOrder.filter(item => item.name !== name)

      // Emit destruction event
      eventBus.emit(EVENTS.SYSTEM.COMPONENT_DESTROYED, { name })

      console.log(`[ComponentRegistry] Destroyed: ${name}`)
      return true
    } catch (error) {
      console.error(`[ComponentRegistry] Error destroying "${name}":`, error)
      return false
    }
  }

  /**
   * Destroy all components
   */
  destroyAll() {
    console.log('[ComponentRegistry] Destroying all components')
    
    // Destroy in reverse order of initialization
    const names = [...this.initOrder].reverse().map(item => item.name)
    
    for (const name of names) {
      this.destroy(name)
    }

    this.isInitialized = false
  }

  /**
   * Get registry statistics
   */
  getStats() {
    const stats = {
      total: this.components.size,
      initialized: 0,
      components: {}
    }

    for (const [name, entry] of this.components) {
      if (entry.initialized) stats.initialized++
      
      stats.components[name] = {
        initialized: entry.initialized,
        hasInit: typeof entry.component.init === 'function',
        hasDestroy: typeof entry.component.destroy === 'function',
        info: entry.component.getInfo ? entry.component.getInfo() : {}
      }
    }

    return stats
  }

  /**
   * Handle Chrome extension context invalidation
   */
  handleContextInvalidated() {
    console.warn('[ComponentRegistry] Extension context invalidated, cleaning up')
    
    // Emit warning event
    eventBus.emit(EVENTS.SYSTEM.CONTEXT_INVALIDATED)
    
    // Destroy all components
    this.destroyAll()
  }

  /**
   * Reset the registry (for testing)
   */
  reset() {
    this.destroyAll()
    this.components.clear()
    this.initOrder = []
    this.isInitialized = false
  }
}

// Create singleton instance
const componentRegistry = new ComponentRegistry()

// Context monitoring removed - was causing premature component destruction
// The extension handles context invalidation naturally through Chrome's lifecycle

// Handle page unload
window.addEventListener('unload', () => {
  componentRegistry.destroyAll()
})

export { ComponentRegistry, componentRegistry }