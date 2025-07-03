import { configureStore } from '@reduxjs/toolkit'
import highlightsReducer, { clearDirtyFlags } from './highlightsSlice'
import uiReducer from './uiSlice'
import { storage } from '../utils/chrome-api.js'
import { STORAGE_TIMING } from '../utils/constants.js'

export const store = configureStore({
  reducer: {
    highlights: highlightsReducer,
    ui: uiReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['highlights/addHighlight'],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['payload.range', 'payload.element'],
        // Ignore these paths in the state
        ignoredPaths: ['highlights.tempRange']
      }
    })
})

/* OLD IMPLEMENTATION - CAUSES PERFORMANCE ISSUES
// Chrome storage sync middleware
store.subscribe(() => {
  const state = store.getState()
  // Sync highlights to Chrome storage
  chrome.storage.local.set({
    highlights: state.highlights.byUrl
  })
})

ISSUES WITH OLD IMPLEMENTATION:
1. Saves on EVERY Redux state change (even UI updates!)
2. Saves ALL highlights for ALL URLs every time
3. No batching - if user highlights 10 words rapidly, causes 10 storage writes
4. Can cause 100s of storage operations per minute on active use
5. Chrome storage has write limits (MAX_WRITE_OPERATIONS_PER_MINUTE = 120)
*/

// NEW IMPLEMENTATION - OPTIMIZED STORAGE WITH BATCHING
// Debounced save function that only saves dirty URLs
let saveTimeout = null

const saveDirtyHighlights = () => {
  const state = store.getState()
  const dirtyUrls = state.highlights.dirtyUrls || []
  
  if (dirtyUrls.length === 0) return
  
  // Only save the URLs that have changes
  const updates = {}
  dirtyUrls.forEach(url => {
    updates[url] = state.highlights.byUrl[url] || []
  })
  
  // Save only changed URLs
  storage.set(updates)
    .then(() => {
      // Clear dirty flags after successful save
      store.dispatch(clearDirtyFlags())
    })
    .catch(error => {
      console.error('[Storage] Failed to save highlights:', error)
    })
}

// Save any pending changes before page unload
window.addEventListener('beforeunload', () => {
  if (saveTimeout) {
    clearTimeout(saveTimeout)
    saveDirtyHighlights() // Force save on unload
  }
})

// Subscribe to specific highlight changes only
store.subscribe(() => {
  const state = store.getState()
  
  // Only trigger save on highlight changes, not UI changes
  if (state.highlights.dirtyUrls?.length > 0) {
    // Cancel previous timeout
    if (saveTimeout) clearTimeout(saveTimeout)
    
    // Schedule new save
    saveTimeout = setTimeout(saveDirtyHighlights, STORAGE_TIMING.SAVE_DELAY)
  }
})