/**
 * Keyboard Shortcuts Handler
 * Manages keyboard shortcuts for the extension
 */

import { store } from '../../store/store'
import { hideHighlightButton } from '../../store/uiSlice'

class KeyboardShortcuts {
  constructor() {
    this.highlightEngine = null
    this.selectedHighlight = null
    this.highlights = []
    this.currentIndex = -1
  }
  
  init(highlightEngine) {
    this.highlightEngine = highlightEngine
    this.attachEventListeners()
    console.log('[KeyboardShortcuts] Initialized')
  }
  
  attachEventListeners() {
    // Listen for keydown events
    document.addEventListener('keydown', this.handleKeyDown.bind(this), true)
  }
  
  handleKeyDown(e) {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
    
    // Debug log for Cmd/Ctrl + Shift combinations
    if (e.shiftKey && (e.metaKey || e.ctrlKey)) {
      console.log('[KeyboardShortcuts] Debug - Key:', e.code, 'metaKey:', e.metaKey, 'ctrlKey:', e.ctrlKey, 'isMac:', isMac)
    }
    
    // Accept both Ctrl+Shift+H and Cmd+Shift+H
    if (e.shiftKey && e.code === 'KeyH' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      console.log('[KeyboardShortcuts] Highlight shortcut triggered')
      this.handleHighlightShortcut()
      return
    }
    
    // Escape key - dismiss selection and hide highlight button
    if (e.key === 'Escape') {
      this.handleEscape()
      return
    }
    
    // Delete key - remove selected/hovered highlight
    if (e.key === 'Delete' || e.key === 'Backspace') {
      // Only handle if not in an input field
      if (this.isInInputField(e.target)) return
      
      this.handleDelete(e)
      return
    }
    
    // Arrow keys - navigate highlights (future feature)
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      // Only handle if not in an input field
      if (this.isInInputField(e.target)) return
      
      // TODO: Implement highlight navigation
      // this.handleArrowNavigation(e.key)
    }
  }
  
  handleHighlightShortcut() {
    // Get current selection
    const selection = window.getSelection()
    const text = selection.toString().trim()
    
    console.log('[KeyboardShortcuts] Highlight shortcut triggered, selected text:', text)
    
    if (text && this.highlightEngine) {
      // Get selected color from store
      const state = store.getState()
      const selectedColor = state.ui.selectedColor || 'yellow'
      
      // Create highlight
      try {
        this.highlightEngine.createHighlight(text, selectedColor, selection)
        console.log('[KeyboardShortcuts] Highlight created successfully')
      } catch (error) {
        console.error('[KeyboardShortcuts] Error creating highlight:', error)
      }
    } else {
      console.log('[KeyboardShortcuts] No text selected or highlight engine not available')
    }
  }
  
  handleEscape() {
    // Clear text selection
    const selection = window.getSelection()
    if (selection.rangeCount > 0) {
      selection.removeAllRanges()
    }
    
    // Hide highlight button
    store.dispatch(hideHighlightButton())
    
    // Close any open menus
    const openMenus = document.querySelectorAll('.mini-toolbar, .color-picker-menu, .site-settings-menu')
    openMenus.forEach(menu => {
      if (menu.style.display !== 'none') {
        menu.style.display = 'none'
      }
    })
    
    console.log('[KeyboardShortcuts] Escape pressed - cleared selection and closed menus')
  }
  
  handleDelete(e) {
    // Check if a highlight is hovered
    const hoveredHighlight = document.querySelector('.web-highlighter-highlight:hover')
    
    if (hoveredHighlight && hoveredHighlight.dataset.highlightId) {
      e.preventDefault()
      
      // Get highlight ID
      const highlightId = hoveredHighlight.dataset.highlightId
      
      // Remove highlight through highlight engine
      if (this.highlightEngine && this.highlightEngine.removeHighlight) {
        this.highlightEngine.removeHighlight(highlightId)
        console.log('[KeyboardShortcuts] Deleted highlight:', highlightId)
      }
    }
  }
  
  isInInputField(element) {
    const tagName = element.tagName.toLowerCase()
    const isEditable = element.isContentEditable
    const isInput = tagName === 'input' || tagName === 'textarea' || tagName === 'select'
    
    return isInput || isEditable
  }
  
  // Future: Navigate highlights with arrow keys
  handleArrowNavigation(key) {
    // Get all highlights on page
    this.highlights = Array.from(document.querySelectorAll('.web-highlighter-highlight'))
    
    if (this.highlights.length === 0) return
    
    if (key === 'ArrowDown') {
      this.currentIndex = (this.currentIndex + 1) % this.highlights.length
    } else if (key === 'ArrowUp') {
      this.currentIndex = this.currentIndex <= 0 ? this.highlights.length - 1 : this.currentIndex - 1
    }
    
    // Focus on current highlight
    const current = this.highlights[this.currentIndex]
    if (current) {
      current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      // Add visual indicator (future enhancement)
    }
  }
  
  destroy() {
    document.removeEventListener('keydown', this.handleKeyDown.bind(this), true)
  }
}

export { KeyboardShortcuts }