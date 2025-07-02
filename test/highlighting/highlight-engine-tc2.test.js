import { HighlightEngine } from '../../src/content/highlighting/highlight-engine.js'
import { eventBus } from '../../src/content/core/event-bus.js'
import { EVENTS } from '../../src/content/core/events.js'

describe('TC-2.1: Single Highlight', () => {
  let highlightEngine
  
  beforeEach(() => {
    // Clear DOM
    document.body.innerHTML = ''
    window.getSelection().removeAllRanges()
    
    // Mock getBoundingClientRect for Range
    if (!Range.prototype.getBoundingClientRect) {
      Range.prototype.getBoundingClientRect = function() {
        return {
          top: 100, left: 50, bottom: 120, right: 150,
          width: 100, height: 20, x: 50, y: 100
        }
      }
    }
    
    // Create highlight engine
    highlightEngine = new HighlightEngine()
    highlightEngine.init()
  })

  afterEach(() => {
    // Clean up
    highlightEngine.destroy()
  })

  it('should create a highlight with unique ID and default yellow color when "Hello" is selected', () => {
    // Setup: Create test content
    document.body.innerHTML = '<p id="test">Hello world</p>'
    const textNode = document.getElementById('test').firstChild
    
    // Action: Select "Hello"
    const range = document.createRange()
    range.setStart(textNode, 0)
    range.setEnd(textNode, 5) // "Hello"
    
    const selection = window.getSelection()
    selection.addRange(range)
    
    // Trigger highlight creation (simulate button click)
    const highlight = highlightEngine.createHighlight('yellow', selection)
    
    // Verify: Highlight was created
    expect(highlight).not.toBeNull()
    expect(highlight.id).toBeDefined()
    expect(highlight.id).toMatch(/^highlight-\d+-[a-z0-9]+$/) // Check ID format: highlight-timestamp-random
    expect(highlight.color).toBe('yellow')
    expect(highlight.text).toBe('Hello')
    
    // Verify: DOM was modified with highlight
    const highlightElements = document.querySelectorAll('.web-highlighter-highlight')
    expect(highlightElements.length).toBeGreaterThan(0)
    
    // Verify: Highlight element has correct attributes
    const highlightEl = highlightElements[0]
    expect(highlightEl.dataset.highlightId).toBe(highlight.id)
    expect(highlightEl.textContent).toBe('Hello')
  })

  it('should not create highlight when no text is selected', () => {
    document.body.innerHTML = '<p id="test">Hello world</p>'
    
    // No selection
    const highlight = highlightEngine.createHighlight('yellow')
    
    expect(highlight).toBeNull()
  })

  it('should handle color parameter correctly', () => {
    document.body.innerHTML = '<p id="test">Hello world</p>'
    const textNode = document.getElementById('test').firstChild
    
    // Select "world"
    const range = document.createRange()
    range.setStart(textNode, 6)
    range.setEnd(textNode, 11)
    
    const selection = window.getSelection()
    selection.addRange(range)
    
    // Create highlight with green color
    const highlight = highlightEngine.createHighlight('green', selection)
    
    expect(highlight).not.toBeNull()
    expect(highlight.color).toBe('green')
    expect(highlight.text).toBe('world')
  })
})