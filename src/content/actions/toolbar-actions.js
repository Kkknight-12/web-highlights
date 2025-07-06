/**
 * Toolbar Actions
 * Modular functions for toolbar button actions
 */

import { store } from '../../store/store'
import { hideMiniToolbar, showColorPicker } from '../../store/uiSlice'
import { highlightEngine } from '../highlighting/highlight-engine.js'
import { calculateColorPickerPosition } from '../ui/position-calculator.js'

/**
 * Copy highlighted text to clipboard
 * @param {string} highlightId - ID of the highlight to copy
 * @returns {Promise<boolean>} - Success status
 */
export async function copyHighlightText(highlightId) {
  if (!highlightId) {
    console.error('[ToolbarActions] No highlight ID provided for copy')
    return false
  }

  // Get ALL elements with this highlight ID (handles multi-element highlights)
  const elements = document.querySelectorAll(`[data-highlight-id="${highlightId}"]`)
  if (elements.length === 0) {
    console.error('[ToolbarActions] Highlight elements not found:', highlightId)
    return false
  }

  try {
    // Combine text from all elements with the same highlight ID
    const textToCopy = Array.from(elements)
      .map(el => el.textContent || '')
      .join('')
    
    console.log('[ToolbarActions] Copying text from', elements.length, 'elements:', textToCopy)
    
    await navigator.clipboard.writeText(textToCopy)
    console.log('[ToolbarActions] Text copied successfully')
    
    // Hide toolbar after successful copy
    store.dispatch(hideMiniToolbar())
    return true
  } catch (err) {
    console.error('[ToolbarActions] Copy failed:', err)
    return false
  }
}

/**
 * Show color picker for highlight
 * @param {string} highlightId - ID of the highlight to change color
 * @param {DOMRect} toolbarRect - Bounding rect of the toolbar
 */
export function showColorPickerForHighlight(highlightId, toolbarRect) {
  if (!highlightId) {
    console.error('[ToolbarActions] No highlight ID for color picker')
    return
  }

  // Pass the highlightId to the position calculator
  const position = calculateColorPickerPosition(toolbarRect, highlightId)
  
  // Show color picker via Redux
  store.dispatch(showColorPicker({
    position,
    highlightId
  }))
}

/**
 * Delete a highlight
 * @param {string} highlightId - ID of the highlight to delete
 * @returns {boolean} - Success status
 */
export function deleteHighlight(highlightId) {
  if (!highlightId) {
    console.error('[ToolbarActions] No highlight ID for deletion')
    return false
  }

  // Delete through highlight engine
  const success = highlightEngine.deleteHighlight(highlightId)
  
  if (success) {
    // Hide toolbar after deletion
    store.dispatch(hideMiniToolbar())
  }
  
  return success
}

/**
 * Navigate to link URL
 * @param {string} linkHref - URL to navigate to
 */
export function navigateToLink(linkHref) {
  if (!linkHref) {
    console.error('[ToolbarActions] No link URL provided')
    return
  }

  console.log('[ToolbarActions] Navigating to:', linkHref)
  window.location.href = linkHref
}