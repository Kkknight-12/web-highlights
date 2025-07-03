/**
 * Highlight Restorer
 * Restores highlights from saved data using Redux
 */

import { store } from '../../store/store'
import { restoreHighlightElement, batchRestoreHighlights } from './dom-highlighter.js'
import { findTextInContainer } from './text-finder.js'

class HighlightRestorer {
  constructor() {
    this.restoredCount = 0
  }

  init() {
    console.log('[HighlightRestorer] Initializing')
  }

  /* OLD IMPLEMENTATION - ISSUE: Multiple highlight restorations not batched
  restoreHighlights() {
    // ... setup code ...
    
    highlights.forEach(highlight => {
      try {
        this.restoreHighlight(highlight) // Each highlight restored individually
      } catch (error) {
        console.error('[HighlightRestorer] Failed to restore highlight:', error)
      }
    })
    
    // ... rest of code ...
  }
  */

  // NEW IMPLEMENTATION - Batch all highlight restorations together
  restoreHighlights() {
    const state = store.getState()
    const url = window.location.href
    const highlights = state.highlights.byUrl[url] || []
    
    if (highlights.length === 0) {
      console.log('[HighlightRestorer] No highlights to restore')
      return
    }
    
    console.log(`[HighlightRestorer] Restoring ${highlights.length} highlights`)
    
    // Collect all highlight operations first
    const allOperations = []
    
    highlights.forEach(highlight => {
      try {
        const { id, text, color, location } = highlight
        
        if (!location || !location.container) {
          console.warn('[HighlightRestorer] Missing location info:', highlight)
          return
        }
        
        // Find the container element
        const container = this.findContainer(location.container)
        if (!container) {
          console.warn('[HighlightRestorer] Container not found:', location.container)
          return
        }
        
        // Find text in container
        const textNodes = findTextInContainer(
          container, 
          text, 
          location.textIndex,
          location.occurrence
        )
        
        if (textNodes.length === 0) {
          console.warn('[HighlightRestorer] Text not found:', text)
          return
        }
        
        // Add to operations list
        textNodes
          .filter(({ node }) => node && node.nodeType === Node.TEXT_NODE)
          .forEach(({ node, start, end }) => {
            allOperations.push({ node, start, end, id, color })
          })
      } catch (error) {
        console.error('[HighlightRestorer] Failed to prepare highlight:', error)
      }
    })
    
    // Execute all DOM modifications in a single batch
    if (allOperations.length > 0) {
      requestAnimationFrame(() => {
        // Use the new batch restore function for better performance
        const restoredCount = batchRestoreHighlights(allOperations)
        this.restoredCount += restoredCount
        
        console.log(`[HighlightRestorer] Restored ${restoredCount} highlights`)
      })
    } else {
      console.log('[HighlightRestorer] No valid highlights to restore')
    }
  }

  /* OLD IMPLEMENTATION - ISSUE: Multiple DOM operations in loop
  restoreHighlight(highlight) {
    // ... validation code ...
    
    // Restore highlight elements
    let elementsCreated = 0
    textNodes.forEach(({ node, start, end }) => {
      if (node && node.nodeType === Node.TEXT_NODE) {
        const created = restoreHighlightElement(node, start, end, id, color) // DOM modification in loop
        if (created) elementsCreated++
      }
    })
    
    // ... rest of code ...
  }
  */

  // NEW IMPLEMENTATION - Batch DOM operations for better performance
  restoreHighlight(highlight) {
    const { id, text, color, location } = highlight
    
    if (!location || !location.container) {
      console.warn('[HighlightRestorer] Missing location info:', highlight)
      return false
    }
    
    // Find the container element
    const container = this.findContainer(location.container)
    if (!container) {
      console.warn('[HighlightRestorer] Container not found:', location.container)
      return false
    }
    
    // Find text in container
    const textNodes = findTextInContainer(
      container, 
      text, 
      location.textIndex,
      location.occurrence
    )
    
    if (textNodes.length === 0) {
      console.warn('[HighlightRestorer] Text not found:', text)
      return false
    }
    
    // NEW: Batch restore operations using requestAnimationFrame
    let elementsCreated = 0
    
    // Collect all valid operations first
    const operations = textNodes
      .filter(({ node }) => node && node.nodeType === Node.TEXT_NODE)
      .map(({ node, start, end }) => ({ node, start, end, id, color }))
    
    if (operations.length === 0) {
      return false
    }
    
    // Execute all DOM modifications in a single frame
    requestAnimationFrame(() => {
      operations.forEach(op => {
        const created = restoreHighlightElement(op.node, op.start, op.end, op.id, op.color)
        if (created) elementsCreated++
      })
      
      if (elementsCreated > 0) {
        this.restoredCount++
      }
    })
    
    // Return true if we have operations to process
    return operations.length > 0
  }

  findContainer(containerInfo) {
    // Handle list containers
    if (containerInfo.type === 'list') {
      const { listType, itemIndex } = containerInfo
      const lists = document.getElementsByTagName(listType)
      
      // Try to find the right list by matching content
      for (const list of lists) {
        if (list.children.length > itemIndex) {
          const item = list.children[itemIndex]
          const itemText = this.getCleanText(item)
          
          // Verify this is the right item by checking text
          if (itemText === containerInfo.cleanText) {
            return item
          }
        }
      }
      
      console.warn('[HighlightRestorer] List item not found by content matching')
      return null
    }
    
    // Handle regular elements
    const { tagName, className, nthOfType = 0 } = containerInfo
    
    // Try to find by class name first
    if (className) {
      const elements = document.getElementsByClassName(className)
      if (elements.length > 0) {
        return elements[0]
      }
    }
    
    // Fallback to tag name and position
    const elements = document.getElementsByTagName(tagName)
    if (elements.length > nthOfType) {
      return elements[nthOfType]
    }
    
    return null
  }
  
  getCleanText(element) {
    const clone = element.cloneNode(true)
    // Remove all highlight spans from the clone
    clone.querySelectorAll('.web-highlighter-highlight').forEach(span => {
      const parent = span.parentNode
      while (span.firstChild) {
        parent.insertBefore(span.firstChild, span)
      }
      span.remove()
    })
    return clone.textContent
  }

  destroy() {
    // Nothing to clean up
  }
}

export { HighlightRestorer }