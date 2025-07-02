/**
 * Storage Helper
 * Manages localStorage operations for UI preferences
 */

const STORAGE_KEYS = {
  DEFAULT_COLOR: 'highlighter-default-color'
}

export function saveColorPreference(color) {
  try {
    localStorage.setItem(STORAGE_KEYS.DEFAULT_COLOR, color)
  } catch (error) {
    console.warn('[StorageHelper] Failed to save color preference:', error)
  }
}

export function loadColorPreference() {
  try {
    return localStorage.getItem(STORAGE_KEYS.DEFAULT_COLOR) || null
  } catch (error) {
    console.warn('[StorageHelper] Failed to load color preference:', error)
    return null
  }
}