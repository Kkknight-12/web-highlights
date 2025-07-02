import { HighlightEngine } from '../../src/content/highlighting/highlight-engine.js'
import { HighlightStorage } from '../../src/content/highlighting/highlight-storage.js'
import { eventBus } from '../../src/content/core/event-bus.js'
import { EVENTS } from '../../src/content/core/events.js'
import { jest } from '@jest/globals'

// Mock getBoundingClientRect for Range
if (!Range.prototype.getBoundingClientRect) {
  Range.prototype.getBoundingClientRect = function() {
    return {
      top: 100, left: 50, bottom: 120, right: 150,
      width: 100, height: 20, x: 50, y: 100
    }
  }
}

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

describe('TC-2.4: Color Selection', () => {
  let highlightEngine
  let highlightStorage
  
  beforeEach(() => {
    // Clear DOM
    document.body.innerHTML = ''
    window.getSelection().removeAllRanges()
    
    // Clear mocks
    chrome.storage.local.get.mockClear()
    chrome.storage.local.set.mockClear()
    
    // Mock successful storage operations
    chrome.storage.local.get.mockImplementation(() => Promise.resolve({ highlights: {} }))
    chrome.storage.local.set.mockImplementation(() => Promise.resolve())
    
    // Initialize components
    highlightEngine = new HighlightEngine()
    highlightEngine.init()
    
    highlightStorage = new HighlightStorage()
    highlightStorage.init()
  })

  afterEach(() => {
    highlightEngine.destroy()
    highlightStorage.destroy()
  })

  it('should create highlight with yellow color by default', async () => {
    // Setup content
    document.body.innerHTML = '<p id="test">Test text for highlighting</p>'
    const p = document.getElementById('test')
    
    // Select text
    const range = document.createRange()
    range.selectNodeContents(p.firstChild)
    const selection = window.getSelection()
    selection.addRange(range)
    
    // Create highlight through event (to trigger storage)
    eventBus.emit(EVENTS.HIGHLIGHT.CREATE_REQUESTED, { selection })
    
    // Wait a bit for event processing
    await new Promise(resolve => setTimeout(resolve, 50))
    
    // Verify default color is yellow
    const highlightElement = document.querySelector('.web-highlighter-highlight')
    expect(highlightElement).not.toBeNull()
    expect(highlightElement.dataset.color).toBe('yellow')
    
    // Verify storage was called
    expect(chrome.storage.local.set).toHaveBeenCalled()
  })

  it('should create highlight with specified color', async () => {
    // Setup content
    document.body.innerHTML = '<p id="test">Text to highlight in green</p>'
    const p = document.getElementById('test')
    
    // Select text
    const range = document.createRange()
    range.selectNodeContents(p.firstChild)
    const selection = window.getSelection()
    selection.addRange(range)
    
    // Create highlight through event
    eventBus.emit(EVENTS.HIGHLIGHT.CREATE_REQUESTED, { color: 'green', selection })
    
    // Wait for event processing
    await new Promise(resolve => setTimeout(resolve, 50))
    
    // Check DOM element has correct color
    const highlightElement = document.querySelector('.web-highlighter-highlight')
    expect(highlightElement).not.toBeNull()
    expect(highlightElement.dataset.color).toBe('green')
  })

  it('should support all predefined colors', async () => {
    const colors = ['yellow', 'green', 'blue', 'pink']
    
    for (const [index, color] of colors.entries()) {
      // Reset DOM for each test
      document.body.innerHTML = `<p id="test-${index}">Text for ${color}</p>`
      const p = document.getElementById(`test-${index}`)
      
      // Select and highlight
      const range = document.createRange()
      range.selectNodeContents(p.firstChild)
      const selection = window.getSelection()
      selection.removeAllRanges()
      selection.addRange(range)
      
      // Create highlight through event
      eventBus.emit(EVENTS.HIGHLIGHT.CREATE_REQUESTED, { color, selection })
      
      // Wait for event processing
      await new Promise(resolve => setTimeout(resolve, 50))
      
      const highlightElement = p.querySelector('.web-highlighter-highlight')
      expect(highlightElement.dataset.color).toBe(color)
    }
  })

  it('should save color information to storage', async () => {
    // Setup content
    document.body.innerHTML = '<p>Save this highlight in blue</p>'
    const p = document.querySelector('p')
    
    // Select text
    const range = document.createRange()
    range.selectNodeContents(p.firstChild)
    const selection = window.getSelection()
    selection.addRange(range)
    
    // Create blue highlight through event
    eventBus.emit(EVENTS.HIGHLIGHT.CREATE_REQUESTED, { color: 'blue', selection })
    
    // Wait for storage save
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Verify storage was called
    expect(chrome.storage.local.set).toHaveBeenCalled()
    
    // Check saved data includes color
    const savedData = chrome.storage.local.set.mock.calls[0][0]
    const savedHighlights = savedData.highlights['http://localhost/']
    expect(savedHighlights).toBeDefined()
    expect(savedHighlights[0].color).toBe('blue')
  })

  it.skip('should restore highlights with correct colors', async () => {
    // Skip this test - restoration is tested in TC-4.1
    // This test case (TC-2.4) should focus on color selection during creation
    // Mock stored highlights with different colors
    const mockHighlights = {
      'http://localhost/': [
        {
          id: 'h1',
          text: 'Yellow text',
          color: 'yellow',
          location: {
            container: { path: [0, 0], tagName: 'p' },
            textIndex: 0,
            occurrence: 0
          }
        },
        {
          id: 'h2',
          text: 'Green text',
          color: 'green',
          location: {
            container: { path: [0, 1], tagName: 'p' },
            textIndex: 0,
            occurrence: 0
          }
        }
      ]
    }
    
    chrome.storage.local.get.mockImplementation(() => 
      Promise.resolve({ highlights: mockHighlights })
    )
    
    // Setup DOM matching the stored highlights
    document.body.innerHTML = `
      <div>
        <p>Yellow text here</p>
        <p>Green text here</p>
      </div>
    `
    
    // Simulate storage load completed
    eventBus.emit(EVENTS.STORAGE.LOADED, {
      url: 'http://localhost/',
      highlights: mockHighlights['http://localhost/']
    })
    
    // Wait for restoration
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Check highlights were restored with correct colors
    const highlights = document.querySelectorAll('.web-highlighter-highlight')
    expect(highlights).toHaveLength(2)
    
    // Verify each highlight has the correct color
    const yellowHighlight = Array.from(highlights).find(h => h.textContent.includes('Yellow'))
    const greenHighlight = Array.from(highlights).find(h => h.textContent.includes('Green'))
    
    expect(yellowHighlight).toBeDefined()
    expect(yellowHighlight.dataset.color).toBe('yellow')
    
    expect(greenHighlight).toBeDefined()
    expect(greenHighlight.dataset.color).toBe('green')
  })

  it('should handle color change events', async () => {
    // Setup content and create initial highlight
    document.body.innerHTML = '<p id="test">Change my color</p>'
    const p = document.getElementById('test')
    
    // Select and highlight in yellow
    const range = document.createRange()
    range.selectNodeContents(p.firstChild)
    const selection = window.getSelection()
    selection.addRange(range)
    
    // Create highlight through event
    eventBus.emit(EVENTS.HIGHLIGHT.CREATE_REQUESTED, { color: 'yellow', selection })
    
    // Wait for event processing
    await new Promise(resolve => setTimeout(resolve, 50))
    
    // Get the saved highlight data from the first storage call
    const firstSaveData = chrome.storage.local.set.mock.calls[0][0]
    const savedHighlight = firstSaveData.highlights['http://localhost/'][0]
    const highlightId = savedHighlight.id
    
    // Mock storage to return the highlight we just created
    chrome.storage.local.get.mockImplementation(() => 
      Promise.resolve({ 
        highlights: { 
          'http://localhost/': [savedHighlight] 
        } 
      })
    )
    
    // Clear selection
    selection.removeAllRanges()
    
    // Emit color change event
    eventBus.emit(EVENTS.HIGHLIGHT.COLOR_CHANGED, {
      id: highlightId,
      newColor: 'purple'
    })
    
    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Verify storage was updated at least twice (creation + color change)
    expect(chrome.storage.local.set.mock.calls.length).toBeGreaterThanOrEqual(2)
    
    // Check the most recent storage call (should be the color update)
    const lastCallIndex = chrome.storage.local.set.mock.calls.length - 1
    const savedData = chrome.storage.local.set.mock.calls[lastCallIndex][0]
    
    if (savedData && savedData.highlights) {
      const highlights = savedData.highlights['http://localhost/']
      if (highlights && highlights.length > 0) {
        // Find the highlight with our ID
        const updatedHighlight = highlights.find(h => h.id === highlightId)
        expect(updatedHighlight).toBeDefined()
        expect(updatedHighlight.color).toBe('purple')
      }
    }
  })
})