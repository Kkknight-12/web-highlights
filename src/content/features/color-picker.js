// Color picker component
import { store } from '../../store/store'
import { hideColorPicker, setSelectedColor } from '../../store/uiSlice'
// Using robust highlighter that handles lists properly
import { changeHighlightColor, HIGHLIGHT_COLORS } from './highlighter-robust'

let picker = null

export function initializeColorPicker() {
  // Create picker element
  picker = document.createElement('div')
  picker.className = 'highlighter-ui-component color-picker'
  
  // Create color buttons
  const colorButtons = Object.entries(HIGHLIGHT_COLORS).map(([color, config]) => `
    <button class="color-btn" data-color="${color}" 
            style="background-color: ${config.hex}" 
            title="${color}"></button>
  `).join('')
  
  picker.innerHTML = colorButtons
  
  // Add to page
  document.body.appendChild(picker)
  
  // Event handlers
  picker.addEventListener('click', handleColorSelect)
  document.addEventListener('mousedown', handleMouseDown)
  
  // Subscribe to store changes
  store.subscribe(updatePickerVisibility)
  
  console.log('[Color Picker] Initialized')
}

function handleColorSelect(e) {
  const button = e.target.closest('button')
  if (!button) return
  
  const color = button.dataset.color
  const state = store.getState()
  const highlightId = state.ui.colorPicker.highlightId
  
  if (highlightId) {
    // Change existing highlight color
    changeHighlightColor(highlightId, color)
  } else {
    // Set default color for new highlights
    store.dispatch(setSelectedColor(color))
  }
  
  store.dispatch(hideColorPicker())
}

function handleMouseDown(e) {
  if (picker && !picker.contains(e.target)) {
    store.dispatch(hideColorPicker())
  }
}

function updatePickerVisibility() {
  const state = store.getState()
  const { visible, position } = state.ui.colorPicker
  
  if (visible) {
    picker.classList.add('visible')
    picker.style.left = `${position.x}px`
    picker.style.top = `${position.y}px`
  } else {
    picker.classList.remove('visible')
  }
}