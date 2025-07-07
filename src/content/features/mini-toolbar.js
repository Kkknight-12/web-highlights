/**
 * Mini Toolbar Component
 * Redux-based UI component for highlight actions
 */
import { store } from '../../store/store'
import { hideMiniToolbar } from '../../store/uiSlice'
import { updateHighlightNote, selectHighlightById } from '../../store/highlightsSlice'
import { createToolbarContainer } from '../ui/mini-toolbar-template.js'
import { showElement, hideElement } from '../ui/visibility-manager.js'
import { 
  copyHighlightText, 
  showColorPickerForHighlight, 
  deleteHighlight, 
  navigateToLink 
} from '../actions/toolbar-actions.js'
import { makeDraggable, ensureWithinViewport } from '../ui/draggable.js'
import { createNoteField, getNoteText, focusNoteField } from '../ui/note-field-template.js'

class MiniToolbar {
  constructor() {
    this.toolbar = null
    this.noteField = null
    this.currentHighlightId = null
    this.currentLinkHref = null  // NEW: Store link href for navigation
    this.unsubscribe = null
    this.dragCleanup = null
    
    // Arrow functions to preserve 'this' binding for proper event listener removal
    this.handleToolbarClick = (e) => {
      console.log('[MiniToolbar] Click event triggered, target:', e.target)
      console.log('[MiniToolbar] Event target tagName:', e.target.tagName)
      console.log('[MiniToolbar] Event target className:', e.target.className)
      
      const button = e.target.closest('button')
      console.log('[MiniToolbar] Closest button found:', button)
      
      if (!button) {
        console.log('[MiniToolbar] No button found, returning')
        return
      }
      
      const action = button.dataset.action
      console.log('[MiniToolbar] Button action:', action)
      console.log('[MiniToolbar] Button dataset:', button.dataset)
      
      // Stop propagation to prevent toolbar from hiding
      e.stopPropagation()
      console.log('[MiniToolbar] Propagation stopped')
      
      const state = store.getState()
      const highlightId = state.ui.miniToolbar.highlightId || this.currentHighlightId
      console.log('[MiniToolbar] Current highlight ID:', highlightId)
      console.log('[MiniToolbar] State highlightId:', state.ui.miniToolbar.highlightId)
      console.log('[MiniToolbar] This.currentHighlightId:', this.currentHighlightId)
      
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
          
        case 'note':
          this.toggleNoteField(highlightId)
          break
          
        case 'save-note':
          console.log('[MiniToolbar] Save note case triggered')
          this.saveNote(highlightId)
          break
          
        case 'cancel-note':
          console.log('[MiniToolbar] Cancel note case triggered')
          this.hideNoteField()
          break
          
        default:
          console.log('[MiniToolbar] Unknown action:', action)
      }
    }
    
    this.handleMouseDown = (e) => {
      // Don't hide if clicking on toolbar, note field, or highlight
      if (this.toolbar && !this.toolbar.contains(e.target) && 
          !e.target.closest('.web-highlighter-highlight') &&
          !e.target.closest('.note-field-container')) {
        store.dispatch(hideMiniToolbar())
      }
    }
    
