import { configureStore } from '@reduxjs/toolkit'
import highlightsReducer from './highlightsSlice'
import uiReducer from './uiSlice'

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
})

// Chrome storage sync middleware
store.subscribe(() => {
  const state = store.getState()
  // Sync highlights to Chrome storage
  chrome.storage.local.set({
    highlights: state.highlights.byUrl
  })
})