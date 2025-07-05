/**
 * Popup functionality for Web Highlighter
 */

import { COLORS } from '../theme/theme-constants.js'

// State
const state = {
  currentTab: null,
  highlights: [],
  pageHighlights: 0,
  totalHighlights: 0,
  pageHighlightsList: [], // Array of highlights for current page
  allHighlightsList: [], // All highlights from all pages
  currentFilter: 'page', // Default to 'page' view
  searchQuery: ''
}

// Initialize popup
document.addEventListener('DOMContentLoaded', initializePopup)

async function initializePopup() {
  try {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    state.currentTab = tab
    
    // Load highlights
    await loadHighlights()
    
    // Update UI
    updateStats()
    
    // Attach event listeners
    attachEventListeners()
  } catch (error) {
    console.error('[Popup] Initialization error:', error)
  }
}

// Load highlights from storage
async function loadHighlights() {
  // Show loading state
  showLoadingState()
  
  try {
    // Get all storage data
    const allData = await chrome.storage.local.get(null)
    
    // Collect all highlights from all URLs
    const allHighlights = []
    let totalCount = 0
    
    // The storage format is { [url]: highlights[] }
    for (const [key, value] of Object.entries(allData)) {
      // Skip non-URL keys like 'settings'
      if (key === 'settings' || !Array.isArray(value)) continue
      
      // Add URL to each highlight for reference
      if (Array.isArray(value)) {
        value.forEach(highlight => {
          allHighlights.push({
            ...highlight,
            url: key
          })
        })
        totalCount += value.length
      }
    }
    
    state.highlights = allHighlights
    state.allHighlightsList = allHighlights
    state.totalHighlights = totalCount
    
    // Get highlights for current page
    if (state.currentTab && state.currentTab.url) {
      const currentUrl = normalizeUrl(state.currentTab.url)
      
      // Check both normalized URL and exact URL
      const pageData = allData[currentUrl] || allData[state.currentTab.url] || []
      
      state.pageHighlightsList = Array.isArray(pageData) ? pageData : []
      state.pageHighlights = state.pageHighlightsList.length
      
      console.log('[Popup] Current URL:', currentUrl)
      console.log('[Popup] Page highlights:', state.pageHighlightsList)
    }
    
    // Hide loading state and render highlights
    hideLoadingState()
    renderHighlightsList()
  } catch (error) {
    console.error('[Popup] Error loading highlights:', error)
    hideLoadingState()
    showErrorState('Failed to load highlights')
  }
}

// Update statistics display
function updateStats() {
  // Stats have been replaced with search and filters
  // This function is kept for backward compatibility but does nothing
}

// Attach event listeners
function attachEventListeners() {
  // Search functionality
  const searchInput = document.getElementById('searchInput')
  searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.toLowerCase()
    renderHighlightsList()
  })
  
  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      // Remove active class from all buttons
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'))
      // Add active class to clicked button
      e.target.classList.add('active')
      // Update filter state
      state.currentFilter = e.target.dataset.filter
      // Re-render list
      renderHighlightsList()
    })
  })
  
  // Export highlights
  document.getElementById('exportHighlights').addEventListener('click', handleExport)
}

// Handle export functionality
async function handleExport() {
  if (state.highlights.length === 0) {
    alert('No highlights to export')
    return
  }
  
  // For now, export as JSON
  const data = {
    exportDate: new Date().toISOString(),
    totalHighlights: state.highlights.length,
    highlights: state.highlights.map(h => ({
      text: h.text,
      url: h.url,
      color: h.color,
      timestamp: h.timestamp,
      title: h.title || 'Untitled Page'
    }))
  }
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  
  chrome.downloads.download({
    url: url,
    filename: `web-highlights-${new Date().toISOString().split('T')[0]}.json`,
    saveAs: true
  })
}

// URL normalization helper
function normalizeUrl(url) {
  try {
    const urlObj = new URL(url)
    // Remove trailing slash and hash
    return urlObj.origin + urlObj.pathname.replace(/\/$/, '')
  } catch (e) {
    return url
  }
}

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.highlights) {
    loadHighlights().then(updateStats)
  }
})

