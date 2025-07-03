/**
 * Color Picker Component
 * Redux-based UI component for color selection
 */
import { store } from '../../store/store'
import { hideColorPicker, setSelectedColor } from '../../store/uiSlice'
import { createColorPickerContainer } from '../ui/color-picker-template.js'
import { showElement, hideElement } from '../ui/visibility-manager.js'
import { highlightEngine } from '../highlighting/highlight-engine.js'

class ColorPicker {
  constructor() {
    this.picker = null
    this.currentHighlightId = null
    this.unsubscribe = null
    
    // Arrow functions to preserve 'this' binding for proper event listener removal
    this.handleColorSelect = (e) => {
      const colorBtn = e.target.closest('.color-option')
      if (!colorBtn) return
      
      const color = colorBtn.dataset.color
      if (!color || !this.currentHighlightId) return
      
      // Update highlight color
      highlightEngine.changeHighlightColor(this.currentHighlightId, color)
      
      // Update selected color in store
      store.dispatch(setSelectedColor(color))
      
      // Hide picker
      store.dispatch(hideColorPicker())
    }
    
    this.handleMouseDown = (e) => {
      if (!this.picker.contains(e.target)) {
        store.dispatch(hideColorPicker())
      }
    }
    
    this.updatePickerVisibility = () => {
      const state = store.getState()
      const { visible, position, highlightId } = state.ui.colorPicker
      
      if (visible) {
        this.currentHighlightId = highlightId
        showElement(this.picker, position)
      } else {
        hideElement(this.picker)
        this.currentHighlightId = null
      }
    }
  }

  init() {
    console.log('[ColorPicker] Initializing')
    
    // Create UI
    this.createPickerUI()
    
    // Attach event listeners
    this.attachEventListeners()
    
    // Subscribe to store changes
    this.unsubscribe = store.subscribe(this.updatePickerVisibility)
  }

  createPickerUI() {
    this.picker = createColorPickerContainer()
    document.body.appendChild(this.picker)
  }

  attachEventListeners() {
    // Color selection
    this.picker.addEventListener('click', this.handleColorSelect)
    
    // Document clicks for hiding
    document.addEventListener('mousedown', this.handleMouseDown)
  }


  destroy() {
    // Clean up DOM
    if (this.picker) {
      this.picker.remove()
    }
    
    // Unsubscribe from store
    if (this.unsubscribe) {
      this.unsubscribe()
    }
    
    // Remove document listeners
    document.removeEventListener('mousedown', this.handleMouseDown)
  }
}

export { ColorPicker }