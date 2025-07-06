/**
 * Popup Filter Functionality
 * Functions for filtering and searching highlights
 */

// Get filtered highlights based on current filter
export function getFilteredHighlights(state) {
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

// Apply search and color filters to highlights
export function applyFilters(highlights, state) {
  let filtered = highlights
  
  // Apply search filter
  if (state.searchQuery) {
    filtered = filtered.filter(h => 
      h.text.toLowerCase().includes(state.searchQuery) ||
      (h.url && h.url.toLowerCase().includes(state.searchQuery))
    )
  }
  
  // Apply color filter
  if (state.selectedColors.length > 0) {
    filtered = filtered.filter(h => 
      state.selectedColors.includes(h.color)
    )
  }
  
  return filtered
}