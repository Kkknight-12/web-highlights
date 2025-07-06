/**
 * Visibility Manager
 * Manages show/hide animations and positioning for UI components
 */

export function showElement(element, position) {
  if (!element) {
    console.error('[VisibilityManager] No element to show')
    return
  }
  
  // Only set position if element is not already visible or being dragged
  const isAlreadyVisible = element.classList.contains('visible')
  const isBeingDragged = element.classList.contains('dragging')
  
  if (!isAlreadyVisible && !isBeingDragged) {
    console.log('[VisibilityManager] Setting initial position:', position)
    element.style.left = `${position.x}px`
    element.style.top = `${position.y}px`
  }
  
  element.classList.add('visible')
}

export function hideElement(element) {
  if (!element) return
  
  element.classList.remove('visible')
}

export function updateElementPosition(element, position) {
  if (!element) return
  
  element.style.left = `${position.x}px`
  element.style.top = `${position.y}px`
}

export function isElementVisible(element) {
  return element && element.classList.contains('visible')
}