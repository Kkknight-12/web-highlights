import { createSlice } from '@reduxjs/toolkit'

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    highlightButton: {
      visible: false,
      position: { x: 0, y: 0 },
      isDragging: false,
      savedPosition: null // Custom position if user dragged it
    },
    miniToolbar: {
      visible: false,
      position: { x: 0, y: 0 },
      highlightId: null,
      isLink: false,      // NEW: Track if highlight is a link
      linkHref: null,     // NEW: Store the link URL
      isDragging: false,
      savedPosition: null
    },
    colorPicker: {
      visible: false,
      position: { x: 0, y: 0 },
      highlightId: null
    },
    selectedColor: 'yellow',
    // Domain-specific saved positions
    domainPositions: {} // { 'example.com': { highlightButton: {x, y}, miniToolbar: {x, y} } }
  },
  reducers: {
    showHighlightButton: (state, action) => {
      state.highlightButton.visible = true
      state.highlightButton.position = action.payload
    },
    
    hideHighlightButton: (state) => {
      state.highlightButton.visible = false
    },
    
    showMiniToolbar: (state, action) => {
      const { position, highlightId, isLink, linkHref } = action.payload  // NEW: Destructure link properties
      state.miniToolbar.visible = true
      state.miniToolbar.position = position
      state.miniToolbar.highlightId = highlightId
      state.miniToolbar.isLink = isLink || false      // NEW: Set link status
      state.miniToolbar.linkHref = linkHref || null   // NEW: Set link URL
      // Hide other UI elements
      state.colorPicker.visible = false
      state.highlightButton.visible = false
    },
    
    hideMiniToolbar: (state) => {
      state.miniToolbar.visible = false
      state.miniToolbar.highlightId = null
      state.miniToolbar.isLink = false      // NEW: Reset link status
      state.miniToolbar.linkHref = null     // NEW: Reset link URL
    },
    
    showColorPicker: (state, action) => {
      const { position, highlightId } = action.payload
      state.colorPicker.visible = true
      state.colorPicker.position = position
      state.colorPicker.highlightId = highlightId
      // Hide toolbar when showing color picker
      state.miniToolbar.visible = false
    },
    
    hideColorPicker: (state) => {
      state.colorPicker.visible = false
      state.colorPicker.highlightId = null
    },
    
    hideAllUI: (state) => {
      state.highlightButton.visible = false
      state.miniToolbar.visible = false
      state.colorPicker.visible = false
    },
    
    setSelectedColor: (state, action) => {
      state.selectedColor = action.payload
    },
    
    // Dragging actions
    startDragging: (state, action) => {
      const { element } = action.payload // 'highlightButton' or 'miniToolbar'
      if (state[element]) {
        state[element].isDragging = true
      }
    },
    
    stopDragging: (state, action) => {
      const { element, position } = action.payload
      if (state[element]) {
        state[element].isDragging = false
        state[element].savedPosition = position
        state[element].position = position
      }
    },
    
    // Save position for current domain
    saveDomainPosition: (state, action) => {
      const { domain, element, position } = action.payload
      if (!state.domainPositions[domain]) {
        state.domainPositions[domain] = {}
      }
      state.domainPositions[domain][element] = position
    },
    
    // Load saved positions for a domain
    loadDomainPositions: (state, action) => {
      const { domain, positions } = action.payload
      if (positions) {
        state.domainPositions[domain] = positions
        // Apply saved positions if elements have them
        if (positions.highlightButton) {
          state.highlightButton.savedPosition = positions.highlightButton
        }
        if (positions.miniToolbar) {
          state.miniToolbar.savedPosition = positions.miniToolbar
        }
      }
    },
    
    // Reset element position to default
    resetElementPosition: (state, action) => {
      const { element } = action.payload
      if (state[element]) {
        state[element].savedPosition = null
        // Position will be recalculated by the component
      }
    }
  }
})

export const {
  showHighlightButton,
  hideHighlightButton,
  showMiniToolbar,
  hideMiniToolbar,
  showColorPicker,
  hideColorPicker,
  hideAllUI,
  setSelectedColor,
  startDragging,
  stopDragging,
  saveDomainPosition,
  loadDomainPositions,
  resetElementPosition
} = uiSlice.actions

export default uiSlice.reducer

// Selectors
export const selectHighlightButton = (state) => state.ui.highlightButton
export const selectMiniToolbar = (state) => state.ui.miniToolbar
export const selectColorPicker = (state) => state.ui.colorPicker
export const selectSelectedColor = (state) => state.ui.selectedColor
export const selectDomainPositions = (state, domain) => state.ui.domainPositions[domain] || {}