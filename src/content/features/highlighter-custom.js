// Custom highlighter implementation - Phase 1: Basic creation/removal
import { store } from '../../store/store'
import { addHighlight, removeHighlight, saveHighlights } from '../../store/highlightsSlice'

// Highlight colors configuration (same as before)
export const HIGHLIGHT_COLORS = {
  yellow: { className: 'highlight-yellow', hex: '#ffe066' },
  green: { className: 'highlight-green', hex: '#6ee7b7' },
  blue: { className: 'highlight-blue', hex: '#93c5fd' },
  pink: { className: 'highlight-pink', hex: '#fca5a5' }
}

// Track if highlights have been restored to prevent duplicates
let highlightsRestored = false

// Initialize the custom highlighter
export function initializeHighlighter() {
  // Handle clicks on highlights
  document.addEventListener('click', handleHighlightClick)
  
  // Subscribe to store changes for restoration
  store.subscribe(handleStoreChange)
  
  console.log('[Custom Highlighter] Initialized')
}

// Generate unique ID
function generateId() {
  return `highlight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Phase 2: Extract context from a range
function extractContext(range) {
  const startContainer = range.startContainer
  const endContainer = range.endContainer
  const startOffset = range.startOffset
  const endOffset = range.endOffset
  
  // Get text before selection (up to 50 chars or block boundary)
  let beforeText = ''
  if (startContainer.nodeType === Node.TEXT_NODE) {
    // Get text from the same text node before selection
    beforeText = startContainer.textContent.substring(
      Math.max(0, startOffset - 50), 
      startOffset
    )
    
    // If we need more context, traverse to previous text nodes
    if (beforeText.length < 50) {
      let node = startContainer
      let remainingChars = 50 - beforeText.length
      
      while (remainingChars > 0 && node) {
        const prevNode = getPreviousTextNode(node)
        if (!prevNode) break
        
        // Stop at block boundaries
        if (isBlockBoundary(node, prevNode)) break
        
        const prevText = prevNode.textContent
        const takeChars = Math.min(prevText.length, remainingChars)
        beforeText = prevText.substring(prevText.length - takeChars) + beforeText
        remainingChars -= takeChars
        node = prevNode
      }
    }
  }
  
  // Get text after selection (up to 50 chars or block boundary)
  let afterText = ''
  if (endContainer.nodeType === Node.TEXT_NODE) {
    // Get text from the same text node after selection
    afterText = endContainer.textContent.substring(
      endOffset,
      Math.min(endContainer.textContent.length, endOffset + 50)
    )
    
    // If we need more context, traverse to next text nodes
    if (afterText.length < 50) {
      let node = endContainer
      let remainingChars = 50 - afterText.length
      
      while (remainingChars > 0 && node) {
        const nextNode = getNextTextNode(node)
        if (!nextNode) break
        
        // Stop at block boundaries
        if (isBlockBoundary(node, nextNode)) break
        
        const nextText = nextNode.textContent
        const takeChars = Math.min(nextText.length, remainingChars)
        afterText = afterText + nextText.substring(0, takeChars)
        remainingChars -= takeChars
        node = nextNode
      }
    }
  }
  
  return {
    before: beforeText.trim(),
    after: afterText.trim()
  }
}

// Get parent element info
function getParentInfo(range) {
  const commonAncestor = range.commonAncestorContainer
  const parentElement = commonAncestor.nodeType === Node.TEXT_NODE 
    ? commonAncestor.parentElement 
    : commonAncestor
    
  // Get the immediate parent that contains the selection
  const container = parentElement.closest('p, li, div, span, h1, h2, h3, h4, h5, h6, td, th') || parentElement
  
  // Basic parent info
  const parentInfo = {
    tagName: container.tagName,
    className: container.className,
    id: container.id,
    fullText: container.textContent,
    selector: generateSelector(container)
  }
  
  // Phase 2: Add list-specific context if in a list
  const listItem = container.closest('li')
  if (listItem) {
    const list = listItem.parentElement
    const listItems = Array.from(list.children)
    const itemIndex = listItems.indexOf(listItem)
    
    parentInfo.listContext = {
      isInList: true,
      listType: list.tagName, // UL or OL
      itemIndex: itemIndex,
      itemText: listItem.textContent,
      prevItemText: itemIndex > 0 ? listItems[itemIndex - 1].textContent : null,
      nextItemText: itemIndex < listItems.length - 1 ? listItems[itemIndex + 1].textContent : null,
      listSelector: generateSelector(list)
    }
  }
  
  return parentInfo
}

// Generate CSS selector for element
function generateSelector(element) {
  const path = []
  let current = element
  
  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase()
    
    // Add ID if exists
    if (current.id) {
      selector = `#${current.id}`
      path.unshift(selector)
      break // ID is unique, no need to go further
    }
    
    // Add class if exists
    if (current.className && typeof current.className === 'string') {
      const classes = current.className.trim().split(/\s+/)
      if (classes.length > 0 && classes[0]) {
        selector += `.${classes[0]}`
      }
    }
    
    // Add nth-child if needed
    const parent = current.parentElement
    if (parent) {
      const siblings = Array.from(parent.children)
      const index = siblings.indexOf(current)
      if (siblings.filter(s => s.tagName === current.tagName).length > 1) {
        selector += `:nth-child(${index + 1})`
      }
    }
    
    path.unshift(selector)
    current = current.parentElement
  }
  
  return path.join(' > ')
}

