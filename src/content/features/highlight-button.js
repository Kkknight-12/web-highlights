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
import { makeDraggable } from '../ui/draggable.js'

class HighlightButton {
  constructor() {
    this.buttonContainer = null
    this.selectedColor = 'yellow'
    this.unsubscribe = null
    this.dragCleanup = null
    
    // Arrow functions to preserve 'this' binding for proper event listener removal
    /* OLD IMPLEMENTATION - ISSUE: 10ms timeout too short for selection stability
    this.handleTextSelection = () => {
      setTimeout(() => {
        const selectionInfo = getSelectionInfo()
        
        if (!selectionInfo) {
          // Selection cleared
          store.dispatch(hideHighlightButton())
          return
        }
        
        const { text, range, rect } = selectionInfo
        // Selection changed - show button
        
        // Always calculate fresh position based on selection
        const position = calculateButtonPosition(rect)
        store.dispatch(showHighlightButton(position))
      }, 10)
    }
    */
    
    // NEW IMPLEMENTATION - 50ms timeout for better selection detection
    // Allows browser time to stabilize selection across different websites
    // Also adds debug logging to help identify selection timing issues
    this.handleTextSelection = () => {
      // Use minimal delay for better responsiveness
      setTimeout(() => {
        const selection = window.getSelection()
        
        const selectionInfo = getSelectionInfo()
        
        if (!selectionInfo) {
          // Selection cleared or invalid
          store.dispatch(hideHighlightButton())
          return
        }
        
        const { text, range, rect } = selectionInfo
        
        // Always calculate fresh position based on selection
        const position = calculateButtonPosition(rect)
        console.log('[HighlightButton] Showing button at position:', position)
        store.dispatch(showHighlightButton(position))
      }, 10) // Reduced back to 10ms for faster response
    }
    
    this.handleMouseDown = (e) => {
      if (this.buttonContainer && !this.buttonContainer.contains(e.target)) {
        store.dispatch(hideHighlightButton())
      }
    }
    
    this.handleScroll = () => {
      store.dispatch(hideHighlightButton())
    }
    
    /* OLD IMPLEMENTATION - Separate handlers for button and color selection
    this.handleHighlightClick = (e) => {
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
    */
    
    // NEW IMPLEMENTATION - Single handler for color clicks (palette mode)
    this.handleColorSelect = (e) => {
      e.preventDefault()
      e.stopPropagation()
      
      const color = e.target.dataset.color
      if (!color) return
      
      // Update selected color
      this.selectedColor = color
      store.dispatch(setSelectedColor(color))
      saveColorPreference(color)
      
      // Update UI to show new selection
      updateColorSelection(this.buttonContainer, color)
      
      // Create highlight immediately with selected color
      const selection = window.getSelection()
      const text = selection.toString().trim()
      if (text) {
        highlightEngine.createHighlight(text, color, selection)
      }
      
      store.dispatch(hideHighlightButton())
    }
  }

  init() {
    console.log('[HighlightButton] Initializing')
    
    // Create UI
    this.createUI()
    
    // Make draggable
    this.setupDraggable()
    
    // Attach event listeners
    this.attachEventListeners()
    
    // Subscribe to store changes
    this.unsubscribe = store.subscribe(this.updateButtonVisibility.bind(this))
    
    // Load saved color preference
    this.loadColorPreference()
  }

  createUI() {
    this.buttonContainer = createButtonContainer(this.selectedColor)
    
    // Add drag handle visual indicator
    const dragHandle = document.createElement('div')
    dragHandle.className = 'drag-handle'
    dragHandle.innerHTML = '⋮⋮'
    dragHandle.style.cssText = `
      position: absolute;
      top: -8px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 10px;
      color: rgba(255, 255, 255, 0.4);
      cursor: move;
      opacity: 0;
      transition: opacity 0.2s ease;
    `
    this.buttonContainer.appendChild(dragHandle)
    
    // Show drag handle on hover
    this.buttonContainer.addEventListener('mouseenter', () => {
      dragHandle.style.opacity = '1'
    })
    this.buttonContainer.addEventListener('mouseleave', () => {
      dragHandle.style.opacity = '0'
    })
    
    document.body.appendChild(this.buttonContainer)
  }
  
  setupDraggable() {
    // Simple draggable - no callbacks, no state saving
    this.dragCleanup = makeDraggable(this.buttonContainer)
  }

  attachEventListeners() {
    /* OLD IMPLEMENTATION - Had separate highlight button
    // Highlight button click
    const highlightBtn = this.buttonContainer.querySelector('.highlight-btn')
    highlightBtn.addEventListener('click', this.handleHighlightClick)
    */
    
    // NEW IMPLEMENTATION - Color buttons only (palette mode)
    // Color selection - clicking any color immediately highlights
    this.buttonContainer.querySelectorAll('.color-option').forEach(btn => {
      btn.addEventListener('click', this.handleColorSelect)
    })
    
    // Document events
    document.addEventListener('mouseup', this.handleTextSelection)
    document.addEventListener('mousedown', this.handleMouseDown)
    window.addEventListener('scroll', this.handleScroll, { passive: true })
  }




  updateButtonVisibility() {
    const state = store.getState()
    const { visible, position } = state.ui.highlightButton
    
    if (visible) {
      // Always reset position when showing - this ensures fresh start each time
      showElement(this.buttonContainer, position)
    } else {
      hideElement(this.buttonContainer)
    }
  }
  
  handleResize = () => {
    // Ensure button stays within viewport after resize
    if (this.buttonContainer) {
      ensureWithinViewport(this.buttonContainer)
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
    
    if (this.dragCleanup) {
      this.dragCleanup()
    }
    
    document.removeEventListener('mouseup', this.handleTextSelection)
    document.removeEventListener('mousedown', this.handleMouseDown)
    window.removeEventListener('scroll', this.handleScroll)
  }
}

export { HighlightButton }