/**
 * DOM Highlighter
 * Handles DOM manipulation for creating highlight elements
 */

import { HIGHLIGHT_COLORS, HIGHLIGHT_CLASS_BASE } from './highlight-constants.js'
import { 
  getParentNode, 
  getParentElement,
  safeTextContent,
  safeInsertBefore,
  safeAppendChild,
  safeFirstChild,
  safeNextSibling,
  safeNormalize,
  safeAddClass,
  safeRemoveClass,
  safeSetAttribute,
  safeGetAttribute
} from '../../utils/dom-safety.js'

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
  safeSetAttribute(wrapper, 'data-highlight-id', id)
  safeSetAttribute(wrapper, 'data-color', color)
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
    const parent = getParentElement(node)
    if (parent && (parent.tagName === 'UL' || parent.tagName === 'OL')) {
      if (safeTextContent(node).trim().length === 0) {
        return
      }
    }
    
    // Determine what part of this text node to highlight
    let startOffset = 0
    let endOffset = safeTextContent(node).length
    
    // Adjust offsets based on the selection range
    if (node === range.startContainer && node === range.endContainer) {
      startOffset = range.startOffset
      endOffset = range.endOffset
    } else if (node === range.startContainer) {
      startOffset = range.startOffset
    endOffset = safeTextContent(node).length
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
      node = safeNextSibling(node)
      if (!node) return // Safety check
      endOffset = endOffset - startOffset
    }
    
    if (endOffset < safeTextContent(node).length) {
      node.splitText(endOffset)
    }
    
    // Create and insert the highlight wrapper
    const wrapper = createHighlightWrapper(id, color)
    const parent = getParentNode(node)
    if (parent) {
      safeInsertBefore(parent, wrapper, node)
      safeAppendChild(wrapper, node)
      wrappedElements.push(wrapper)
    }
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
    const parent = getParentNode(element)
    if (parent) {
      parentsToNormalize.add(parent)
      
      // Collect child nodes to be moved
      const childNodes = []
      let firstChild = safeFirstChild(element)
      while (firstChild) {
        childNodes.push(element.removeChild(firstChild))
        firstChild = safeFirstChild(element)
      }
      
      operations.push({
        element,
        parent,
        childNodes,
        nextSibling: safeNextSibling(element)
      })
    }
  })
  
  // Phase 2: Execute all DOM modifications
  operations.forEach(op => {
    // Insert all child nodes back
    const fragment = document.createDocumentFragment()
    op.childNodes.forEach(child => safeAppendChild(fragment, child))
    
    if (op.nextSibling) {
      safeInsertBefore(op.parent, fragment, op.nextSibling)
    } else {
      safeAppendChild(op.parent, fragment)
    }
    
    // Remove the highlight wrapper
    if (op.element && typeof op.element.remove === 'function') {
      op.element.remove()
    }
  })
  
  // Phase 3: Normalize affected parent nodes
  parentsToNormalize.forEach(parent => {
    safeNormalize(parent)
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
    const currentColor = safeGetAttribute(element, 'data-color')
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
        safeRemoveClass(op.element, HIGHLIGHT_COLORS[op.currentColor].className)
      }
      
      // Add new color class and update attribute
      safeAddClass(op.element, HIGHLIGHT_COLORS[newColor].className)
      safeSetAttribute(op.element, 'data-color', newColor)
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
  
  // Validate offsets are within bounds
  const textLength = node.textContent.length
  if (start < 0 || start > textLength || end < 0 || end > textLength || start > end) {
    console.warn('[DOMHighlighter] Invalid offsets for restore:', {
      start, end, textLength, 
      text: node.textContent.substring(0, 20) + '...'
    })
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

/**
 * Batch restore multiple highlight elements for better performance
 * @param {Array} operations - Array of {node, start, end, id, color} objects
 * @returns {number} Number of successfully restored highlights
 */
export function batchRestoreHighlights(operations) {
  if (!operations || operations.length === 0) {
    return 0
  }
  
  let restored = 0
  
  // Group operations by parent node for better performance
  const operationsByParent = new Map()
  
  operations.forEach(op => {
    if (op.node && op.node.nodeType === Node.TEXT_NODE && op.node.parentNode) {
      const parent = op.node.parentNode
      if (!operationsByParent.has(parent)) {
        operationsByParent.set(parent, [])
      }
      operationsByParent.get(parent).push(op)
    }
  })
  
  // Process each parent's operations together
  operationsByParent.forEach((parentOps, parent) => {
    // Sort operations by position to avoid conflicts
    parentOps.sort((a, b) => {
      if (a.node === b.node) {
        return a.start - b.start
      }
      // Compare node positions
      const position = a.node.compareDocumentPosition(b.node)
      return position & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
    })
    
    // Apply operations in reverse order to avoid offset shifts
    for (let i = parentOps.length - 1; i >= 0; i--) {
      const op = parentOps[i]
      try {
        const success = restoreHighlightElement(op.node, op.start, op.end, op.id, op.color)
        if (success) restored++
      } catch (error) {
        console.error('[DOMHighlighter] Batch restore failed for operation:', error)
      }
    }
  })
  
  return restored
}