// Helper: Get previous text node
function getPreviousTextNode(node) {
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null,
    false
  )
  
  // Position walker at current node
  let currentNode
  while (currentNode = walker.nextNode()) {
    if (currentNode === node) {
      // Now go back one
      return walker.previousNode()
    }
  }
  return null
}

// Helper: Get next text node
function getNextTextNode(node) {
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null,
    false
  )
  
  // Position walker at current node
  let currentNode
  while (currentNode = walker.nextNode()) {
    if (currentNode === node) {
      // Return the next one
      return walker.nextNode()
    }
  }
  return null
}

// Helper: Check if there's a block boundary between nodes
function isBlockBoundary(node1, node2) {
  const blockTags = ['P', 'DIV', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'TD', 'TH']
  
  // Get all parents of node1
  let current = node1.parentNode
  const parents1 = []
  while (current && current !== document.body) {
    if (blockTags.includes(current.tagName)) {
      parents1.push(current)
    }
    current = current.parentNode
  }
  
  // Check if node2 is in a different block
  current = node2.parentNode
  while (current && current !== document.body) {
    if (blockTags.includes(current.tagName) && !parents1.includes(current)) {
      return true
    }
    current = current.parentNode
  }
  
  return false
}

// Find which occurrence of the text this is within the parent
function findOccurrenceIndex(range, text, parentInfo) {
  const container = document.querySelector(parentInfo.selector)
  if (!container) {
    return { index: 0, total: 1 }
  }
  
  const fullText = container.textContent
  const occurrences = []
  let searchIndex = 0
  
  // Find all occurrences of the text
  while ((searchIndex = fullText.indexOf(text, searchIndex)) !== -1) {
    occurrences.push(searchIndex)
    searchIndex += text.length
  }
  
  // Find which occurrence our range corresponds to
  const rangeOffset = getRangeOffsetInContainer(range, container)
  let occurrenceIndex = 0
  
  for (let i = 0; i < occurrences.length; i++) {
    if (occurrences[i] === rangeOffset) {
      occurrenceIndex = i
      break
    }
  }
  
  return {
    index: occurrenceIndex,
    total: occurrences.length
  }
}

// Get the character offset of a range within a container
function getRangeOffsetInContainer(range, container) {
  const preRange = document.createRange()
  preRange.selectNodeContents(container)
  preRange.setEnd(range.startContainer, range.startOffset)
  
  return preRange.toString().length
}

