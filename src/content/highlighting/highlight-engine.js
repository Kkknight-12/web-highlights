/**
 * Highlight Engine
 * Core highlighting logic - creates and manages highlights
 */

import { store } from '../../store/store'
import { addHighlight, removeHighlight, updateHighlightColor, saveHighlights } from '../../store/highlightsSlice'
import { hideMiniToolbar, showMiniToolbar } from '../../store/uiSlice'
import { generateHighlightId, HIGHLIGHT_COLORS } from './highlight-constants.js'
import { getContainerInfo, findTextPositionInCleanText } from './text-finder.js'
import { wrapTextNodes, removeHighlightElements, changeHighlightColor } from './dom-highlighter.js'

class HighlightEngine {
  constructor() {
    this.unsubscribe = null
  }

  init() {
    console.log('[HighlightEngine] Initializing')
    
    // Listen for DOM clicks on highlights
    document.addEventListener('click', this.handleHighlightClick.bind(this), true)
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
      
      // Create highlight object
      const highlight = {
        id,
        text,
        color,
        timestamp: Date.now(),
        url: window.location.href,
        elements: elements.length,
        location: {
          container: containerInfo,
          textIndex: position.index,
          occurrence: position.occurrence
        }
      }
      
      // Add to Redux store
      const url = window.location.href
      store.dispatch(addHighlight({ url, highlight }))
      
      // Save to storage
      const state = store.getState()
      const highlights = state.highlights.byUrl[url] || []
      store.dispatch(saveHighlights({ url, highlights }))
      
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
        const highlight = {
          id,
          text: blockText,
          color,
          timestamp: Date.now(),
          url,
          elements: elements.length,
          location: {
            container: containerInfo,
            textIndex: position.index,
            occurrence: position.occurrence
          }
        }
        
        highlights.push(highlight)
        store.dispatch(addHighlight({ url, highlight }))
      }
    })
    
    // Save all highlights
    const state = store.getState()
    const allHighlights = state.highlights.byUrl[url] || []
    store.dispatch(saveHighlights({ url, highlights: allHighlights }))
    
    // Clear selection
    window.getSelection().removeAllRanges()
    
    console.log(`[HighlightEngine] Created ${highlights.length} separate highlights for cross-element selection`)
    return highlights
  }

  getBlockElementsInRange(range) {
    const blocks = []
    const blockSelector = 'p, li, div, h1, h2, h3, h4, h5, h6, td, th'
    
    // Get start and end blocks
    const startBlock = range.startContainer.nodeType === Node.TEXT_NODE ?
      range.startContainer.parentElement.closest(blockSelector) :
      range.startContainer.closest(blockSelector)
      
    const endBlock = range.endContainer.nodeType === Node.TEXT_NODE ?
      range.endContainer.parentElement.closest(blockSelector) :
      range.endContainer.closest(blockSelector)
    
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
      if (current && current.matches(blockSelector)) {
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
      
      // Save updated highlights
      const state = store.getState()
      const highlights = state.highlights.byUrl[url] || []
      store.dispatch(saveHighlights({ url, highlights }))
      
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
      
      // Save updated highlights
      const state = store.getState()
      const highlights = state.highlights.byUrl[url] || []
      store.dispatch(saveHighlights({ url, highlights }))
      
      console.log(`[HighlightEngine] Changed color for highlight: ${id}`)
      return true
    }
    
    return false
  }

  handleHighlightClick(e) {
    const element = e.target.closest('[data-highlight-id]')
    if (!element) return
    
    e.preventDefault()
    e.stopPropagation()
    
    const id = element.dataset.highlightId
    const rect = element.getBoundingClientRect()
    
    // Show mini toolbar through Redux
    store.dispatch(showMiniToolbar({
      position: {
        top: rect.top + window.scrollY,
        left: rect.left + rect.width / 2
      },
      highlightId: id
    }))
  }

  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe()
    }
    
    document.removeEventListener('click', this.handleHighlightClick)
  }
}

// Export singleton instance
export const highlightEngine = new HighlightEngine()
export { HighlightEngine }