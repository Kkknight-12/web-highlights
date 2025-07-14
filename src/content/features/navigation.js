// Navigation detection for SPAs
import { store } from '../../store/store'
import { loadHighlights, setCurrentUrl } from '../../store/highlightsSlice'
import { HighlightRestorer } from '../highlighting/highlight-restorer.js'
import { RESTORATION_TIMING } from '../../utils/constants.js'
import { normalizeUrlForStorage } from '../../utils/text-sanitizer.js'

export function setupNavigationDetection() {
  // OLD IMPLEMENTATION - Tracked raw URL with fragments
  // let lastUrl = window.location.href
  // NEW IMPLEMENTATION - Track normalized URL
  let lastUrl = normalizeUrlForStorage(window.location.href) || window.location.href
  const highlightRestorer = new HighlightRestorer()
  
  const checkUrlChange = async () => {
    const currentRawUrl = window.location.href
    const currentUrl = normalizeUrlForStorage(currentRawUrl) || currentRawUrl
    
    // Only trigger if normalized URL actually changed
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl
      console.log('[Navigation] URL changed:', currentRawUrl, '→ normalized:', currentUrl)
      
      // Update current URL in store with normalized URL
      store.dispatch(setCurrentUrl(currentUrl))
      
      // Load highlights for new page using normalized URL
      await store.dispatch(loadHighlights(currentUrl))
      
      // Restore highlights after a short delay to ensure page content is ready
      setTimeout(() => {
        console.log('[Navigation] Restoring highlights for:', currentUrl)
        highlightRestorer.restoreHighlights()
      }, RESTORATION_TIMING.INITIAL_DELAY)
    }
  }
  
  // Listen for popstate (back/forward)
  window.addEventListener('popstate', checkUrlChange)
  
  // Monitor pushState/replaceState for SPAs
  const originalPushState = history.pushState
  const originalReplaceState = history.replaceState
  
  history.pushState = function(...args) {
    originalPushState.apply(history, args)
    setTimeout(checkUrlChange, 100)
  }
  
  history.replaceState = function(...args) {
    originalReplaceState.apply(history, args)
    setTimeout(checkUrlChange, 100)
  }
  
  // Fallback: periodic check
  setInterval(checkUrlChange, 2000)
  
  console.log('[Navigation] Detection initialized')
}