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
  }

  init() {
    console.log('[ColorPicker] Initializing')
    
    // Create UI
    this.createPickerUI()
    
    // Attach event listeners
    this.attachEventListeners()
    
    // Subscribe to store changes
    this.unsubscribe = store.subscribe(this.updatePickerVisibility.bind(this))
  }

  createPickerUI() {
    this.picker = createColorPickerContainer()
    document.body.appendChild(this.picker)
  }

  attachEventListeners() {
    // Color selection
    this.picker.addEventListener('click', this.handleColorSelect.bind(this))
    
    // Document clicks for hiding
    document.addEventListener('mousedown', this.handleMouseDown.bind(this))
  }

  handleColorSelect(e) {
    const button = e.target.closest('button')
    if (!button) return
    
    const color = button.dataset.color
    const state = store.getState()
    const highlightId = state.ui.colorPicker.highlightId || this.currentHighlightId
    
    if (highlightId) {
      // Change existing highlight color
      highlightEngine.changeHighlightColor(highlightId, color)
    } else {
      // Set default color for new highlights
      store.dispatch(setSelectedColor(color))
    }
    
    // Hide picker
    store.dispatch(hideColorPicker())
  }


  handleMouseDown(e) {
    // Don't hide if clicking on picker
    if (this.picker && !this.picker.contains(e.target)) {
      store.dispatch(hideColorPicker())
    }
  }

  updatePickerVisibility() {
    const state = store.getState()
    const { visible, position } = state.ui.colorPicker
    
    if (visible) {
      showElement(this.picker, position)
    } else {
      hideElement(this.picker)
    }
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