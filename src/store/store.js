import { configureStore } from '@reduxjs/toolkit'
import highlightsReducer from './highlightsSlice'
import uiReducer from './uiSlice'
import { eventBus } from '../content/core/event-bus.js'
import { createEventMiddleware, createEventListenerMiddleware } from './event-middleware.js'

// Create middleware instances
const eventMiddleware = createEventMiddleware(eventBus)
const eventListenerMiddleware = createEventListenerMiddleware(eventBus)

export const store = configureStore({
  reducer: {
    highlights: highlightsReducer,
    ui: uiReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['highlights/addHighlight'],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['payload.range', 'payload.element'],
        // Ignore these paths in the state
        ignoredPaths: ['highlights.tempRange']
      }
    })
    .concat(eventMiddleware)
    .concat(eventListenerMiddleware)
})

// Chrome storage sync middleware
store.subscribe(() => {
  const state = store.getState()
  // Sync highlights to Chrome storage
  chrome.storage.local.set({
    highlights: state.highlights.byUrl
  })
})