// Phase 2: Enhanced highlight creation with context capture
export function createHighlight(color = 'yellow') {
  const selection = window.getSelection()
  
  // Validate selection
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    console.log('[Custom Highlighter] No valid selection')
    return null
  }
  
  const range = selection.getRangeAt(0)
  const text = selection.toString().trim()
  
  if (!text) {
    console.log('[Custom Highlighter] Selected text is empty')
    return null
  }
  
  const id = generateId()
  
  try {
    // Phase 2: Capture context before wrapping
    const context = extractContext(range)
    const parentInfo = getParentInfo(range)
    
    // Find which occurrence of the text this is within the parent
    const occurrence = findOccurrenceIndex(range, text, parentInfo)
    
    // Create wrapper span
    const wrapper = document.createElement('span')
    wrapper.className = `web-highlighter-highlight ${HIGHLIGHT_COLORS[color].className}`
    wrapper.setAttribute('data-highlight-id', id)
    wrapper.setAttribute('data-color', color)
    
    console.log('[Custom Highlighter] Creating highlight with classes:', wrapper.className)
    
    // Try to wrap the range content
    try {
      // This works for simple selections within a single text node
      range.surroundContents(wrapper)
      console.log('[Custom Highlighter] Used surroundContents method')
    } catch (e) {
      // If surroundContents fails (e.g., selection spans multiple elements),
      // extract and wrap the contents
      console.log('[Custom Highlighter] Using fallback wrapping method')
      const contents = range.extractContents()
      wrapper.appendChild(contents)
      range.insertNode(wrapper)
    }
    
    // Verify the highlight was added to DOM
    const addedElement = document.querySelector(`[data-highlight-id="${id}"]`)
    if (addedElement) {
      console.log('[Custom Highlighter] Highlight added to DOM:', addedElement.className)
    } else {
      console.error('[Custom Highlighter] Highlight not found in DOM after creation!')
    }
    
    // Create highlight object with Phase 2 context data
    const highlight = {
      id,
      text,
      color,
      timestamp: Date.now(),
      url: window.location.href,
      // Phase 2: Add location data
      location: {
        context: {
          before: context.before,
          after: context.after
        },
        parent: parentInfo,
        occurrence: occurrence
      }
    }
    
    // Add to Redux store
    store.dispatch(addHighlight({ url: window.location.href, highlight }))
    
    // Save to Chrome storage
    const state = store.getState()
    const highlights = state.highlights.byUrl[window.location.href] || []
    store.dispatch(saveHighlights({ url: window.location.href, highlights }))
    
    // Clear selection
    selection.removeAllRanges()
    
    console.log('[Custom Highlighter] Created:', id)
    console.log('[Custom Highlighter] Context:', context)
    console.log('[Custom Highlighter] Parent:', parentInfo)
    
    return highlight
    
  } catch (error) {
    console.error('[Custom Highlighter] Failed to create:', error)
    return null
  }
}

// Phase 1: Basic highlight removal
export function deleteHighlight(id) {
  // Find all elements with this highlight ID
  const elements = document.querySelectorAll(`[data-highlight-id="${id}"]`)
  
  if (elements.length === 0) {
    console.log('[Custom Highlighter] No elements found for ID:', id)
    return
  }
  
  elements.forEach(element => {
    // Get parent before we start moving nodes
    const parent = element.parentNode
    
    // Move all child nodes out of the wrapper
    while (element.firstChild) {
      parent.insertBefore(element.firstChild, element)
    }
    
    // Remove the now-empty wrapper
    element.remove()
  })
  
  // Merge adjacent text nodes to clean up
  document.body.normalize()
  
  // Update Redux store
  const url = window.location.href
  store.dispatch(removeHighlight({ url, id }))
  
  // Save to Chrome storage
  const state = store.getState()
  const highlights = state.highlights.byUrl[url] || []
  store.dispatch(saveHighlights({ url, highlights }))
  
  console.log('[Custom Highlighter] Deleted:', id)
}

