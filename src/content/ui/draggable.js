/**
 * Draggable Module
 * Simple drag functionality for UI elements - no state management
 */

/**
 * Makes an element draggable with boundary checking
 * @param {HTMLElement} element - Element to make draggable
 * @param {Object} options - Configuration options
 */
export function makeDraggable(element, options = {}) {
  if (!element || element.nodeType !== Node.ELEMENT_NODE) {
    console.warn('[Draggable] Invalid element provided')
    return null
  }

  let isDragging = false
  let startX = 0
  let startY = 0
  let initialX = 0
  let initialY = 0

  // Get the drag handle or use the whole element
  const dragHandle = options.handle || element

  // Add drag cursor
  dragHandle.style.cursor = 'move'

  // Mouse down handler
  function handleMouseDown(e) {
    // Only handle left click
    if (e.button !== 0) return

    isDragging = true
    startX = e.clientX
    startY = e.clientY

    // Get current position
    const rect = element.getBoundingClientRect()
    initialX = rect.left
    initialY = rect.top

    // Add dragging class for visual feedback
    element.classList.add('dragging')
    
    // Prevent text selection while dragging
    e.preventDefault()
    e.stopPropagation()

    // Add document-level listeners for drag and release
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  // Mouse move handler - direct updates for smooth dragging
  function handleMouseMove(e) {
    if (!isDragging) return

    // Prevent default to stop text selection
    e.preventDefault()

    // Calculate new position
    const deltaX = e.clientX - startX
    const deltaY = e.clientY - startY
    
    let newX = initialX + deltaX
    let newY = initialY + deltaY

    // Apply boundary checking
    const bounded = applyBoundaries(element, newX, newY)

    // Update position directly for immediate response
    element.style.left = `${bounded.x}px`
    element.style.top = `${bounded.y}px`
  }

  // Mouse up handler
  function handleMouseUp(e) {
    if (!isDragging) return

    isDragging = false
    element.classList.remove('dragging')

    // Clean up document listeners
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }

  // Add event listeners
  dragHandle.addEventListener('mousedown', handleMouseDown)

  // Return cleanup function
  return function cleanup() {
    dragHandle.removeEventListener('mousedown', handleMouseDown)
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }
}

/**
 * Apply viewport boundaries to position
 * @param {HTMLElement} element - Element being dragged
 * @param {number} x - Proposed X position
 * @param {number} y - Proposed Y position
 * @returns {Object} Bounded position {x, y}
 */
function applyBoundaries(element, x, y) {
  const rect = element.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  
  // Ensure element stays within viewport
  const padding = 10 // Minimum distance from edge
  
  // Horizontal boundaries
  if (x < padding) {
    x = padding
  } else if (x + rect.width > viewportWidth - padding) {
    x = viewportWidth - rect.width - padding
  }
  
  // Vertical boundaries
  if (y < padding) {
    y = padding
  } else if (y + rect.height > viewportHeight - padding) {
    y = viewportHeight - rect.height - padding
  }
  
  return { x, y }
}

/**
 * Check if element is within viewport after window resize
 * @param {HTMLElement} element - Element to check
 * @returns {boolean} True if adjustment was made
 */
export function ensureWithinViewport(element) {
  if (!element || element.nodeType !== Node.ELEMENT_NODE) return false
  
  const rect = element.getBoundingClientRect()
  const bounded = applyBoundaries(element, rect.left, rect.top)
  
  if (bounded.x !== rect.left || bounded.y !== rect.top) {
    element.style.left = `${bounded.x}px`
    element.style.top = `${bounded.y}px`
    return true
  }
  
  return false
}