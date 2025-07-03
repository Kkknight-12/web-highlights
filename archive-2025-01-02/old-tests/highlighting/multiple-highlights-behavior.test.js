import { HighlightEngine } from '../../src/content/highlighting/highlight-engine.js'
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

describe('Multiple Highlights Behavior - Actual Implementation', () => {
  let highlightEngine
  
  beforeEach(() => {
    document.body.innerHTML = ''
    window.getSelection().removeAllRanges()
    
    highlightEngine = new HighlightEngine()
    highlightEngine.init()
  })

  afterEach(() => {
    highlightEngine.destroy()
  })

  it('documents DOM fragmentation after highlighting', () => {
    document.body.innerHTML = '<p id="test">Hello world</p>'
    const p = document.getElementById('test')
    const originalTextNode = p.firstChild
    
    // Before any highlights
    expect(p.childNodes.length).toBe(1)
    expect(originalTextNode.textContent).toBe('Hello world')
    
    // Highlight "Hello"
    const range = document.createRange()
    range.setStart(originalTextNode, 0)
    range.setEnd(originalTextNode, 5)
    
    const selection = window.getSelection()
    selection.addRange(range)
    
    const highlight = highlightEngine.createHighlight('yellow', selection)
    expect(highlight).not.toBeNull()
    
    // After highlighting, DOM structure changes
    expect(p.childNodes.length).toBe(3) // Empty text, span, remaining text
    
    // Original text node reference is now only " world"
    const remainingTextNode = p.childNodes[2]
    expect(remainingTextNode.textContent).toBe(' world')
    
    // The highlighted text is wrapped in a span
    const highlightSpan = p.childNodes[1]
    expect(highlightSpan.tagName).toBe('SPAN')
    expect(highlightSpan.textContent).toBe('Hello')
  })

  it('shows how browser selection works with fragmented DOM', () => {
    document.body.innerHTML = '<p id="test">ABC DEF GHI</p>'
    
    // First highlight "DEF"
    const p = document.getElementById('test')
    let range = document.createRange()
    range.setStart(p.firstChild, 4)
    range.setEnd(p.firstChild, 7)
    
    const selection = window.getSelection()
    selection.addRange(range)
    
    highlightEngine.createHighlight('yellow', selection)
    selection.removeAllRanges()
    
    // Now DOM is: "ABC " <span>DEF</span> " GHI"
    
    // In a real browser, when user selects "ABC", the browser creates a range
    // that properly references the first text node
    const firstTextNode = p.childNodes[0]
    expect(firstTextNode.textContent).toBe('ABC ')
    
    // We can highlight "ABC" by using the correct text node
    range = document.createRange()
    range.setStart(firstTextNode, 0)
    range.setEnd(firstTextNode, 3)
    selection.addRange(range)
    
    const highlight2 = highlightEngine.createHighlight('green', selection)
    expect(highlight2).not.toBeNull()
    expect(highlight2.text).toBe('ABC')
  })

  it('demonstrates the real issue: programmatic selection after DOM changes', () => {
    // The real issue is when we try to programmatically create selections
    // using stored offsets after the DOM has changed
    
    document.body.innerHTML = '<p id="test">Hello world example</p>'
    const p = document.getElementById('test')
    
    // Store original positions
    const worldStart = 6
    const worldEnd = 11
    
    // Highlight "Hello"
    let range = document.createRange()
    range.setStart(p.firstChild, 0)
    range.setEnd(p.firstChild, 5)
    
    const selection = window.getSelection()
    selection.addRange(range)
    highlightEngine.createHighlight('yellow', selection)
    selection.removeAllRanges()
    
    // Now if we try to use the stored positions with the original node reference
    try {
      range = document.createRange()
      range.setStart(p.firstChild, worldStart) // This will fail!
      range.setEnd(p.firstChild, worldEnd)
    } catch (error) {
      expect(error.name).toBe('IndexSizeError')
      
      // This is the core issue: stored positions become invalid
      // after DOM modifications
    }
  })

  it('shows how real browser selection works correctly', () => {
    // When a user manually selects text in the browser,
    // the browser automatically handles the fragmented DOM
    
    document.body.innerHTML = '<p id="test">One Two Three</p>'
    
    // Highlight "Two"
    const p = document.getElementById('test')
    const range = document.createRange()
    range.setStart(p.firstChild, 4)
    range.setEnd(p.firstChild, 7)
    
    const selection = window.getSelection()
    selection.addRange(range)
    highlightEngine.createHighlight('yellow', selection)
    selection.removeAllRanges()
    
    // DOM is now: "One " <span>Two</span> " Three"
    expect(p.childNodes.length).toBe(3)
    
    // When user selects "Three", browser gives us the correct text node
    const lastTextNode = p.childNodes[2]
    expect(lastTextNode.textContent).toBe(' Three')
    
    // We can highlight it correctly
    const range2 = document.createRange()
    range2.setStart(lastTextNode, 1) // Skip the space
    range2.setEnd(lastTextNode, 6)
    selection.addRange(range2)
    
    const highlight2 = highlightEngine.createHighlight('green', selection)
    expect(highlight2).not.toBeNull()
    expect(highlight2.text).toBe('Three')
    
    // Both highlights exist
    expect(p.querySelectorAll('.web-highlighter-highlight').length).toBe(2)
  })
})