// Highlight button UI component with color options
import { store } from '../../store/store'
import { showHighlightButton, hideHighlightButton, setSelectedColor } from '../../store/uiSlice'
// Using robust highlighter that handles lists properly
import { createHighlight, HIGHLIGHT_COLORS } from './highlighter-robust'

let buttonContainer = null
let selectedColor = 'yellow' // Default color

export function initializeHighlightButton() {
  // Create button container with color options
  buttonContainer = document.createElement('div')
  buttonContainer.className = 'highlighter-ui-component highlight-button-container'
  
  // Create the main structure with color options (icon left, colors right)
  buttonContainer.innerHTML = `
    <button class="highlight-btn" title="Highlight">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20.707 5.826l-3.535-3.533a.999.999 0 0 0-1.408 0L7.096 10.96a.996.996 0 0 0-.273.488l-1.024 4.437a.998.998 0 0 0 1.228 1.228l4.437-1.024a.996.996 0 0 0 .488-.273l8.669-8.669a.999.999 0 0 0 .086-1.321z" fill="currentColor"/>
        <path d="M19 17v-6a1 1 0 0 0-2 0v6H8a1 1 0 0 0 0 2h10a1 1 0 0 0 1-1z" fill="currentColor"/>
      </svg>
    </button>
    <div class="color-options">
      ${Object.entries(HIGHLIGHT_COLORS).map(([color, config]) => `
        <button class="color-option ${color === selectedColor ? 'selected' : ''}" 
                data-color="${color}" 
                style="background-color: ${config.hex}"
                title="${color}">
        </button>
      `).join('')}
    </div>
  `
  
  // Add to page
  document.body.appendChild(buttonContainer)
  
  // Event handlers
  const highlightBtn = buttonContainer.querySelector('.highlight-btn')
  highlightBtn.addEventListener('click', handleHighlightClick)
  
  // Color selection handlers
  buttonContainer.querySelectorAll('.color-option').forEach(btn => {
    btn.addEventListener('click', handleColorSelect)
  })
  
  document.addEventListener('mouseup', handleTextSelection)
  document.addEventListener('mousedown', handleMouseDown)
  window.addEventListener('scroll', handleScroll, { passive: true })
  
  // Subscribe to store changes
  store.subscribe(updateButtonVisibility)
  
  // Load saved color preference
  const savedColor = localStorage.getItem('highlighter-default-color')
  if (savedColor && HIGHLIGHT_COLORS[savedColor]) {
    selectedColor = savedColor
    updateColorSelection()
  }
  
  console.log('[Highlight Button] Initialized with color options')
}

function handleColorSelect(e) {
  e.preventDefault()
  e.stopPropagation()
  
  const color = e.target.dataset.color
  if (color && HIGHLIGHT_COLORS[color]) {
    selectedColor = color
    store.dispatch(setSelectedColor(color))
    
    // Save preference
    localStorage.setItem('highlighter-default-color', color)
    
    // Update UI
    updateColorSelection()
    
    // Immediately create highlight with selected color
    createHighlight(color)
    
    // Hide button after highlighting
    store.dispatch(hideHighlightButton())
  }
}

function handleHighlightClick(e) {
  e.preventDefault()
  e.stopPropagation()
  
  // Create highlight with selected color
  createHighlight(selectedColor)
  
  // Hide button
  store.dispatch(hideHighlightButton())
}

function updateColorSelection() {
  buttonContainer.querySelectorAll('.color-option').forEach(btn => {
    if (btn.dataset.color === selectedColor) {
      btn.classList.add('selected')
    } else {
      btn.classList.remove('selected')
    }
  })
}

function handleTextSelection() {
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
          x: rect.left + scrollX + (rect.width / 2) - 95, // Center button
          y: rect.top + scrollY - 65 // Above selection
        }))
      } else {
        store.dispatch(hideHighlightButton())
      }
    } else {
      store.dispatch(hideHighlightButton())
    }
  }, 10)
}

function handleMouseDown(e) {
  if (buttonContainer && !buttonContainer.contains(e.target)) {
    store.dispatch(hideHighlightButton())
  }
}

function handleScroll() {
  store.dispatch(hideHighlightButton())
}

function updateButtonVisibility() {
  const state = store.getState()
  const { visible, position } = state.ui.highlightButton
  
  if (visible) {
    buttonContainer.classList.add('visible')
    buttonContainer.style.left = `${position.x}px`
    buttonContainer.style.top = `${position.y}px`
  } else {
    buttonContainer.classList.remove('visible')
  }
}