    this.updateToolbarVisibility = () => {
      const state = store.getState()
      const { visible, position, highlightId, isLink, linkHref } = state.ui.miniToolbar
      
      console.log('[MiniToolbar] Visibility update:', { visible, position, highlightId, isLink })
      
      if (visible) {
        // Check if switching to a different highlight
        const isNewHighlight = this.currentHighlightId !== highlightId
        
        this.currentHighlightId = highlightId
        this.currentLinkHref = linkHref  // NEW: Store link href from Redux state
        
        // Only recreate toolbar if link status changed
        const needsRecreate = !this.toolbar || (this.toolbar.dataset.isLink === 'true') !== isLink
        
        if (needsRecreate) {
          // Clean up old toolbar AND note field
          if (this.toolbar) {
            this.toolbar.removeEventListener('click', this.handleToolbarClick)
            this.toolbar.remove()
          }
          // Clean up note field reference
          if (this.noteField) {
            this.noteField = null
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
        
        // Update note button indicator
        this.updateNoteIndicator(highlightId)
        
        // Only hide note field when switching to a different highlight
        if (isNewHighlight && this.noteField) {
          this.hideNoteField()
        }
      } else {
        hideElement(this.toolbar)
        this.hideNoteField()
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
    // Re-attach event listener to new toolbar with event delegation
    this.toolbar.addEventListener('click', this.handleToolbarClick, true) // Use capture phase
    
    // Also attach the mousedown handler to prevent bubbling
    this.toolbar.addEventListener('mousedown', (e) => {
      console.log('[MiniToolbar] Toolbar mousedown, target:', e.target)
      // Allow button clicks to proceed normally
      if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
        console.log('[MiniToolbar] Button mousedown, not stopping propagation')
        return
      }
      console.log('[MiniToolbar] Non-button mousedown, stopping propagation')
      e.stopPropagation()
    })
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
    
    // Prevent toolbar clicks from bubbling to document
    // But don't interfere with button clicks
    this.toolbar.addEventListener('mousedown', (e) => {
      console.log('[MiniToolbar] Toolbar mousedown, target:', e.target)
      // Allow button clicks to proceed normally
      if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
        console.log('[MiniToolbar] Button mousedown, not stopping propagation')
        return
      }
      console.log('[MiniToolbar] Non-button mousedown, stopping propagation')
      e.stopPropagation()
    })
  }


  handleResize = () => {
    // Ensure toolbar stays within viewport after resize
    if (this.toolbar) {
      ensureWithinViewport(this.toolbar)
    }
  }
  
  // Note field management methods
  toggleNoteField(highlightId) {
    // Check if note field actually exists in DOM, not just the reference
    const existingNoteField = this.toolbar.querySelector('.note-field-container')
    if (existingNoteField) {
      this.hideNoteField()
    } else {
      this.showNoteField(highlightId)
    }
  }
  
  showNoteField(highlightId) {
    if (!this.toolbar || !highlightId) return
    
    // Remove any existing note field first to avoid duplicates
    const existingNoteField = this.toolbar.querySelector('.note-field-container')
    if (existingNoteField) {
      existingNoteField.remove()
    }
    
    // Get current highlight to check for existing note
    const state = store.getState()
    const url = window.location.href
    const highlight = selectHighlightById(state, url, highlightId)
    const existingNote = highlight ? highlight.note || '' : ''
    
    // Create note field with callbacks
    this.noteField = createNoteField(
      highlightId, 
      existingNote,
      (noteText) => {
        // Save callback
        console.log('[MiniToolbar] Save callback triggered with text:', noteText)
        store.dispatch(updateHighlightNote({ url, id: highlightId, note: noteText }))
        this.updateNoteIndicator(highlightId)
        this.hideNoteField()
      },
      () => {
        // Cancel callback
        console.log('[MiniToolbar] Cancel callback triggered')
        this.hideNoteField()
      }
    )
    this.toolbar.appendChild(this.noteField)
    
    // Add a document level click listener to debug
    const debugClickHandler = (e) => {
      console.log('[MiniToolbar] Document click detected, target:', e.target)
      if (e.target.classList.contains('note-field-save') || e.target.classList.contains('note-field-cancel')) {
        console.log('[MiniToolbar] Button click reached document level!')
      }
    }
    document.addEventListener('click', debugClickHandler, true)
    
    // Store handler for cleanup
    this.noteField._debugHandler = debugClickHandler
    
    // Add visible class after a frame for animation
    requestAnimationFrame(() => {
      this.noteField.classList.add('visible')
      focusNoteField(this.noteField)
    })
    
    // Position note field below toolbar
    const toolbarRect = this.toolbar.getBoundingClientRect()
    this.noteField.style.top = '40px'
    
    // Ensure note field stays within viewport
    requestAnimationFrame(() => {
      const noteRect = this.noteField.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      
      // Adjust horizontal position if needed
      if (noteRect.right > viewportWidth - 10) {
        const adjustment = noteRect.right - viewportWidth + 10
        this.noteField.style.left = `-${adjustment}px`
      }
    })
  }
  
  hideNoteField() {
    if (!this.noteField) return
    
    this.noteField.classList.remove('visible')
    
    // Remove after animation
    setTimeout(() => {
      if (this.noteField) {
        this.noteField.remove()
        this.noteField = null
      }
    }, 200)
  }
  
  saveNote(highlightId) {
    console.log('[MiniToolbar] saveNote called with highlightId:', highlightId)
    console.log('[MiniToolbar] noteField exists?', !!this.noteField)
    
    if (!this.noteField || !highlightId) {
      console.log('[MiniToolbar] Missing noteField or highlightId, returning')
      return
    }
    
    const noteText = getNoteText(this.noteField)
    console.log('[MiniToolbar] Note text to save:', noteText)
    
    const url = window.location.href
    console.log('[MiniToolbar] Current URL:', url)
    
    // Update note in Redux store
    console.log('[MiniToolbar] Dispatching updateHighlightNote')
    store.dispatch(updateHighlightNote({ url, id: highlightId, note: noteText }))
    
    // Update note indicator
    console.log('[MiniToolbar] Updating note indicator')
    this.updateNoteIndicator(highlightId)
    
    // Hide note field
    console.log('[MiniToolbar] Hiding note field')
    this.hideNoteField()
    
    console.log('[MiniToolbar] Note saved successfully:', noteText)
  }
  
  updateNoteIndicator(highlightId) {
    if (!this.toolbar || !highlightId) return
    
    const noteBtn = this.toolbar.querySelector('[data-action="note"]')
    if (!noteBtn) return
    
    // Get highlight to check for note
    const state = store.getState()
    const url = window.location.href
    const highlight = selectHighlightById(state, url, highlightId)
    
    if (highlight && highlight.note) {
      noteBtn.classList.add('has-note')
      noteBtn.setAttribute('title', 'Edit note')
    } else {
      noteBtn.classList.remove('has-note')
      noteBtn.setAttribute('title', 'Add note')
    }
  }
  
  destroy() {
    // Clean up DOM
    if (this.toolbar) {
      this.toolbar.removeEventListener('click', this.handleToolbarClick)
      this.toolbar.remove()
    }
    
    // Clean up note field
    if (this.noteField) {
      this.noteField.remove()
      this.noteField = null
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