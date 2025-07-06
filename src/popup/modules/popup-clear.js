/**
 * Popup Clear/Delete Operations
 * Functions for deleting and clearing highlights
 */

import { normalizeUrl, updateStats } from './popup-utils.js'
import { loadHighlights } from './popup-storage.js'
import { showUndoToast } from './popup-undo.js'

// Handle delete highlight
export async function handleDeleteHighlight(highlightIds, state) {
  try {
    if (!state.currentTab || !state.currentTab.url) return
    
    // Handle both single ID and array of IDs
    const idsToDelete = Array.isArray(highlightIds) ? highlightIds : [highlightIds]
    
    // Only support undo for single highlight deletion
    const isSingleDelete = idsToDelete.length === 1
    
    const currentUrl = normalizeUrl(state.currentTab.url)
    
    if (isSingleDelete) {
      // For single delete with undo support
      
      // Check if there's a pending undo - if so, execute the pending deletion first
      if (state.undoData && state.pendingDeleteId) {
        await executePendingDelete(state)
      }
      
      // Mark highlight as pending deletion
      state.pendingDeleteId = idsToDelete[0]
      
      // Get the highlight data for undo
      const result = await chrome.storage.local.get([currentUrl, state.currentTab.url])
      const highlights = result[currentUrl] || result[state.currentTab.url] || []
      const highlightToDelete = highlights.find(h => h.id === idsToDelete[0])
      
      if (highlightToDelete) {
        // Store undo data
        state.undoData = {
          highlight: highlightToDelete,
          url: currentUrl,
          storageKey: result[currentUrl] ? currentUrl : state.currentTab.url
        }
        
        // Show undo toast
        showUndoToast(state)
        
        // Mark the highlight visually as pending deletion
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
        chrome.tabs.sendMessage(tab.id, {
          action: 'markPendingDelete',
          highlightId: highlightToDelete.id
        })
        
        // DO NOT reload highlights - just re-render with pending state
        if (state.renderCallback) {
          state.renderCallback()
        }
      }
    } else {
      // For multiple deletes (no undo support) - delete immediately
      
      // First execute any pending delete
      if (state.undoData && state.pendingDeleteId) {
        await executePendingDelete(state)
      }
      
      // Filter out all deleted highlights
      const updatedHighlights = highlights.filter(h => !idsToDelete.includes(h.id))
      
      // Save updated highlights
      const updateData = {}
      const storageKey = result[currentUrl] ? currentUrl : state.currentTab.url
      updateData[storageKey] = updatedHighlights
      
      await chrome.storage.local.set(updateData)
      
      // Remove from DOM
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      chrome.tabs.sendMessage(tab.id, {
        action: 'removeHighlights',
        highlightIds: idsToDelete
      })
      
      // Reload highlights
      await loadHighlights(state)
      updateStats()
    }
    
  } catch (error) {
    console.error('[Popup] Error deleting highlight:', error)
  }
}

// Execute pending delete (called when timer expires or new delete happens)
export async function executePendingDelete(state) {
  if (!state.undoData || !state.pendingDeleteId) return
  
  try {
    const { storageKey } = state.undoData
    
    // Get current highlights
    const result = await chrome.storage.local.get(storageKey)
    const highlights = result[storageKey] || []
    
    // Remove the pending highlight
    const updatedHighlights = highlights.filter(h => h.id !== state.pendingDeleteId)
    
    // Save updated highlights
    const updateData = {}
    updateData[storageKey] = updatedHighlights
    await chrome.storage.local.set(updateData)
    
    // Remove from DOM
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    chrome.tabs.sendMessage(tab.id, {
      action: 'removeHighlights',
      highlightIds: [state.pendingDeleteId]
    })
    
    // Clear pending state
    state.pendingDeleteId = null
    state.undoData = null
    
    // Reload highlights
    await loadHighlights(state)
    
    // Re-render
    if (state.renderCallback) {
      state.renderCallback()
    }
    
  } catch (error) {
    console.error('[Popup] Error executing pending delete:', error)
  }
}

