/**
 * Mini Toolbar Component
 * Redux-based UI component for highlight actions
 */
import { store } from '../../store/store'
import { hideMiniToolbar } from '../../store/uiSlice'
import { createToolbarContainer } from '../ui/mini-toolbar-template.js'
import { showElement, hideElement } from '../ui/visibility-manager.js'
import { 
  copyHighlightText, 
  showColorPickerForHighlight, 
  deleteHighlight, 
  navigateToLink 
} from '../actions/toolbar-actions.js'
import { makeDraggable, ensureWithinViewport } from '../ui/draggable.js'

class MiniToolbar {
  constructor() {
    this.toolbar = null
    this.currentHighlightId = null
    this.currentLinkHref = null  // NEW: Store link href for navigation
    this.unsubscribe = null
    this.dragCleanup = null
    
    // Arrow functions to preserve 'this' binding for proper event listener removal
    this.handleToolbarClick = (e) => {
      const button = e.target.closest('button')
      if (!button) return
      
      const action = button.dataset.action
      console.log('[MiniToolbar] Button clicked:', action)
      
      const state = store.getState()
      const highlightId = state.ui.miniToolbar.highlightId || this.currentHighlightId
      console.log('[MiniToolbar] Current highlight ID:', highlightId)
      
      switch (action) {
        case 'navigate':  // NEW: Handle navigation for highlighted links
          navigateToLink(this.currentLinkHref)
          break
          
        case 'copy':
          copyHighlightText(highlightId)
          break
          
        case 'color':
          const rect = this.toolbar.getBoundingClientRect()
          showColorPickerForHighlight(highlightId, rect)
          break
          
        case 'remove':
          deleteHighlight(highlightId)
          break
      }
    }
    
    this.handleMouseDown = (e) => {
      // Don't hide if clicking on toolbar or highlight
      if (this.toolbar && !this.toolbar.contains(e.target) && 
          !e.target.closest('.web-highlighter-highlight')) {
        store.dispatch(hideMiniToolbar())
      }
    }
    
    this.updateToolbarVisibility = () => {
      const state = store.getState()
      const { visible, position, highlightId, isLink, linkHref } = state.ui.miniToolbar
      
      console.log('[MiniToolbar] Visibility update:', { visible, position, highlightId, isLink })
      
      if (visible) {
        this.currentHighlightId = highlightId
        this.currentLinkHref = linkHref  // NEW: Store link href from Redux state
        
        // Only recreate toolbar if link status changed
        const needsRecreate = !this.toolbar || (this.toolbar.dataset.isLink === 'true') !== isLink
        
        if (needsRecreate) {
          // Clean up old toolbar
          if (this.toolbar) {
            this.toolbar.removeEventListener('click', this.handleToolbarClick)
            this.toolbar.remove()
          }
          // Create new toolbar with correct buttons
          this.createToolbarUI({ isLink, linkHref })
          // Store link status on toolbar element
          this.toolbar.dataset.isLink = isLink ? 'true' : 'false'
          // Re-setup draggable for new toolbar
          this.setupDraggable()
        }
        
        // Always show at calculated position
        console.log('[MiniToolbar] Showing toolbar at:', position)
        showElement(this.toolbar, position)
      } else {
        hideElement(this.toolbar)
        this.currentHighlightId = null
        this.currentLinkHref = null  // Clear stored link href
      }
    }
  }

  init() {
    console.log('[MiniToolbar] Initializing')
    
    // Create initial UI (without link options)
    this.createToolbarUI()
    
    // Make draggable
    this.setupDraggable()
    
    // Attach event listeners
    this.attachEventListeners()
    
    // Subscribe to store changes - arrow function preserves 'this'
    this.unsubscribe = store.subscribe(this.updateToolbarVisibility)
    
    // Handle window resize
    window.addEventListener('resize', this.handleResize)
  }

  createToolbarUI(options = {}) {
    this.toolbar = createToolbarContainer(options)
    
    // No drag handle needed - whole toolbar is draggable
    
    document.body.appendChild(this.toolbar)
    console.log('[MiniToolbar] Created toolbar element:', this.toolbar)
    console.log('[MiniToolbar] Toolbar classes:', this.toolbar.className)
    // Re-attach event listener to new toolbar
    this.toolbar.addEventListener('click', this.handleToolbarClick)
  }
  
  setupDraggable() {
    // Clean up previous drag setup if toolbar was recreated
    if (this.dragCleanup) {
      this.dragCleanup()
    }
    
    // Make whole toolbar draggable
    this.dragCleanup = makeDraggable(this.toolbar)
  }

  attachEventListeners() {
    // Document clicks for hiding
    document.addEventListener('mousedown', this.handleMouseDown)
  }


  handleResize = () => {
    // Ensure toolbar stays within viewport after resize
    if (this.toolbar) {
      ensureWithinViewport(this.toolbar)
    }
  }
  
  destroy() {
    // Clean up DOM
    if (this.toolbar) {
      this.toolbar.removeEventListener('click', this.handleToolbarClick)
      this.toolbar.remove()
    }
    
    // Clean up drag functionality
    if (this.dragCleanup) {
      this.dragCleanup()
    }
    
    // Unsubscribe from store
    if (this.unsubscribe) {
      this.unsubscribe()
    }
    
    // Remove document listeners
    document.removeEventListener('mousedown', this.handleMouseDown)
    window.removeEventListener('resize', this.handleResize)
  }
}

export { MiniToolbar }