// Change highlight color
export function changeHighlightColor(id, newColor) {
  const elements = document.querySelectorAll(`[data-highlight-id="${id}"]`)
  
  if (elements.length === 0) return
  
  // Get current color from first element
  const currentColor = elements[0].getAttribute('data-color')
  const oldClassName = HIGHLIGHT_COLORS[currentColor].className
  const newClassName = HIGHLIGHT_COLORS[newColor].className
  
  // Update all elements
  elements.forEach(element => {
    element.classList.remove(oldClassName)
    element.classList.add(newClassName)
    element.setAttribute('data-color', newColor)
  })
  
  console.log('[Custom Highlighter] Changed color:', id, currentColor, '->', newColor)
}

// Handle clicks on highlights
function handleHighlightClick(e) {
  const highlight = e.target.closest('.web-highlighter-highlight')
  if (highlight) {
    const id = highlight.getAttribute('data-highlight-id')
    if (id) {
      // Dispatch custom event for UI components
      window.dispatchEvent(new CustomEvent('highlight-clicked', {
        detail: { 
          id, 
          element: highlight,
          rect: highlight.getBoundingClientRect()
        }
      }))
    }
  }
}

// Handle store changes
let lastUrl = window.location.href
function handleStoreChange() {
  const state = store.getState()
  const currentUrl = state.highlights.currentUrl
  
  // If URL changed and matches current page, restore highlights
  if (currentUrl === window.location.href && currentUrl !== lastUrl) {
    lastUrl = currentUrl
    highlightsRestored = false
    setTimeout(restoreHighlights, 100)
  }
}

