// Highlighter feature using Rangy and Redux
import rangy from 'rangy'
import 'rangy/lib/rangy-classapplier'
import 'rangy/lib/rangy-highlighter'
import 'rangy/lib/rangy-serializer'
import { store } from '../../store/store'
import { addHighlight, removeHighlight, updateHighlightColor, saveHighlights } from '../../store/highlightsSlice'

// Initialize Rangy
rangy.init()

// Highlighter instance
let highlighter = null

// Highlight colors configuration
export const HIGHLIGHT_COLORS = {
  yellow: { className: 'highlight-yellow', hex: '#ffe066' },
  green: { className: 'highlight-green', hex: '#6ee7b7' },
  blue: { className: 'highlight-blue', hex: '#93c5fd' },
  pink: { className: 'highlight-pink', hex: '#fca5a5' }
}

// Track if highlights have been restored to prevent duplicates
let highlightsRestored = false

// Initialize Rangy highlighter
export function initializeHighlighter() {
  highlighter = rangy.createHighlighter()
  
  // Add class appliers for each color
  Object.entries(HIGHLIGHT_COLORS).forEach(([color, config]) => {
    const applier = rangy.createClassApplier(config.className, {
      elementTagName: 'span',
      elementProperties: {
        className: 'web-highlighter-highlight'
      }
    })
    
    highlighter.addClassApplier(applier)
  })
  
  // Handle clicks on highlights
  document.addEventListener('click', handleHighlightClick)
  
  // Subscribe to store changes for restoration
  store.subscribe(handleStoreChange)
  
  console.log('[Highlighter] Initialized')
}

