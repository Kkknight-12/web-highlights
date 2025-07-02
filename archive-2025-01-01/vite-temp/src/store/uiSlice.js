import { createSlice } from '@reduxjs/toolkit'

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    highlightButton: {
      visible: false,
      position: { x: 0, y: 0 }
    },
    miniToolbar: {
      visible: false,
      position: { x: 0, y: 0 },
      highlightId: null
    },
    colorPicker: {
      visible: false,
      position: { x: 0, y: 0 },
      highlightId: null
    },
    selectedColor: 'yellow'
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
      const { position, highlightId } = action.payload
      state.miniToolbar.visible = true
      state.miniToolbar.position = position
      state.miniToolbar.highlightId = highlightId
      // Hide other UI elements
      state.colorPicker.visible = false
      state.highlightButton.visible = false
    },
    
    hideMiniToolbar: (state) => {
      state.miniToolbar.visible = false
      state.miniToolbar.highlightId = null
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
  setSelectedColor
} = uiSlice.actions

export default uiSlice.reducer

// Selectors
export const selectHighlightButton = (state) => state.ui.highlightButton
export const selectMiniToolbar = (state) => state.ui.miniToolbar
export const selectColorPicker = (state) => state.ui.colorPicker
export const selectSelectedColor = (state) => state.ui.selectedColor