/**
 * Popup Utility Functions
 * Helper functions for popup functionality
 */

// URL normalization helper
export function normalizeUrl(url) {
  try {
    const urlObj = new URL(url)
    // Remove trailing slash and hash
    return urlObj.origin + urlObj.pathname.replace(/\/$/, '')
  } catch (e) {
    return url
  }
}

// Truncate text to specified length
export function truncateText(text, maxLength = 100) {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

// Get relative time from timestamp
export function getRelativeTime(timestamp) {
  if (!timestamp) return 'Unknown time'
  
  const now = Date.now()
  const diff = now - timestamp
  
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 30) return `${days}d ago`
  
  return new Date(timestamp).toLocaleDateString()
}

// Update statistics display (kept for backward compatibility)
export function updateStats() {
  // Stats have been replaced with search and filters
  // This function is kept for backward compatibility but does nothing
}

// Show toast notification
export function showToast(message, duration = 3000) {
  // Use existing undo toast element for notifications
  const toast = document.getElementById('undoToast')
  if (!toast) return
  
  const messageEl = toast.querySelector('.undo-message')
  const undoBtn = toast.querySelector('.undo-button')
  const progressBar = document.getElementById('undoProgressBar')
  
  if (messageEl) messageEl.textContent = message
  if (undoBtn) undoBtn.style.display = 'none'
  if (progressBar) progressBar.style.display = 'none'
  
  toast.style.display = 'block'
  
  setTimeout(() => {
    toast.style.display = 'none'
    if (undoBtn) undoBtn.style.display = 'block' // Reset for undo functionality
    if (progressBar) progressBar.style.display = 'block'
  }, duration)
}