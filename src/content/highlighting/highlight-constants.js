/**
 * Highlight Constants
 * Shared constants for highlighting functionality
 */

export const HIGHLIGHT_COLORS = {
  yellow: { className: 'highlight-yellow', hex: '#ffe066' },
  green: { className: 'highlight-green', hex: '#6ee7b7' },
  blue: { className: 'highlight-blue', hex: '#93c5fd' },
  pink: { className: 'highlight-pink', hex: '#fca5a5' }
}

export function generateHighlightId() {
  return `highlight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export const HIGHLIGHT_CLASS_BASE = 'web-highlighter-highlight'

export const CONTAINER_TAGS = ['p', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'td', 'th', 'div']

export const BLOCK_TAGS = ['P', 'DIV', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'TD', 'TH']