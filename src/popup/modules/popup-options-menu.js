/**
 * Popup Options Menu
 * 3-dots dropdown menu for highlight items with various actions
 */

import { saveOptionsMenuState } from './popup-storage.js'
import { state as popupState, updateState } from './popup-state.js'

// Track open menu to close when clicking outside
let currentOpenMenu = null

/**
 * Create options menu for a highlight
 * @param {Object} highlight - Highlight object
 * @param {Object} state - Current popup state
 * @returns {HTMLElement} Options menu container
 */
export function createOptionsMenu(highlight, state) {
  const container = document.createElement('div')
  container.className = 'options-menu-container'
  
  // 3-dots button
  const menuButton = document.createElement('button')
  menuButton.className = 'options-menu-btn'
  menuButton.title = 'More options'
  menuButton.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="5" r="1.5" fill="currentColor"/>
      <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
      <circle cx="12" cy="19" r="1.5" fill="currentColor"/>
    </svg>
  `
  
  // Dropdown menu
  const dropdown = document.createElement('div')
  dropdown.className = 'options-dropdown'
  dropdown.style.display = 'none'
  
  // Check if highlight is pinned/archived
  const isPinned = state.pinnedHighlights?.includes(highlight.id)
  const isArchived = state.archivedHighlights?.includes(highlight.id)
  
  // Menu items
  const menuItems = [
    {
      id: 'pin',
      label: isPinned ? 'Unpin from Top' : 'Pin to Top',
      icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M19 11h-6V5a1 1 0 0 0-2 0v6H5a1 1 0 0 0 0 2h6v6a1 1 0 0 0 2 0v-6h6a1 1 0 0 0 0-2z" 
          fill="${isPinned ? 'currentColor' : 'none'}" 
          stroke="currentColor" 
          stroke-width="2"/>
      </svg>`,
      action: () => {
        // Toggle pin state in popup state
        const pinnedHighlights = [...popupState.pinnedHighlights]
        const index = pinnedHighlights.indexOf(highlight.id)
        if (index === -1) {
          pinnedHighlights.push(highlight.id)
        } else {
          pinnedHighlights.splice(index, 1)
        }
        updateState({ pinnedHighlights })
        
        // Save to storage
        saveOptionsMenuState(popupState)
        
        // Re-render the list
        if (popupState.renderCallback) {
          popupState.renderCallback()
        }
        
        closeAllMenus()
      }
    },
    {
      id: 'archive',
      label: isArchived ? 'Unarchive' : 'Archive',
      icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M21 8v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8m18 0-2-5H5L3 8m18 0H3m9 5v5" 
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,
      action: () => {
        // Toggle archive state in popup state
        const archivedHighlights = [...popupState.archivedHighlights]
        const index = archivedHighlights.indexOf(highlight.id)
        if (index === -1) {
          archivedHighlights.push(highlight.id)
        } else {
          archivedHighlights.splice(index, 1)
        }
        updateState({ archivedHighlights })
        
        // Save to storage
        saveOptionsMenuState(popupState)
        
        // Re-render the list
        if (popupState.renderCallback) {
          popupState.renderCallback()
        }
        
        closeAllMenus()
      }
    },
    {
      id: 'hide',
      label: 'Hide Until Next Visit',
      icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" 
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
        <path d="M1 1l22 22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
      action: () => {
        // Add to hidden highlights (session-based)
        const hiddenHighlights = [...popupState.hiddenHighlights]
        if (!hiddenHighlights.includes(highlight.id)) {
          hiddenHighlights.push(highlight.id)
        }
        updateState({ hiddenHighlights })
        
        // Note: Don't save hidden highlights to storage (session-based)
        
        // Re-render the list
        if (popupState.renderCallback) {
          popupState.renderCallback()
        }
        
        closeAllMenus()
      }
    },
    {
      id: 'divider',
      type: 'divider'
    },
    {
      id: 'copy-link',
      label: 'Copy Link',
      icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" 
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" 
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,
      action: () => {
        copyHighlightLink(highlight)
        closeAllMenus()
      }
    },
    {
      id: 'divider2',
      type: 'divider'
    },
    {
      id: 'site-settings',
      label: 'Site Settings',
      icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
        <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
      hasSubmenu: true,
      submenu: createSiteSettingsSubmenu(highlight.url)
    }
  ]
  
  // Create menu items
  menuItems.forEach(item => {
    if (item.type === 'divider') {
      const divider = document.createElement('div')
      divider.className = 'options-menu-divider'
      dropdown.appendChild(divider)
    } else {
      const menuItem = document.createElement('button')
      menuItem.className = 'options-menu-item'
      if (item.hasSubmenu) {
        menuItem.classList.add('has-submenu')
      }
      
      menuItem.innerHTML = `
        <span class="menu-item-icon">${item.icon}</span>
        <span class="menu-item-label">${item.label}</span>
        ${item.hasSubmenu ? '<span class="submenu-arrow">›</span>' : ''}
      `
      
      if (item.hasSubmenu) {
        // Add submenu on hover
        menuItem.appendChild(item.submenu)
        
        menuItem.addEventListener('mouseenter', () => {
          item.submenu.style.display = 'block'
        })
        
        menuItem.addEventListener('mouseleave', () => {
          item.submenu.style.display = 'none'
        })
      } else if (item.action) {
        menuItem.addEventListener('click', (e) => {
          e.stopPropagation()
          item.action()
        })
      }
      
      dropdown.appendChild(menuItem)
    }
  })
  
  // Toggle menu on button click
  menuButton.addEventListener('click', (e) => {
    e.stopPropagation()
    toggleMenu(dropdown)
  })
  
  // Close menu when clicking outside
  document.addEventListener('click', handleDocumentClick)
  
  container.appendChild(menuButton)
  container.appendChild(dropdown)
  
  return container
}

