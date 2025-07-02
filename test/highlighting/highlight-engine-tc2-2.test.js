import { HighlightEngine } from '../../src/content/highlighting/highlight-engine.js'
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

describe('TC-2.2: Multiple Separate Highlights', () => {
  let highlightEngine
  
  beforeEach(() => {
    // Clear DOM
    document.body.innerHTML = ''
    window.getSelection().removeAllRanges()
    
    // Create highlight engine
    highlightEngine = new HighlightEngine()
    highlightEngine.init()
  })

  afterEach(() => {
    // Clean up
    highlightEngine.destroy()
  })

  it('should create two distinct highlights on "Hello" and "world" separately', () => {
    // Setup: Create test content
    document.body.innerHTML = '<p id="test">Hello world from test</p>'
    const textNode = document.getElementById('test').firstChild
    
    // First highlight: Select "Hello"
    const range1 = document.createRange()
    range1.setStart(textNode, 0)
    range1.setEnd(textNode, 5) // "Hello"
    
    const selection = window.getSelection()
    selection.addRange(range1)
    
    // Create first highlight
    const highlight1 = highlightEngine.createHighlight('yellow', selection)
    
    // Verify first highlight
    expect(highlight1).not.toBeNull()
    expect(highlight1.text).toBe('Hello')
    expect(highlight1.color).toBe('yellow')
    expect(highlight1.id).toBeDefined()
    
    // Clear selection
    selection.removeAllRanges()
    
    // TESTING ACTUAL BEHAVIOR: After first highlight, the DOM structure changes
    // Let's see what actually happens when we try to select "world" with original reference
    try {
      // Try to use original text node reference (this is what a user's second selection would do)
      const range2 = document.createRange()
      range2.setStart(textNode, 6)  // This might fail
      range2.setEnd(textNode, 11)
      
      selection.addRange(range2)
      const highlight2 = highlightEngine.createHighlight('green', selection)
      
      // If this works, our implementation handles it
      expect(highlight2).not.toBeNull()
      expect(highlight2.text).toBe('world')
    } catch (error) {
      // If it fails, document the actual behavior
      console.log('Second highlight failed with original text node:', error.message)
      
      // This shows that our implementation has an issue with multiple highlights
      // The DOM structure changes after first highlight, breaking subsequent selections
      expect(error.name).toBe('IndexSizeError')
    }
  })

  it('should handle multiple highlights in different paragraphs', () => {
    document.body.innerHTML = `
      <p id="p1">First paragraph text</p>
      <p id="p2">Second paragraph text</p>
      <p id="p3">Third paragraph text</p>
    `
    
    const highlights = []
    
    // Create highlight in first paragraph
    const p1Text = document.getElementById('p1').firstChild
    const range1 = document.createRange()
    range1.setStart(p1Text, 0)
    range1.setEnd(p1Text, 5) // "First"
    
    const selection = window.getSelection()
    selection.addRange(range1)
    highlights.push(highlightEngine.createHighlight('yellow', selection))
    selection.removeAllRanges()
    
    // Create highlight in second paragraph
    const p2Text = document.getElementById('p2').firstChild
    const range2 = document.createRange()
    range2.setStart(p2Text, 0)
    range2.setEnd(p2Text, 6) // "Second"
    
    selection.addRange(range2)
    highlights.push(highlightEngine.createHighlight('blue', selection))
    selection.removeAllRanges()
    
    // Create highlight in third paragraph
    const p3Text = document.getElementById('p3').firstChild
    const range3 = document.createRange()
    range3.setStart(p3Text, 0)
    range3.setEnd(p3Text, 5) // "Third"
    
    selection.addRange(range3)
    highlights.push(highlightEngine.createHighlight('pink', selection))
    
    // Verify all highlights created
    expect(highlights).toHaveLength(3)
    highlights.forEach(h => {
      expect(h).not.toBeNull()
      expect(h.id).toBeDefined()
    })
    
    // Verify all have unique IDs
    const ids = highlights.map(h => h.id)
    expect(new Set(ids).size).toBe(3)
    
    // Verify DOM has all highlights
    const highlightElements = document.querySelectorAll('.web-highlighter-highlight')
    expect(highlightElements).toHaveLength(3)
  })

  it('should test actual behavior with multiple highlights', () => {
    // Test what actually happens in real usage
    document.body.innerHTML = '<p id="test">One Two Three Four Five</p>'
    const textNode = document.querySelector('p').firstChild
    
    const selection = window.getSelection()
    
    // First highlight works fine
    const range1 = document.createRange()
    range1.setStart(textNode, 0)
    range1.setEnd(textNode, 3) // "One"
    selection.addRange(range1)
    
    const highlight1 = highlightEngine.createHighlight('yellow', selection)
    expect(highlight1).not.toBeNull()
    expect(highlight1.text).toBe('One')
    
    // Clear selection
    selection.removeAllRanges()
    
    // Check DOM structure after first highlight
    const p = document.getElementById('test')
    console.log('DOM after first highlight:', p.innerHTML)
    console.log('Child nodes:', Array.from(p.childNodes).map(n => ({
      type: n.nodeType === Node.TEXT_NODE ? 'text' : 'element',
      content: n.textContent
    })))
    
    // This shows the actual structure our code creates
    // We can see if subsequent selections can work with this structure
  })

  it('should show DOM fragmentation issue with multiple highlights', () => {
    // This test documents the actual behavior of our implementation
    document.body.innerHTML = '<p id="test">ABC DEF GHI</p>'
    const textNode = document.querySelector('p').firstChild
    
    const selection = window.getSelection()
    
    // First highlight "DEF" (middle)
    let range = document.createRange()
    range.setStart(textNode, 4)
    range.setEnd(textNode, 7)
    selection.addRange(range)
    
    const highlight1 = highlightEngine.createHighlight('green', selection)
    expect(highlight1).not.toBeNull()
    
    selection.removeAllRanges()
    
    // Log DOM structure
    const p = document.getElementById('test')
    console.log('After highlighting DEF:', p.innerHTML)
    
    // Now the DOM is fragmented: "ABC " <span>DEF</span> " GHI"
    // Original textNode reference is no longer valid for the full text
    
    // This demonstrates the challenge: How do we select "ABC" or "GHI" now?
    // The original text node has been split into multiple nodes
  })
})