/**
 * Popup UI State Management
 * Functions for managing UI visibility states
 */

// Show loading state
export function showLoadingState() {
  document.getElementById('loadingState').style.display = 'flex'
  document.getElementById('highlightsList').style.display = 'none'
  document.getElementById('emptyStateCurrentPage').style.display = 'none'
  document.getElementById('emptyStateGlobal').style.display = 'none'
}

// Hide loading state
export function hideLoadingState() {
  document.getElementById('loadingState').style.display = 'none'
}

// Show error state
export function showErrorState(message) {
  // For now, show empty state with error message
  const emptyState = document.getElementById('emptyStateCurrentPage')
  emptyState.style.display = 'block'
  emptyState.querySelector('p').textContent = message
}

// Update clear button visibility based on active filters
export function updateClearButtonVisibility(state) {
  const clearBtn = document.getElementById('clearFiltersBtn')
  if (!clearBtn) return
  
  // Show clear button if we have active color filters or search query
  const hasActiveFilters = state.selectedColors.length > 0 || state.searchQuery.length > 0
  clearBtn.style.display = hasActiveFilters ? 'flex' : 'none'
}