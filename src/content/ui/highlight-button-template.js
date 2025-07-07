/**
 * Highlight Button Template
 * Safe DOM creation for highlight button
 */

import { HIGHLIGHT_COLORS } from '../highlighting/highlight-constants.js'
import { COLORS } from '../../theme/theme-constants.js'
import { ICONS } from './icons.js'

/* OLD IMPLEMENTATION - SECURITY ISSUE: Used innerHTML which could lead to XSS
export function createButtonHTML(selectedColor = 'yellow') {
  return `
    <button class="highlight-btn" title="Highlight">
      <svg>...</svg>
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
  container.innerHTML = createButtonHTML(selectedColor) // SECURITY ISSUE: innerHTML usage
  return container
}
*/

// NEW IMPLEMENTATION - Safe DOM construction without innerHTML
function createHighlightButtonSVG() {
  const parser = new DOMParser()
  const svgString = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20.707 5.826l-3.535-3.533a.999.999 0 0 0-1.408 0L7.096 10.96a.996.996 0 0 0-.273.488l-1.024 4.437a.998.998 0 0 0 1.228 1.228l4.437-1.024a.996.996 0 0 0 .488-.273l8.669-8.669a.999.999 0 0 0 .086-1.321z" fill="currentColor"/>
    <path d="M19 17v-6a1 1 0 0 0-2 0v6H8a1 1 0 0 0 0 2h10a1 1 0 0 0 1-1z" fill="currentColor"/>
  </svg>`
  
  const doc = parser.parseFromString(svgString, 'image/svg+xml')
  const svg = doc.documentElement
  
  if (svg.nodeName === 'parsererror') {
    console.error('[HighlightButton] SVG parse error')
    return null
  }
  
  return svg
}

function createColorOptionButton(color, config, isSelected) {
  const button = document.createElement('button')
  button.className = 'color-option'
  if (isSelected) {
    button.classList.add('selected')
  }
  button.setAttribute('data-color', color)
  // Use theme colors
  button.style.backgroundColor = COLORS.highlights[color]
  button.setAttribute('title', color)
  return button
}

/* OLD IMPLEMENTATION - Had redundant highlight button
export function createButtonContainer(selectedColor = 'yellow') {
  const container = document.createElement('div')
  container.className = 'highlighter-ui-component highlight-button-container'
  
  // Create highlight button
  const highlightBtn = document.createElement('button')
  highlightBtn.className = 'highlight-btn'
  highlightBtn.setAttribute('title', 'Highlight')
  
  const svg = createHighlightButtonSVG()
  if (svg) {
    highlightBtn.appendChild(svg)
  }
  
  // Create color options container
  const colorOptions = document.createElement('div')
  colorOptions.className = 'color-options'
  
  // Create color option buttons
  Object.entries(HIGHLIGHT_COLORS).forEach(([color, config]) => {
    const colorBtn = createColorOptionButton(color, config, color === selectedColor)
    colorOptions.appendChild(colorBtn)
  })
  
  // Append elements to container
  container.appendChild(highlightBtn)
  container.appendChild(colorOptions)
  
  return container
}
*/

// NEW IMPLEMENTATION - Palette only mode (single-click highlighting)
export function createButtonContainer(selectedColor = 'yellow') {
  const container = document.createElement('div')
  container.className = 'highlighter-ui-component palette-mode'
  
  // Create color option buttons directly in container
  Object.entries(HIGHLIGHT_COLORS).forEach(([color, config]) => {
    const colorBtn = createColorOptionButton(color, config, color === selectedColor)
    container.appendChild(colorBtn)
  })
  
  // NEW: Add gear icon for site settings
  const settingsBtn = document.createElement('button')
  settingsBtn.className = 'settings-btn'
  settingsBtn.setAttribute('title', 'Site settings')
  settingsBtn.innerHTML = ICONS.gear
  container.appendChild(settingsBtn)
  
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