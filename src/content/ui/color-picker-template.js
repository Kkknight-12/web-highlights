/**
 * Color Picker Template
 * Safe DOM creation for the color picker
 */

import { HIGHLIGHT_COLORS } from '../highlighting/highlight-constants.js'
import { COLORS } from '../../theme/theme-constants.js'

/* OLD IMPLEMENTATION - SECURITY ISSUE: Used innerHTML which could lead to XSS
export function createColorPickerHTML() {
  return `
    <div class="color-grid">
      ${Object.entries(HIGHLIGHT_COLORS).map(([color, config]) => `
        <button class="color-option" 
                data-color="${color}" 
                style="background-color: ${config.hex}"
                title="${color}">
        </button>
      `).join('')}
    </div>
  `
}

export function createColorPickerContainer() {
  const container = document.createElement('div')
  container.className = 'highlighter-ui-component color-picker'
  container.innerHTML = createColorPickerHTML() // SECURITY ISSUE: innerHTML usage
  return container
}
*/

// NEW IMPLEMENTATION - Safe DOM construction without innerHTML
function createColorButton(color, config) {
  const button = document.createElement('button')
  button.className = 'color-option'
  button.setAttribute('data-color', color)
  // Use theme colors
  button.style.backgroundColor = COLORS.highlights[color]
  button.setAttribute('title', color)
  return button
}

export function createColorPickerContainer() {
  const container = document.createElement('div')
  container.className = 'highlighter-ui-component color-picker'
  
  // Create color grid
  const colorGrid = document.createElement('div')
  colorGrid.className = 'color-grid'
  
  // Create color buttons
  Object.entries(HIGHLIGHT_COLORS).forEach(([color, config]) => {
    const colorBtn = createColorButton(color, config)
    colorGrid.appendChild(colorBtn)
  })
  
  container.appendChild(colorGrid)
  return container
}