import { store } from '../store/store'
import { loadHighlights, setCurrentUrl } from '../store/highlightsSlice'
import './highlighter'
import './ui/highlight-button'
import './ui/mini-toolbar'
import './ui/color-picker'
import './styles.css'
import './test-hmr' // Test hot reload

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize)
} else {
  initialize()
}

async function initialize() {
  console.log('[Web Highlighter] Initializing with Redux Toolkit...')
  
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
  
  // Load highlights for current page
  await store.dispatch(loadHighlights(window.location.href))
  
  // Setup navigation detection
  setupNavigationDetection()
  
  console.log('[Web Highlighter] Initialization complete')
}

// Detect navigation changes (for SPAs)
function setupNavigationDetection() {
  let lastUrl = window.location.href
  
  const checkUrlChange = async () => {
    const currentUrl = window.location.href
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl
      console.log('[Web Highlighter] Navigation detected:', currentUrl)
      
      // Update current URL in store
      store.dispatch(setCurrentUrl(currentUrl))
      
      // Load highlights for new page
      await store.dispatch(loadHighlights(currentUrl))
    }
  }
  
  // Listen for popstate (back/forward)
  window.addEventListener('popstate', checkUrlChange)
  
  // Simple interval check for other navigation
  setInterval(checkUrlChange, 1000)
}

// Export store for other modules
window.__highlighterStore = store