// Phase 3: Find text location using context and scoring
function findTextLocation(highlight) {
  const { text, location } = highlight
  const candidates = []
  
  // Phase 3: Find all text occurrences
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        // Skip existing highlights
        if (node.parentElement?.classList.contains('web-highlighter-highlight')) {
          return NodeFilter.FILTER_REJECT
        }
        // Skip empty text nodes
        if (!node.textContent.trim()) {
          return NodeFilter.FILTER_REJECT
        }
        return NodeFilter.FILTER_ACCEPT
      }
    },
    false
  )
  
  let node
  while (node = walker.nextNode()) {
    const nodeText = node.textContent
    let searchIndex = 0
    
    // Find all occurrences of our text in this node
    while ((searchIndex = nodeText.indexOf(text, searchIndex)) !== -1) {
      candidates.push({
        node: node,
        index: searchIndex,
        score: 0
      })
      searchIndex += text.length
    }
  }
  
  console.log(`[Custom Highlighter] Found ${candidates.length} candidates for "${text}"`)
  
  // If we have the expected context, let's check if we can find it
  if (location.context && location.context.before) {
    console.log(`[Custom Highlighter] Looking for context pattern: "${location.context.before}" + "${text}" + "${location.context.after.slice(0, 20)}..."`)
  }
  
  // Phase 3: Score each candidate
  candidates.forEach(candidate => {
    let score = 0
    const { node, index } = candidate
    
    // Context matching (highest weight)
    if (location.context) {
      // Get broader context from the text node
      const nodeText = node.textContent
      const beforeStart = Math.max(0, index - 50)
      const afterEnd = Math.min(nodeText.length, index + text.length + 50)
      
      // Extract actual context around this occurrence
      const actualBefore = nodeText.substring(beforeStart, index).trim()
      const actualAfter = nodeText.substring(index + text.length, afterEnd).trim()
      
      // Debug logging only for first few candidates
      if (candidates.indexOf(candidate) < 3) {
        console.log('[Custom Highlighter] Checking context for candidate at index', index)
        console.log('[Custom Highlighter] Expected before:', location.context.before)
        console.log('[Custom Highlighter] Actual before:', actualBefore.slice(-20))
        console.log('[Custom Highlighter] Expected after:', location.context.after)  
        console.log('[Custom Highlighter] Actual after:', actualAfter.slice(0, 20))
      }
      
      // Check text before
      if (location.context.before.length > 0) {
        if (actualBefore.endsWith(location.context.before)) {
          score += 30 // Exact match
          console.log('[Custom Highlighter] Exact before match +30')
        } else if (location.context.before.length < 10) {
          // For short context, check if it appears anywhere near the end
          if (actualBefore.slice(-20).includes(location.context.before)) {
            score += 20 // Short context match
            console.log('[Custom Highlighter] Short before context match +20')
          }
        } else if (actualBefore.includes(location.context.before.slice(-10))) {
          score += 15 // Partial match
          console.log('[Custom Highlighter] Partial before match +15')
        }
      }
      
      // Check text after
      if (location.context.after.length > 0) {
        if (actualAfter.startsWith(location.context.after)) {
          score += 30 // Exact match
          console.log('[Custom Highlighter] Exact after match +30')
        } else if (location.context.after.length >= 10 && actualAfter.startsWith(location.context.after.slice(0, 10))) {
          score += 15 // Partial match
          console.log('[Custom Highlighter] Partial after match +15')
        } else if (actualAfter.slice(0, 50).includes(location.context.after.slice(0, Math.min(10, location.context.after.length)))) {
          score += 10 // Weak match
          console.log('[Custom Highlighter] Weak after match +10')
        }
      }
    }
    
    // Parent matching
    const parentElement = node.parentElement
    if (location.parent) {
      if (parentElement.tagName === location.parent.tagName) {
        score += 10
        console.log('[Custom Highlighter] Tag match +10')
      }
      
      if (parentElement.className === location.parent.className) {
        score += 10
        console.log('[Custom Highlighter] Class match +10')
      }
      
      // Check if parent matches selector
      try {
        if (location.parent.selector && parentElement.matches(location.parent.selector)) {
          score += 20
          console.log('[Custom Highlighter] Selector match +20')
        }
      } catch (e) {
        // Invalid selector, ignore
      }
    }
    
    // List context matching (special handling for lists)
    if (location.parent?.listContext?.isInList) {
      const listItem = parentElement.closest('li')
      if (listItem) {
        const list = listItem.parentElement
        const itemIndex = Array.from(list.children).indexOf(listItem)
        
        if (itemIndex === location.parent.listContext.itemIndex) {
          score += 40 // High weight for correct list position
          console.log('[Custom Highlighter] List position match +40')
        }
        
        // Check sibling context
        const prevItem = listItem.previousElementSibling
        const nextItem = listItem.nextElementSibling
        
        if (prevItem?.textContent === location.parent.listContext.prevItemText) {
          score += 20
          console.log('[Custom Highlighter] Previous item match +20')
        }
        
        if (nextItem?.textContent === location.parent.listContext.nextItemText) {
          score += 20
          console.log('[Custom Highlighter] Next item match +20')
        }
      }
    }
    
    // Occurrence matching
    if (location.occurrence) {
      const parentText = parentElement.textContent
      const occurrences = []
      let searchIdx = 0
      
      while ((searchIdx = parentText.indexOf(text, searchIdx)) !== -1) {
        occurrences.push(searchIdx)
        searchIdx += text.length
      }
      
      const nodeOffset = getTextOffsetInParent(node, parentElement)
      const absoluteIndex = nodeOffset + index
      const occurrenceIndex = occurrences.indexOf(absoluteIndex)
      
      if (occurrenceIndex === location.occurrence.index) {
        score += 15
        console.log('[Custom Highlighter] Occurrence index match +15')
      }
    }
    
    candidate.score = score
    // Only log high-scoring candidates
    if (score >= 30) {
      console.log(`[Custom Highlighter] Candidate score: ${score} at index ${index}`);
    }
  })
  
  // Sort by score and return best match
  candidates.sort((a, b) => b.score - a.score)
  
  // Only return if score is above threshold
  const bestMatch = candidates[0]
  if (bestMatch && bestMatch.score >= 30) {
    console.log(`[Custom Highlighter] Best match score: ${bestMatch.score}`)
    return bestMatch
  }
  
  // Fallback: If no good match but we have multiple candidates with same score, 
  // try to find one that matches the parent selector exactly
  if (bestMatch && location.parent?.selector) {
    const tiedCandidates = candidates.filter(c => c.score === bestMatch.score)
    if (tiedCandidates.length > 1) {
      console.log(`[Custom Highlighter] ${tiedCandidates.length} candidates tied at score ${bestMatch.score}, checking parent selectors`)
      
      for (const candidate of tiedCandidates) {
        try {
          const parent = candidate.node.parentElement
          let current = parent
          while (current && current !== document.body) {
            if (current.matches(location.parent.selector)) {
              console.log(`[Custom Highlighter] Found exact parent match via selector`)
              return candidate
            }
            current = current.parentElement
          }
        } catch (e) {
          // Invalid selector, continue
        }
      }
    }
  }
  
  console.warn(`[Custom Highlighter] No good match found for "${text}" (best score: ${bestMatch?.score || 0})`)
  return null
}

