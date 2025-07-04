/**
 * Position Calculator
 * Calculates optimal positions for UI elements
 */

export function calculateButtonPosition(rect) {
  const scrollX = window.pageXOffset || document.documentElement.scrollLeft
  const scrollY = window.pageYOffset || document.documentElement.scrollTop
  
  // Calculate palette width: 4 colors * 24px + 3 gaps * 4px + padding 16px = 124px
  const paletteWidth = 124
  
  return {
    x: rect.left + scrollX + (rect.width / 2) - (paletteWidth / 2), // Center palette
    y: rect.top + scrollY - 65 // Above selection
  }
}

export function calculateToolbarPosition(rect) {
  const scrollX = window.pageXOffset || document.documentElement.scrollLeft
  const scrollY = window.pageYOffset || document.documentElement.scrollTop
  
  return {
    x: rect.left + scrollX + (rect.width / 2) - 75, // Center toolbar
    y: rect.bottom + scrollY + 5 // Below highlight
  }
}

export function calculateColorPickerPosition(triggerRect) {
  return {
    x: triggerRect.left,
    y: triggerRect.bottom + 5
  }
}

export function isPositionVisible(position, elementSize) {
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
    scrollX: window.pageXOffset,
    scrollY: window.pageYOffset
  }
  
  // Check if element would be visible
  const visibleX = position.x >= viewport.scrollX && 
                   position.x + elementSize.width <= viewport.scrollX + viewport.width
  const visibleY = position.y >= viewport.scrollY && 
                   position.y + elementSize.height <= viewport.scrollY + viewport.height
  
  return visibleX && visibleY
}