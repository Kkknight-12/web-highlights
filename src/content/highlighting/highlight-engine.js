/**
 * Highlight Engine
 * Core highlighting logic - creates and manages highlights
 */

import { store } from '../../store/store'
import { addHighlight, removeHighlight, updateHighlightColor } from '../../store/highlightsSlice'
import { hideMiniToolbar, showMiniToolbar } from '../../store/uiSlice'
import { generateHighlightId, HIGHLIGHT_COLORS } from './highlight-constants.js'
import { getContainerInfo, findTextPositionInCleanText } from './text-finder.js'
import { wrapTextNodes, removeHighlightElements, changeHighlightColor } from './dom-highlighter.js'
import { BLOCK_SELECTOR, COMPONENT_SELECTORS } from '../../utils/constants.js'
import { sanitizeForStorage, sanitizeUrl, normalizeUrlForStorage } from '../../utils/text-sanitizer.js'
import { calculateToolbarPosition } from '../ui/position-calculator.js'
import { performanceMonitor } from '../../utils/performance-monitor.js'

class HighlightEngine {
  constructor() {
    this.unsubscribe = null
    
    // Arrow function to preserve 'this' binding for proper event listener removal
    this.handleHighlightClick = (e) => {
      /**
       * CRITICAL FIX: Prevent highlight clicks when interacting with note field
       * 
       * Problem: When clicking save/cancel buttons in note field, the highlight underneath
       * was also getting clicked, causing toolbar to reposition and lose the button click.
       * 
       * Root Cause: Highlight click handler uses capture phase (true flag), so it receives
       * events before the note field can stop propagation in bubble phase.
       * 
       * Solution: Three-layer protection:
       * 1. Direct check if click target is within note field
       * 2. Flag-based system set by mousedown to ignore next click
       * 3. Check if note field is already open for this highlight
       */
      
      // Layer 1: Direct check if click is on note field or its children
      if (e.target.closest('.note-field-container')) {
        console.log('[HighlightEngine] Click on note field, ignoring')
        return
      }
      
      // Layer 2: Check flag set by mousedown event
      if (this._ignoreNextHighlightClick) {
        console.log('[HighlightEngine] Ignoring highlight click due to note field interaction')
        return
      }
      
      const element = e.target.closest(COMPONENT_SELECTORS.HIGHLIGHT)
      if (!element) return
      
      // Layer 3: Check if note field already open for this highlight
      const existingNoteField = document.querySelector('.note-field-container')
      if (existingNoteField && existingNoteField.getAttribute('data-highlight-id') === element.dataset.highlightId) {
        console.log('[HighlightEngine] Note field already open for this highlight, ignoring click')
        return
      }
      
      console.log('[HighlightEngine] Highlight clicked:', element.dataset.highlightId)
      
      // Always prevent default to stop immediate navigation
      // This allows us to show the toolbar first and let user choose
      e.preventDefault()
      e.stopPropagation()
      
      const id = element.dataset.highlightId
      const rect = element.getBoundingClientRect()
      
      // NEW: Check if highlight is inside a link element
      // This enables the navigate button in the toolbar
      const linkParent = element.closest('a')
      const isLink = !!linkParent
      
      // Show mini toolbar through Redux
      // NEW: Pass link information to show navigate button when needed
      // Use calculateToolbarPosition to get proper coordinates
      const toolbarPosition = calculateToolbarPosition(rect)
      
      console.log('[HighlightEngine] Showing mini toolbar at:', toolbarPosition, 'isLink:', isLink)
      
      store.dispatch(showMiniToolbar({
        position: toolbarPosition,
        highlightId: id,
        isLink: isLink,
        linkHref: isLink ? linkParent.href : null
      }))
    }
  }

