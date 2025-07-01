// Navigation detection for SPAs
import { store } from '../../store/store'
import { loadHighlights, setCurrentUrl } from '../../store/highlightsSlice'

export function setupNavigationDetection() {
  let lastUrl = window.location.href
  
  const checkUrlChange = async () => {
    const currentUrl = window.location.href
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl
      console.log('[Navigation] URL changed:', currentUrl)
      
      // Update current URL in store
      store.dispatch(setCurrentUrl(currentUrl))
      
      // Load highlights for new page
      await store.dispatch(loadHighlights(currentUrl))
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