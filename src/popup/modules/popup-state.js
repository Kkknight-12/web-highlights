/**
 * Popup State Management
 * Centralized state for popup functionality
 */

// State object - single source of truth
export const state = {
  currentTab: null,
  highlights: [],
  pageHighlights: 0,
  totalHighlights: 0,
  pageHighlightsList: [], // Array of highlights for current page
  allHighlightsList: [], // All highlights from all pages
  currentFilter: 'page', // Default to 'page' view
  searchQuery: '',
  selectedColors: [], // Track selected color filters
  undoData: null, // Store deleted highlight for undo
  undoTimer: null, // Timer for auto-dismiss
  pendingDeleteId: null, // ID of highlight pending deletion (during undo period)
  currentView: 'list', // 'list' or 'detail'
  selectedHighlight: null, // Currently selected highlight for detail view
  // NEW: Options menu state
  pinnedHighlights: [], // Array of pinned highlight IDs
  archivedHighlights: [], // Array of archived highlight IDs
  hiddenHighlights: [], // Array of temporarily hidden highlight IDs
  siteSettings: {}, // Per-domain settings
  showArchived: false // Toggle to show archived highlights
}

// State update functions
export function updateState(updates) {
  Object.assign(state, updates)
}

export function resetState() {
  state.currentTab = null
  state.highlights = []
  state.pageHighlights = 0
  state.totalHighlights = 0
  state.pageHighlightsList = []
  state.allHighlightsList = []
  state.currentFilter = 'page'
  state.searchQuery = ''
  state.selectedColors = []
  state.undoData = null
  state.pendingDeleteId = null
  if (state.undoTimer) {
    clearTimeout(state.undoTimer)
    state.undoTimer = null
  }
}