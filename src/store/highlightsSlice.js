import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { safeStorageGet, safeStorageSet } from '../utils/chrome-api.js'

// Async thunk to load highlights from Chrome storage
export const loadHighlights = createAsyncThunk(
  'highlights/load',
  async (url) => {
    const result = await safeStorageGet(url)
    return { url, highlights: result[url] || [] }
  }
)

// Async thunk to save highlights to Chrome storage
export const saveHighlights = createAsyncThunk(
  'highlights/save',
  async ({ url, highlights }) => {
    const data = {}
    data[url] = highlights
    const success = await safeStorageSet(data)
    if (!success) {
      throw new Error('Failed to save highlights')
    }
    return { url, highlights }
  }
)

const highlightsSlice = createSlice({
  name: 'highlights',
  initialState: {
    byUrl: {},
    currentUrl: null,
    loading: false,
    error: null,
    dirtyUrls: [], // Track which URLs have unsaved changes (using array instead of Set for Redux serialization)
    // NEW: Options menu features
    pinnedHighlights: [], // Array of pinned highlight IDs
    archivedHighlights: [], // Array of archived highlight IDs
    hiddenHighlights: [], // Array of temporarily hidden highlight IDs (session-based)
    siteSettings: {} // Per-domain settings { domain: { disabled: bool, hidePopup: bool } }
  },
  reducers: {
    addHighlight: (state, action) => {
      const { url, highlight } = action.payload
      if (!state.byUrl[url]) {
        state.byUrl[url] = []
      }
      state.byUrl[url].push(highlight)
      // Mark URL as dirty (needs saving) - avoid duplicates
      if (!state.dirtyUrls.includes(url)) {
        state.dirtyUrls.push(url)
      }
    },
    
    removeHighlight: (state, action) => {
      const { url, id } = action.payload
      if (state.byUrl[url]) {
        state.byUrl[url] = state.byUrl[url].filter(h => h.id !== id)
        // Mark URL as dirty
        if (!state.dirtyUrls.includes(url)) {
          state.dirtyUrls.push(url)
        }
      }
    },
    
    updateHighlightColor: (state, action) => {
      const { url, id, color } = action.payload
      const highlights = state.byUrl[url]
      if (highlights) {
        const highlight = highlights.find(h => h.id === id)
        if (highlight) {
          highlight.color = color
          // Mark URL as dirty
          if (!state.dirtyUrls.includes(url)) {
            state.dirtyUrls.push(url)
          }
        }
      }
    },
    
    updateHighlightNote: (state, action) => {
      const { url, id, note } = action.payload
      const highlights = state.byUrl[url]
      if (highlights) {
        const highlight = highlights.find(h => h.id === id)
        if (highlight) {
          highlight.note = note
          // Mark URL as dirty
          if (!state.dirtyUrls.includes(url)) {
            state.dirtyUrls.push(url)
          }
        }
      }
    },
    
    setCurrentUrl: (state, action) => {
      state.currentUrl = action.payload
    },
    
    clearHighlights: (state, action) => {
      const url = action.payload
      if (url) {
        delete state.byUrl[url]
        // Mark URL as dirty
        if (!state.dirtyUrls.includes(url)) {
          state.dirtyUrls.push(url)
        }
      } else {
        // Mark all URLs as dirty before clearing
        Object.keys(state.byUrl).forEach(url => {
          if (!state.dirtyUrls.includes(url)) {
            state.dirtyUrls.push(url)
          }
        })
        state.byUrl = {}
      }
    },
    
    clearDirtyFlags: (state) => {
      // Clear all dirty flags after successful save
      state.dirtyUrls = []
    },
    
    // NEW: Pin/unpin highlight
    togglePinHighlight: (state, action) => {
      const { id } = action.payload
      const index = state.pinnedHighlights.indexOf(id)
      if (index === -1) {
        state.pinnedHighlights.push(id)
      } else {
        state.pinnedHighlights.splice(index, 1)
      }
    },
    
    // NEW: Archive/unarchive highlight
    toggleArchiveHighlight: (state, action) => {
      const { id } = action.payload
      const index = state.archivedHighlights.indexOf(id)
      if (index === -1) {
        state.archivedHighlights.push(id)
      } else {
        state.archivedHighlights.splice(index, 1)
      }
    },
    
    // NEW: Hide highlight until next visit (session-based)
    hideHighlightUntilNextVisit: (state, action) => {
      const { id } = action.payload
      if (!state.hiddenHighlights.includes(id)) {
        state.hiddenHighlights.push(id)
      }
    },
    
    // NEW: Update site settings
    updateSiteSettings: (state, action) => {
      const { domain, settings } = action.payload
      state.siteSettings[domain] = {
        ...state.siteSettings[domain],
        ...settings
      }
    },
    
    // NEW: Clear hidden highlights (for new session)
    clearHiddenHighlights: (state) => {
      state.hiddenHighlights = []
    }
  },
  
  extraReducers: (builder) => {
    builder
      // Load highlights
      .addCase(loadHighlights.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loadHighlights.fulfilled, (state, action) => {
        const { url, highlights } = action.payload
        state.byUrl[url] = highlights
        state.loading = false
      })
      .addCase(loadHighlights.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message
      })
      
      // Save highlights
      .addCase(saveHighlights.fulfilled, (state, action) => {
        // Already saved, just update state if needed
        const { url, highlights } = action.payload
        state.byUrl[url] = highlights
      })
  }
})

export const { 
  addHighlight, 
  removeHighlight, 
  updateHighlightColor,
  updateHighlightNote,
  setCurrentUrl,
  clearHighlights,
  clearDirtyFlags,
  // NEW: Options menu actions
  togglePinHighlight,
  toggleArchiveHighlight,
  hideHighlightUntilNextVisit,
  updateSiteSettings,
  clearHiddenHighlights
} = highlightsSlice.actions

export default highlightsSlice.reducer

// Selectors
export const selectHighlightsByUrl = (state, url) => state.highlights.byUrl[url] || []
export const selectCurrentHighlights = (state) => {
  const url = state.highlights.currentUrl || window.location.href
  return state.highlights.byUrl[url] || []
}
export const selectHighlightById = (state, url, id) => {
  const highlights = state.highlights.byUrl[url] || []
  return highlights.find(h => h.id === id)
}