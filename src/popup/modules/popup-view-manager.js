/**
 * Popup View Manager
 * Handles transitions between list and detail views
 */

import { state, updateState } from './popup-state.js'
import { renderHighlightsList } from './popup-ui.js'
import { renderDetailView } from './popup-detail-view.js'

// Switch to detail view for a specific highlight
export function showDetailView(highlightId) {
  // Find the highlight
  const highlight = state.highlights.find(h => h.id === highlightId)
  if (!highlight) {
    console.error('[ViewManager] Highlight not found:', highlightId)
    return
  }
  
  // Update state
  updateState({
    currentView: 'detail',
    selectedHighlight: highlight
  })
  
  // Hide list view
  const listContainer = document.querySelector('.highlights-section')
  const actionsContainer = document.querySelector('.actions-container')
  const filtersContainer = document.querySelector('.filter-container')
  const colorFiltersContainer = document.querySelector('.color-filter-container')
  
  if (listContainer) listContainer.style.display = 'none'
  if (actionsContainer) actionsContainer.style.display = 'none'
  if (filtersContainer) filtersContainer.style.display = 'none'
  if (colorFiltersContainer) colorFiltersContainer.style.display = 'none'
  
  // Show detail view
  const detailContainer = document.getElementById('detailViewContainer')
  if (detailContainer) {
    detailContainer.style.display = 'flex'
    renderDetailView(highlight)
  }
}

// Switch back to list view
export function showListView() {
  // Update state
  updateState({
    currentView: 'list',
    selectedHighlight: null
  })
  
  // Show list view
  const listContainer = document.querySelector('.highlights-section')
  const actionsContainer = document.querySelector('.actions-container')
  const filtersContainer = document.querySelector('.filter-container')
  const colorFiltersContainer = document.querySelector('.color-filter-container')
  
  if (listContainer) listContainer.style.display = 'flex'
  if (actionsContainer) actionsContainer.style.display = 'flex'
  if (filtersContainer) filtersContainer.style.display = 'flex'
  if (colorFiltersContainer) colorFiltersContainer.style.display = 'flex'
  
  // Hide detail view
  const detailContainer = document.getElementById('detailViewContainer')
  if (detailContainer) {
    detailContainer.style.display = 'none'
  }
  
  // Re-render list to reflect any changes
  renderHighlightsList(state)
}

// Handle browser back button
export function setupViewNavigation() {
  // Listen for popstate events (browser back button)
  window.addEventListener('popstate', (event) => {
    if (event.state && event.state.view === 'list') {
      showListView()
    }
  })
  
  // Set initial state
  window.history.replaceState({ view: 'list' }, '', '')
}