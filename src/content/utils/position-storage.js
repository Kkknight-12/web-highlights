/**
 * Position Storage Utility
 * Handles saving and loading UI element positions per domain
 */

import { storage } from '../../utils/chrome-api.js'
import { store } from '../../store/store.js'
import { saveDomainPosition, loadDomainPositions } from '../../store/uiSlice.js'

/**
 * Get current domain from URL
 * @returns {string} Domain name
 */
function getCurrentDomain() {
  try {
    const url = new URL(window.location.href)
    return url.hostname
  } catch (error) {
    console.error('[PositionStorage] Error getting domain:', error)
    return 'unknown'
  }
}

/**
 * Save element position for current domain
 * @param {string} elementName - 'highlightButton' or 'miniToolbar'
 * @param {Object} position - {x, y} coordinates
 */
export async function saveElementPosition(elementName, position) {
  const domain = getCurrentDomain()
  
  // Update Redux store
  store.dispatch(saveDomainPosition({
    domain,
    element: elementName,
    position
  }))
  
  // Save to Chrome storage
  try {
    const storageKey = `positions_${domain}`
    const result = await storage.get(storageKey)
    const positions = result[storageKey] || {}
    
    positions[elementName] = position
    
    await storage.set({ [storageKey]: positions })
    console.log('[PositionStorage] Saved position for', elementName, position)
  } catch (error) {
    console.error('[PositionStorage] Error saving position:', error)
  }
}

/**
 * Load saved positions for current domain
 */
export async function loadSavedPositions() {
  const domain = getCurrentDomain()
  
  try {
    const storageKey = `positions_${domain}`
    const result = await storage.get(storageKey)
    const positions = result[storageKey]
    
    if (positions) {
      // Update Redux store with saved positions
      store.dispatch(loadDomainPositions({
        domain,
        positions
      }))
      console.log('[PositionStorage] Loaded positions for', domain, positions)
    }
  } catch (error) {
    console.error('[PositionStorage] Error loading positions:', error)
  }
}

/**
 * Clear saved position for an element
 * @param {string} elementName - Element to reset
 */
export async function clearElementPosition(elementName) {
  const domain = getCurrentDomain()
  
  try {
    const storageKey = `positions_${domain}`
    const result = await storage.get(storageKey)
    const positions = result[storageKey] || {}
    
    if (positions[elementName]) {
      delete positions[elementName]
      await storage.set({ [storageKey]: positions })
      console.log('[PositionStorage] Cleared position for', elementName)
    }
  } catch (error) {
    console.error('[PositionStorage] Error clearing position:', error)
  }
}

/**
 * Check if element has a saved position
 * @param {string} elementName - Element to check
 * @returns {boolean} True if saved position exists
 */
export function hasSavedPosition(elementName) {
  const state = store.getState()
  const domain = getCurrentDomain()
  const domainPositions = state.ui.domainPositions[domain] || {}
  return !!domainPositions[elementName]
}