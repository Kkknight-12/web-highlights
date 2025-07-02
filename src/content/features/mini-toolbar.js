/**
 * Mini Toolbar Component
 * Redux-based UI component for highlight actions
 */
import { store } from '../../store/store'
import { showMiniToolbar, hideMiniToolbar, showColorPicker } from '../../store/uiSlice'
import { createToolbarContainer } from '../ui/mini-toolbar-template.js'
import { calculateToolbarPosition, calculateColorPickerPosition } from '../ui/position-calculator.js'
import { showElement, hideElement } from '../ui/visibility-manager.js'
import { highlightEngine } from '../highlighting/highlight-engine.js'

class MiniToolbar {
  constructor() {
    this.toolbar = null
    this.currentHighlightId = null
    this.unsubscribe = null
  }

  init() {
    console.log('[MiniToolbar] Initializing')
    
    // Create UI
    this.createToolbarUI()
    
    // Attach event listeners
    this.attachEventListeners()
    
    // Subscribe to store changes
    this.unsubscribe = store.subscribe(this.updateToolbarVisibility.bind(this))
  }

  createToolbarUI() {
    this.toolbar = createToolbarContainer()
    document.body.appendChild(this.toolbar)
  }

  attachEventListeners() {
    // Toolbar button clicks
    this.toolbar.addEventListener('click', this.handleToolbarClick.bind(this))
    
    // Document clicks for hiding
    document.addEventListener('mousedown', this.handleMouseDown.bind(this))
  }

  handleToolbarClick(e) {
    const button = e.target.closest('button')
    if (!button) return
    
    const action = button.dataset.action
    const state = store.getState()
    const highlightId = state.ui.miniToolbar.highlightId || this.currentHighlightId
    
    switch (action) {
      case 'copy':
        this.copyHighlightText(highlightId)
        break
        
      case 'color':
        this.requestColorChange(highlightId)
        break
        
      case 'remove':
        this.requestHighlightDeletion(highlightId)
        break
    }
  }


  handleMouseDown(e) {
    // Don't hide if clicking on toolbar or highlight
    if (this.toolbar && !this.toolbar.contains(e.target) && 
        !e.target.closest('.web-highlighter-highlight')) {
      store.dispatch(hideMiniToolbar())
    }
  }

  copyHighlightText(highlightId) {
    const element = document.querySelector(`[data-highlight-id="${highlightId}"]`)
    if (element) {
      navigator.clipboard.writeText(element.textContent).then(() => {
        console.log('[MiniToolbar] Text copied')
        
        // Hide toolbar after copy
        store.dispatch(hideMiniToolbar())
      }).catch(err => {
        console.error('[MiniToolbar] Copy failed:', err)
      })
    }
  }

  requestColorChange(highlightId) {
    const rect = this.toolbar.getBoundingClientRect()
    const position = calculateColorPickerPosition(rect)
    
    // Show color picker
    store.dispatch(showColorPicker({
      position,
      highlightId
    }))
    
  }

  requestHighlightDeletion(highlightId) {
    // Delete highlight through engine
    highlightEngine.deleteHighlight(highlightId)
    
    // Hide toolbar
    store.dispatch(hideMiniToolbar())
  }

  updateToolbarVisibility() {
    const state = store.getState()
    const { visible, position } = state.ui.miniToolbar
    
    if (visible) {
      showElement(this.toolbar, position)
    } else {
      hideElement(this.toolbar)
    }
  }

  destroy() {
    // Clean up DOM
    if (this.toolbar) {
      this.toolbar.remove()
    }
    
    // Unsubscribe from store
    if (this.unsubscribe) {
      this.unsubscribe()
    }
    
    // Remove document listeners
    document.removeEventListener('mousedown', this.handleMouseDown)
  }
}

export { MiniToolbar }