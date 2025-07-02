/**
 * Highlight Restorer
 * Restores highlights from saved data using Redux
 */

import { store } from '../../store/store'
import { restoreHighlightElement } from './dom-highlighter.js'
import { findTextInContainer } from './text-finder.js'

class HighlightRestorer {
  constructor() {
    this.restoredCount = 0
  }

  init() {
    console.log('[HighlightRestorer] Initializing')
  }

  restoreHighlights() {
    const state = store.getState()
    const url = window.location.href
    const highlights = state.highlights.byUrl[url] || []
    
    if (highlights.length === 0) {
      console.log('[HighlightRestorer] No highlights to restore')
      return
    }
    
    console.log(`[HighlightRestorer] Restoring ${highlights.length} highlights`)
    
    highlights.forEach(highlight => {
      try {
        this.restoreHighlight(highlight)
      } catch (error) {
        console.error('[HighlightRestorer] Failed to restore highlight:', error)
      }
    })
    
    console.log(`[HighlightRestorer] Restored ${this.restoredCount} highlights`)
  }

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
    
    // Restore highlight elements
    let elementsCreated = 0
    textNodes.forEach(({ node, start, end }) => {
      if (node && node.nodeType === Node.TEXT_NODE) {
        const created = restoreHighlightElement(node, start, end, id, color)
        if (created) elementsCreated++
      }
    })
    
    if (elementsCreated > 0) {
      this.restoredCount++
      return true
    }
    
    return false
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