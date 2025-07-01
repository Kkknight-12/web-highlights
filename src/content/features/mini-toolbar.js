// Mini toolbar component
import { store } from '../../store/store'
import { showMiniToolbar, hideMiniToolbar, showColorPicker } from '../../store/uiSlice'
import { deleteHighlight } from './highlighter'

let toolbar = null

export function initializeMiniToolbar() {
  // Create toolbar element
  toolbar = document.createElement('div')
  toolbar.className = 'highlighter-ui-component mini-toolbar'
  toolbar.innerHTML = `
    <button class="toolbar-btn" data-action="copy" title="Copy text">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="9" width="13" height="13" rx="2"/>
        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
      </svg>
    </button>
    <button class="toolbar-btn" data-action="color" title="Change color">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="10" fill="#FFE066"/>
      </svg>
    </button>
    <button class="toolbar-btn" data-action="remove" title="Remove highlight">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M6 18L18 6M6 6l12 12"/>
      </svg>
    </button>
  `
  
  // Add to page
  document.body.appendChild(toolbar)
  
  // Event handlers
  toolbar.addEventListener('click', handleToolbarClick)
  window.addEventListener('highlight-clicked', handleHighlightClick)
  document.addEventListener('mousedown', handleMouseDown)
  
  // Subscribe to store changes
  store.subscribe(updateToolbarVisibility)
  
  console.log('[Mini Toolbar] Initialized')
}

function handleToolbarClick(e) {
  const button = e.target.closest('button')
  if (!button) return
  
  const action = button.dataset.action
  const state = store.getState()
  const highlightId = state.ui.miniToolbar.highlightId
  
  switch (action) {
    case 'copy':
      copyHighlightText(highlightId)
      store.dispatch(hideMiniToolbar())
      break
      
    case 'color':
      const rect = toolbar.getBoundingClientRect()
      store.dispatch(showColorPicker({
        position: { x: rect.left, y: rect.bottom + 5 },
        highlightId
      }))
      break
      
    case 'remove':
      deleteHighlight(highlightId)
      store.dispatch(hideMiniToolbar())
      break
  }
}

function handleHighlightClick(e) {
  const { id, rect } = e.detail
  const scrollX = window.pageXOffset || document.documentElement.scrollLeft
  const scrollY = window.pageYOffset || document.documentElement.scrollTop
  
  store.dispatch(showMiniToolbar({
    position: {
      x: rect.left + scrollX + (rect.width / 2) - 75, // Center toolbar
      y: rect.bottom + scrollY + 5
    },
    highlightId: id
  }))
}

function handleMouseDown(e) {
  if (toolbar && !toolbar.contains(e.target) && 
      !e.target.closest('.web-highlighter-highlight')) {
    store.dispatch(hideMiniToolbar())
  }
}

function copyHighlightText(highlightId) {
  const element = document.querySelector(`[data-highlight-id="${highlightId}"]`)
  if (element) {
    navigator.clipboard.writeText(element.textContent).then(() => {
      console.log('[Mini Toolbar] Text copied')
    })
  }
}

function updateToolbarVisibility() {
  const state = store.getState()
  const { visible, position } = state.ui.miniToolbar
  
  if (visible) {
    toolbar.classList.add('visible')
    toolbar.style.left = `${position.x}px`
    toolbar.style.top = `${position.y}px`
  } else {
    toolbar.classList.remove('visible')
  }
}