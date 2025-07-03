/**
 * Main content script entry point
 * Uses Redux-only state management
 */

import { store } from '../store/store'
import { loadHighlights, setCurrentUrl } from '../store/highlightsSlice'

// Import components
import { highlightEngine } from './highlighting/highlight-engine.js'
import { HighlightRestorer } from './highlighting/highlight-restorer.js'
import { HighlightButton } from './features/highlight-button.js'
import { MiniToolbar } from './features/mini-toolbar.js'
import { ColorPicker } from './features/color-picker.js'

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
  
  // Load highlights for current page
  await store.dispatch(loadHighlights(window.location.href))
  
  // Restore highlights
  components.highlightRestorer.restoreHighlights()
  
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