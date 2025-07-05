/**
 * Theme Manager
 * Handles theme injection and consistency across the extension
 * Ensures theme persists on refresh and navigation
 */

import { COLORS, EFFECTS, SPACING, COMPONENTS, getThemeCSSVariables } from './theme-constants.js'

class ThemeManager {
  constructor() {
    this.themeId = 'web-highlighter-theme'
    this.injected = false
  }

  /**
   * Inject theme CSS into the page
   * Safe to call multiple times - checks if already injected
   */
  injectTheme() {
    // Check if theme is already injected
    if (document.getElementById(this.themeId)) {
      this.injected = true
      return
    }

    // Create style element with theme CSS
    const styleElement = document.createElement('style')
    styleElement.id = this.themeId
    styleElement.textContent = `
      /* Web Highlighter Theme Variables */
      ${getThemeCSSVariables()}
      
      /* Component-specific theme styles */
      .highlighter-ui-component {
        font-family: ${COMPONENTS.popup.body.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'};
      }
      
      /* Glassmorphic components */
      .highlight-button,
      .mini-toolbar,
      .color-picker {
        background: ${COMPONENTS.highlightButton.background};
        backdrop-filter: ${COMPONENTS.highlightButton.backdropFilter};
        -webkit-backdrop-filter: ${COMPONENTS.highlightButton.backdropFilter};
        border: ${COMPONENTS.highlightButton.border};
        transition: ${COMPONENTS.highlightButton.transition};
      }
      
      /* Dark theme for all UI components */
      .highlighter-ui-component {
        color: ${COLORS.text.primary};
      }
      
      /* Ensure SVG icons are visible on dark backgrounds */
      .highlighter-ui-component svg {
        stroke: currentColor;
        color: ${COLORS.text.primary};
      }
    `

    // Inject at the beginning of head for priority
    const head = document.head || document.getElementsByTagName('head')[0]
    if (head.firstChild) {
      head.insertBefore(styleElement, head.firstChild)
    } else {
      head.appendChild(styleElement)
    }

    this.injected = true
  }

  /**
   * Remove injected theme (for cleanup)
   */
  removeTheme() {
    const element = document.getElementById(this.themeId)
    if (element) {
      element.remove()
      this.injected = false
    }
  }

  /**
   * Apply theme styles to an element programmatically
   * Useful for dynamically created elements
   */
  applyComponentTheme(element, componentType) {
    if (!element || !componentType) return

    const styles = COMPONENTS[componentType]
    if (!styles) {
      console.warn(`Unknown component type: ${componentType}`)
      return
    }

    // Apply styles
    Object.assign(element.style, styles)
  }

  /**
   * Get theme color by path (e.g., 'primary.dark', 'highlights.yellow')
   */
  getColor(colorPath) {
    const parts = colorPath.split('.')
    let color = COLORS

    for (const part of parts) {
      color = color[part]
      if (!color) {
        console.warn(`Color not found: ${colorPath}`)
        return null
      }
    }

    return color
  }

  /**
   * Get highlight color based on color name
   */
  getHighlightColor(colorName, withOpacity = false) {
    if (withOpacity) {
      return COLORS.highlightsBg[colorName] || COLORS.highlightsBg.yellow
    }
    return COLORS.highlights[colorName] || COLORS.highlights.yellow
  }

  /**
   * Ensure theme persists on navigation
   * Call this on page load/navigation
   */
  ensureThemePersistence() {
    // Check if we're in a content script context
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
      // Use MutationObserver to re-inject theme if removed
      const observer = new MutationObserver(() => {
        if (!document.getElementById(this.themeId)) {
          this.injectTheme()
        }
      })

      // Observe head element for changes
      const head = document.head || document.getElementsByTagName('head')[0]
      if (head) {
        observer.observe(head, {
          childList: true,
          subtree: false
        })
      }
    }
  }

  /**
   * Initialize theme manager
   * Safe to call on every page load
   */
  init() {
    // Inject theme
    this.injectTheme()
    
    // Ensure persistence
    this.ensureThemePersistence()
    
    // Re-inject on document ready if needed
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.injectTheme()
      })
    }
  }
}

// Create singleton instance
const themeManager = new ThemeManager()

// Auto-initialize if in content script context
if (typeof window !== 'undefined' && window.location && window.location.href) {
  // Initialize theme on load
  themeManager.init()
}

export default themeManager
export { themeManager, COLORS, EFFECTS, SPACING, COMPONENTS }