/**
 * Site Settings Menu
 * Simple dropdown menu for site-specific settings
 */

import { safeStorageGet, safeStorageSet } from '../../utils/chrome-api.js'
import { hideElement } from './visibility-manager.js'

// Track if menu is open
let isMenuOpen = false
let menuElement = null

/**
 * Create site settings menu
 * @returns {Promise<HTMLElement>} Menu element
 */
export async function createSiteSettingsMenu() {
  const menu = document.createElement('div')
  menu.className = 'highlighter-ui-component site-settings-menu'
  menu.style.display = 'none'
  
  const domain = window.location.hostname
  
  // Get current settings to show state
  const currentSettings = await getCurrentSettings()
  
  // Menu items
  const items = [
    {
      id: 'disable-site',
      label: currentSettings.disabled ? '✓ Extension disabled' : 'Disable on this site',
      action: async () => {
        await toggleSiteSetting('disabled')
        closeMenu()
        // Reload page to apply changes
        window.location.reload()
      }
    },
    {
      id: 'hide-button',
      label: currentSettings.hideButton ? '✓ Button hidden' : 'Hide button on this site',
      action: async () => {
        await toggleSiteSetting('hideButton')
        closeMenu()
        // Reload page to apply changes (same as disable option)
        window.location.reload()
      }
    }
  ]
  
  // Create menu items
  items.forEach(item => {
    const menuItem = document.createElement('button')
    menuItem.className = 'site-settings-item'
    menuItem.textContent = item.label
    menuItem.addEventListener('click', item.action)
    menu.appendChild(menuItem)
  })
  
  // Close menu when clicking outside
  document.addEventListener('click', handleDocumentClick)
  
  menuElement = menu
  return menu
}

/**
 * Toggle a site setting
 * @param {string} setting - Setting name
 */
async function toggleSiteSetting(setting) {
  const domain = window.location.hostname
  
  // Get current settings
  const data = await safeStorageGet('optionsMenuState')
  const optionsState = data.optionsMenuState || { siteSettings: {} }
  
  // Toggle the setting
  if (!optionsState.siteSettings[domain]) {
    optionsState.siteSettings[domain] = {}
  }
  
  optionsState.siteSettings[domain][setting] = !optionsState.siteSettings[domain][setting]
  
  // Save back to storage
  await safeStorageSet({ optionsMenuState: optionsState })
}

/**
 * Toggle menu visibility
 */
export function toggleSiteSettingsMenu(menu) {
  isMenuOpen = !isMenuOpen
  menu.style.display = isMenuOpen ? 'block' : 'none'
  
  // Position menu below the button
  if (isMenuOpen) {
    const button = document.querySelector('.settings-btn')
    if (button) {
      const rect = button.getBoundingClientRect()
      menu.style.top = `${rect.height + 4}px`
      menu.style.right = '0'
    }
  }
}

/**
 * Close the menu
 */
function closeMenu() {
  if (menuElement) {
    menuElement.style.display = 'none'
    isMenuOpen = false
  }
}

/**
 * Handle document clicks to close menu
 */
function handleDocumentClick(e) {
  if (isMenuOpen && menuElement && !menuElement.contains(e.target) && !e.target.closest('.settings-btn')) {
    closeMenu()
  }
}

/**
 * Get current settings for the domain
 */
async function getCurrentSettings() {
  const domain = window.location.hostname
  const data = await safeStorageGet('optionsMenuState')
  return data.optionsMenuState?.siteSettings?.[domain] || {}
}

// Clean up when extension unloads
window.addEventListener('unload', () => {
  document.removeEventListener('click', handleDocumentClick)
})