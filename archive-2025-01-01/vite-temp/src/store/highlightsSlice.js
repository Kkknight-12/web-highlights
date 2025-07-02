import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'

// Async thunk to load highlights from Chrome storage
export const loadHighlights = createAsyncThunk(
  'highlights/load',
  async (url) => {
    const result = await chrome.storage.local.get(url)
    return { url, highlights: result[url] || [] }
  }
)

// Async thunk to save highlights to Chrome storage
export const saveHighlights = createAsyncThunk(
  'highlights/save',
  async ({ url, highlights }) => {
    const data = {}
    data[url] = highlights
    await chrome.storage.local.set(data)
    return { url, highlights }
  }
)

const highlightsSlice = createSlice({
  name: 'highlights',
  initialState: {
    byUrl: {},
    currentUrl: null,
    loading: false,
    error: null
  },
  reducers: {
    addHighlight: (state, action) => {
      const { url, highlight } = action.payload
      if (!state.byUrl[url]) {
        state.byUrl[url] = []
      }
      state.byUrl[url].push(highlight)
    },
    
    removeHighlight: (state, action) => {
      const { url, id } = action.payload
      if (state.byUrl[url]) {
        state.byUrl[url] = state.byUrl[url].filter(h => h.id !== id)
      }
    },
    
    updateHighlightColor: (state, action) => {
      const { url, id, color } = action.payload
      const highlights = state.byUrl[url]
      if (highlights) {
        const highlight = highlights.find(h => h.id === id)
        if (highlight) {
          highlight.color = color
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
      } else {
        state.byUrl = {}
      }
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
  setCurrentUrl,
  clearHighlights 
} = highlightsSlice.actions

export default highlightsSlice.reducer

// Selectors
export const selectHighlightsByUrl = (state, url) => state.highlights.byUrl[url] || []
export const selectCurrentHighlights = (state) => {
  const url = state.highlights.currentUrl || window.location.href
  return state.highlights.byUrl[url] || []
}