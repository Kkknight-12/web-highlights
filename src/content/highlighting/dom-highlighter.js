/**
 * DOM Highlighter
 * Handles DOM manipulation for creating highlight elements
 */

import { HIGHLIGHT_COLORS, HIGHLIGHT_CLASS_BASE } from './highlight-constants.js'

/**
 * Get all text nodes within a range
 * @private
 */
function getTextNodesInRange(range) {
  const textNodes = []
  const commonAncestor = range.commonAncestorContainer
  
  // If the common ancestor is already a text node, return it
  if (commonAncestor.nodeType === Node.TEXT_NODE) {
    return [commonAncestor]
  }
  
  // Create a tree walker to find all text nodes
  const walker = document.createTreeWalker(
    commonAncestor,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        const nodeRange = document.createRange()
        nodeRange.selectNodeContents(node)
        
        // Check if this text node intersects with our selection range
        if (range.compareBoundaryPoints(Range.END_TO_START, nodeRange) <= 0 &&
            range.compareBoundaryPoints(Range.START_TO_END, nodeRange) >= 0) {
          return NodeFilter.FILTER_ACCEPT
        }
        return NodeFilter.FILTER_REJECT
      }
    }
  )
  
  let node
  while (node = walker.nextNode()) {
    textNodes.push(node)
  }
  
  return textNodes
}

/**
 * Create a highlight wrapper element
 */
export function createHighlightWrapper(id, color) {
  const wrapper = document.createElement('span')
  wrapper.className = `${HIGHLIGHT_CLASS_BASE} ${HIGHLIGHT_COLORS[color].className}`
  wrapper.setAttribute('data-highlight-id', id)
  wrapper.setAttribute('data-color', color)
  return wrapper
}

/**
 * Wrap text nodes with highlight elements
 */
export function wrapTextNodes(range, id, color) {
  const textNodes = getTextNodesInRange(range)
  const wrappedElements = []
  
  textNodes.forEach(node => {
    // Skip text nodes that are direct children of list elements (UL/OL)
    // These are usually whitespace between list items and shouldn't be highlighted
    const parent = node.parentElement
    if (parent && (parent.tagName === 'UL' || parent.tagName === 'OL')) {
      // Only skip if the text node contains only whitespace
      if (node.textContent.trim().length === 0) {
        return
      }
    }
    
    // Determine what part of this text node to highlight
    let startOffset = 0
    let endOffset = node.textContent.length
    
    // Adjust offsets based on the selection range
    if (node === range.startContainer && node === range.endContainer) {
      startOffset = range.startOffset
      endOffset = range.endOffset
    } else if (node === range.startContainer) {
      startOffset = range.startOffset
      endOffset = node.textContent.length
    } else if (node === range.endContainer) {
      startOffset = 0
      endOffset = range.endOffset
    }
    
    // Skip if there's nothing to highlight
    if (startOffset >= endOffset) {
      return
    }
    
    // Split the text node if needed and wrap only the selected part
    if (startOffset > 0) {
      // Split at the start to separate unhighlighted text
      node.splitText(startOffset)
      // Now node contains text before selection, and node.nextSibling contains the rest
      node = node.nextSibling
      endOffset = endOffset - startOffset
      startOffset = 0
    }
    
    if (endOffset < node.textContent.length) {
      // Split at the end to separate unhighlighted text
      node.splitText(endOffset)
      // Now node contains only the text to be highlighted
    }
    
    // Create and insert the highlight wrapper
    const wrapper = createHighlightWrapper(id, color)
    node.parentNode.insertBefore(wrapper, node)
    wrapper.appendChild(node)
    wrappedElements.push(wrapper)
  })
  
  return wrappedElements
}

/**
 * Remove highlight elements with a specific ID
 * @param {string} id - Highlight ID
 * @returns {number} Number of elements removed
 */
export function removeHighlightElements(id) {
  const elements = document.querySelectorAll(`[data-highlight-id="${id}"]`)
  let removed = 0
  
  elements.forEach(element => {
    const parent = element.parentNode
    while (element.firstChild) {
      parent.insertBefore(element.firstChild, element)
    }
    element.remove()
    removed++
  })
  
  // Normalize text nodes
  if (removed > 0) {
    document.body.normalize()
  }
  
  return removed
}

/**
 * Change the color of highlight elements
 * @param {string} id - Highlight ID
 * @param {string} newColor - New color
 * @returns {number} Number of elements changed
 */
export function changeHighlightColor(id, newColor) {
  const elements = document.querySelectorAll(`[data-highlight-id="${id}"]`)
  let changed = 0
  
  if (!HIGHLIGHT_COLORS[newColor]) {
    return 0
  }
  
  elements.forEach(element => {
    // Remove old color class
    const currentColor = element.getAttribute('data-color')
    if (currentColor && HIGHLIGHT_COLORS[currentColor]) {
      element.classList.remove(HIGHLIGHT_COLORS[currentColor].className)
    }
    
    // Add new color class
    element.classList.add(HIGHLIGHT_COLORS[newColor].className)
    element.setAttribute('data-color', newColor)
    changed++
  })
  
  return changed
}

/**
 * Restore a highlight element for saved highlights
 * @param {Node} node - Text node
 * @param {number} start - Start offset
 * @param {number} end - End offset
 * @param {string} id - Highlight ID
 * @param {string} color - Highlight color
 * @returns {boolean} Success
 */
export function restoreHighlightElement(node, start, end, id, color) {
  if (node.nodeType !== Node.TEXT_NODE) {
    return false
  }
  
  const range = document.createRange()
  range.setStart(node, start)
  range.setEnd(node, end)
  
  const wrapper = createHighlightWrapper(id, color)
  
  try {
    range.surroundContents(wrapper)
    return true
  } catch (e) {
    // Fallback method
    try {
      const contents = range.extractContents()
      wrapper.appendChild(contents)
      range.insertNode(wrapper)
      return true
    } catch (fallbackError) {
      console.error('[DOMHighlighter] Failed to restore highlight:', fallbackError)
      return false
    }
  }
}

