/**
 * Color Picker Template
 * HTML template for the color picker
 */

import { HIGHLIGHT_COLORS } from '../highlighting/highlight-constants.js'

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
  container.innerHTML = createColorPickerHTML()
  return container
}