import rangy from 'rangy'
import 'rangy/lib/rangy-classapplier'
import 'rangy/lib/rangy-highlighter'
import 'rangy/lib/rangy-serializer'
import { store } from '../store/store'
import { addHighlight, removeHighlight, updateHighlightColor, saveHighlights } from '../store/highlightsSlice'

// Initialize Rangy
rangy.init()

// Highlighter instance
let highlighter = null

// Highlight colors configuration
const highlightColors = {
  yellow: { className: 'highlight-yellow' },
  green: { className: 'highlight-green' },
  blue: { className: 'highlight-blue' },
  pink: { className: 'highlight-pink' }
}

// Initialize Rangy highlighter
function initializeHighlighter() {
  highlighter = rangy.createHighlighter()
  
  // Add class appliers for each color
  for (const [color, config] of Object.entries(highlightColors)) {
    const applier = rangy.createClassApplier(config.className, {
      elementTagName: 'span',
      elementProperties: {
        className: 'web-highlighter-highlight'
      }
    })
    
    highlighter.addClassApplier(applier)
  }
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
    const colorConfig = highlightColors[color]
    highlighter.highlightSelection(colorConfig.className)
    
    // Add data attributes to all highlight elements
    const highlightElements = document.querySelectorAll(`.${colorConfig.className}:not([data-highlight-id])`)
    highlightElements.forEach(element => {
      element.setAttribute('data-highlight-id', id)
      element.setAttribute('data-color', color)
    })
    
    // Serialize the highlight
    const serialized = highlighter.serialize()
    
    // Create highlight object
    const highlight = {
      id,
      text,
      color,
      serialized,
      timestamp: Date.now()
    }
    
    // Add to Redux store
    const url = window.location.href
    store.dispatch(addHighlight({ url, highlight }))
    
    // Save to Chrome storage
    const state = store.getState()
    store.dispatch(saveHighlights({ url, highlights: state.highlights.byUrl[url] }))
    
    // Clear selection
    selection.removeAllRanges()
    
    console.log('[Web Highlighter] Created highlight:', id)
    return highlight
    
  } catch (error) {
    console.error('[Web Highlighter] Failed to create highlight:', error)
    return null
  }
}

// Remove highlight by ID
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
  
  // Remove from Redux store
  const url = window.location.href
  store.dispatch(removeHighlight({ url, id }))
  
  // Save to Chrome storage
  const state = store.getState()
  store.dispatch(saveHighlights({ url, highlights: state.highlights.byUrl[url] }))
  
  console.log('[Web Highlighter] Removed highlight:', id)
}

// Change highlight color
export function changeHighlightColor(id, newColor) {
  const elements = document.querySelectorAll(`[data-highlight-id="${id}"]`)
  
  if (elements.length === 0) return
  
  // Get current color
  const currentColor = elements[0].getAttribute('data-color')
  const oldConfig = highlightColors[currentColor]
  const newConfig = highlightColors[newColor]
  
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
  store.dispatch(saveHighlights({ url, highlights: state.highlights.byUrl[url] }))
  
  console.log('[Web Highlighter] Updated highlight color:', id, newColor)
}

// Restore highlights from store
export function restoreHighlights() {
  const state = store.getState()
  const url = window.location.href
  const highlights = state.highlights.byUrl[url] || []
  
  console.log('[Web Highlighter] Restoring highlights:', highlights.length)
  
  // Clear existing highlights first
  removeAllHighlights()
  
  // Restore each highlight
  highlights.forEach(highlight => {
    try {
      if (highlight.serialized) {
        // Deserialize and apply the highlight
        highlighter.deserialize(highlight.serialized)
        
        // Add data attributes
        const colorConfig = highlightColors[highlight.color]
        const elements = document.querySelectorAll(`.${colorConfig.className}:not([data-highlight-id])`)
        
        elements.forEach(element => {
          element.setAttribute('data-highlight-id', highlight.id)
          element.setAttribute('data-color', highlight.color)
        })
        
        console.log('[Web Highlighter] Restored highlight:', highlight.id)
      }
    } catch (error) {
      console.error('[Web Highlighter] Failed to restore highlight:', highlight.id, error)
    }
  })
}

// Remove all highlights from DOM
function removeAllHighlights() {
  const elements = document.querySelectorAll('.web-highlighter-highlight')
  elements.forEach(element => {
    const parent = element.parentNode
    while (element.firstChild) {
      parent.insertBefore(element.firstChild, element)
    }
    element.remove()
  })
}

// Subscribe to store changes
store.subscribe(() => {
  const state = store.getState()
  const currentUrl = state.highlights.currentUrl
  
  // If URL changed, restore highlights
  if (currentUrl === window.location.href) {
    // Use setTimeout to ensure DOM is ready
    setTimeout(restoreHighlights, 100)
  }
})

// Initialize highlighter
initializeHighlighter()

// Handle clicks on highlights
document.addEventListener('click', (e) => {
  const highlight = e.target.closest('.web-highlighter-highlight')
  if (highlight) {
    const id = highlight.getAttribute('data-highlight-id')
    if (id) {
      // Dispatch event for mini toolbar
      window.dispatchEvent(new CustomEvent('highlight-clicked', {
        detail: { id, element: highlight }
      }))
    }
  }
})

// Export functions
window.__highlighter = {
  createHighlight,
  deleteHighlight,
  changeHighlightColor,
  restoreHighlights
}