// UI State Management Functions
function showLoadingState() {
  document.getElementById('loadingState').style.display = 'flex'
  document.getElementById('highlightsList').style.display = 'none'
  document.getElementById('emptyStateCurrentPage').style.display = 'none'
  document.getElementById('emptyStateGlobal').style.display = 'none'
}

function hideLoadingState() {
  document.getElementById('loadingState').style.display = 'none'
}

function showErrorState(message) {
  // For now, show empty state with error message
  const emptyState = document.getElementById('emptyStateCurrentPage')
  emptyState.style.display = 'block'
  emptyState.querySelector('p').textContent = message
}

// Render highlights list
function renderHighlightsList() {
  const highlightsList = document.getElementById('highlightsList')
  
  // Clear existing content
  highlightsList.innerHTML = ''
  
  // Get filtered highlights
  let filteredHighlights = getFilteredHighlights()
  
  // Apply search filter
  if (state.searchQuery) {
    filteredHighlights = filteredHighlights.filter(h => 
      h.text.toLowerCase().includes(state.searchQuery) ||
      (h.url && h.url.toLowerCase().includes(state.searchQuery))
    )
  }
  
  // Check if we have highlights
  if (filteredHighlights.length === 0) {
    // Show appropriate empty state
    if (state.searchQuery || state.currentFilter !== 'all') {
      document.getElementById('emptyStateCurrentPage').style.display = 'block'
      const emptyText = document.querySelector('#emptyStateCurrentPage p')
      emptyText.textContent = 'No highlights found'
    } else if (state.totalHighlights === 0) {
      document.getElementById('emptyStateGlobal').style.display = 'block'
    } else {
      document.getElementById('emptyStateCurrentPage').style.display = 'block'
    }
    highlightsList.style.display = 'none'
    return
  }
  
  // Hide empty states
  document.getElementById('emptyStateCurrentPage').style.display = 'none'
  document.getElementById('emptyStateGlobal').style.display = 'none'
  
  // Show highlights list
  highlightsList.style.display = 'block'
  
  // Sort highlights by timestamp (newest first)
  const sortedHighlights = [...filteredHighlights].sort((a, b) => 
    (b.timestamp || 0) - (a.timestamp || 0)
  )
  
  // No need to manage scrollable class - CSS handles it automatically
  
  // Create highlight items for all highlights (no limit)
  sortedHighlights.forEach(highlight => {
    const highlightItem = createHighlightItem(highlight)
    highlightsList.appendChild(highlightItem)
  })
  
  // All highlights are now shown with scroll when needed
}

