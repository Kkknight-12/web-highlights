import { configureStore } from '@reduxjs/toolkit'
import highlightsReducer, { addHighlight, setCurrentUrl } from '../../src/store/highlightsSlice.js'

describe('TC-3.1: Redux State Update', () => {
  let store
  
  beforeEach(() => {
    // Create a fresh store for each test
    store = configureStore({
      reducer: {
        highlights: highlightsReducer
      }
    })
    
    // Set current URL
    const testUrl = 'https://example.com/test'
    store.dispatch(setCurrentUrl(testUrl))
  })

  it('should update Redux store when highlight is created', () => {
    // Initial state check
    const initialState = store.getState().highlights
    expect(initialState.byUrl).toEqual({})
    expect(initialState.currentUrl).toBe('https://example.com/test')
    
    // Create highlight data (simulating what highlight engine creates)
    const highlightData = {
      id: 'highlight-1234567890-abc123',
      text: 'Hello world',
      color: 'yellow',
      timestamp: Date.now(),
      url: 'https://example.com/test',
      context: {
        before: 'Say ',
        after: ' to everyone'
      },
      location: {
        container: { path: [0, 0], tagName: 'p' },
        textIndex: 0,
        occurrence: 0
      }
    }
    
    // Dispatch action to add highlight
    store.dispatch(addHighlight({
      url: highlightData.url,
      highlight: highlightData
    }))
    
    // Verify: Redux store contains highlight data
    const updatedState = store.getState().highlights
    const highlightsForUrl = updatedState.byUrl[highlightData.url]
    
    expect(highlightsForUrl).toBeDefined()
    expect(highlightsForUrl).toHaveLength(1)
    
    const storedHighlight = highlightsForUrl[0]
    
    // Verify: State includes ID, text, color, position
    expect(storedHighlight.id).toBe(highlightData.id)
    expect(storedHighlight.text).toBe(highlightData.text)
    expect(storedHighlight.color).toBe(highlightData.color)
    expect(storedHighlight.timestamp).toBeDefined()
    expect(storedHighlight.location).toBeDefined()
    expect(storedHighlight.context).toBeDefined()
  })

  it('should handle multiple highlights', () => {
    const url = 'https://example.com/test'
    
    // Add first highlight
    const highlight1 = {
      id: 'highlight-1',
      text: 'First highlight',
      color: 'yellow'
    }
    
    store.dispatch(addHighlight({
      url: url,
      highlight: highlight1
    }))
    
    // Add second highlight
    const highlight2 = {
      id: 'highlight-2',
      text: 'Second highlight',
      color: 'green'
    }
    
    store.dispatch(addHighlight({
      url: url,
      highlight: highlight2
    }))
    
    // Verify both are in state
    const state = store.getState().highlights
    const highlights = state.byUrl[url]
    
    expect(highlights).toHaveLength(2)
    expect(highlights[0].id).toBe('highlight-1')
    expect(highlights[1].id).toBe('highlight-2')
  })

  it('should maintain separate highlights for different URLs', () => {
    const url1 = 'https://example.com/page1'
    const url2 = 'https://example.com/page2'
    
    // Add highlight to first URL
    store.dispatch(addHighlight({
      url: url1,
      highlight: {
        id: 'highlight-page1',
        text: 'Page 1 highlight',
        color: 'yellow'
      }
    }))
    
    // Add highlight to second URL
    store.dispatch(addHighlight({
      url: url2,
      highlight: {
        id: 'highlight-page2',
        text: 'Page 2 highlight',
        color: 'blue'
      }
    }))
    
    // Verify separate storage
    const state = store.getState().highlights
    
    expect(state.byUrl[url1]).toHaveLength(1)
    expect(state.byUrl[url2]).toHaveLength(1)
    expect(state.byUrl[url1][0].text).toBe('Page 1 highlight')
    expect(state.byUrl[url2][0].text).toBe('Page 2 highlight')
  })
})