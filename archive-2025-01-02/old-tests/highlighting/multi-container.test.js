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

describe('Multi-Container Selection (Cross-List Items)', () => {
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

  it('should highlight text across multiple list items', () => {
    document.body.innerHTML = `
      <ul>
        <li>First item in list</li>
        <li>Second item in list</li>
        <li>Third item in list</li>
      </ul>
    `
    
    const listItems = document.querySelectorAll('li')
    const firstText = listItems[0].firstChild
    const secondText = listItems[1].firstChild
    
    // Select from "First" to "Second"
    const range = document.createRange()
    range.setStart(firstText, 0)
    range.setEnd(secondText, 6) // "Second"
    
    const selection = window.getSelection()
    selection.addRange(range)
    
    // Create highlight
    const highlight = highlightEngine.createHighlight('yellow', selection)
    
    // Should create highlight successfully
    expect(highlight).not.toBeNull()
    expect(highlight.text).toContain('First item in list')
    expect(highlight.text).toContain('Second')
    
    // Verify DOM has highlights
    const highlightElements = document.querySelectorAll('.web-highlighter-highlight')
    expect(highlightElements.length).toBeGreaterThan(0)
    
    // Verify list structure is intact
    expect(document.querySelectorAll('li')).toHaveLength(3)
  })

  it('should highlight across all three list items', () => {
    document.body.innerHTML = `
      <ul>
        <li>Item A</li>
        <li>Item B</li>
        <li>Item C</li>
      </ul>
    `
    
    const listItems = document.querySelectorAll('li')
    const firstText = listItems[0].firstChild
    const thirdText = listItems[2].firstChild
    
    // Select from start of first to end of third
    const range = document.createRange()
    range.setStart(firstText, 0)
    range.setEnd(thirdText, 6) // End of "Item C"
    
    const selection = window.getSelection()
    selection.addRange(range)
    
    const highlight = highlightEngine.createHighlight('green', selection)
    
    expect(highlight).not.toBeNull()
    expect(highlight.text).toContain('Item A')
    expect(highlight.text).toContain('Item B')
    expect(highlight.text).toContain('Item C')
  })

  it('should handle partial selection across list items', () => {
    document.body.innerHTML = `
      <ul>
        <li>First long item text</li>
        <li>Second long item text</li>
      </ul>
    `
    
    const listItems = document.querySelectorAll('li')
    const firstText = listItems[0].firstChild
    const secondText = listItems[1].firstChild
    
    // Select from "long" in first item to "long" in second
    const range = document.createRange()
    range.setStart(firstText, 6) // After "First "
    range.setEnd(secondText, 11) // After "Second long"
    
    const selection = window.getSelection()
    selection.addRange(range)
    
    const highlight = highlightEngine.createHighlight('blue', selection)
    
    expect(highlight).not.toBeNull()
    expect(highlight.text).toContain('long item text')
    expect(highlight.text).toContain('Second long')
  })

  it('should highlight text with colons across list items', () => {
    document.body.innerHTML = `
      <ul>
        <li>Label: Value one</li>
        <li>Label: Value two</li>
        <li>Label: Value three</li>
      </ul>
    `
    
    const listItems = document.querySelectorAll('li')
    const firstText = listItems[0].firstChild
    const secondText = listItems[1].firstChild
    
    // Select including colons
    const range = document.createRange()
    range.setStart(firstText, 0)
    range.setEnd(secondText, 16) // End of second item
    
    const selection = window.getSelection()
    selection.addRange(range)
    
    const highlight = highlightEngine.createHighlight('pink', selection)
    
    expect(highlight).not.toBeNull()
    // Verify colons are included
    expect(highlight.text.match(/:/g).length).toBeGreaterThanOrEqual(2)
  })

  it('should handle selection across nested lists', () => {
    document.body.innerHTML = `
      <ul>
        <li>Parent item 1
          <ul>
            <li>Nested 1.1</li>
            <li>Nested 1.2</li>
          </ul>
        </li>
        <li>Parent item 2</li>
      </ul>
    `
    
    const parentItem1 = document.querySelector('li').firstChild
    const nestedItem = document.querySelector('ul ul li').firstChild
    
    // Select from parent to nested
    const range = document.createRange()
    range.setStart(parentItem1, 0) // Start of "Parent item 1"
    range.setEnd(nestedItem, 10) // End of "Nested 1.1"
    
    const selection = window.getSelection()
    selection.addRange(range)
    
    const highlight = highlightEngine.createHighlight('yellow', selection)
    
    expect(highlight).not.toBeNull()
    expect(highlight.text).toContain('Parent item 1')
    expect(highlight.text).toContain('Nested 1.1')
  })

  it('should preserve highlight IDs across multiple containers', () => {
    document.body.innerHTML = `
      <ul>
        <li>First item</li>
        <li>Second item</li>
      </ul>
    `
    
    const listItems = document.querySelectorAll('li')
    const firstText = listItems[0].firstChild
    const secondText = listItems[1].firstChild
    
    const range = document.createRange()
    range.setStart(firstText, 0)
    range.setEnd(secondText, 11)
    
    const selection = window.getSelection()
    selection.addRange(range)
    
    const highlight = highlightEngine.createHighlight('green', selection)
    
    // All highlight elements should have the same ID
    const highlightElements = document.querySelectorAll('.web-highlighter-highlight')
    const highlightIds = Array.from(highlightElements).map(el => el.dataset.highlightId)
    
    // All should have the same ID
    expect(new Set(highlightIds).size).toBe(1)
    expect(highlightIds[0]).toBe(highlight.id)
  })
})