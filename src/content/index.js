/**
 * Main content script entry point
 * Uses Redux-only state management
 */

import { store } from '../store/store'
import { loadHighlights, setCurrentUrl } from '../store/highlightsSlice'
import { RESTORATION_TIMING } from '../utils/constants.js'
import { isExtensionDisabledForSite } from '../utils/site-settings.js'

// Import theme manager - initializes automatically
import themeManager from '../theme/theme-manager.js'

// Import components
import { highlightEngine } from './highlighting/highlight-engine.js'
import { HighlightRestorer } from './highlighting/highlight-restorer.js'
import { HighlightButton } from './features/highlight-button.js'
import { MiniToolbar } from './features/mini-toolbar.js'
import { ColorPicker } from './features/color-picker.js'
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
  store.dispatch(setCurrentUrl(window.location.href))
  
  // Initialize components
  components = {
    highlightEngine,
    highlightRestorer: new HighlightRestorer(),
    highlightButton: new HighlightButton(),
    miniToolbar: new MiniToolbar(),
    colorPicker: new ColorPicker()
  }
  
  // Initialize all components
  Object.values(components).forEach(component => {
    if (component.init) {
      component.init()
    }
  })
  
  // Setup navigation detection for SPAs and back/forward navigation
  setupNavigationDetection()
  
  // Load highlights for current page
  await store.dispatch(loadHighlights(window.location.href))
  
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