/**
 * Create site settings submenu
 */
function createSiteSettingsSubmenu(url) {
  const submenu = document.createElement('div')
  submenu.className = 'options-submenu'
  submenu.style.display = 'none'
  
  const domain = new URL(url).hostname
  const siteSettings = popupState.siteSettings[domain] || {}
  
  const submenuItems = [
    {
      label: siteSettings.disabled ? 'Enable on this site' : 'Disable on this site',
      action: () => {
        // Update site settings
        const newSiteSettings = { ...popupState.siteSettings }
        newSiteSettings[domain] = {
          ...newSiteSettings[domain],
          disabled: !siteSettings.disabled
        }
        updateState({ siteSettings: newSiteSettings })
        
        // Save to storage
        saveOptionsMenuState(popupState)
        
        closeAllMenus()
      }
    },
    {
      label: 'Reset UI positions',
      action: () => {
        // Clear saved positions for this domain
        chrome.storage.local.remove(`positions_${domain}`)
        closeAllMenus()
      }
    },
    {
      label: siteSettings.hidePopup ? 'Show popup on this site' : 'Hide popup on this site',
      action: () => {
        // Update site settings
        const newSiteSettings = { ...popupState.siteSettings }
        newSiteSettings[domain] = {
          ...newSiteSettings[domain],
          hidePopup: !siteSettings.hidePopup
        }
        updateState({ siteSettings: newSiteSettings })
        
        // Save to storage
        saveOptionsMenuState(popupState)
        
        closeAllMenus()
      }
    }
  ]
  
  submenuItems.forEach(item => {
    const menuItem = document.createElement('button')
    menuItem.className = 'options-menu-item submenu-item'
    menuItem.textContent = item.label
    menuItem.addEventListener('click', (e) => {
      e.stopPropagation()
      item.action()
    })
    submenu.appendChild(menuItem)
  })
  
  return submenu
}

/**
 * Copy highlight link to clipboard
 */
function copyHighlightLink(highlight) {
  // Generate shareable link with highlight ID
  const link = `${highlight.url}#highlight=${highlight.id}`
  
  navigator.clipboard.writeText(link).then(() => {
    // Show toast notification
    showToast('Link copied to clipboard')
  }).catch(err => {
    console.error('Failed to copy link:', err)
    showToast('Failed to copy link')
  })
}

/**
 * Show toast notification
 */
function showToast(message) {
  // Use existing undo toast element for notifications
  const toast = document.getElementById('undoToast')
  const messageEl = toast.querySelector('.undo-message')
  const undoBtn = toast.querySelector('.undo-button')
  
  messageEl.textContent = message
  undoBtn.style.display = 'none'
  toast.style.display = 'block'
  
  setTimeout(() => {
    toast.style.display = 'none'
    undoBtn.style.display = 'block' // Reset for undo functionality
  }, 2000)
}

/**
 * Toggle menu visibility
 */
function toggleMenu(dropdown) {
  const isOpen = dropdown.style.display === 'block'
  
  // Close any other open menu
  if (currentOpenMenu && currentOpenMenu !== dropdown) {
    currentOpenMenu.style.display = 'none'
  }
  
  // Toggle this menu
  dropdown.style.display = isOpen ? 'none' : 'block'
  currentOpenMenu = isOpen ? null : dropdown
  
  // Position dropdown to avoid overflow
  if (!isOpen) {
    positionDropdown(dropdown)
  }
}

/**
 * Position dropdown to stay within viewport
 */
function positionDropdown(dropdown) {
  const rect = dropdown.getBoundingClientRect()
  const containerRect = dropdown.parentElement.getBoundingClientRect()
  
  // Reset position
  dropdown.style.right = '0'
  dropdown.style.left = 'auto'
  dropdown.style.top = '100%'
  dropdown.style.bottom = 'auto'
  
  // Check if dropdown goes off screen
  if (rect.bottom > window.innerHeight - 10) {
    // Position above button
    dropdown.style.top = 'auto'
    dropdown.style.bottom = '100%'
  }
  
  if (rect.right > window.innerWidth - 10) {
    // Position to the left
    dropdown.style.right = '0'
    dropdown.style.left = 'auto'
  }
}

/**
 * Close all menus
 */
function closeAllMenus() {
  if (currentOpenMenu) {
    currentOpenMenu.style.display = 'none'
    currentOpenMenu = null
  }
}

/**
 * Handle document click to close menus
 */
function handleDocumentClick(e) {
  if (!e.target.closest('.options-menu-container')) {
    closeAllMenus()
  }
}

// Clean up event listener when popup closes
window.addEventListener('unload', () => {
  document.removeEventListener('click', handleDocumentClick)
})