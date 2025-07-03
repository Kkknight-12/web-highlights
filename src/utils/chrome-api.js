/**
 * Chrome API Safe Wrappers
 * Simple error handling for Chrome extension APIs
 */

/**
 * Safely get data from Chrome storage
 * @param {string|string[]} keys - Storage keys to retrieve
 * @returns {Promise<Object>} Storage data or empty object on error
 */
export async function safeStorageGet(keys) {
  try {
    // Check if extension context is valid
    if (!chrome.runtime?.id) {
      console.warn('[ChromeAPI] Extension context invalid')
      return {}
    }
    
    const result = await chrome.storage.local.get(keys)
    return result || {}
  } catch (error) {
    console.warn('[ChromeAPI] Storage get failed:', error.message)
    return {}
  }
}

/**
 * Safely set data in Chrome storage
 * @param {Object} data - Data to store
 * @returns {Promise<boolean>} Success status
 */
export async function safeStorageSet(data) {
  try {
    // Check if extension context is valid
    if (!chrome.runtime?.id) {
      console.warn('[ChromeAPI] Extension context invalid')
      return false
    }
    
    await chrome.storage.local.set(data)
    return true
  } catch (error) {
    console.warn('[ChromeAPI] Storage set failed:', error.message)
    
    // Check for quota exceeded
    if (error.message?.includes('QUOTA_BYTES')) {
      console.error('[ChromeAPI] Storage quota exceeded!')
    }
    
    return false
  }
}

/**
 * Check if Chrome APIs are available
 * @returns {boolean} True if APIs are available
 */
export function isChromeAPIAvailable() {
  return !!(chrome?.runtime?.id && chrome?.storage?.local)
}

/**
 * Safely send message to runtime
 * @param {Object} message - Message to send
 * @returns {Promise<any>} Response or null on error
 */
export async function safeSendMessage(message) {
  try {
    if (!chrome.runtime?.id) {
      console.warn('[ChromeAPI] Extension context invalid')
      return null
    }
    
    const response = await chrome.runtime.sendMessage(message)
    return response
  } catch (error) {
    console.warn('[ChromeAPI] Send message failed:', error.message)
    return null
  }
}

/**
 * Safely send message to tab
 * @param {number} tabId - Tab ID
 * @param {Object} message - Message to send
 * @returns {Promise<any>} Response or null on error
 */
export async function safeSendTabMessage(tabId, message) {
  try {
    if (!chrome.runtime?.id) {
      console.warn('[ChromeAPI] Extension context invalid')
      return null
    }
    
    const response = await chrome.tabs.sendMessage(tabId, message)
    return response
  } catch (error) {
    console.warn('[ChromeAPI] Send tab message failed:', error.message)
    return null
  }
}