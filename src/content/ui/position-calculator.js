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
    y: rect.top + scrollY - 50 // Above selection (consistent with color picker)
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

export function calculateColorPickerPosition(triggerRect, highlightId = null) {
  const scrollX = window.pageXOffset || document.documentElement.scrollLeft
  const scrollY = window.pageYOffset || document.documentElement.scrollTop
  
  // Calculate color picker width: 4 colors * 24px + 3 gaps * 4px + padding 16px = 124px
  const pickerWidth = 124
  
  // Get the specific highlight element to calculate position
  let xPosition, yPosition
  
  if (highlightId) {
    // Find all elements of this highlight to get the full bounds
    const highlightElements = document.querySelectorAll(`[data-highlight-id="${highlightId}"]`)
    if (highlightElements.length > 0) {
      // Get the bounding rect that encompasses all highlight elements
      let minLeft = Infinity, maxRight = -Infinity, minTop = Infinity
      
      highlightElements.forEach(el => {
        const rect = el.getBoundingClientRect()
        minLeft = Math.min(minLeft, rect.left)
        maxRight = Math.max(maxRight, rect.right)
        minTop = Math.min(minTop, rect.top)
      })
      
      // Center X position over the entire highlight
      const highlightCenterX = minLeft + (maxRight - minLeft) / 2
      xPosition = highlightCenterX + scrollX - (pickerWidth / 2)
      
      // Position above the highlight by 50px (reduced from 65px)
      yPosition = minTop + scrollY - 50
    } else {
      // Fallback if highlight elements not found
      xPosition = triggerRect.left + scrollX + (triggerRect.width / 2) - (pickerWidth / 2)
      yPosition = triggerRect.top + scrollY - 50
    }
  } else {
    // Fallback: center on toolbar
    xPosition = triggerRect.left + scrollX + (triggerRect.width / 2) - (pickerWidth / 2)
    yPosition = triggerRect.top + scrollY - 50
  }
  
  return {
    x: xPosition, // Centered over highlighted text
    y: yPosition // Reduced Y offset from 65px to 50px
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