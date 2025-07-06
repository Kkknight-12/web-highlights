/**
 * Popup Undo Functionality
 * Functions for handling undo operations
 */

import { loadHighlights } from './popup-storage.js'

// Import executePendingDelete to avoid circular dependency
let executePendingDeleteFn = null
export function setExecutePendingDelete(fn) {
  executePendingDeleteFn = fn
}

// Show undo toast notification
export function showUndoToast(state) {
  // Clear any existing timer
  if (state.undoTimer) {
    clearTimeout(state.undoTimer)
    state.undoTimer = null
  }
  
  const toast = document.getElementById('undoToast')
  const progressBar = document.getElementById('undoProgressBar')
  
  // Reset animation
  progressBar.style.animation = 'none'
  progressBar.offsetHeight // Force reflow
  progressBar.style.animation = 'undoCountdown 5s linear forwards'
  
  // Show toast
  toast.style.display = 'block'
  setTimeout(() => {
    toast.classList.add('show')
  }, 10)
  
  // Auto-hide after 5 seconds and execute the pending delete
  state.undoTimer = setTimeout(async () => {
    hideUndoToast(state)
    
    // Execute the pending delete
    if (executePendingDeleteFn) {
      await executePendingDeleteFn(state)
    }
    
    // Clear undo data
    state.undoData = null
    state.pendingDeleteId = null
    
    // Re-render if callback exists
    if (state.renderCallback) {
      state.renderCallback()
    }
  }, 5000)
}

// Hide undo toast
export function hideUndoToast(state) {
  const toast = document.getElementById('undoToast')
  toast.classList.remove('show')
  
  // Hide after animation completes
  setTimeout(() => {
    toast.style.display = 'none'
  }, 300)
  
  // Clear timer
  if (state.undoTimer) {
    clearTimeout(state.undoTimer)
    state.undoTimer = null
  }
}

// Handle undo action
export async function handleUndo(state) {
  if (!state.undoData || !state.pendingDeleteId) return
  
  try {
    // Clear the timer
    if (state.undoTimer) {
      clearTimeout(state.undoTimer)
      state.undoTimer = null
    }
    
    const pendingId = state.pendingDeleteId
    
    // Clear undo data and pending state
    state.undoData = null
    state.pendingDeleteId = null
    
    // Hide toast
    hideUndoToast(state)
    
    // Remove pending delete visual state from webpage only
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    await chrome.tabs.sendMessage(tab.id, {
      action: 'removePendingDelete',
      highlightId: pendingId
    })
    
    // Re-render to remove the pending-delete class
    if (state.renderCallback) {
      state.renderCallback()
    }
    
    console.log('[Popup] Highlight delete cancelled via undo')
  } catch (error) {
    console.error('[Popup] Error handling undo:', error)
  }
}