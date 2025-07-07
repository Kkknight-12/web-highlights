/**
 * Site Settings Utilities
 * Check and manage per-site settings for the extension
 */

import { safeStorageGet } from './chrome-api.js'

/**
 * Check if extension is disabled for current domain
 * @returns {Promise<boolean>} True if extension is disabled
 */
export async function isExtensionDisabledForSite() {
  try {
    const domain = window.location.hostname
    const data = await safeStorageGet('optionsMenuState')
    
    if (data.optionsMenuState?.siteSettings?.[domain]?.disabled) {
      console.log(`[Site Settings] Extension disabled for ${domain}`)
      return true
    }
    
    return false
  } catch (error) {
    console.error('[Site Settings] Error checking site settings:', error)
    return false // Default to enabled if error
  }
}

/**
 * Check if popup should be hidden for current domain
 * @returns {Promise<boolean>} True if popup should be hidden
 */
export async function shouldHidePopupForSite() {
  try {
    const domain = window.location.hostname
    const data = await safeStorageGet('optionsMenuState')
    
    // Check both hidePopup and hideButton (for backward compatibility)
    if (data.optionsMenuState?.siteSettings?.[domain]?.hidePopup || 
        data.optionsMenuState?.siteSettings?.[domain]?.hideButton) {
      console.log(`[Site Settings] Popup/button hidden for ${domain}`)
      return true
    }
    
    return false
  } catch (error) {
    console.error('[Site Settings] Error checking popup settings:', error)
    return false // Default to showing popup if error
  }
}