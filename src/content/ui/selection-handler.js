/**
 * Selection Handler Utility
 * Handles text selection validation and processing
 */

export function getSelectionInfo() {
  const selection = window.getSelection()
  
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return null
  }
  
  const range = selection.getRangeAt(0)
  const rect = range.getBoundingClientRect()
  const text = selection.toString().trim()
  
  // Validate selection
  if (!text || rect.width <= 0 || rect.height <= 0) {
    return null
  }
  
  return {
    selection,
    range,
    rect,
    text
  }
}

export function isValidSelection(selection) {
  return selection && 
         selection.rangeCount > 0 && 
         !selection.isCollapsed &&
         selection.toString().trim().length > 0
}

export function clearSelection() {
  const selection = window.getSelection()
  if (selection) {
    selection.removeAllRanges()
  }
}