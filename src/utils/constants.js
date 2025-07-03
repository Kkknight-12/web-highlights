/**
 * Shared Constants
 * Centralized constants to avoid duplication across modules
 */

// Block-level elements that can contain highlights
export const BLOCK_SELECTOR = 'p, li, div, h1, h2, h3, h4, h5, h6, td, th'

// Chrome API error messages
export const CHROME_ERRORS = {
  CONTEXT_INVALID: 'Extension context invalidated',
  QUOTA_EXCEEDED: 'QUOTA_BYTES',
  TAB_CLOSED: 'Tab was closed',
  NO_PERMISSION: 'Permission denied'
}

// Storage keys
export const STORAGE_KEYS = {
  HIGHLIGHTS: 'highlights',
  SETTINGS: 'settings'
}

// Highlight classes
export const HIGHLIGHT_CLASS = 'web-highlighter-highlight'

// Component selectors
export const COMPONENT_SELECTORS = {
  HIGHLIGHT: `[data-highlight-id]`,
  HIGHLIGHT_SPAN: `.${HIGHLIGHT_CLASS}`,
  TOOLBAR: 'highlight-toolbar',
  COLOR_PICKER: 'color-picker-component',
  HIGHLIGHT_BUTTON: 'highlight-button'
}

// Event names (for consistency)
export const EVENTS = {
  TEXT_SELECTED: 'textSelected',
  HIGHLIGHT_CLICKED: 'highlightClicked',
  COLOR_CHANGED: 'colorChanged'
}

// Storage timing constants
export const STORAGE_TIMING = {
  SAVE_DELAY: 300 // 300ms delay for batching (reduced from 1000ms for better persistence)
}