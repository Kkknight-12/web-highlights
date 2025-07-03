/**
 * Mini Toolbar Template
 * Safe DOM construction for the mini toolbar
 */

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

export function createToolbarContainer() {
  const container = document.createElement('div')
  container.className = 'highlighter-ui-component mini-toolbar'
  
  // Copy button
  const copyBtn = createToolbarButton(
    'copy',
    'Copy text',
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
    '<rect x="9" y="9" width="13" height="13" rx="2"/>' +
    '<path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>' +
    '</svg>'
  )
  
  // Color button
  const colorBtn = createToolbarButton(
    'color',
    'Change color',
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">' +
    '<circle cx="12" cy="12" r="10" fill="#FFE066"/>' +
    '</svg>'
  )
  
  // Remove button
  const removeBtn = createToolbarButton(
    'remove',
    'Remove highlight',
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
    '<path d="M6 18L18 6M6 6l12 12"/>' +
    '</svg>'
  )
  
  // Append buttons to container
  container.appendChild(copyBtn)
  container.appendChild(colorBtn)
  container.appendChild(removeBtn)
  
  return container
}