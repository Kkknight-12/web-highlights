// Main content script entry point
import { store } from '../store/store'
import { loadHighlights, setCurrentUrl } from '../store/highlightsSlice'
// Using robust highlighter that handles lists properly
import { initializeHighlighter } from './features/highlighter-robust'
import { initializeHighlightButton } from './features/highlight-button'
import { initializeMiniToolbar } from './features/mini-toolbar'
import { initializeColorPicker } from './features/color-picker'
import { setupNavigationDetection } from './features/navigation'
import './styles.css'

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize)
} else {
  initialize()
}

async function initialize() {
  console.log('[Web Highlighter] Initializing...')
  
  // Skip if already initialized
  if (window.__webHighlighterInitialized) {
    return
  }
  window.__webHighlighterInitialized = true
  
  // Skip chrome:// pages
  if (window.location.href.startsWith('chrome://')) {
    return
  }
  
  // Set current URL in store
  store.dispatch(setCurrentUrl(window.location.href))
  
  // Initialize features
  initializeHighlighter()
  initializeHighlightButton()
  initializeMiniToolbar()
  initializeColorPicker()
  
  // Load highlights for current page
  await store.dispatch(loadHighlights(window.location.href))
  
  // Setup navigation detection
  setupNavigationDetection()
  
  // Restore highlights after store is loaded
  setTimeout(() => {
    // Using robust highlighter
    if (window.__robustHighlighter && window.__robustHighlighter.restoreHighlights) {
      console.log('[Web Highlighter] Restoring highlights after store load')
      window.__robustHighlighter.restoreHighlights()
    }
  }, 300)
  
  console.log('[Web Highlighter] Ready!')
}

// Export store for debugging
window.__highlighterStore = store

// Enable HMR
if (import.meta.hot) {
  import.meta.hot.accept()
}