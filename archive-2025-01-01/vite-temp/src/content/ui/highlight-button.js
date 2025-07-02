import { store } from '../../store/store'
import { showHighlightButton, hideHighlightButton } from '../../store/uiSlice'

// Create highlight button element
const button = document.createElement('button')
button.className = 'highlighter-ui-component highlight-button'
button.innerHTML = `
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20.707 5.826l-3.535-3.533a.999.999 0 0 0-1.408 0L7.096 10.96a.996.996 0 0 0-.273.488l-1.024 4.437a.998.998 0 0 0 1.228 1.228l4.437-1.024a.996.996 0 0 0 .488-.273l8.669-8.669a.999.999 0 0 0 .086-1.321z" fill="currentColor"/>
  </svg>
  <span>Highlight</span>
`

// Add styles
const styles = `
  .highlight-button {
    display: none;
    padding: 10px 16px !important;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
    color: #ffffff !important;
    border: none !important;
    border-radius: 24px !important;
    font-weight: 600 !important;
    cursor: pointer !important;
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4) !important;
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) !important;
    align-items: center !important;
    gap: 8px !important;
    animation: fadeIn 0.2s ease-out !important;
  }
  
  .highlight-button.visible {
    display: flex !important;
  }
  
  .highlight-button:hover {
    background: linear-gradient(135deg, #764ba2 0%, #667eea 100%) !important;
    transform: translateY(-2px) scale(1.05) !important;
    box-shadow: 0 7px 20px rgba(102, 126, 234, 0.5) !important;
  }
  
  .highlight-button:active {
    transform: translateY(0) scale(0.98) !important;
  }
  
  .highlight-button svg {
    width: 18px !important;
    height: 18px !important;
  }
  
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`

// Inject styles
const styleSheet = document.createElement('style')
styleSheet.textContent = styles
document.head.appendChild(styleSheet)

// Add button to page
document.body.appendChild(button)

// Handle button click
button.addEventListener('click', (e) => {
  e.preventDefault()
  e.stopPropagation()
  
  // Create highlight
  if (window.__highlighter) {
    window.__highlighter.createHighlight()
  }
  
  // Hide button
  store.dispatch(hideHighlightButton())
})

// Subscribe to store changes
store.subscribe(() => {
  const state = store.getState()
  const { visible, position } = state.ui.highlightButton
  
  if (visible) {
    button.classList.add('visible')
    button.style.left = `${position.x}px`
    button.style.top = `${position.y}px`
  } else {
    button.classList.remove('visible')
  }
})

// Listen for text selection
document.addEventListener('mouseup', () => {
  setTimeout(() => {
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
      const range = selection.getRangeAt(0)
      const rect = range.getBoundingClientRect()
      const text = selection.toString().trim()
      
      if (text && rect.width > 0 && rect.height > 0) {
        const scrollX = window.pageXOffset || document.documentElement.scrollLeft
        const scrollY = window.pageYOffset || document.documentElement.scrollTop
        
        store.dispatch(showHighlightButton({
          x: rect.left + scrollX,
          y: rect.top + scrollY - 50
        }))
      } else {
        store.dispatch(hideHighlightButton())
      }
    } else {
      store.dispatch(hideHighlightButton())
    }
  }, 10)
})

// Hide on click outside
document.addEventListener('mousedown', (e) => {
  if (!button.contains(e.target)) {
    store.dispatch(hideHighlightButton())
  }
})

// Hide on scroll
window.addEventListener('scroll', () => {
  store.dispatch(hideHighlightButton())
}, { passive: true })

console.log('[Web Highlighter] Highlight button initialized')