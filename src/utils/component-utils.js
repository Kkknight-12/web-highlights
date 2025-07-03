/**
 * Component Utilities
 * Shared utilities for UI components
 */

/**
 * Base class for components with common functionality
 */
export class BaseComponent {
  constructor() {
    this.element = null
    this.eventHandlers = new Map()
  }

  /**
   * Add event listener with automatic tracking for cleanup
   */
  addEventListener(target, event, handler, options) {
    const key = `${target === window ? 'window' : target === document ? 'document' : 'element'}_${event}`
    
    // Store handler reference for cleanup
    this.eventHandlers.set(key, { target, event, handler, options })
    
    // Add the listener
    target.addEventListener(event, handler, options)
  }

  /**
   * Remove all tracked event listeners
   */
  removeAllEventListeners() {
    this.eventHandlers.forEach(({ target, event, handler, options }) => {
      target.removeEventListener(event, handler, options)
    })
    this.eventHandlers.clear()
  }

  /**
   * Common destroy implementation
   */
  destroy() {
    // Remove all event listeners
    this.removeAllEventListeners()
    
    // Remove element from DOM
    if (this.element && this.element.parentNode) {
      this.element.remove()
    }
    
    // Clear references
    this.element = null
    
    console.log(`[${this.constructor.name}] Destroyed`)
  }
}

/**
 * Position an element relative to coordinates
 */
export function positionElement(element, x, y, offset = { x: 0, y: 0 }) {
  element.style.position = 'absolute'
  element.style.left = `${x + offset.x}px`
  element.style.top = `${y + offset.y}px`
}

/**
 * Check if element is in viewport
 */
export function isInViewport(element) {
  const rect = element.getBoundingClientRect()
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  )
}

/**
 * Ensure element stays within viewport bounds
 */
export function constrainToViewport(element) {
  const rect = element.getBoundingClientRect()
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight
  
  // Adjust horizontal position
  if (rect.right > viewportWidth) {
    element.style.left = `${viewportWidth - rect.width - 10}px`
  }
  if (rect.left < 0) {
    element.style.left = '10px'
  }
  
  // Adjust vertical position
  if (rect.bottom > viewportHeight) {
    element.style.top = `${viewportHeight - rect.height - 10}px`
  }
  if (rect.top < 0) {
    element.style.top = '10px'
  }
}