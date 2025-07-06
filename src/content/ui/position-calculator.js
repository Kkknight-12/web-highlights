/**
 * Position Calculator
 * Calculates optimal positions for UI elements
 */

export function calculateButtonPosition(rect) {
  // For fixed position elements, we use viewport coordinates (not page coordinates)
  // Calculate palette width: 4 colors * 24px + 3 gaps * 4px + padding 16px = 124px
  const paletteWidth = 124
  
  return {
    x: rect.left + (rect.width / 2) - (paletteWidth / 2), // Center palette
    y: rect.top - 50 // Above selection
  }
}

export function calculateToolbarPosition(rect) {
  // For fixed position elements, use viewport coordinates (not page coordinates)
  return {
    x: rect.left + (rect.width / 2) - 75, // Center toolbar
    y: rect.bottom + 5 // Below highlight
  }
}

export function calculateColorPickerPosition(triggerRect, highlightId = null) {
  // For fixed position elements, use viewport coordinates (not page coordinates)
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
      xPosition = highlightCenterX - (pickerWidth / 2)
      
      // Position above the highlight by 50px
      yPosition = minTop - 50
    } else {
      // Fallback if highlight elements not found
      xPosition = triggerRect.left + (triggerRect.width / 2) - (pickerWidth / 2)
      yPosition = triggerRect.top - 50
    }
  } else {
    // Fallback: center on toolbar
    xPosition = triggerRect.left + (triggerRect.width / 2) - (pickerWidth / 2)
    yPosition = triggerRect.top - 50
  }
  
  return {
    x: xPosition, // Centered over highlighted text
    y: yPosition // Above the highlight
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