// Get text offset of a node within a parent
function getTextOffsetInParent(textNode, parent) {
  let offset = 0
  const walker = document.createTreeWalker(
    parent,
    NodeFilter.SHOW_TEXT,
    null,
    false
  )
  
  let node
  while (node = walker.nextNode()) {
    if (node === textNode) {
      return offset
    }
    offset += node.textContent.length
  }
  
  return 0
}

// Phase 3: Restore highlights from storage
export function restoreHighlights() {
  // Prevent duplicate restoration
  if (highlightsRestored) {
    console.log('[Custom Highlighter] Highlights already restored')
    return
  }
  
  const state = store.getState()
  const url = window.location.href
  const highlights = state.highlights.byUrl[url] || []
  
  console.log(`[Custom Highlighter] Restoring ${highlights.length} highlights for ${url}`)
  
  if (highlights.length === 0) {
    return
  }
  
  // Mark as restored
  highlightsRestored = true
  
  // Remove any existing highlights first
  document.querySelectorAll('.web-highlighter-highlight').forEach(el => {
    const parent = el.parentNode
    while (el.firstChild) {
      parent.insertBefore(el.firstChild, el)
    }
    el.remove()
  })
  
  // Restore each highlight
  let restored = 0
  let failed = 0
  
  highlights.forEach(highlight => {
    try {
      console.log(`[Custom Highlighter] Restoring highlight: ${highlight.id}`)
      
      const match = findTextLocation(highlight)
      if (match) {
        const { node, index } = match
        
        // Create range for the matched text
        const range = document.createRange()
        range.setStart(node, index)
        range.setEnd(node, index + highlight.text.length)
        
        // Create wrapper
        const wrapper = document.createElement('span')
        wrapper.className = `web-highlighter-highlight ${HIGHLIGHT_COLORS[highlight.color].className}`
        wrapper.setAttribute('data-highlight-id', highlight.id)
        wrapper.setAttribute('data-color', highlight.color)
        
        // Wrap the text
        try {
          range.surroundContents(wrapper)
        } catch (e) {
          // Fallback method
          const contents = range.extractContents()
          wrapper.appendChild(contents)
          range.insertNode(wrapper)
        }
        
        restored++
        console.log(`[Custom Highlighter] Successfully restored: ${highlight.id}`)
      } else {
        failed++
        console.warn(`[Custom Highlighter] Failed to find text for: ${highlight.id}`)
      }
    } catch (error) {
      failed++
      console.error('[Custom Highlighter] Error restoring highlight:', error)
    }
  })
  
  console.log(`[Custom Highlighter] Restoration complete: ${restored} restored, ${failed} failed`)
}

// Export API
window.__customHighlighter = {
  createHighlight,
  deleteHighlight,
  changeHighlightColor,
  restoreHighlights
}