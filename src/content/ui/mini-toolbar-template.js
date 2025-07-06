/**
 * Mini Toolbar Template
 * Safe DOM construction for the mini toolbar
 */

import { ICONS } from './icons.js'

/* OLD IMPLEMENTATION - SECURITY ISSUE: Used innerHTML which could lead to XSS
export function createToolbarHTML() {
  return `
    <button class="toolbar-btn" data-action="copy" title="Copy text">
      ...svg content...
    </button>
    ...more buttons...
  `
}

export function createToolbarContainer() {
  const container = document.createElement('div')
  container.className = 'highlighter-ui-component mini-toolbar'
  container.innerHTML = createToolbarHTML() // SECURITY ISSUE: innerHTML usage
  return container
}
*/

// NEW IMPLEMENTATION - Safe DOM construction without innerHTML
function createSVGElement(svgContent) {
  const wrapper = document.createElement('div')
  // Use DOMParser for safe SVG parsing
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgContent, 'image/svg+xml')
  const svg = doc.documentElement
  
  // Check for parse errors
  if (svg.nodeName === 'parsererror') {
    console.error('[MiniToolbar] SVG parse error')
    return null
  }
  
  return svg
}

function createToolbarButton(action, title, svgContent) {
  const button = document.createElement('button')
  button.className = 'toolbar-btn'
  button.setAttribute('data-action', action)
  button.setAttribute('title', title)
  
  const svg = createSVGElement(svgContent)
  if (svg) {
    button.appendChild(svg)
  }
  
  return button
}

export function createToolbarContainer(options = {}) {
  const container = document.createElement('div')
  container.className = 'highlighter-ui-component mini-toolbar'
  
  // Navigate button - only shown when highlight is inside a link
  if (options.isLink) {
    const navigateBtn = createToolbarButton('navigate', 'Navigate to link', ICONS.externalLink)
    container.appendChild(navigateBtn)
  }
  
  // Copy button
  const copyBtn = createToolbarButton('copy', 'Copy text', ICONS.copy)
  
  // Color button
  const colorBtn = createToolbarButton('color', 'Change color', ICONS.palette)
  
  // Remove button
  const removeBtn = createToolbarButton('remove', 'Remove highlight', ICONS.trash)
  
  // Append buttons to container
  container.appendChild(copyBtn)
  container.appendChild(colorBtn)
  container.appendChild(removeBtn)
  
  return container
}