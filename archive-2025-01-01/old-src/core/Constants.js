/**
 * Constants Module
 * All configuration values and constants used throughout the extension
 * Extracted from the monolithic content.js following CHROME_EXTENSION_ARCHITECTURE_GUIDE.md
 */

const Constants = {
  // Highlight colors configuration
  HIGHLIGHT_COLORS: {
    yellow: { 
      bg: 'rgba(255, 224, 102, 0.4)', 
      border: 'rgba(255, 224, 102, 0.6)', 
      name: 'Yellow' 
    },
    green: { 
      bg: 'rgba(110, 231, 183, 0.4)', 
      border: 'rgba(110, 231, 183, 0.6)', 
      name: 'Green' 
    },
    blue: { 
      bg: 'rgba(147, 197, 253, 0.4)', 
      border: 'rgba(147, 197, 253, 0.6)', 
      name: 'Blue' 
    },
    pink: { 
      bg: 'rgba(252, 165, 165, 0.4)', 
      border: 'rgba(252, 165, 165, 0.6)', 
      name: 'Pink' 
    }
  },

  // Default settings
  DEFAULT_COLOR: 'yellow',
  
  // Storage keys
  STORAGE_KEY: 'highlights',
  
  // Timing constants (in milliseconds)
  DEBOUNCE_DELAY: 300,
  CONTEXT_CHECK_INTERVAL: 5000,
  HIGHLIGHT_LOAD_DELAY: 100,
  MUTATION_OBSERVER_DELAY: 1000,
  WINDOW_LOAD_DELAY: 500,
  RENDER_BUFFER: 5,
  
  // CSS Classes
  HIGHLIGHT_CLASS: 'web-highlighter-highlight',
  BUTTON_CONTAINER_ID: 'web-highlighter-button-container',
  TOOLBAR_ID: 'web-highlighter-toolbar',
  
  // Z-index values (max safe integer for browsers)
  Z_INDEX: {
    HIGHLIGHT: 'auto',
    BUTTON: 2147483647,
    TOOLBAR: 2147483647,
    COLOR_PICKER: 2147483647
  },
  
  // UI Dimensions
  UI: {
    BUTTON_HEIGHT: 40,
    BUTTON_PADDING: '10px 16px',
    BUTTON_BORDER_RADIUS: 24,
    TOOLBAR_GAP: 5,
    COLOR_BUTTON_SIZE: 24,
    ICON_SIZE: 20
  },
  
  // Font settings
  FONT: {
    FAMILY: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    SIZE: '14px',
    WEIGHT: 500
  },
  
  // Shadow settings
  SHADOW: {
    BUTTON: '0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)',
    TOOLBAR: '0 2px 12px rgba(0, 0, 0, 0.1)'
  },
  
  // Animation settings
  ANIMATION: {
    TRANSITION: 'all 0.2s',
    HOVER_BRIGHTNESS: 0.9,
    NORMAL_BRIGHTNESS: 1
  },
  
  // Error messages
  ERRORS: {
    CONTEXT_INVALIDATED: 'Extension context invalidated',
    STORAGE_FAILED: 'Failed to access storage',
    HIGHLIGHT_FAILED: 'Failed to create highlight'
  },
  
  // Chrome URLs to skip
  CHROME_URLS: ['chrome://', 'chrome-extension://'],
  
  // Node types
  NODE_TYPES: {
    ELEMENT: 1, // Node.ELEMENT_NODE
    TEXT: 3     // Node.TEXT_NODE
  },
  
  // Additional constants
  COLORS: {
    DEFAULT_COLOR: 'yellow',
    HIGHLIGHT_COLORS: {
      yellow: { 
        bg: 'rgba(255, 224, 102, 0.4)', 
        border: 'rgba(255, 224, 102, 0.6)', 
        name: 'Yellow' 
      },
      green: { 
        bg: 'rgba(110, 231, 183, 0.4)', 
        border: 'rgba(110, 231, 183, 0.6)', 
        name: 'Green' 
      },
      blue: { 
        bg: 'rgba(147, 197, 253, 0.4)', 
        border: 'rgba(147, 197, 253, 0.6)', 
        name: 'Blue' 
      },
      pink: { 
        bg: 'rgba(252, 165, 165, 0.4)', 
        border: 'rgba(252, 165, 165, 0.6)', 
        name: 'Pink' 
      }
    }
  }
};

// Freeze all nested objects to prevent accidental modifications
function deepFreeze(obj) {
  Object.freeze(obj);
  Object.getOwnPropertyNames(obj).forEach(prop => {
    if (obj[prop] !== null && (typeof obj[prop] === 'object' || typeof obj[prop] === 'function') && !Object.isFrozen(obj[prop])) {
      deepFreeze(obj[prop]);
    }
  });
  return obj;
}

deepFreeze(Constants);

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Constants;
}

// Also attach to window for browser usage
if (typeof window !== 'undefined') {
  window.Constants = Constants;
}