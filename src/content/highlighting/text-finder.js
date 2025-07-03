/**
 * Text Finder
 * Finds text locations within DOM for accurate highlight restoration
 */

import { CONTAINER_TAGS, BLOCK_TAGS } from './highlight-constants.js'

/**
 * Get clean text without any highlight spans
 */
export function getCleanText(element) {
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

/**
 * Get container info for a range
 */
export function getContainerInfo(range) {
  const startContainer = range.startContainer
  const startElement = startContainer.nodeType === Node.TEXT_NODE ? 
    startContainer.parentElement : startContainer
  
  // Find the meaningful container
  const meaningfulContainer = startElement.closest(CONTAINER_TAGS.join(', ')) || startElement
  
  // Check if in a list item
  const listItem = meaningfulContainer.tagName === 'LI' ? 
    meaningfulContainer : meaningfulContainer.closest('li')
  
  if (listItem) {
    const list = listItem.parentElement
    const allItems = Array.from(list.children)
    const itemIndex = allItems.indexOf(listItem)
    
    return {
      type: 'list',
      listType: list.tagName,
      itemIndex: itemIndex,
      totalItems: allItems.length,
      cleanText: getCleanText(listItem),
      // Store context from adjacent items
      prevItemText: itemIndex > 0 ? getCleanText(allItems[itemIndex - 1]).slice(0, 50) : null,
      nextItemText: itemIndex < allItems.length - 1 ? getCleanText(allItems[itemIndex + 1]).slice(0, 50) : null
    }
  }
  
  // For non-list elements
  return {
    type: 'element',
    tagName: meaningfulContainer.tagName,
    cleanText: getCleanText(meaningfulContainer),
    id: meaningfulContainer.id || null,
    className: meaningfulContainer.className || null
  }
}

/**
 * Find text position within clean text
 */
export function findTextPositionInCleanText(text, containerInfo, range) {
  const cleanText = containerInfo.cleanText
  
  // Normalize whitespace for searching
  const normalizedText = text.replace(/\s+/g, ' ').trim()
  const normalizedCleanText = cleanText.replace(/\s+/g, ' ')
  
  /* OLD O(n²) IMPLEMENTATION - PRESERVED FOR REFERENCE
  const positions = []
  let index = normalizedCleanText.indexOf(normalizedText)
  
  while (index !== -1) {
    // Map back to original position - THIS IS O(n) FOR EACH OCCURRENCE!
    const originalIndex = mapNormalizedToOriginal(cleanText, index)
    positions.push(originalIndex)
    index = normalizedCleanText.indexOf(normalizedText, index + 1)
  }
  */
  
  // NEW O(n) IMPLEMENTATION - BUILD POSITION MAPPING ONCE
  // Create a mapping table between normalized and original positions
  const positionMap = buildNormalizedPositionMap(cleanText)
  
  // Find all occurrences using the pre-built mapping
  const positions = []
  let index = normalizedCleanText.indexOf(normalizedText)
  
  while (index !== -1) {
    // O(1) lookup instead of O(n) iteration
    const originalIndex = positionMap.get(index) || index
    positions.push(originalIndex)
    index = normalizedCleanText.indexOf(normalizedText, index + 1)
  }
  
  // Single occurrence
  if (positions.length === 1) {
    return { index: positions[0], occurrence: 0 }
  }
  
  // No occurrences
  if (positions.length === 0) {
    console.warn(`[TextFinder] Text "${text}" not found in container`)
    return { index: -1, occurrence: -1 }
  }
  
  // Multiple occurrences - need to determine which one
  if (containerInfo.type === 'list') {
    // For lists, we already have the correct container
    return { index: positions[0], occurrence: 0 }
  }
  
  // For non-list elements, try to determine which occurrence
  try {
    const startElement = range.startContainer.nodeType === Node.TEXT_NODE ? 
      range.startContainer.parentElement : range.startContainer
    const container = startElement.closest(containerInfo.tagName.toLowerCase())
    
    if (container) {
      const beforeRange = document.createRange()
      beforeRange.selectNodeContents(container)
      beforeRange.setEnd(range.startContainer, range.startOffset)
      const beforeText = beforeRange.toString()
      
      // Find which occurrence best matches our position
      let bestMatch = 0
      let minDiff = Infinity
      
      for (let i = 0; i < positions.length; i++) {
        const diff = Math.abs(positions[i] - beforeText.length)
        if (diff < minDiff) {
          minDiff = diff
          bestMatch = i
        }
      }
      
      return { index: positions[bestMatch], occurrence: bestMatch }
    }
  } catch (e) {
    console.warn('[TextFinder] Error finding text position:', e)
  }
  
  // Fallback to first occurrence
  return { index: positions[0], occurrence: 0 }
}

/**
 * Find all text nodes containing a specific text
 */
export function findTextNodes(container, text) {
  const textNodes = []
  const cleanText = getCleanText(container)
  
  if (!cleanText.includes(text)) {
    return textNodes
  }
  
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        // Skip empty nodes
        if (!node.textContent.trim()) {
          return NodeFilter.FILTER_REJECT
        }
        // Skip nodes inside existing highlights
        if (node.parentElement?.classList.contains('web-highlighter-highlight')) {
          return NodeFilter.FILTER_REJECT
        }
        return NodeFilter.FILTER_ACCEPT
      }
    }
  )
  
  let node
  while (node = walker.nextNode()) {
    if (node.textContent.includes(text)) {
      textNodes.push(node)
    }
  }
  
  return textNodes
}

/**
 * Create a range for specific text within a container
 */
