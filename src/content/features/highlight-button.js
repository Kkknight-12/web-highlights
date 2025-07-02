/**
 * Highlight Button Component
 * Redux-based UI component for creating highlights
 */
import { store } from '../../store/store'
import { showHighlightButton, hideHighlightButton, setSelectedColor } from '../../store/uiSlice'
import { createButtonContainer, updateColorSelection } from '../ui/highlight-button-template.js'
import { calculateButtonPosition } from '../ui/position-calculator.js'
import { getSelectionInfo } from '../ui/selection-handler.js'
import { showElement, hideElement } from '../ui/visibility-manager.js'
import { saveColorPreference, loadColorPreference } from '../ui/storage-helper.js'
import { highlightEngine } from '../highlighting/highlight-engine.js'

class HighlightButton {
  constructor() {
    this.buttonContainer = null
    this.selectedColor = 'yellow'
    this.unsubscribe = null
  }

  init() {
    console.log('[HighlightButton] Initializing')
    
    // Create UI
    this.createUI()
    
    // Attach event listeners
    this.attachEventListeners()
    
    // Subscribe to store changes
    this.unsubscribe = store.subscribe(this.updateButtonVisibility.bind(this))
    
    // Load saved color preference
    this.loadColorPreference()
  }

  createUI() {
    this.buttonContainer = createButtonContainer(this.selectedColor)
    document.body.appendChild(this.buttonContainer)
  }

  attachEventListeners() {
    // Highlight button click
    const highlightBtn = this.buttonContainer.querySelector('.highlight-btn')
    highlightBtn.addEventListener('click', this.handleHighlightClick.bind(this))
    
    // Color selection
    this.buttonContainer.querySelectorAll('.color-option').forEach(btn => {
      btn.addEventListener('click', this.handleColorSelect.bind(this))
    })
    
    // Document events
    document.addEventListener('mouseup', this.handleTextSelection.bind(this))
    document.addEventListener('mousedown', this.handleMouseDown.bind(this))
    window.addEventListener('scroll', this.handleScroll.bind(this), { passive: true })
  }


  handleHighlightClick(e) {
    e.preventDefault()
    e.stopPropagation()
    
    // Create highlight through highlight engine
    const selection = window.getSelection()
    const text = selection.toString().trim()
    if (text) {
      highlightEngine.createHighlight(text, this.selectedColor, selection)
    }
    
    store.dispatch(hideHighlightButton())
  }

  handleColorSelect(e) {
    e.preventDefault()
    e.stopPropagation()
    
    const color = e.target.dataset.color
    if (!color) return
    
    this.selectedColor = color
    store.dispatch(setSelectedColor(color))
    saveColorPreference(color)
    
    updateColorSelection(this.buttonContainer, color)
    
    // Create highlight with new color
    const selection = window.getSelection()
    const text = selection.toString().trim()
    if (text) {
      highlightEngine.createHighlight(text, color, selection)
    }
    
    store.dispatch(hideHighlightButton())
  }

  handleTextSelection() {
    setTimeout(() => {
      const selectionInfo = getSelectionInfo()
      
      if (!selectionInfo) {
        // Selection cleared
        store.dispatch(hideHighlightButton())
        return
      }
      
      const { text, range, rect } = selectionInfo
      // Selection changed - show button
      
      const position = calculateButtonPosition(rect)
      store.dispatch(showHighlightButton(position))
    }, 10)
  }

  handleMouseDown(e) {
    if (this.buttonContainer && !this.buttonContainer.contains(e.target)) {
      store.dispatch(hideHighlightButton())
    }
  }

  handleScroll() {
    store.dispatch(hideHighlightButton())
  }


  updateButtonVisibility() {
    const state = store.getState()
    const { visible, position } = state.ui.highlightButton
    
    if (visible) {
      showElement(this.buttonContainer, position)
    } else {
      hideElement(this.buttonContainer)
    }
  }

  loadColorPreference() {
    const savedColor = loadColorPreference()
    if (savedColor) {
      this.selectedColor = savedColor
      updateColorSelection(this.buttonContainer, savedColor)
    }
  }

  destroy() {
    if (this.buttonContainer) {
      this.buttonContainer.remove()
    }
    
    if (this.unsubscribe) {
      this.unsubscribe()
    }
    
    document.removeEventListener('mouseup', this.handleTextSelection)
    document.removeEventListener('mousedown', this.handleMouseDown)
    window.removeEventListener('scroll', this.handleScroll)
  }
}

export { HighlightButton }