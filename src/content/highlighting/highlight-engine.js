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
import { sanitizeForStorage, sanitizeUrl } from '../../utils/text-sanitizer.js'

class HighlightEngine {
  constructor() {
    this.unsubscribe = null
    
    // Arrow function to preserve 'this' binding for proper event listener removal
    this.handleHighlightClick = (e) => {
      const element = e.target.closest(COMPONENT_SELECTORS.HIGHLIGHT)
      if (!element) return
      
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
      // FIX: Use calculateToolbarPosition to get proper x,y coordinates
      const toolbarPosition = {
        x: rect.left + window.scrollX + (rect.width / 2) - 75, // Center toolbar
        y: rect.bottom + window.scrollY + 5 // Below highlight
      }
      
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
    document.addEventListener('click', this.handleHighlightClick, true)
    
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
      }
    })
  }


  createHighlight(text, color = 'yellow', selection = window.getSelection()) {
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      console.warn('[HighlightEngine] No valid selection')
      return null
    }
    
    const range = selection.getRangeAt(0)
    const selectionText = selection.toString()
    text = text || selectionText
    
    if (!text.trim()) {
      console.warn('[HighlightEngine] Empty selection')
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
        return this.createMultipleHighlights(range, color)
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
      const highlight = {
        id,
        text: sanitizeForStorage(actualHighlightedText), // Sanitize text for safe storage
        color,
        timestamp: Date.now(),
        url: sanitizeUrl(window.location.href) || window.location.href, // Sanitize URL
        elements: elements.length,
        location: {
          container: containerInfo,
          textIndex: actualPosition.index, // Use recalculated position
          occurrence: actualPosition.occurrence
        }
      }
      
      // Add to Redux store
      const url = window.location.href
      store.dispatch(addHighlight({ url, highlight }))
      
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
      return highlight
      
    } catch (error) {
      console.error('[HighlightEngine] Creation failed:', error)
      return null
    }
  }

  createMultipleHighlights(range, color) {
    const highlights = []
    const url = window.location.href
    
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
    const url = window.location.href
    
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
    const url = window.location.href
    
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