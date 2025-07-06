/**
 * Popup functionality for Web Highlighter
 * Main entry point - coordinates all popup modules
 */

// Import modules
import { state } from './modules/popup-state.js'
import { loadHighlights, setupStorageListener } from './modules/popup-storage.js'
import { handleExport } from './modules/popup-export.js'
import { handleClearHighlights, executePendingDelete } from './modules/popup-clear.js'
import { handleUndo, setExecutePendingDelete } from './modules/popup-undo.js'
import { renderHighlightsList } from './modules/popup-ui.js'
import { updateClearButtonVisibility } from './modules/popup-ui-state.js'
import { updateStats } from './modules/popup-utils.js'

// Set the executePendingDelete function to avoid circular dependency
setExecutePendingDelete(executePendingDelete)

// Initialize popup
document.addEventListener('DOMContentLoaded', initializePopup)

async function initializePopup() {
  try {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    state.currentTab = tab
    
    // Set render callback for modules that need it
    state.renderCallback = () => renderHighlightsList(state)
    
    // Load highlights
    await loadHighlights(state)
    
    // Update UI
    updateStats()
    renderHighlightsList(state)
    
    // Setup storage listener
    setupStorageListener(
      () => loadHighlights(state),
      updateStats
    )
    
    // Attach event listeners
    attachEventListeners()
  } catch (error) {
    console.error('[Popup] Initialization error:', error)
  }
}

// Attach event listeners
function attachEventListeners() {
  // Search functionality
  const searchInput = document.getElementById('searchInput')
  searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.toLowerCase()
    updateClearButtonVisibility(state)
    renderHighlightsList(state)
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
      renderHighlightsList(state)
    })
  })
  
  // Color filter buttons
  document.querySelectorAll('.color-filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const button = e.currentTarget
      const color = button.dataset.color
      
      // Toggle color in selected colors
      if (state.selectedColors.includes(color)) {
        // Remove color from filter
        state.selectedColors = state.selectedColors.filter(c => c !== color)
        button.classList.remove('active')
      } else {
        // Add color to filter
        state.selectedColors.push(color)
        button.classList.add('active')
      }
      
      // Show/hide clear button based on active filters
      updateClearButtonVisibility(state)
      
      // Re-render list with new filters
      renderHighlightsList(state)
    })
  })
  
  // Clear filters button
  const clearFiltersBtn = document.getElementById('clearFiltersBtn')
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', () => {
      // Clear all color filters
      state.selectedColors = []
      
      // Remove active class from all color buttons
      document.querySelectorAll('.color-filter-btn').forEach(btn => {
        btn.classList.remove('active')
      })
      
      // Clear search input
      const searchInput = document.getElementById('searchInput')
      searchInput.value = ''
      state.searchQuery = ''
      
      // Hide clear button
      clearFiltersBtn.style.display = 'none'
      
      // Re-render list
      renderHighlightsList(state)
    })
  }
  
  // Export highlights
  document.getElementById('exportHighlights').addEventListener('click', () => {
    handleExport(state)
  })
  
  // Clear page highlights
  const clearPageBtn = document.getElementById('clearPageHighlights')
  if (clearPageBtn) {
    clearPageBtn.addEventListener('click', () => {
      handleClearHighlights('page', state)
    })
  }
  
  // Clear all highlights
  const clearAllBtn = document.getElementById('clearAllHighlights')
  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', () => {
      handleClearHighlights('all', state)
    })
  }
  
  // Undo button
  const undoBtn = document.getElementById('undoButton')
  if (undoBtn) {
    undoBtn.addEventListener('click', () => {
      handleUndo(state)
    })
  }
}