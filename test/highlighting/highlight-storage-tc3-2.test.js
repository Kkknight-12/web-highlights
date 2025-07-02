import { HighlightStorage } from '../../src/content/highlighting/highlight-storage.js'
import { eventBus } from '../../src/content/core/event-bus.js'
import { EVENTS } from '../../src/content/core/events.js'
import { jest } from '@jest/globals'

// Mock chrome.storage API
global.chrome = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn()
    },
    onChanged: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    }
  },
  runtime: {
    lastError: null
  }
}

describe('TC-3.2: Chrome Storage Sync', () => {
  let highlightStorage
  
  beforeEach(() => {
    // Clear mocks
    chrome.storage.local.get.mockClear()
    chrome.storage.local.set.mockClear()
    
    // Mock successful storage operations with Promise-based API
    chrome.storage.local.get.mockImplementation((keys) => {
      return Promise.resolve({ highlights: {} })
    })
    
    chrome.storage.local.set.mockImplementation((data) => {
      return Promise.resolve()
    })
    
    // Create storage instance
    highlightStorage = new HighlightStorage()
    highlightStorage.init()
  })

  afterEach(() => {
    if (highlightStorage) {
      highlightStorage.destroy()
    }
  })

  it('should save highlight to chrome.storage.local when created', async () => {
    // Create a highlight (using localhost URL that jsdom provides)
    const highlight = {
      id: 'highlight-123',
      text: 'Test highlight',
      color: 'yellow',
      url: 'http://localhost/',
      timestamp: Date.now(),
      location: {
        container: { path: [0], tagName: 'p' },
        textIndex: 0,
        occurrence: 0
      }
    }
    
    // Emit highlight created event (this is what the actual code listens for)
    eventBus.emit(EVENTS.HIGHLIGHT.CREATED, highlight)
    
    // Give time for async operations
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Verify chrome.storage.set was called
    expect(chrome.storage.local.set).toHaveBeenCalled()
    
    // Get the data that was saved
    const savedData = chrome.storage.local.set.mock.calls[0][0]
    
    // Verify the structure
    expect(savedData).toHaveProperty('highlights')
    expect(savedData.highlights).toHaveProperty(highlight.url)
    expect(savedData.highlights[highlight.url]).toBeInstanceOf(Array)
    expect(savedData.highlights[highlight.url]).toHaveLength(1)
    
    // Verify the highlight data
    const savedHighlight = savedData.highlights[highlight.url][0]
    expect(savedHighlight.id).toBe(highlight.id)
    expect(savedHighlight.text).toBe(highlight.text)
    expect(savedHighlight.color).toBe(highlight.color)
    expect(savedHighlight.location).toEqual(highlight.location)
  })

  it('should append to existing highlights for the same URL', async () => {
    // Mock existing highlight
    chrome.storage.local.get.mockImplementation((keys) => {
      return Promise.resolve({
        highlights: {
          'http://localhost/': [{
            id: 'existing-highlight',
            text: 'Existing',
            color: 'green'
          }]
        }
      })
    })
    
    // Create new highlight
    const newHighlight = {
      id: 'new-highlight',
      text: 'New highlight',
      color: 'yellow',
      url: 'http://localhost/'
    }
    
    // Request save using HIGHLIGHT.CREATED event
    eventBus.emit(EVENTS.HIGHLIGHT.CREATED, newHighlight)
    
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Verify storage was updated
    expect(chrome.storage.local.set).toHaveBeenCalled()
    
    const savedData = chrome.storage.local.set.mock.calls[0][0]
    const urlHighlights = savedData.highlights['http://localhost/']
    
    // Should have both highlights
    expect(urlHighlights).toHaveLength(2)
    expect(urlHighlights[0].id).toBe('existing-highlight')
    expect(urlHighlights[1].id).toBe('new-highlight')
  })

  it('should handle deletion requests', async () => {
    // Mock existing highlights
    chrome.storage.local.get.mockImplementation((keys) => {
      return Promise.resolve({
        highlights: {
          'http://localhost/': [
            { id: 'highlight-1', text: 'First' },
            { id: 'highlight-2', text: 'Second' },
            { id: 'highlight-3', text: 'Third' }
          ]
        }
      })
    })
    
    // Request deletion using HIGHLIGHT.DELETED event
    eventBus.emit(EVENTS.HIGHLIGHT.DELETED, { 
      id: 'highlight-2'
    })
    
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Verify storage was updated
    expect(chrome.storage.local.set).toHaveBeenCalled()
    
    const savedData = chrome.storage.local.set.mock.calls[0][0]
    const urlHighlights = savedData.highlights['http://localhost/']
    
    // Should have 2 highlights (deleted one removed)
    expect(urlHighlights).toHaveLength(2)
    expect(urlHighlights.find(h => h.id === 'highlight-2')).toBeUndefined()
    expect(urlHighlights[0].id).toBe('highlight-1')
    expect(urlHighlights[1].id).toBe('highlight-3')
  })

  it('should handle color change updates', async () => {
    // Mock existing highlight
    chrome.storage.local.get.mockImplementation((keys) => {
      return Promise.resolve({
        highlights: {
          'http://localhost/': [{
            id: 'highlight-1',
            text: 'Test',
            color: 'yellow'
          }]
        }
      })
    })
    
    // Request color update using HIGHLIGHT.COLOR_CHANGED event
    eventBus.emit(EVENTS.HIGHLIGHT.COLOR_CHANGED, {
      id: 'highlight-1',
      newColor: 'green'
    })
    
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Verify storage was updated
    expect(chrome.storage.local.set).toHaveBeenCalled()
    
    const savedData = chrome.storage.local.set.mock.calls[0][0]
    const updatedHighlight = savedData.highlights['http://localhost/'][0]
    
    expect(updatedHighlight.id).toBe('highlight-1')
    expect(updatedHighlight.color).toBe('green')
    expect(updatedHighlight.text).toBe('Test') // Text should remain unchanged
  })

  it('should emit LOADED event after loading highlights', async () => {
    const loadedSpy = jest.fn()
    eventBus.on(EVENTS.STORAGE.LOADED, loadedSpy)
    
    // Mock stored highlights
    const mockHighlights = {
      'http://localhost/': [
        { id: 'h1', text: 'First' },
        { id: 'h2', text: 'Second' }
      ]
    }
    
    chrome.storage.local.get.mockImplementation((keys) => {
      return Promise.resolve({ highlights: mockHighlights })
    })
    
    // Request load
    eventBus.emit(EVENTS.STORAGE.LOAD_REQUESTED, { url: 'http://localhost/' })
    
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Verify loaded event was emitted
    expect(loadedSpy).toHaveBeenCalled()
    
    const eventData = loadedSpy.mock.calls[0][0].detail
    expect(eventData.url).toBe('http://localhost/')
    expect(eventData.highlights).toHaveLength(2)
    expect(eventData.highlights[0].id).toBe('h1')
    expect(eventData.highlights[1].id).toBe('h2')
    
    eventBus.off(EVENTS.STORAGE.LOADED, loadedSpy)
  })

  it('should handle storage errors gracefully', async () => {
    // Mock storage error
    chrome.storage.local.set.mockImplementation((data) => {
      chrome.runtime.lastError = { message: 'Storage quota exceeded' }
      return Promise.reject(new Error('Storage quota exceeded'))
    })
    
    const errorSpy = jest.fn()
    eventBus.on(EVENTS.STORAGE.SAVE_FAILED, errorSpy)
    
    // Try to save using HIGHLIGHT.CREATED event
    eventBus.emit(EVENTS.HIGHLIGHT.CREATED, {
      id: 'test', 
      text: 'Test',
      url: 'http://localhost/'
    })
    
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Should handle error gracefully
    expect(errorSpy).toHaveBeenCalled()
    expect(errorSpy.mock.calls[0][0].detail.error).toBe('Storage quota exceeded')
    
    // Clean up
    chrome.runtime.lastError = null
    eventBus.off(EVENTS.STORAGE.SAVE_FAILED, errorSpy)
  })
})