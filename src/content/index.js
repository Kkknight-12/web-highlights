/**
 * Main content script entry point
 * Uses Redux-only state management
 */

import { store } from '../store/store'
import { loadHighlights, setCurrentUrl } from '../store/highlightsSlice'
import { RESTORATION_TIMING } from '../utils/constants.js'
import { isExtensionDisabledForSite } from '../utils/site-settings.js'
import { normalizeUrlForStorage } from '../utils/text-sanitizer.js'

// Import theme manager - initializes automatically
import themeManager from '../theme/theme-manager.js'

// Import components
import { highlightEngine } from './highlighting/highlight-engine.js'
import { HighlightRestorer } from './highlighting/highlight-restorer.js'
import { HighlightButton } from './features/highlight-button.js'
import { MiniToolbar } from './features/mini-toolbar.js'
import { ColorPicker } from './features/color-picker.js'
import { KeyboardShortcuts } from './features/keyboard-shortcuts.js'
import { setupNavigationDetection } from './features/navigation.js'

// Import styles
import './styles.css'

// Track initialization state without global variable
let initialized = false
// Store component references for cleanup
let components = {}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize)
} else {
  initialize()
}

async function initialize() {
  console.log('[Web Highlighter] Initializing...')
  
  // Skip if already initialized
  if (initialized) {
    return
  }
  initialized = true
  
  // Skip chrome:// pages
  if (window.location.href.startsWith('chrome://')) {
    return
  }
  
  // NEW: Check if extension is disabled for this site
  const isDisabled = await isExtensionDisabledForSite()
  if (isDisabled) {
    console.log('[Web Highlighter] Extension disabled for this site')
    return
  }
  
  // Initialize theme (safe to call multiple times)
  themeManager.init()
  
  // Set current URL in store
  // OLD IMPLEMENTATION - Used raw URL with fragments
  // store.dispatch(setCurrentUrl(window.location.href))
  // NEW IMPLEMENTATION - Use normalized URL
  const normalizedUrl = normalizeUrlForStorage(window.location.href) || window.location.href
  store.dispatch(setCurrentUrl(normalizedUrl))
  
  // Initialize components
  components = {
    highlightEngine,
    highlightRestorer: new HighlightRestorer(),
    highlightButton: new HighlightButton(),
    miniToolbar: new MiniToolbar(),
    colorPicker: new ColorPicker(),
    keyboardShortcuts: new KeyboardShortcuts()
  }
  
  // Initialize all components
  Object.values(components).forEach(component => {
    if (component.init) {
      // Pass highlight engine to keyboard shortcuts
      if (component === components.keyboardShortcuts) {
        component.init(components.highlightEngine)
      } else {
        component.init()
      }
    }
  })
  
  // Setup navigation detection for SPAs and back/forward navigation
  setupNavigationDetection()
  
  // Load highlights for current page
  // OLD IMPLEMENTATION - Used raw URL
  // await store.dispatch(loadHighlights(window.location.href))
  // NEW IMPLEMENTATION - Use normalized URL to load highlights
  await store.dispatch(loadHighlights(normalizedUrl))
  
  /* OLD IMPLEMENTATION - Restored highlights immediately
  // Issue: Dynamic content might not be loaded yet when navigating back
  components.highlightRestorer.restoreHighlights()
  */
  
  // NEW IMPLEMENTATION - Add delay for dynamic content
  // When navigating back to a page, content might still be loading
  // Delay ensures most dynamic content is ready
  setTimeout(() => {
    components.highlightRestorer.restoreHighlights()
  }, RESTORATION_TIMING.INITIAL_DELAY)
  
  // Also restore after full page load for late-loading content
  // This catches content that loads after DOMContentLoaded
  if (document.readyState !== 'complete') {
    window.addEventListener('load', () => {
      // Only retry if no highlights were restored yet
      if (components.highlightRestorer && components.highlightRestorer.restoredCount === 0) {
        console.log('[Web Highlighter] Retrying highlight restoration after page load...')
        components.highlightRestorer.restoreHighlights()
      }
    })
  }
  
  console.log('[Web Highlighter] Ready!')
}

// Enable HMR
if (import.meta.hot) {
  import.meta.hot.accept()
}

// Handle page unload - Clean up to prevent memory leaks
window.addEventListener('unload', () => {
  console.log('[Web Highlighter] Page unloading - cleaning up components')
  
  // Destroy all components to remove event listeners
  Object.values(components).forEach(component => {
    if (component.destroy) {
      component.destroy()
    }
  })
  
  // Clear references
  components = {}
  initialized = false
})

// Export for debugging in development only
if (process.env.NODE_ENV === 'development') {
  window.__webHighlighter = { store }
}

// Export components for access by other scripts
window.__webHighlighterComponents = components

// Load performance commands in development
if (process.env.NODE_ENV !== 'production') {
  import('./commands/performance-commands.js').catch(err => {
    console.log('[Web Highlighter] Performance commands not loaded:', err)
  })
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Web Highlighter] Message from background:', request)
  
  if (request.action === 'highlightSelection') {
    console.log('[Web Highlighter] Highlight selection action received')
    
    // Visual feedback that shortcut was triggered
    document.body.style.border = '3px solid red'
    setTimeout(() => {
      document.body.style.border = ''
    }, 500)
    
    // Check if components are initialized
    if (!components.highlightEngine) {
      console.warn('[Web Highlighter] Components not initialized yet')
      sendResponse({ success: false, error: 'Not initialized' })
      return
    }
    
    // Get current selection
    const selection = window.getSelection()
    const text = selection.toString().trim()
    console.log('[Web Highlighter] Current selection text:', text)
    console.log('[Web Highlighter] Selection object:', selection)
    
    if (text) {
      // Get selected color from store
      const state = store.getState()
      const selectedColor = state.ui.selectedColor || 'yellow'
      console.log('[Web Highlighter] Using color:', selectedColor)
      
      try {
        // Create highlight
        components.highlightEngine.createHighlight(text, selectedColor, selection)
        console.log('[Web Highlighter] Highlight created successfully')
        sendResponse({ success: true })
      } catch (error) {
        console.error('[Web Highlighter] Error creating highlight:', error)
        sendResponse({ success: false, error: error.message })
      }
    } else {
      console.log('[Web Highlighter] No text selected')
      sendResponse({ success: false, error: 'No text selected' })
    }
  }
})