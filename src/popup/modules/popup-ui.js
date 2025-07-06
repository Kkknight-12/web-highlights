/**
 * Popup UI Rendering
 * Functions for rendering highlights list and UI components
 */

import { COLORS } from '../../theme/theme-constants.js'
import { truncateText, getRelativeTime } from './popup-utils.js'
import { getFilteredHighlights, applyFilters } from './popup-filters.js'
import { handleCopyHighlight, handleDeleteHighlight, handleHighlightClick } from './popup-clear.js'

// Helper function to get highlight color
function getHighlightColor(colorName) {
  // Use theme colors
  return COLORS.highlights[colorName] || COLORS.highlights.yellow
}

// Create individual highlight item element
function createHighlightItem(highlight, state, renderHighlightsList) {
  const item = document.createElement('div')
  item.className = 'highlight-item'
  
  // Add pending-delete class if this highlight is pending deletion
  if (state.pendingDeleteId === highlight.id) {
    item.classList.add('pending-delete')
  }
  
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
    handleDeleteHighlight(highlight.id, state)
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

// Render highlights list
export function renderHighlightsList(state) {
  const highlightsList = document.getElementById('highlightsList')
  
  // Clear existing content
  highlightsList.innerHTML = ''
  
  // Get filtered highlights
  let filteredHighlights = getFilteredHighlights(state)
  
  // Apply search and color filters
  filteredHighlights = applyFilters(filteredHighlights, state)
  
  // Check if we have highlights
  if (filteredHighlights.length === 0) {
    // Show appropriate empty state
    if (state.searchQuery || state.selectedColors.length > 0 || state.currentFilter !== 'all') {
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
    const highlightItem = createHighlightItem(highlight, state, renderHighlightsList)
    highlightsList.appendChild(highlightItem)
  })
  
  // All highlights are now shown with scroll when needed
}