  init() {
    console.log('[HighlightEngine] Initializing')
    
    // Listen for DOM clicks on highlights
    // IMPORTANT: Using capture phase (true) to intercept events early
    document.addEventListener('click', this.handleHighlightClick, true)
    
    /**
     * FIX: Mousedown listener to prevent highlight clicks during note field interaction
     * 
     * Why this works:
     * - Mousedown fires before click
     * - We detect mousedown on note field and set a flag
     * - When click event fires milliseconds later, we check the flag
     * - This prevents toolbar repositioning between mousedown and click
     * 
     * Timeline of events:
     * 1. User presses mouse button on Save (mousedown)
     * 2. This handler sets _ignoreNextHighlightClick = true
     * 3. Click event fires
     * 4. Highlight click handler checks flag and returns early
     * 5. Button click handler executes successfully
     */
    document.addEventListener('mousedown', (e) => {
      // If mousedown is on note field, set a flag to ignore the next click
      if (e.target.closest('.note-field-container')) {
        this._ignoreNextHighlightClick = true
        setTimeout(() => {
          this._ignoreNextHighlightClick = false
        }, 100)
      }
    }, true)
    
    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      switch (request.action) {
        case 'removeHighlights':
          // Remove specific highlights
          if (request.highlightIds && Array.isArray(request.highlightIds)) {
            request.highlightIds.forEach(id => {
              removeHighlightElements(id)
            })
            sendResponse({ success: true })
          }
          break
          
        case 'clearAllHighlights':
          // Remove all highlights from DOM
          const allHighlights = document.querySelectorAll(COMPONENT_SELECTORS.HIGHLIGHT)
          allHighlights.forEach(el => el.remove())
          console.log(`[HighlightEngine] Cleared ${allHighlights.length} highlights from DOM`)
          sendResponse({ success: true })
          break
          
        case 'scrollToHighlight':
          // Scroll to specific highlight
          const element = document.querySelector(`[data-highlight-id="${request.highlightId}"]`)
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
            // Flash the highlight briefly
            element.style.transition = 'opacity 0.3s'
            element.style.opacity = '0.3'
            setTimeout(() => {
              element.style.opacity = '1'
            }, 300)
            sendResponse({ success: true })
          }
          break
          
        case 'restoreHighlight':
          // Restore a deleted highlight (for undo)
          if (request.highlight) {
            const restored = this.restoreSingleHighlight(request.highlight)
            sendResponse({ success: restored })
          }
          break
          
        case 'markPendingDelete':
          // Mark highlight as pending deletion (visual state)
          const pendingElement = document.querySelector(`[data-highlight-id="${request.highlightId}"]`)
          if (pendingElement) {
            pendingElement.style.opacity = '0.5'
            pendingElement.style.textDecoration = 'line-through'
            pendingElement.style.transition = 'opacity 0.3s'
            sendResponse({ success: true })
          }
          break
          
        case 'removePendingDelete':
          // Remove pending deletion visual state
          const unpendingElement = document.querySelector(`[data-highlight-id="${request.highlightId}"]`)
          if (unpendingElement) {
            unpendingElement.style.opacity = '1'
            unpendingElement.style.textDecoration = 'none'
            sendResponse({ success: true })
          }
          break
          
        case 'changeHighlightColor':
          // Change highlight color
          if (request.highlightId && request.newColor) {
            const success = this.changeHighlightColor(request.highlightId, request.newColor)
            sendResponse({ success })
          }
          break
      }
    })
  }


  createHighlight(text, color = 'yellow', selection = window.getSelection()) {
    // Start performance timing
    const timing = performanceMonitor.startTiming('highlightCreation')
    
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      console.warn('[HighlightEngine] No valid selection')
      performanceMonitor.endTiming(timing)
      return null
    }
    
    const range = selection.getRangeAt(0)
    const selectionText = selection.toString()
    text = text || selectionText
    
    if (!text.trim()) {
      console.warn('[HighlightEngine] Empty selection')
      performanceMonitor.endTiming(timing)
      return null
    }
    
    try {
      // Check if this is a cross-element selection
      const startContainer = range.startContainer
      const endContainer = range.endContainer
      const startElement = startContainer.nodeType === Node.TEXT_NODE ? 
        startContainer.parentElement : startContainer
      const endElement = endContainer.nodeType === Node.TEXT_NODE ? 
        endContainer.parentElement : endContainer
      
      // Check if selection spans multiple block-level elements
      const startBlock = startElement.closest('p, li, div, h1, h2, h3, h4, h5, h6, td, th') || startElement
      const endBlock = endElement.closest('p, li, div, h1, h2, h3, h4, h5, h6, td, th') || endElement
      const isCrossElement = startBlock !== endBlock
      
      console.log('[HighlightEngine] Start block:', startBlock)
      console.log('[HighlightEngine] End block:', endBlock)
      console.log('[HighlightEngine] Is cross-element:', isCrossElement)
      
      if (isCrossElement) {
        // Handle cross-element selections by creating separate highlights
        console.log('[HighlightEngine] Cross-element selection detected, creating separate highlights')
        const result = this.createMultipleHighlights(range, color)
        performanceMonitor.endTiming(timing)
        return result
      }
      
      // Single element highlight
      const id = generateHighlightId()
      
      // Get container info before modifying DOM
      const containerInfo = getContainerInfo(range)
      const position = findTextPositionInCleanText(text, containerInfo, range)
      
      // Wrap text nodes
      const elements = wrapTextNodes(range, id, color)
      
      if (elements.length === 0) {
        throw new Error('No elements created')
      }
      
      // Extract the actual highlighted text from the wrapped elements
      // This ensures we save exactly what was highlighted, not what was selected
      const actualHighlightedText = elements
        .map(el => el.textContent)
        .join('')
      
      // Log if there's a mismatch
      if (actualHighlightedText !== text) {
        console.warn('[HighlightEngine] Text mismatch detected:', 
          `selected: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}" (${text.length} chars) vs ` +
          `highlighted: "${actualHighlightedText.substring(0, 50)}${actualHighlightedText.length > 50 ? '...' : ''}" (${actualHighlightedText.length} chars)`
        )
      }
      
      // Recalculate position with the actual highlighted text
      const actualPosition = findTextPositionInCleanText(actualHighlightedText, containerInfo, range)
      
      // Create highlight object with sanitized data
      // OLD IMPLEMENTATION - URL WITH HASH FRAGMENTS
      // url: sanitizeUrl(window.location.href) || window.location.href, // Sanitize URL
      // const url = window.location.href
      // ISSUE: This stored highlights with hash fragments (#cite_note-17)
      // making them invisible when visiting the page without the fragment
      
      // NEW IMPLEMENTATION - NORMALIZED URL FOR CONSISTENT STORAGE
      const normalizedUrl = normalizeUrlForStorage(window.location.href) || window.location.href
      
      const highlight = {
        id,
        text: sanitizeForStorage(actualHighlightedText), // Sanitize text for safe storage
        color,
        timestamp: Date.now(),
        url: normalizedUrl, // Use normalized URL for storage
        elements: elements.length,
        location: {
          container: containerInfo,
          textIndex: actualPosition.index, // Use recalculated position
          occurrence: actualPosition.occurrence
        }
      }
      
      // Add to Redux store using normalized URL as key
      store.dispatch(addHighlight({ url: normalizedUrl, highlight }))
      
      /* OLD IMPLEMENTATION - MANUAL SAVE AFTER EACH HIGHLIGHT
      // Save to storage
      const state = store.getState()
      const highlights = state.highlights.byUrl[url] || []
      store.dispatch(saveHighlights({ url, highlights }))
      
      ISSUE: This caused immediate storage write for EACH highlight
      NEW: Automatic batched saving handles this after 1 second delay
      */
      
      // Clear selection
      selection.removeAllRanges()
      
      console.log(`[HighlightEngine] Created highlight: ${text}`)
      
      // End performance timing
      const metric = performanceMonitor.endTiming(timing)
      if (metric && metric.duration > 50) {
        console.warn(`[HighlightEngine] Slow highlight creation: ${metric.duration.toFixed(2)}ms`)
      }
      
      return highlight
      
    } catch (error) {
      console.error('[HighlightEngine] Creation failed:', error)
      performanceMonitor.endTiming(timing)
      return null
    }
  }

  createMultipleHighlights(range, color) {
    const highlights = []
    // OLD IMPLEMENTATION - Used raw URL with fragments
    // const url = window.location.href
    // NEW IMPLEMENTATION - Use normalized URL
    const url = normalizeUrlForStorage(window.location.href) || window.location.href
    
    // Get all block elements in the range
    const blocks = this.getBlockElementsInRange(range)
    
    blocks.forEach((block, index) => {
      const blockRange = document.createRange()
      
      // Set range for this specific block
      if (index === 0) {
        // First block: from start of selection to end of block
        blockRange.setStart(range.startContainer, range.startOffset)
        blockRange.setEndAfter(block.lastChild || block)
      } else if (index === blocks.length - 1) {
        // Last block: from start of block to end of selection
        blockRange.setStartBefore(block.firstChild || block)
        blockRange.setEnd(range.endContainer, range.endOffset)
      } else {
        // Middle blocks: entire block
        blockRange.selectNodeContents(block)
      }
      
      // Get text for this block
      const blockText = blockRange.toString().trim()
      if (!blockText) return
      
      const id = generateHighlightId()
      
      // Get container info for this specific block
      const containerInfo = getContainerInfo(blockRange)
      const position = findTextPositionInCleanText(blockText, containerInfo, blockRange)
      
      // Wrap text nodes in this block
      const elements = wrapTextNodes(blockRange, id, color)
      
      if (elements.length > 0) {
        // Extract actual highlighted text from wrapped elements
        const actualBlockText = elements
          .map(el => el.textContent)
          .join('')
        
        // Recalculate position with actual text
        const actualPosition = findTextPositionInCleanText(actualBlockText, containerInfo, blockRange)
        
        const highlight = {
          id,
          text: sanitizeForStorage(actualBlockText), // Sanitize text for safe storage
          color,
          timestamp: Date.now(),
          url: sanitizeUrl(url) || url, // Sanitize URL
          elements: elements.length,
          location: {
            container: containerInfo,
            textIndex: actualPosition.index,
            occurrence: actualPosition.occurrence
          }
        }
        
        highlights.push(highlight)
        store.dispatch(addHighlight({ url, highlight }))
      }
    })
    
    /* OLD IMPLEMENTATION - MANUAL SAVE
    // Save all highlights
    const state = store.getState()
    const allHighlights = state.highlights.byUrl[url] || []
    store.dispatch(saveHighlights({ url, highlights: allHighlights }))
    
    NEW: Automatic batched saving handles this
    */
    
    // Clear selection
    window.getSelection().removeAllRanges()
    
    console.log(`[HighlightEngine] Created ${highlights.length} separate highlights for cross-element selection`)
    return highlights
  }

  getBlockElementsInRange(range) {
    const blocks = []
    // Using centralized constant instead of duplicated string
    
    // Get start and end blocks
    const startBlock = range.startContainer.nodeType === Node.TEXT_NODE ?
      range.startContainer.parentElement.closest(BLOCK_SELECTOR) :
      range.startContainer.closest(BLOCK_SELECTOR)
      
    const endBlock = range.endContainer.nodeType === Node.TEXT_NODE ?
      range.endContainer.parentElement.closest(BLOCK_SELECTOR) :
      range.endContainer.closest(BLOCK_SELECTOR)
    
    if (!startBlock || !endBlock) return blocks
    
    // Single block
    if (startBlock === endBlock) {
      blocks.push(startBlock)
      return blocks
    }
    
    // Multiple blocks - just collect them in order
    let current = startBlock
    blocks.push(current)
    
    while (current && current !== endBlock) {
      current = current.nextElementSibling
      if (current && current.matches(BLOCK_SELECTOR)) {
        blocks.push(current)
      }
    }
    
    // If we didn't reach endBlock, it's not a sibling - just add it
    if (!blocks.includes(endBlock)) {
      blocks.push(endBlock)
    }
    
    return blocks
  }


  deleteHighlight(id) {
    // OLD IMPLEMENTATION - Used raw URL with fragments
    // const url = window.location.href
    // NEW IMPLEMENTATION - Use normalized URL
    const url = normalizeUrlForStorage(window.location.href) || window.location.href
    
    // Remove from DOM
    const removed = removeHighlightElements(id)
    
    if (removed > 0) {
      // Remove from Redux store
      store.dispatch(removeHighlight({ url, id }))
      
      /* OLD IMPLEMENTATION - IMMEDIATE SAVE
      // Save updated highlights
      const state = store.getState()
      const highlights = state.highlights.byUrl[url] || []
      store.dispatch(saveHighlights({ url, highlights }))
      
      NEW: Automatic batched saving handles this
      */
      
      // Hide toolbar
      store.dispatch(hideMiniToolbar())
      
      console.log(`[HighlightEngine] Deleted highlight: ${id}`)
      return true
    }
    
    return false
  }

  changeHighlightColor(id, newColor) {
    // OLD IMPLEMENTATION - Used raw URL with fragments
    // const url = window.location.href
    // NEW IMPLEMENTATION - Use normalized URL
    const url = normalizeUrlForStorage(window.location.href) || window.location.href
    
    // Update DOM
    const changed = changeHighlightColor(id, newColor)
    
    if (changed > 0) {
      // Update Redux store
      store.dispatch(updateHighlightColor({ url, id, color: newColor }))
      
      /* OLD IMPLEMENTATION - IMMEDIATE SAVE
      // Save updated highlights
      const state = store.getState()
      const highlights = state.highlights.byUrl[url] || []
      store.dispatch(saveHighlights({ url, highlights }))
      
      NEW: Automatic batched saving handles this
      */
      
      console.log(`[HighlightEngine] Changed color for highlight: ${id}`)
      return true
    }
    
    return false
  }


  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe()
    }
    
    document.removeEventListener('click', this.handleHighlightClick)
  }
  
  // Restore a single highlight (for undo functionality)
  restoreSingleHighlight(highlight) {
    try {
      // Find the container using the stored context
      const containers = getContainerInfo(highlight.text)
      
      for (const container of containers) {
        // Try to find matching text position
        const position = findTextPositionInCleanText(
          container.cleanText,
          highlight.text,
          highlight.textBefore,
          highlight.textAfter
        )
        
        if (position && position.index >= 0) {
          // Create highlight elements
          const highlightElements = wrapTextNodes(
            container.container,
            position.index,
            position.index + highlight.text.length,
            highlight.id,
            highlight.color
          )
          
          if (highlightElements && highlightElements.length > 0) {
            console.log(`[HighlightEngine] Restored highlight: ${highlight.id}`)
            
            // Also add to Redux store for consistency
            const url = window.location.href
            store.dispatch(addHighlight({ url, highlight }))
            
            return true
          }
        }
      }
      
      console.warn('[HighlightEngine] Could not restore highlight - text not found')
      return false
    } catch (error) {
      console.error('[HighlightEngine] Error restoring highlight:', error)
      return false
    }
  }
}

// Export singleton instance
export const highlightEngine = new HighlightEngine()
export { HighlightEngine }