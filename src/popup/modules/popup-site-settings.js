/**
 * Popup Site Settings Manager
 * Manage site-specific settings from the popup
 */

import { showToast } from './popup-utils.js'

/**
 * Show site settings dialog
 */
export async function showSiteSettingsDialog() {
  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab || !tab.url) return
  
  const url = new URL(tab.url)
  const domain = url.hostname
  
  // Get current settings
  const data = await chrome.storage.local.get('optionsMenuState')
  const settings = data.optionsMenuState?.siteSettings?.[domain] || {}
  
  // Create dialog overlay
  const overlay = document.createElement('div')
  overlay.className = 'site-settings-overlay'
  
  // Create dialog
  const dialog = document.createElement('div')
  dialog.className = 'site-settings-dialog'
  
  dialog.innerHTML = `
    <h3>Site Settings</h3>
    <p class="site-domain">${domain}</p>
    
    <div class="settings-options">
      <label class="setting-option">
        <input type="checkbox" id="disableExtension" ${settings.disabled ? 'checked' : ''}>
        <span>Disable extension on this site</span>
      </label>
      
      <label class="setting-option">
        <input type="checkbox" id="hideButton" ${settings.hideButton ? 'checked' : ''}>
        <span>Hide highlight button on this site</span>
      </label>
    </div>
    
    <div class="dialog-actions">
      <button class="dialog-btn cancel-btn" id="cancelSettings">Cancel</button>
      <button class="dialog-btn save-btn" id="saveSettings">Save</button>
    </div>
  `
  
  overlay.appendChild(dialog)
  document.body.appendChild(overlay)
  
  // Handle save
  document.getElementById('saveSettings').addEventListener('click', async () => {
    const disabled = document.getElementById('disableExtension').checked
    const hideButton = document.getElementById('hideButton').checked
    
    // Update settings
    const optionsState = data.optionsMenuState || { siteSettings: {} }
    if (!optionsState.siteSettings) optionsState.siteSettings = {}
    
    optionsState.siteSettings[domain] = { disabled, hideButton }
    
    // Save to storage
    await chrome.storage.local.set({ optionsMenuState: optionsState })
    
    // Close dialog
    overlay.remove()
    
    // Show success message
    showToast('Settings saved! Reloading page...')
    
    // Reload the active tab to apply changes immediately
    setTimeout(async () => {
      try {
        await chrome.tabs.reload(tab.id)
        // Close popup after reload
        window.close()
      } catch (error) {
        console.error('[SiteSettings] Failed to reload tab:', error)
        showToast('Please reload the page manually to apply changes.')
      }
    }, 500) // Small delay to ensure toast is visible
  })
  
  // Handle cancel
  document.getElementById('cancelSettings').addEventListener('click', () => {
    overlay.remove()
  })
  
  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove()
    }
  })
}

/**
 * Initialize site settings button
 */
export function initSiteSettings() {
  const settingsBtn = document.getElementById('siteSettingsBtn')
  if (settingsBtn) {
    settingsBtn.addEventListener('click', showSiteSettingsDialog)
  }
}