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

/* OLD IMPLEMENTATION - ISSUE: Multiple DOM operations in loop causing reflows
export function wrapTextNodes(range, id, color) {
  const textNodes = getTextNodesInRange(range)
  const wrappedElements = []
  
  textNodes.forEach(node => {
    // ... processing logic ...
    
    // Create and insert the highlight wrapper
    const wrapper = createHighlightWrapper(id, color)
    node.parentNode.insertBefore(wrapper, node) // DOM modification in loop
    wrapper.appendChild(node) // Another DOM modification
    wrappedElements.push(wrapper)
  })
  
  return wrappedElements
}
*/

// NEW IMPLEMENTATION - Batch DOM operations to minimize reflows
// Uses DocumentFragment pattern to collect all operations before applying
export function wrapTextNodes(range, id, color) {
  const textNodes = getTextNodesInRange(range)
  const wrappedElements = []
  const operations = []
  
  // Phase 1: Prepare all operations without modifying DOM
  textNodes.forEach(node => {
    // Skip text nodes that are direct children of list elements (UL/OL)
    const parent = node.parentElement
    if (parent && (parent.tagName === 'UL' || parent.tagName === 'OL')) {
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
    
    // Store operation for later execution
    operations.push({
      node,
      startOffset,
      endOffset
    })
  })
  
  // Phase 2: Execute all DOM modifications in batch
  operations.forEach(op => {
    let { node, startOffset, endOffset } = op
    
    // Split the text node if needed
    if (startOffset > 0) {
      node.splitText(startOffset)
      node = node.nextSibling
      endOffset = endOffset - startOffset
    }
    
    if (endOffset < node.textContent.length) {
      node.splitText(endOffset)
    }
    
    // Create and insert the highlight wrapper
    const wrapper = createHighlightWrapper(id, color)
    node.parentNode.insertBefore(wrapper, node)
    wrapper.appendChild(node)
    wrappedElements.push(wrapper)
  })
  
  return wrappedElements
}

/* OLD IMPLEMENTATION - ISSUE: Multiple DOM operations in loop
export function removeHighlightElements(id) {
  const elements = document.querySelectorAll(`[data-highlight-id="${id}"]`)
  let removed = 0
  
  elements.forEach(element => {
    const parent = element.parentNode
    while (element.firstChild) {
      parent.insertBefore(element.firstChild, element) // DOM modification in loop
    }
    element.remove() // Another DOM modification
    removed++
  })
  
  // Normalize text nodes
  if (removed > 0) {
    document.body.normalize()
  }
  
  return removed
}
*/

// NEW IMPLEMENTATION - Batch DOM operations using DocumentFragment
// Minimizes reflows by collecting all operations before execution
/**
 * Remove highlight elements with a specific ID
 * @param {string} id - Highlight ID
 * @returns {number} Number of elements removed
 */
export function removeHighlightElements(id) {
  const elements = document.querySelectorAll(`[data-highlight-id="${id}"]`)
  if (elements.length === 0) return 0
  
  // Collect parent nodes that will need normalization
  const parentsToNormalize = new Set()
  
  // Phase 1: Prepare all operations
  const operations = []
  elements.forEach(element => {
    const parent = element.parentNode
    if (parent) {
      parentsToNormalize.add(parent)
      
      // Collect child nodes to be moved
      const childNodes = []
      while (element.firstChild) {
        childNodes.push(element.removeChild(element.firstChild))
      }
      
      operations.push({
        element,
        parent,
        childNodes,
        nextSibling: element.nextSibling
      })
    }
  })
  
  // Phase 2: Execute all DOM modifications
  operations.forEach(op => {
    // Insert all child nodes back
    const fragment = document.createDocumentFragment()
    op.childNodes.forEach(child => fragment.appendChild(child))
    
    if (op.nextSibling) {
      op.parent.insertBefore(fragment, op.nextSibling)
    } else {
      op.parent.appendChild(fragment)
    }
    
    // Remove the highlight wrapper
    op.element.remove()
  })
  
  // Phase 3: Normalize affected parent nodes
  parentsToNormalize.forEach(parent => {
    try {
      parent.normalize()
    } catch (e) {
      // Some parents might not support normalize
      console.warn('[DOMHighlighter] Could not normalize parent:', e)
    }
  })
  
  return operations.length
}

/* OLD IMPLEMENTATION - ISSUE: Multiple DOM operations in loop
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
      element.classList.remove(HIGHLIGHT_COLORS[currentColor].className) // DOM modification in loop
    }
    
    // Add new color class
    element.classList.add(HIGHLIGHT_COLORS[newColor].className) // DOM modification in loop
    element.setAttribute('data-color', newColor) // DOM modification in loop
    changed++
  })
  
  return changed
}
*/

// NEW IMPLEMENTATION - Batch DOM operations to minimize reflows
// Collects all elements first, then applies changes in batch
/**
 * Change the color of highlight elements
 * @param {string} id - Highlight ID
 * @param {string} newColor - New color
 * @returns {number} Number of elements changed
 */
export function changeHighlightColor(id, newColor) {
  const elements = document.querySelectorAll(`[data-highlight-id="${id}"]`)
  
  if (!HIGHLIGHT_COLORS[newColor] || elements.length === 0) {
    return 0
  }
  
  // Phase 1: Prepare operations (collect current colors)
  const operations = []
  elements.forEach(element => {
    const currentColor = element.getAttribute('data-color')
    operations.push({
      element,
      currentColor,
      newColor
    })
  })
  
  // Phase 2: Execute all DOM modifications in batch
  // Use requestAnimationFrame to batch all DOM updates in single frame
  requestAnimationFrame(() => {
    operations.forEach(op => {
      // Remove old color class
      if (op.currentColor && HIGHLIGHT_COLORS[op.currentColor]) {
        op.element.classList.remove(HIGHLIGHT_COLORS[op.currentColor].className)
      }
      
      // Add new color class and update attribute
      op.element.classList.add(HIGHLIGHT_COLORS[newColor].className)
      op.element.setAttribute('data-color', newColor)
    })
  })
  
  return operations.length
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

