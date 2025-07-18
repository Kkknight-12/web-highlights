/**
 * Popup Storage Operations
 * Functions for loading and managing highlights from Chrome storage
 */

import { normalizeUrl } from './popup-utils.js'
import { showLoadingState, hideLoadingState, showErrorState } from './popup-ui-state.js'

// Load highlights from storage
export async function loadHighlights(state) {
  // Show loading state
  showLoadingState()
  
  try {
    // Get all storage data
    const allData = await chrome.storage.local.get(null)
    
    // Collect all highlights from all URLs
    const allHighlights = []
    let totalCount = 0
    
    // NEW: Extract options menu state if available
    if (allData.optionsMenuState) {
      state.pinnedHighlights = allData.optionsMenuState.pinnedHighlights || []
      state.archivedHighlights = allData.optionsMenuState.archivedHighlights || []
      state.hiddenHighlights = allData.optionsMenuState.hiddenHighlights || []
      state.siteSettings = allData.optionsMenuState.siteSettings || {}
    }
    
    // The storage format is { [url]: highlights[] }
    for (const [key, value] of Object.entries(allData)) {
      // Skip non-URL keys like 'settings' or 'optionsMenuState'
      if (key === 'settings' || key === 'optionsMenuState' || !Array.isArray(value)) continue
      
      // Add URL to each highlight for reference
      if (Array.isArray(value)) {
        value.forEach(highlight => {
          allHighlights.push({
            ...highlight,
            url: key
          })
        })
        totalCount += value.length
      }
    }
    
    state.highlights = allHighlights
    state.allHighlightsList = allHighlights
    state.totalHighlights = totalCount
    
    // Get highlights for current page
    if (state.currentTab && state.currentTab.url) {
      const currentUrl = normalizeUrl(state.currentTab.url)
      
      // Check both normalized URL and exact URL
      const pageData = allData[currentUrl] || allData[state.currentTab.url] || []
      
      state.pageHighlightsList = Array.isArray(pageData) ? pageData : []
      state.pageHighlights = state.pageHighlightsList.length
      
      console.log('[Popup] Current URL:', currentUrl)
      console.log('[Popup] Page highlights:', state.pageHighlightsList)
    }
    
    // Hide loading state
    hideLoadingState()
    
    return true
  } catch (error) {
    console.error('[Popup] Error loading highlights:', error)
    hideLoadingState()
    showErrorState('Failed to load highlights')
    return false
  }
}

// Listen for storage changes
export function setupStorageListener(loadHighlightsFn, updateStatsFn) {
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.highlights) {
      loadHighlightsFn().then(updateStatsFn)
    }
  })
}

// NEW: Save options menu state
export async function saveOptionsMenuState(state) {
  try {
    const optionsMenuState = {
      pinnedHighlights: state.pinnedHighlights || [],
      archivedHighlights: state.archivedHighlights || [],
      hiddenHighlights: state.hiddenHighlights || [],
      siteSettings: state.siteSettings || {}
    }
    
    await chrome.storage.local.set({ optionsMenuState })
    return true
  } catch (error) {
    console.error('[Popup] Error saving options menu state:', error)
    return false
  }
}