export function createRangeForText(container, text, occurrence = 0) {
  const textNodes = getAllTextNodes(container)
  let currentOccurrence = 0
  let found = false
  let range = null
  
  for (const node of textNodes) {
    const nodeText = node.textContent
    let searchIndex = 0
    
    while ((searchIndex = nodeText.indexOf(text, searchIndex)) !== -1) {
      if (currentOccurrence === occurrence) {
        range = document.createRange()
        range.setStart(node, searchIndex)
        range.setEnd(node, searchIndex + text.length)
        found = true
        break
      }
      currentOccurrence++
      searchIndex += text.length
    }
    
    if (found) break
  }
  
  return range
}

/**
 * Get all text nodes in a container
 */
function getAllTextNodes(container) {
  const textNodes = []
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null,
    false
  )
  
  let node
  while (node = walker.nextNode()) {
    textNodes.push(node)
  }
  
  return textNodes
}

/**
 * Find text within a container with context information
 * @param {Element} container - Container element
 * @param {string} text - Text to find
 * @param {number} textIndex - Character index in container
 * @param {number} occurrence - Which occurrence to find
 * @returns {Array} Array of text node info objects
 */
export function findTextInContainer(container, text, textIndex, occurrence = 0) {
  const cleanText = getCleanText(container)
  
  // Normalize whitespace in the search text to handle cross-element selections
  const normalizedSearchText = text.replace(/\s+/g, ' ').trim()
  const normalizedCleanText = cleanText.replace(/\s+/g, ' ')
  
  /* OLD O(n²) IMPLEMENTATION - PRESERVED FOR REFERENCE
  // Find all occurrences of the text
  let index = normalizedCleanText.indexOf(normalizedSearchText)
  let occurrenceCount = 0
  let targetIndex = -1
  
  while (index !== -1) {
    if (occurrenceCount === occurrence) {
      // Map back to original text position - THIS WAS O(n)!
      targetIndex = mapNormalizedToOriginal(cleanText, index)
      break
    }
    occurrenceCount++
    index = normalizedCleanText.indexOf(normalizedSearchText, index + 1)
  }
  */
  
  // NEW O(n) IMPLEMENTATION - Build position map once
  const positionMap = buildNormalizedPositionMap(cleanText)
  
  // Find specific occurrence
  let index = normalizedCleanText.indexOf(normalizedSearchText)
  let occurrenceCount = 0
  let targetIndex = -1
  
  while (index !== -1) {
    if (occurrenceCount === occurrence) {
      // O(1) lookup instead of O(n) mapping
      targetIndex = positionMap.get(index) || index
      break
    }
    occurrenceCount++
    index = normalizedCleanText.indexOf(normalizedSearchText, index + 1)
  }
  
  if (targetIndex === -1) {
    return [] // Text not found
  }
  
  // Now find the actual text nodes that contain this text
  const result = []
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null,
    false
  )
  
  let currentIndex = 0
  let node
  
  // Use the original text length for collecting nodes
  const originalTextLength = text.length
  
  while (node = walker.nextNode()) {
    const nodeText = node.textContent
    const nodeLength = nodeText.length
    
    // Check if our target text starts in this node
    if (currentIndex <= targetIndex && targetIndex < currentIndex + nodeLength) {
      const startInNode = targetIndex - currentIndex
      const endInNode = Math.min(startInNode + originalTextLength, nodeLength)
      
      result.push({
        node,
        start: startInNode,
        end: endInNode
      })
      
      // If text spans multiple nodes, continue collecting
      if (endInNode - startInNode < originalTextLength) {
        const remainingLength = originalTextLength - (endInNode - startInNode)
        let collectedLength = endInNode - startInNode
        
        while (collectedLength < originalTextLength && (node = walker.nextNode())) {
          const nodeText = node.textContent
          // Fix: calculate how much we still need, not subtract collected from remaining
          const stillNeeded = originalTextLength - collectedLength
          const takeLength = Math.min(stillNeeded, nodeText.length)
          
          if (takeLength <= 0) {
            break
          }
          
          result.push({
            node,
            start: 0,
            end: takeLength
          })
          
          collectedLength += takeLength
        }
      }
      
      break
    }
    
    currentIndex += nodeLength
  }
  
  return result
}

/**
 * Map normalized text position back to original text position
 * @private
 */
/* OLD O(n) IMPLEMENTATION - PRESERVED FOR REFERENCE
 * This function was called for EACH occurrence found, making the overall algorithm O(n²)
function mapNormalizedToOriginal(originalText, normalizedIndex) {
  let originalIndex = 0
  let normalizedCount = 0
  
  for (let i = 0; i < originalText.length; i++) {
    if (normalizedCount === normalizedIndex) {
      return i
    }
    
    // Skip consecutive whitespace in counting
    if (/\s/.test(originalText[i])) {
      // Skip additional whitespace
      while (i + 1 < originalText.length && /\s/.test(originalText[i + 1])) {
        i++
      }
      normalizedCount++ // Count as single space
    } else {
      normalizedCount++
    }
  }
  
  return originalIndex
}
*/

// NEW O(n) IMPLEMENTATION - Build complete mapping in one pass
/**
 * Build a mapping table between normalized positions and original positions
 * This is O(n) but only runs once, not for each occurrence
 * @param {string} originalText - Original text with all whitespace
 * @returns {Map} Map of normalized position -> original position
 */
function buildNormalizedPositionMap(originalText) {
  const positionMap = new Map()
  let normalizedPos = 0
  
  for (let i = 0; i < originalText.length; i++) {
    // Map current normalized position to original position
    positionMap.set(normalizedPos, i)
    
    // Handle whitespace normalization
    if (/\s/.test(originalText[i])) {
      // Skip consecutive whitespace
      while (i + 1 < originalText.length && /\s/.test(originalText[i + 1])) {
        i++
      }
      normalizedPos++ // Count as single space
    } else {
      normalizedPos++
    }
  }
  
  return positionMap
}