// Handle clear highlights (page or all)
export async function handleClearHighlights(scope, state) {
  // Determine what we're clearing
  const highlightsToClear = scope === 'page' ? state.pageHighlightsList : state.allHighlightsList
  const count = highlightsToClear.length
  
  // Don't show dialog if no highlights
  if (count === 0) {
    return
  }
  
  // Show confirmation dialog
  showConfirmationDialog(scope, count, state)
}

// Show confirmation dialog for clear operations
function showConfirmationDialog(scope, count, state) {
  // Create dialog overlay
  const overlay = document.createElement('div')
  overlay.className = 'confirmation-dialog-overlay'
  
  const dialog = document.createElement('div')
  dialog.className = 'confirmation-dialog'
  
  const title = scope === 'page' ? 'Clear Page Highlights?' : 'Clear All Highlights?'
  const message = scope === 'page' 
    ? `This will permanently delete <span class="highlight-count">${count} highlight${count !== 1 ? 's' : ''}</span> from the current page.`
    : `This will permanently delete <span class="highlight-count">ALL ${count} highlight${count !== 1 ? 's' : ''}</span> from all pages.`
  
  dialog.innerHTML = `
    <h3>${title}</h3>
    <p>${message}</p>
    <p>This action cannot be undone.</p>
    
    <div class="confirmation-actions">
      <button class="confirmation-cancel">Cancel</button>
      <button class="confirmation-confirm">Clear</button>
    </div>
  `
  
  overlay.appendChild(dialog)
  document.body.appendChild(overlay)
  
  // Handle dialog actions
  dialog.querySelector('.confirmation-cancel').addEventListener('click', () => {
    overlay.remove()
  })
  
  dialog.querySelector('.confirmation-confirm').addEventListener('click', async () => {
    overlay.remove()
    await performClearHighlights(scope, state)
  })
  
  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove()
    }
  })
}

// Perform the actual clear operation
async function performClearHighlights(scope, state) {
  try {
    // First execute any pending delete
    if (state.undoData && state.pendingDeleteId) {
      await executePendingDelete(state)
    }
    
    if (scope === 'page') {
      // Clear current page highlights
      if (!state.currentTab || !state.currentTab.url) return
      
      const currentUrl = normalizeUrl(state.currentTab.url)
      
      // Clear from storage
      const updateData = {}
      updateData[currentUrl] = []
      updateData[state.currentTab.url] = [] // Clear both normalized and original URL
      
      await chrome.storage.local.set(updateData)
      
      // Send message to content script to remove all highlights from DOM
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      chrome.tabs.sendMessage(tab.id, {
        action: 'clearAllHighlights'
      })
      
    } else {
      // Clear all highlights from all pages
      const allData = await chrome.storage.local.get(null)
      
      // Create update object to set all URL keys to empty arrays
      const updateData = {}
      for (const [key, value] of Object.entries(allData)) {
        // Only clear URL keys (skip 'settings' etc)
        if (key !== 'settings' && Array.isArray(value)) {
          updateData[key] = []
        }
      }
      
      await chrome.storage.local.set(updateData)
      
      // Send message to current tab to clear DOM
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      chrome.tabs.sendMessage(tab.id, {
        action: 'clearAllHighlights'
      })
    }
    
    // Reload highlights and update UI
    await loadHighlights(state)
    
    // Need to re-render
    if (state.renderCallback) {
      state.renderCallback()
    }
    
  } catch (error) {
    console.error('[Popup] Error clearing highlights:', error)
  }
}

// Handle copy highlight text
export function handleCopyHighlight(text) {
  // Create temporary textarea to copy text
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
  
  // Show feedback (you could add a toast notification here)
  console.log('[Popup] Text copied to clipboard')
}

// Handle highlight click - scroll to highlight on page
export async function handleHighlightClick(highlightId) {
  try {
    // Send message to content script to scroll to highlight
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    
    chrome.tabs.sendMessage(tab.id, {
      action: 'scrollToHighlight',
      highlightId: highlightId
    })
    
    // Close popup after clicking
    window.close()
  } catch (error) {
    console.error('[Popup] Error scrolling to highlight:', error)
  }
}