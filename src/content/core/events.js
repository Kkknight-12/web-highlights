/**
 * Event Catalog
 * Centralized list of all events in the system
 */

export const EVENTS = {
  // Highlight Operations
  HIGHLIGHT: {
    CREATE_REQUESTED: 'highlight:create:requested',
    CREATED: 'highlight:created',
    CREATE_FAILED: 'highlight:create:failed',
    
    DELETE_REQUESTED: 'highlight:delete:requested',
    DELETED: 'highlight:deleted',
    DELETE_FAILED: 'highlight:delete:failed',
    
    COLOR_CHANGE_REQUESTED: 'highlight:color:change:requested',
    COLOR_CHANGED: 'highlight:color:changed',
    COLOR_CHANGE_FAILED: 'highlight:color:change:failed',
    
    CLICKED: 'highlight:clicked',
    HOVERED: 'highlight:hovered',
    SELECTED: 'highlight:selected'
  },

  // Highlight Restoration
  RESTORATION: {
    RESTORE_REQUESTED: 'restoration:restore:requested',
    RESTORE_STARTED: 'restoration:restore:started',
    RESTORE_PROGRESS: 'restoration:restore:progress',
    RESTORE_COMPLETED: 'restoration:restore:completed',
    RESTORE_FAILED: 'restoration:restore:failed',
    
    HIGHLIGHT_RESTORED: 'restoration:highlight:restored',
    HIGHLIGHT_NOT_FOUND: 'restoration:highlight:not-found'
  },

  // Selection Events
  SELECTION: {
    CHANGED: 'selection:changed',
    CLEARED: 'selection:cleared',
    VALID: 'selection:valid',
    INVALID: 'selection:invalid'
  },

  // UI Component Events
  UI: {
    // Highlight Button
    BUTTON_SHOW_REQUESTED: 'ui:button:show:requested',
    BUTTON_SHOWN: 'ui:button:shown',
    BUTTON_HIDE_REQUESTED: 'ui:button:hide:requested',
    BUTTON_HIDDEN: 'ui:button:hidden',
    BUTTON_CLICKED: 'ui:button:clicked',
    
    // Mini Toolbar
    TOOLBAR_SHOW_REQUESTED: 'ui:toolbar:show:requested',
    TOOLBAR_SHOWN: 'ui:toolbar:shown',
    TOOLBAR_HIDE_REQUESTED: 'ui:toolbar:hide:requested',
    TOOLBAR_HIDDEN: 'ui:toolbar:hidden',
    
    // Color Picker
    COLOR_PICKER_OPENED: 'ui:color-picker:opened',
    COLOR_PICKER_CLOSED: 'ui:color-picker:closed',
    COLOR_SELECTED: 'ui:color:selected'
  },

  // Storage Events
  STORAGE: {
    SAVE_REQUESTED: 'storage:save:requested',
    SAVED: 'storage:saved',
    SAVE_FAILED: 'storage:save:failed',
    
    LOAD_REQUESTED: 'storage:load:requested',
    LOADED: 'storage:loaded',
    LOAD_FAILED: 'storage:load:failed',
    
    CLEAR_REQUESTED: 'storage:clear:requested',
    CLEARED: 'storage:cleared',
    
    UPDATED: 'storage:updated',
    SYNC_REQUESTED: 'storage:sync:requested'
  },

  // Navigation Events
  NAVIGATION: {
    PAGE_CHANGED: 'navigation:page:changed',
    URL_CHANGED: 'navigation:url:changed',
    DOM_READY: 'navigation:dom:ready',
    BEFORE_UNLOAD: 'navigation:before:unload'
  },

  // System Events
  SYSTEM: {
    INITIALIZED: 'system:initialized',
    READY: 'system:ready',
    ERROR: 'system:error',
    WARNING: 'system:warning',
    
    CONTEXT_INVALIDATED: 'system:context:invalidated',
    CONTEXT_RESTORED: 'system:context:restored',
    
    COMPONENT_REGISTERED: 'system:component:registered',
    COMPONENT_DESTROYED: 'system:component:destroyed'
  },

  // Debug Events
  DEBUG: {
    LOG: 'debug:log',
    STATS_REQUESTED: 'debug:stats:requested',
    STATS_UPDATED: 'debug:stats:updated'
  }
}

// Helper function to get all event names (for debugging)
export function getAllEventNames() {
  const events = []
  
  function extractEvents(obj, prefix = '') {
    for (const key in obj) {
      const value = obj[key]
      if (typeof value === 'string') {
        events.push(value)
      } else if (typeof value === 'object') {
        extractEvents(value, prefix + key + '.')
      }
    }
  }
  
  extractEvents(EVENTS)
  return events
}

// Freeze the events object to prevent modifications
function deepFreeze(obj) {
  Object.freeze(obj)
  Object.getOwnPropertyNames(obj).forEach(prop => {
    if (obj[prop] !== null && typeof obj[prop] === 'object') {
      deepFreeze(obj[prop])
    }
  })
  return obj
}

deepFreeze(EVENTS)