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

describe('TC-2.2: Multiple Separate Highlights - Real World Usage', () => {
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

  it('should create multiple highlights as a user would in real usage', () => {
    // Setup: Create test content
    document.body.innerHTML = '<p id="test">Hello world from test</p>'
    
    // First selection: User selects "Hello"
    const p = document.getElementById('test')
    const selection = window.getSelection()
    
    // User selects "Hello"
    const range1 = document.createRange()
    range1.setStart(p.firstChild, 0)
    range1.setEnd(p.firstChild, 5)
    selection.addRange(range1)
    
    // User clicks highlight button
    const highlight1 = highlightEngine.createHighlight('yellow', selection)
    
    // Verify first highlight
    expect(highlight1).not.toBeNull()
    expect(highlight1.text).toBe('Hello')
    
    // User clears selection (clicks elsewhere)
    selection.removeAllRanges()
    
    // Now DOM has changed - let's see current structure
    console.log('DOM after first highlight:', p.innerHTML)
    console.log('Child nodes count:', p.childNodes.length)
    
    // Second selection: User selects "world"
    // In real usage, browser would give us the correct text node
    // Let's simulate what browser does - find the text node containing "world"
    
    let worldTextNode = null
    for (let i = 0; i < p.childNodes.length; i++) {
      const node = p.childNodes[i]
      if (node.nodeType === Node.TEXT_NODE && node.textContent.includes('world')) {
        worldTextNode = node
        break
      }
    }
    
    if (worldTextNode) {
      const worldIndex = worldTextNode.textContent.indexOf('world')
      const range2 = document.createRange()
      range2.setStart(worldTextNode, worldIndex)
      range2.setEnd(worldTextNode, worldIndex + 5)
      selection.addRange(range2)
      
      // User clicks highlight button again
      const highlight2 = highlightEngine.createHighlight('green', selection)
      
      // Verify second highlight
      expect(highlight2).not.toBeNull()
      expect(highlight2.text).toBe('world')
      
      // Verify both highlights exist
      const allHighlights = p.querySelectorAll('.web-highlighter-highlight')
      expect(allHighlights).toHaveLength(2)
      
      // Verify each has correct text
      const yellowHighlight = p.querySelector('[data-color="yellow"]')
      const greenHighlight = p.querySelector('[data-color="green"]')
      expect(yellowHighlight.textContent).toBe('Hello')
      expect(greenHighlight.textContent).toBe('world')
    } else {
      // If we can't find the text node, it means our implementation
      // has an issue with DOM structure after highlighting
      fail('Could not find text node containing "world" after first highlight')
    }
  })

  it('should handle multiple highlights in a list', () => {
    // Real world scenario: highlighting items in a list
    document.body.innerHTML = `
      <ul>
        <li>First item to highlight</li>
        <li>Second item to highlight</li>
        <li>Third item to highlight</li>
      </ul>
    `
    
    const selection = window.getSelection()
    const listItems = document.querySelectorAll('li')
    
    // User highlights "First" in first item
    const firstLi = listItems[0]
    const range1 = document.createRange()
    range1.setStart(firstLi.firstChild, 0)
    range1.setEnd(firstLi.firstChild, 5)
    selection.addRange(range1)
    
    const highlight1 = highlightEngine.createHighlight('yellow', selection)
    expect(highlight1).not.toBeNull()
    expect(highlight1.text).toBe('First')
    
    selection.removeAllRanges()
    
    // User highlights "Second" in second item (different list item)
    const secondLi = listItems[1]
    const range2 = document.createRange()
    range2.setStart(secondLi.firstChild, 0)
    range2.setEnd(secondLi.firstChild, 6)
    selection.addRange(range2)
    
    const highlight2 = highlightEngine.createHighlight('green', selection)
    expect(highlight2).not.toBeNull()
    expect(highlight2.text).toBe('Second')
    
    // Verify both highlights exist
    const allHighlights = document.querySelectorAll('.web-highlighter-highlight')
    expect(allHighlights).toHaveLength(2)
    
    // Verify list structure is intact
    expect(document.querySelectorAll('li')).toHaveLength(3)
  })

  it('should handle multiple highlights in same paragraph with real selection behavior', () => {
    // This tests the actual issue: can we create multiple highlights
    // in the same text node after DOM fragmentation?
    
    document.body.innerHTML = '<p id="test">The quick brown fox jumps over the lazy dog</p>'
    const p = document.getElementById('test')
    const selection = window.getSelection()
    
    // Highlight "quick"
    let range = document.createRange()
    range.setStart(p.firstChild, 4)
    range.setEnd(p.firstChild, 9)
    selection.addRange(range)
    
    const highlight1 = highlightEngine.createHighlight('yellow', selection)
    expect(highlight1).not.toBeNull()
    selection.removeAllRanges()
    
    // Log DOM structure
    console.log('After first highlight:', p.innerHTML)
    
    // Now try to highlight "fox" - need to find the right text node
    let foxNode = null
    for (let node of p.childNodes) {
      if (node.nodeType === Node.TEXT_NODE && node.textContent.includes('fox')) {
        foxNode = node
        break
      }
    }
    
    if (foxNode) {
      const foxIndex = foxNode.textContent.indexOf('fox')
      range = document.createRange()
      range.setStart(foxNode, foxIndex)
      range.setEnd(foxNode, foxIndex + 3)
      selection.addRange(range)
      
      const highlight2 = highlightEngine.createHighlight('green', selection)
      expect(highlight2).not.toBeNull()
      expect(highlight2.text).toBe('fox')
      
      // Verify both highlights exist
      expect(p.querySelectorAll('.web-highlighter-highlight')).toHaveLength(2)
    } else {
      fail('Could not find text node containing "fox"')
    }
  })
})