// Generate unique ID
function generateId() {
  return `highlight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Create highlight from current selection
export function createHighlight(color = 'yellow') {
  const selection = rangy.getSelection()
  
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return null
  }
  
  const id = generateId()
  const text = selection.toString().trim()
  
  if (!text) {
    return null
  }
  
  try {
    // Apply highlight using Rangy
    const colorConfig = HIGHLIGHT_COLORS[color]
    highlighter.highlightSelection(colorConfig.className)
    
    // Add data attributes to all new highlight elements
    const highlightElements = document.querySelectorAll(`.${colorConfig.className}:not([data-highlight-id])`)
    highlightElements.forEach(element => {
      element.setAttribute('data-highlight-id', id)
      element.setAttribute('data-color', color)
    })
    
    // Serialize the highlight
    const serialized = highlighter.serialize()
    
    console.log('[Highlighter] Serialized data:', serialized)
    console.log('[Highlighter] Selected text:', text)
    
    // Create highlight object
    const highlight = {
      id,
      text,
      color,
      serialized,
      timestamp: Date.now(),
      url: window.location.href
    }
    
    // Add to Redux store
    store.dispatch(addHighlight({ url: window.location.href, highlight }))
    
    // Save to Chrome storage
    const state = store.getState()
    const highlights = state.highlights.byUrl[window.location.href] || []
    store.dispatch(saveHighlights({ url: window.location.href, highlights }))
    
    // Clear selection
    selection.removeAllRanges()
    
    console.log('[Highlighter] Created:', id)
    return highlight
    
  } catch (error) {
    console.error('[Highlighter] Failed to create:', error)
    return null
  }
}

// Delete highlight
export function deleteHighlight(id) {
  // Find all elements with this highlight ID
  const elements = document.querySelectorAll(`[data-highlight-id="${id}"]`)
  
  elements.forEach(element => {
    // Unwrap the highlight
    const parent = element.parentNode
    while (element.firstChild) {
      parent.insertBefore(element.firstChild, element)
    }
    element.remove()
  })
  
  // Update Redux store
  const url = window.location.href
  store.dispatch(removeHighlight({ url, id }))
  
  // Save to Chrome storage
  const state = store.getState()
  const highlights = state.highlights.byUrl[url] || []
  store.dispatch(saveHighlights({ url, highlights }))
  
  console.log('[Highlighter] Deleted:', id)
}

// Change highlight color
export function changeHighlightColor(id, newColor) {
  const elements = document.querySelectorAll(`[data-highlight-id="${id}"]`)
  
  if (elements.length === 0) return
  
  // Get current color
  const currentColor = elements[0].getAttribute('data-color')
  const oldConfig = HIGHLIGHT_COLORS[currentColor]
  const newConfig = HIGHLIGHT_COLORS[newColor]
  
  // Update DOM
  elements.forEach(element => {
    element.classList.remove(oldConfig.className)
    element.classList.add(newConfig.className)
    element.setAttribute('data-color', newColor)
  })
  
  // Update Redux store
  const url = window.location.href
  store.dispatch(updateHighlightColor({ url, id, color: newColor }))
  
  // Save to Chrome storage
  const state = store.getState()
  const highlights = state.highlights.byUrl[url] || []
  store.dispatch(saveHighlights({ url, highlights }))
  
  console.log('[Highlighter] Changed color:', id, newColor)
}

// Restore highlights from serialized data
export function restoreHighlights() {
  // Prevent duplicate restoration
  if (highlightsRestored) {
    console.log('[Highlighter] Highlights already restored, skipping')
    return
  }
  
  const state = store.getState()
  const url = window.location.href
  const highlights = state.highlights.byUrl[url] || []
  
  console.log('[Highlighter] Restoring highlights for URL:', url)
  console.log('[Highlighter] Found highlights:', highlights.length)
  
  if (highlights.length === 0) {
    return
  }
  
  // Mark as restored to prevent duplicates
  highlightsRestored = true
  
  // Clear existing highlights first
  removeAllHighlights()
  
  // Wait a bit for DOM to stabilize
  setTimeout(() => {
    // Restore each highlight
    highlights.forEach(highlight => {
      try {
        if (highlight.serialized) {
          console.log('[Highlighter] Deserializing:', highlight.id)
          console.log('[Highlighter] Original text:', highlight.text)
          console.log('[Highlighter] Serialized data:', highlight.serialized)
          
          // Deserialize and apply the highlight
          highlighter.deserialize(highlight.serialized)
          
          // Add data attributes
          const colorConfig = HIGHLIGHT_COLORS[highlight.color]
          const elements = document.querySelectorAll(`.${colorConfig.className}:not([data-highlight-id])`)
          
          let restoredText = ''
          elements.forEach(element => {
            element.setAttribute('data-highlight-id', highlight.id)
            element.setAttribute('data-color', highlight.color)
            restoredText += element.textContent
          })
          
          console.log('[Highlighter] Restored text:', restoredText)
          if (restoredText !== highlight.text) {
            console.warn('[Highlighter] Text mismatch! Original:', highlight.text, 'Restored:', restoredText)
          }
          
          console.log('[Highlighter] Successfully restored:', highlight.id)
        }
      } catch (error) {
        console.error('[Highlighter] Failed to restore:', highlight.id, error)
      }
    })
    
    console.log('[Highlighter] Restoration complete')
  }, 100)
}

// Remove all highlights from DOM
function removeAllHighlights() {
  const elements = document.querySelectorAll('.web-highlighter-highlight')
  elements.forEach(element => {
    const parent = element.parentNode
    if (parent) {
      while (element.firstChild) {
        parent.insertBefore(element.firstChild, element)
      }
      element.remove()
    }
  })
}

// Handle clicks on highlights
function handleHighlightClick(e) {
  const highlight = e.target.closest('.web-highlighter-highlight')
  if (highlight) {
    const id = highlight.getAttribute('data-highlight-id')
    if (id) {
      // Dispatch custom event for UI components
      window.dispatchEvent(new CustomEvent('highlight-clicked', {
        detail: { 
          id, 
          element: highlight,
          rect: highlight.getBoundingClientRect()
        }
      }))
    }
  }
}

// Handle store changes
let lastUrl = window.location.href
function handleStoreChange() {
  const state = store.getState()
  const currentUrl = state.highlights.currentUrl
  
  // If URL changed and matches current page, restore highlights
  if (currentUrl === window.location.href && currentUrl !== lastUrl) {
    lastUrl = currentUrl
    // Reset the flag to allow restoration on navigation
    highlightsRestored = false
    setTimeout(restoreHighlights, 100)
  }
}

// Export API
window.__highlighter = {
  createHighlight,
  deleteHighlight,
  changeHighlightColor,
  restoreHighlights
}