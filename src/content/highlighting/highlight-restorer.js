/**
 * Highlight Restorer
 * Restores highlights from saved data using Redux
 */

import { store } from '../../store/store'
import { restoreHighlightElement, batchRestoreHighlights } from './dom-highlighter.js'
import { findTextInContainer, getCleanText } from './text-finder.js'
import { RESTORATION_TIMING } from '../../utils/constants.js'
import { performanceMonitor } from '../../utils/performance-monitor.js'
import { normalizeUrlForStorage } from '../../utils/text-sanitizer.js'

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
    const timing = performanceMonitor.startTiming('highlightRestoration')
    
    const state = store.getState()
    // OLD IMPLEMENTATION - Used raw URL with fragments
    // const url = window.location.href
    // const highlights = state.highlights.byUrl[url] || []
    // ISSUE: Would only find highlights if URL matched exactly including fragments
    
    // NEW IMPLEMENTATION - Use normalized URL for lookup
    const normalizedUrl = normalizeUrlForStorage(window.location.href) || window.location.href
    const highlights = state.highlights.byUrl[normalizedUrl] || []
    
    // Debug logging when highlights found via normalization
    if (highlights.length > 0 && normalizedUrl !== window.location.href) {
      console.log(`[HighlightRestorer] Found ${highlights.length} highlights via normalized URL`)
      console.log(`[HighlightRestorer] Current URL: ${window.location.href}`)
      console.log(`[HighlightRestorer] Normalized to: ${normalizedUrl}`)
    }
    
    if (highlights.length === 0) {
      console.log('[HighlightRestorer] No highlights to restore')
      performanceMonitor.endTiming(timing)
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
        
        // End performance timing
        const metric = performanceMonitor.endTiming(timing)
        if (metric) {
          const avgTime = metric.duration / highlights.length
          console.log(`[HighlightRestorer] Restoration performance: ${metric.duration.toFixed(2)}ms total, ${avgTime.toFixed(2)}ms per highlight`)
        }
      })
    } else {
      console.log('[HighlightRestorer] No valid highlights to restore')
      performanceMonitor.endTiming(timing)
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
          const itemText = getCleanText(item)
          
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
    const { tagName, className, id, cleanText, nthOfType = 0 } = containerInfo
    
    // Try to find by ID first (most reliable)
    if (id) {
      const element = document.getElementById(id)
      if (element) {
        // Verify it's still the right element by checking tag name
        if (element.tagName === tagName) {
          console.log('[HighlightRestorer] Found container by ID:', id)
          return element
        }
      }
    }
    
    // Try to find by class name and verify content
    if (className) {
      const elements = document.getElementsByClassName(className)
      // Check all elements with this class to find one with matching content
      for (const element of elements) {
        if (element.tagName === tagName) {
          const elementText = getCleanText(element)
          // Check if the text contains what we're looking for (partial match)
          // This handles cases where the container might have additional content
          // Handle edge case: cleanText might be shorter than CONTENT_MATCH_LENGTH
          const matchLength = Math.min(cleanText?.length || 0, RESTORATION_TIMING.CONTENT_MATCH_LENGTH)
          if (cleanText && matchLength > 0 && elementText.includes(cleanText.substring(0, matchLength))) {
            console.log('[HighlightRestorer] Found container by class and content match')
            return element
          }
        }
      }
    }
    
    // Fallback to tag name and position, but verify content
    const elements = document.getElementsByTagName(tagName)
    
    // First try exact position
    if (elements.length > nthOfType) {
      const element = elements[nthOfType]
      const elementText = getCleanText(element)
      // If content roughly matches, use it
      // Handle edge case: cleanText might be shorter than CONTENT_MATCH_SHORT
      const shortMatchLength = Math.min(cleanText?.length || 0, RESTORATION_TIMING.CONTENT_MATCH_SHORT)
      if (!cleanText || (shortMatchLength > 0 && elementText.includes(cleanText.substring(0, shortMatchLength)))) {
        console.log('[HighlightRestorer] Found container by position')
        return element
      }
    }
    
    // If exact position fails, search all elements for content match
    if (cleanText) {
      console.log('[HighlightRestorer] Searching for container by content...')
      for (const element of elements) {
        const elementText = getCleanText(element)
        // Handle edge case: cleanText might be shorter than CONTENT_MATCH_LENGTH
        const contentMatchLength = Math.min(cleanText.length, RESTORATION_TIMING.CONTENT_MATCH_LENGTH)
        if (contentMatchLength > 0 && elementText.includes(cleanText.substring(0, contentMatchLength))) {
          console.log('[HighlightRestorer] Found container by content match')
          return element
        }
      }
    }
    
    console.warn('[HighlightRestorer] Container not found:', containerInfo)
    return null
  }
  /* REMOVED - Now using imported getCleanText from text-finder.js
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
  */

  destroy() {
    // Nothing to clean up
  }
}

export { HighlightRestorer }