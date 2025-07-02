/**
 * Redux Event Middleware
 * Bridges Redux actions with the event bus system
 */

import { EVENTS } from '../content/core/events.js'

/**
 * Create event middleware that emits events for specific Redux actions
 * @param {EventBus} eventBus - The event bus instance
 */
export const createEventMiddleware = (eventBus) => (store) => (next) => (action) => {
  // Process the action first
  const result = next(action)
  
  // Emit events based on action type
  switch (action.type) {
    // Highlight actions
    case 'highlights/addHighlight':
      eventBus.emit(EVENTS.HIGHLIGHT.CREATED, action.payload)
      break
      
    case 'highlights/removeHighlight':
      eventBus.emit(EVENTS.HIGHLIGHT.DELETED, action.payload)
      break
      
    case 'highlights/updateHighlightColor':
      eventBus.emit(EVENTS.HIGHLIGHT.COLOR_CHANGED, {
        id: action.payload.id,
        newColor: action.payload.color
      })
      break
      
    // Storage actions
    case 'highlights/saveHighlights':
      eventBus.emit(EVENTS.STORAGE.SAVE_REQUESTED, {
        url: action.payload.url,
        highlights: action.payload.highlights
      })
      break
      
    case 'highlights/loadHighlights/fulfilled':
      eventBus.emit(EVENTS.STORAGE.LOADED, {
        url: action.meta.arg,
        highlights: action.payload
      })
      break
      
    // UI actions
    case 'ui/showHighlightButton':
      eventBus.emit(EVENTS.UI.BUTTON_SHOW_REQUESTED, action.payload)
      break
      
    case 'ui/hideHighlightButton':
      eventBus.emit(EVENTS.UI.BUTTON_HIDE_REQUESTED)
      break
      
    case 'ui/showMiniToolbar':
      eventBus.emit(EVENTS.UI.TOOLBAR_SHOW_REQUESTED, action.payload)
      break
      
    case 'ui/hideMiniToolbar':
      eventBus.emit(EVENTS.UI.TOOLBAR_HIDE_REQUESTED)
      break
      
    case 'ui/setSelectedColor':
      eventBus.emit(EVENTS.UI.COLOR_SELECTED, {
        color: action.payload,
        isDefault: true
      })
      break
      
    // Navigation actions
    case 'highlights/setCurrentUrl':
      eventBus.emit(EVENTS.NAVIGATION.URL_CHANGED, {
        url: action.payload,
        previousUrl: store.getState().highlights.currentUrl
      })
      break
  }
  
  return result
}

/**
 * Create event listener middleware that updates Redux store based on events
 * @param {EventBus} eventBus - The event bus instance
 */
export const createEventListenerMiddleware = (eventBus) => (store) => {
  // Listen for events and dispatch Redux actions
  
  // Highlight events
  eventBus.on(EVENTS.HIGHLIGHT.CREATE_REQUESTED, (event) => {
    // This would be handled by the highlight engine
    console.log('[EventMiddleware] Highlight create requested:', event.detail)
  })
  
  eventBus.on(EVENTS.HIGHLIGHT.DELETE_REQUESTED, (event) => {
    // This would be handled by the highlight engine
    console.log('[EventMiddleware] Highlight delete requested:', event.detail)
  })
  
  // Storage events
  eventBus.on(EVENTS.STORAGE.UPDATED, (event) => {
    const { url } = event.detail
    if (url === window.location.href) {
      // Reload highlights if storage was updated externally
      store.dispatch({ type: 'highlights/loadHighlights', payload: url })
    }
  })
  
  // System events
  eventBus.on(EVENTS.SYSTEM.ERROR, (event) => {
    console.error('[EventMiddleware] System error:', event.detail)
    // Could dispatch error action to show user notification
  })
  
  eventBus.on(EVENTS.SYSTEM.CONTEXT_INVALIDATED, () => {
    console.warn('[EventMiddleware] Extension context invalidated')
    // Could dispatch action to save state before shutdown
  })
  
  // Return middleware function
  return (next) => (action) => next(action)
}