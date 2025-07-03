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

describe('TC-2.5: Highlight in Lists', () => {
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

  it('should highlight text within a single list item', () => {
    // Setup: Create a list
    document.body.innerHTML = `
      <ul>
        <li>First item in the list</li>
        <li>Second item in the list</li>
        <li>Third item in the list</li>
      </ul>
    `
    
    // Select text in first list item
    const firstLi = document.querySelector('li')
    const textNode = firstLi.firstChild
    
    const range = document.createRange()
    range.setStart(textNode, 0)
    range.setEnd(textNode, 10) // "First item"
    
    const selection = window.getSelection()
    selection.addRange(range)
    
    // Create highlight
    const highlight = highlightEngine.createHighlight('yellow', selection)
    
    // Verify highlight was created
    expect(highlight).not.toBeNull()
    expect(highlight.text).toBe('First item')
    
    // Verify list structure is preserved
    const ul = document.querySelector('ul')
    expect(ul).not.toBeNull()
    expect(ul.children).toHaveLength(3)
    
    // Verify the list item still exists and contains the highlight
    const highlightedLi = document.querySelector('li')
    expect(highlightedLi).not.toBeNull()
    expect(highlightedLi.querySelector('.web-highlighter-highlight')).not.toBeNull()
    
    // Verify list items remain as LI elements
    Array.from(ul.children).forEach(child => {
      expect(child.tagName).toBe('LI')
    })
  })

  it('should highlight entire list item content', () => {
    document.body.innerHTML = `
      <ol>
        <li>Complete list item text</li>
        <li>Another complete item</li>
      </ol>
    `
    
    // Select entire first list item text
    const firstLi = document.querySelector('li')
    const range = document.createRange()
    range.selectNodeContents(firstLi)
    
    const selection = window.getSelection()
    selection.addRange(range)
    
    // Create highlight
    const highlight = highlightEngine.createHighlight('green', selection)
    
    expect(highlight).not.toBeNull()
    expect(highlight.text).toBe('Complete list item text')
    
    // Verify list structure
    const ol = document.querySelector('ol')
    expect(ol.children).toHaveLength(2)
    
    // Verify highlighted content is still within LI
    const highlightElement = document.querySelector('.web-highlighter-highlight')
    expect(highlightElement.closest('li')).toBe(firstLi)
  })

  it('should handle highlighting across multiple list items', () => {
    document.body.innerHTML = `
      <ul>
        <li>First item text</li>
        <li>Second item text</li>
        <li>Third item text</li>
      </ul>
    `
    
    const listItems = document.querySelectorAll('li')
    
    // Select from middle of first item to middle of second item
    const firstTextNode = listItems[0].firstChild
    const secondTextNode = listItems[1].firstChild
    
    const range = document.createRange()
    range.setStart(firstTextNode, 6) // After "First "
    range.setEnd(secondTextNode, 6)   // After "Second"
    
    const selection = window.getSelection()
    selection.addRange(range)
    
    // Create highlight
    const highlight = highlightEngine.createHighlight('blue', selection)
    
    // Verify highlight was created
    expect(highlight).not.toBeNull()
    
    // Verify list structure is maintained
    const ul = document.querySelector('ul')
    expect(ul.children).toHaveLength(3)
    
    // All children should still be LI elements
    Array.from(ul.children).forEach(child => {
      expect(child.tagName).toBe('LI')
    })
    
    // Check that highlights exist
    const highlights = document.querySelectorAll('.web-highlighter-highlight')
    expect(highlights.length).toBeGreaterThan(0)
  })

  it('should preserve nested list structure', () => {
    document.body.innerHTML = `
      <ul>
        <li>Parent item
          <ul>
            <li>Nested item one</li>
            <li>Nested item two</li>
          </ul>
        </li>
        <li>Another parent</li>
      </ul>
    `
    
    // Select text in nested list item
    const nestedLi = document.querySelector('ul ul li')
    const textNode = nestedLi.firstChild
    
    const range = document.createRange()
    range.setStart(textNode, 0)
    range.setEnd(textNode, 6) // "Nested"
    
    const selection = window.getSelection()
    selection.addRange(range)
    
    // Create highlight
    const highlight = highlightEngine.createHighlight('pink', selection)
    
    expect(highlight).not.toBeNull()
    expect(highlight.text).toBe('Nested')
    
    // Verify nested structure is preserved
    const outerUl = document.querySelector('ul')
    const innerUl = document.querySelector('ul ul')
    
    expect(outerUl).not.toBeNull()
    expect(innerUl).not.toBeNull()
    expect(outerUl.children).toHaveLength(2)
    expect(innerUl.children).toHaveLength(2)
    
    // Verify highlight is in the correct nested position
    const highlightElement = document.querySelector('.web-highlighter-highlight')
    expect(highlightElement.closest('ul ul li')).toBe(nestedLi)
  })

  it('should handle mixed list types', () => {
    document.body.innerHTML = `
      <div>
        <ul>
          <li>Unordered item</li>
        </ul>
        <ol>
          <li>Ordered item</li>
        </ol>
        <dl>
          <dt>Definition term</dt>
          <dd>Definition description</dd>
        </dl>
      </div>
    `
    
    // Highlight in each list type
    const ulLi = document.querySelector('ul li')
    const olLi = document.querySelector('ol li')
    const dt = document.querySelector('dt')
    
    // Test UL
    let range = document.createRange()
    range.selectNodeContents(ulLi)
    let selection = window.getSelection()
    selection.removeAllRanges()
    selection.addRange(range)
    
    let highlight1 = highlightEngine.createHighlight('yellow', selection)
    expect(highlight1).not.toBeNull()
    
    // Test OL
    range = document.createRange()
    range.selectNodeContents(olLi)
    selection.removeAllRanges()
    selection.addRange(range)
    
    let highlight2 = highlightEngine.createHighlight('green', selection)
    expect(highlight2).not.toBeNull()
    
    // Test DL
    range = document.createRange()
    range.selectNodeContents(dt)
    selection.removeAllRanges()
    selection.addRange(range)
    
    let highlight3 = highlightEngine.createHighlight('blue', selection)
    expect(highlight3).not.toBeNull()
    
    // Verify all list structures are preserved
    expect(document.querySelector('ul')).not.toBeNull()
    expect(document.querySelector('ol')).not.toBeNull()
    expect(document.querySelector('dl')).not.toBeNull()
    
    // Verify highlights are in correct positions
    expect(document.querySelector('ul .web-highlighter-highlight')).not.toBeNull()
    expect(document.querySelector('ol .web-highlighter-highlight')).not.toBeNull()
    expect(document.querySelector('dt .web-highlighter-highlight')).not.toBeNull()
  })

  it('should maintain list item markers and numbering', () => {
    document.body.innerHTML = `
      <ol start="5">
        <li>Fifth item</li>
        <li>Sixth item</li>
        <li>Seventh item</li>
      </ol>
    `
    
    // Highlight second item
    const secondLi = document.querySelectorAll('li')[1]
    const range = document.createRange()
    range.selectNodeContents(secondLi)
    
    const selection = window.getSelection()
    selection.addRange(range)
    
    const highlight = highlightEngine.createHighlight('yellow', selection)
    expect(highlight).not.toBeNull()
    
    // Verify list still starts at 5
    const ol = document.querySelector('ol')
    expect(ol.getAttribute('start')).toBe('5')
    
    // Verify all items are still present
    expect(ol.children).toHaveLength(3)
    
    // List should still render with correct numbering (5, 6, 7)
    // Note: We can't directly test CSS numbering, but structure should be intact
  })

  it('should handle partial text selection within list items', () => {
    document.body.innerHTML = `
      <ul>
        <li>This is a longer list item with multiple words</li>
        <li>Another list item here</li>
      </ul>
    `
    
    // Select partial text "longer list item"
    const firstLi = document.querySelector('li')
    const textNode = firstLi.firstChild
    
    const range = document.createRange()
    range.setStart(textNode, 10) // After "This is a "
    range.setEnd(textNode, 26)   // Before " with multiple words"
    
    const selection = window.getSelection()
    selection.addRange(range)
    
    const highlight = highlightEngine.createHighlight('green', selection)
    
    expect(highlight).not.toBeNull()
    expect(highlight.text).toBe('longer list item')
    
    // Verify the list item still contains all text
    expect(firstLi.textContent).toBe('This is a longer list item with multiple words')
    
    // Verify highlight is within the list item
    const highlightElement = document.querySelector('.web-highlighter-highlight')
    expect(highlightElement.closest('li')).toBe(firstLi)
  })
})