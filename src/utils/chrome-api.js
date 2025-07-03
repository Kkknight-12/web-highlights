/**
 * Chrome API Wrapper
 * Simple wrapper for Chrome extension APIs to centralize usage
 */

/**
 * Storage API wrapper
 */
export const storage = {
  /**
   * Get data from Chrome storage
   * @param {string|string[]|null} keys - Keys to retrieve
   * @returns {Promise<Object>} Stored data
   */
  get(keys = null) {
    return chrome.storage.local.get(keys)
  },
  
  /**
   * Set data in Chrome storage
   * @param {Object} data - Data to store
   * @returns {Promise<void>}
   */
  set(data) {
    return chrome.storage.local.set(data)
  },
  
  /**
   * Remove data from Chrome storage
   * @param {string|string[]} keys - Keys to remove
   * @returns {Promise<void>}
   */
  remove(keys) {
    return chrome.storage.local.remove(keys)
  },
  
  /**
   * Clear all data from Chrome storage
   * @returns {Promise<void>}
   */
  clear() {
    return chrome.storage.local.clear()
  }
}

/**
 * Runtime API wrapper
 */
export const runtime = {
  /**
   * Send message to background script
   * @param {Object} message - Message to send
   * @returns {Promise<any>} Response from background
   */
  sendMessage(message) {
    return chrome.runtime.sendMessage(message)
  },
  
  /**
   * Check if extension context is valid
   * @returns {boolean} True if context is valid
   */
  isContextValid() {
    return chrome.runtime && chrome.runtime.id
  },
  
  /**
   * Get extension URL
   * @param {string} path - Path to resource
   * @returns {string} Full URL
   */
  getURL(path) {
    return chrome.runtime.getURL(path)
  }
}

/**
 * Tabs API wrapper
 */
export const tabs = {
  /**
   * Get current active tab
   * @returns {Promise<chrome.tabs.Tab>} Active tab
   */
  async getCurrent() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    return tab
  },
  
  /**
   * Send message to specific tab
   * @param {number} tabId - Tab ID
   * @param {Object} message - Message to send
   * @returns {Promise<any>} Response from tab
   */
  sendMessage(tabId, message) {
    return chrome.tabs.sendMessage(tabId, message)
  }
}

/**
 * Context Menus API wrapper
 */
export const contextMenus = {
  /**
   * Create context menu item
   * @param {Object} createProperties - Menu item properties
   * @returns {void}
   */
  create(createProperties) {
    chrome.contextMenus.create(createProperties)
  },
  
  /**
   * Remove context menu item
   * @param {string} menuItemId - Menu item ID
   * @returns {Promise<void>}
   */
  remove(menuItemId) {
    return chrome.contextMenus.remove(menuItemId)
  },
  
  /**
   * Remove all context menu items
   * @returns {Promise<void>}
   */
  removeAll() {
    return chrome.contextMenus.removeAll()
  }
}

/**
 * Safe wrapper functions with error handling
 */

/**
 * Safely get data from Chrome storage
 * @param {string|string[]|null} keys - Keys to retrieve
 * @returns {Promise<Object>} Stored data or empty object on error
 */
export async function safeStorageGet(keys = null) {
  try {
    if (!runtime.isContextValid()) {
      console.warn('[Chrome API] Extension context invalid')
      return {}
    }
    return await storage.get(keys)
  } catch (error) {
    console.error('[Chrome API] Storage get error:', error)
    return {}
  }
}

/**
 * Safely set data in Chrome storage
 * @param {Object} data - Data to store
 * @returns {Promise<boolean>} True if successful, false on error
 */
export async function safeStorageSet(data) {
  try {
    if (!runtime.isContextValid()) {
      console.warn('[Chrome API] Extension context invalid')
      return false
    }
    await storage.set(data)
    return true
  } catch (error) {
    console.error('[Chrome API] Storage set error:', error)
    return false
  }
}

/**
 * Safely send message to a tab
 * @param {number} tabId - Tab ID
 * @param {Object} message - Message to send
 * @returns {Promise<any>} Response or null on error
 */
export async function safeSendTabMessage(tabId, message) {
  try {
    if (!runtime.isContextValid()) {
      console.warn('[Chrome API] Extension context invalid')
      return null
    }
    return await tabs.sendMessage(tabId, message)
  } catch (error) {
    console.error('[Chrome API] Tab message error:', error)
    return null
  }
}

/**
 * Safely send message to background script
 * @param {Object} message - Message to send
 * @returns {Promise<any>} Response or null on error
 */
export async function safeSendMessage(message) {
  try {
    if (!runtime.isContextValid()) {
      console.warn('[Chrome API] Extension context invalid')
      return null
    }
    return await runtime.sendMessage(message)
  } catch (error) {
    console.error('[Chrome API] Runtime message error:', error)
    return null
  }
}