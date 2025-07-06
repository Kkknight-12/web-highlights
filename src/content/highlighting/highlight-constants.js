/**
 * Highlight Constants
 * Shared constants for highlighting functionality
 */

import { COLORS } from '../../theme/theme-constants.js'

export const HIGHLIGHT_COLORS = {
  yellow: { className: 'highlight-yellow', hex: COLORS.highlights.yellow },
  green: { className: 'highlight-green', hex: COLORS.highlights.green },
  blue: { className: 'highlight-blue', hex: COLORS.highlights.blue },
  pink: { className: 'highlight-pink', hex: COLORS.highlights.pink }
}

export function generateHighlightId() {
  return `highlight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export const HIGHLIGHT_CLASS_BASE = 'web-highlighter-highlight'

export const CONTAINER_TAGS = ['p', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'td', 'th', 'div']

export const BLOCK_TAGS = ['P', 'DIV', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'TD', 'TH']