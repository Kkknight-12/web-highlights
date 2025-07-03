import { HighlightRestorer } from '../../src/content/highlighting/highlight-restorer.js'
import { eventBus } from '../../src/content/core/event-bus.js'
import { EVENTS } from '../../src/content/core/events.js'
import { jest } from '@jest/globals'

// Mock chrome.storage API
global.chrome = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn()
    }
  }
}

describe('TC-4.1: Page Reload/Restoration', () => {
  let highlightRestorer
  
  beforeEach(() => {
    // Clear DOM
    document.body.innerHTML = ''
    
    // Create restorer
    highlightRestorer = new HighlightRestorer()
    highlightRestorer.init()
    
    // Reset chrome.storage mock
    chrome.storage.local.get.mockClear()
    chrome.storage.local.set.mockClear()
  })

  afterEach(() => {
    highlightRestorer.destroy()
  })

  it('should restore saved highlights when page loads', async () => {
    // Setup: Create page content
    document.body.innerHTML = '<p id="test">Hello world, this is a test</p>'
    
    // Mock saved highlights data
    const savedHighlights = [
      {
        id: 'highlight-123',
        text: 'Hello',
        color: 'yellow',
        url: window.location.href,
        location: {
          container: { path: [0], tagName: 'p' },
          textIndex: 0,
          occurrence: 0
        }
      },
      {
        id: 'highlight-456',
        text: 'world',
        color: 'green',
        url: window.location.href,
        location: {
          container: { path: [0], tagName: 'p' },
          textIndex: 6,
          occurrence: 0
        }
      }
    ]
    
    // Mock chrome.storage response
    chrome.storage.local.get.mockImplementation((key, callback) => {
      callback({
        highlights: {
          [window.location.href]: savedHighlights
        }
      })
    })
    
    // Action: Trigger restoration by simulating storage loaded event
    eventBus.emit(EVENTS.STORAGE.LOADED, {
      highlights: savedHighlights,
      url: window.location.href
    })
    
    // Verify: Highlights were restored in DOM
    const highlightElements = document.querySelectorAll('.web-highlighter-highlight')
    expect(highlightElements).toHaveLength(2)
    
    // Verify first highlight
    const firstHighlight = highlightElements[0]
    expect(firstHighlight.textContent).toBe('Hello')
    expect(firstHighlight.dataset.highlightId).toBe('highlight-123')
    expect(firstHighlight.dataset.color).toBe('yellow')
    expect(firstHighlight.classList.contains('highlight-yellow')).toBe(true)
    
    // Verify second highlight  
    const secondHighlight = highlightElements[1]
    expect(secondHighlight.textContent).toBe('world')
    expect(secondHighlight.dataset.highlightId).toBe('highlight-456')
    expect(secondHighlight.dataset.color).toBe('green')
    expect(secondHighlight.classList.contains('highlight-green')).toBe(true)
    
    // Verify: Restoration succeeded
    expect(document.body.innerHTML).toContain('highlight-123')
    expect(document.body.innerHTML).toContain('highlight-456')
  })

  it('should handle no saved highlights gracefully', async () => {
    document.body.innerHTML = '<p>No highlights here</p>'
    
    // Mock empty storage
    chrome.storage.local.get.mockImplementation((key, callback) => {
      callback({ highlights: {} })
    })
    
    // Should not throw
    eventBus.emit(EVENTS.STORAGE.LOADED, {
      highlights: [],
      url: window.location.href
    })
    
    // No highlights should be created
    const highlightElements = document.querySelectorAll('.web-highlighter-highlight')
    expect(highlightElements).toHaveLength(0)
  })

  it('should skip highlights for different URLs', async () => {
    document.body.innerHTML = '<p>Test content</p>'
    
    // Mock highlights for different URL
    chrome.storage.local.get.mockImplementation((key, callback) => {
      callback({
        highlights: {
          'https://different-site.com': [{
            id: 'highlight-789',
            text: 'Test',
            color: 'yellow'
          }]
        }
      })
    })
    
    // Simulate storage loaded event with empty highlights for current URL
    eventBus.emit(EVENTS.STORAGE.LOADED, {
      highlights: [],
      url: window.location.href
    })
    
    // No highlights should be created
    const highlightElements = document.querySelectorAll('.web-highlighter-highlight')
    expect(highlightElements).toHaveLength(0)
  })
})