/**
 * Mini Toolbar Template
 * HTML template for the mini toolbar
 */

export function createToolbarHTML() {
  return `
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
}

export function createToolbarContainer() {
  const container = document.createElement('div')
  container.className = 'highlighter-ui-component mini-toolbar'
  container.innerHTML = createToolbarHTML()
  return container
}