// Create individual highlight item element
function createHighlightItem(highlight) {
  const item = document.createElement('div')
  item.className = 'highlight-item'
  item.dataset.highlightId = highlight.id
  
  // Create color indicator
  const colorIndicator = document.createElement('div')
  colorIndicator.className = 'highlight-color-indicator'
  colorIndicator.style.backgroundColor = getHighlightColor(highlight.color)
  
  // Create content container
  const content = document.createElement('div')
  content.className = 'highlight-content'
  
  // Create text element
  const text = document.createElement('div')
  text.className = 'highlight-text'
  text.textContent = truncateText(highlight.text)
  text.title = highlight.text // Show full text on hover
  
  // Create metadata row
  const metadata = document.createElement('div')
  metadata.className = 'highlight-metadata'
  
  const timestamp = document.createElement('span')
  timestamp.className = 'highlight-timestamp'
  timestamp.textContent = getRelativeTime(highlight.timestamp)
  
  metadata.appendChild(timestamp)
  
  // Create actions container
  const actions = document.createElement('div')
  actions.className = 'highlight-actions'
  
  // Copy button
  const copyBtn = document.createElement('button')
  copyBtn.className = 'highlight-action-btn copy-btn'
  copyBtn.title = 'Copy text'
  copyBtn.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" stroke="currentColor" stroke-width="2"/>
      <rect x="8" y="2" width="8" height="4" rx="1" stroke="currentColor" stroke-width="2"/>
    </svg>
  `
  copyBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    handleCopyHighlight(highlight.text)
  })
  
  // Delete button
  const deleteBtn = document.createElement('button')
  deleteBtn.className = 'highlight-action-btn delete-btn'
  deleteBtn.title = 'Delete highlight'
  deleteBtn.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    handleDeleteHighlight(highlight.id)
  })
  
  // Append elements
  actions.appendChild(copyBtn)
  actions.appendChild(deleteBtn)
  
  content.appendChild(text)
  content.appendChild(metadata)
  
  item.appendChild(colorIndicator)
  item.appendChild(content)
  item.appendChild(actions)
  
  // Click to scroll to highlight
  item.addEventListener('click', () => {
    handleHighlightClick(highlight.id)
  })
  
  return item
}

// Get filtered highlights based on current filter
function getFilteredHighlights() {
  const now = Date.now()
  const dayInMs = 24 * 60 * 60 * 1000
  const weekInMs = 7 * dayInMs
  
  switch (state.currentFilter) {
    case 'page':
      // Only highlights from current page
      return state.pageHighlightsList
      
    case 'today':
      // Highlights from today (all pages)
      return state.allHighlightsList.filter(h => {
        const timestamp = h.timestamp || 0
        return (now - timestamp) < dayInMs
      })
      
    case 'week':
      // Highlights from this week (all pages)
      return state.allHighlightsList.filter(h => {
        const timestamp = h.timestamp || 0
        return (now - timestamp) < weekInMs
      })
      
    case 'all':
    default:
      // All highlights from all pages
      return state.allHighlightsList
  }
}

// Helper function to get highlight color
function getHighlightColor(colorName) {
  // Use theme colors
  return COLORS.highlights[colorName] || COLORS.highlights.yellow
}

// Truncate text to specified length
function truncateText(text, maxLength = 100) {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

// Get relative time from timestamp
function getRelativeTime(timestamp) {
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

// Handle highlight click - scroll to highlight on page
async function handleHighlightClick(highlightId) {
  try {
    // Send message to content script to scroll to highlight
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    
    chrome.tabs.sendMessage(tab.id, {
      action: 'scrollToHighlight',
      highlightId: highlightId
    })
    
    // Close popup after clicking
    window.close()
  } catch (error) {
    console.error('[Popup] Error scrolling to highlight:', error)
  }
}

// Handle copy highlight text
function handleCopyHighlight(text) {
  // Create temporary textarea to copy text
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
  
  // Show feedback (you could add a toast notification here)
  console.log('[Popup] Text copied to clipboard')
}

// Handle delete highlight
async function handleDeleteHighlight(highlightIds) {
  try {
    if (!state.currentTab || !state.currentTab.url) return
    
    // Handle both single ID and array of IDs
    const idsToDelete = Array.isArray(highlightIds) ? highlightIds : [highlightIds]
    
    const currentUrl = normalizeUrl(state.currentTab.url)
    
    // Get highlights for current URL
    const result = await chrome.storage.local.get([currentUrl, state.currentTab.url])
    const highlights = result[currentUrl] || result[state.currentTab.url] || []
    
    // Filter out all deleted highlights
    const updatedHighlights = highlights.filter(h => !idsToDelete.includes(h.id))
    
    // Save updated highlights back to the same URL key
    const updateData = {}
    const storageKey = result[currentUrl] ? currentUrl : state.currentTab.url
    updateData[storageKey] = updatedHighlights
    
    await chrome.storage.local.set(updateData)
    
    // Send message to content script to remove the highlights from DOM
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    chrome.tabs.sendMessage(tab.id, {
      action: 'removeHighlights',
      highlightIds: idsToDelete
    })
    
    // Reload highlights
    await loadHighlights()
    updateStats()
    
    // TODO: Implement undo functionality
  } catch (error) {
    console.error('[Popup] Error deleting highlight:', error)
  }
}