/**
 * Highlight Button Template
 * HTML template and DOM creation for highlight button
 */

import { HIGHLIGHT_COLORS } from '../highlighting/highlight-constants.js'

export function createButtonHTML(selectedColor = 'yellow') {
  return `
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
}

export function createButtonContainer(selectedColor = 'yellow') {
  const container = document.createElement('div')
  container.className = 'highlighter-ui-component highlight-button-container'
  container.innerHTML = createButtonHTML(selectedColor)
  return container
}

export function updateColorSelection(container, selectedColor) {
  container.querySelectorAll('.color-option').forEach(btn => {
    if (btn.dataset.color === selectedColor) {
      btn.classList.add('selected')
    } else {
      btn.classList.remove('selected')
    }
  })
}