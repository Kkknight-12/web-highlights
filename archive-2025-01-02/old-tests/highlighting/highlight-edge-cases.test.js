import { HighlightEngine } from './highlight-engine.js'
import { eventBus } from '../core/event-bus.js'
import { EVENTS } from '../core/events.js'
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

describe('Highlight Engine Edge Cases - Lists and Special Characters', () => {
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

  describe('List Highlighting Issues', () => {
    it('should highlight text within a single list item without breaking structure', () => {
      document.body.innerHTML = `
        <ul id="test-list">
          <li>First item in the list</li>
          <li>Second item in the list</li>
          <li>Third item in the list</li>
        </ul>
      `
      
      const firstLi = document.querySelector('li')
      const textNode = firstLi.firstChild
      
      // Select "First item"
      const range = document.createRange()
      range.setStart(textNode, 0)
      range.setEnd(textNode, 10)
      
      const selection = window.getSelection()
      selection.addRange(range)
      
      // Create highlight
      const highlight = highlightEngine.createHighlight('yellow', selection)
      
      // Verify highlight was created
      expect(highlight).not.toBeNull()
      expect(highlight.text).toBe('First item')
      
      // Verify list structure is intact
      const list = document.getElementById('test-list')
      expect(list.querySelectorAll('li')).toHaveLength(3)
      
      // Verify highlighted text is wrapped but still inside list item
      const highlightEl = document.querySelector('.web-highlighter-highlight')
      expect(highlightEl).not.toBeNull()
      expect(highlightEl.closest('li')).toBe(firstLi)
      expect(highlightEl.textContent).toBe('First item')
      
      // Verify rest of list item text is preserved
      expect(firstLi.textContent).toBe('First item in the list')
    })

    it('should handle highlighting across multiple list items', () => {
      document.body.innerHTML = `
        <ul>
          <li>First item</li>
          <li>Second item</li>
          <li>Third item</li>
        </ul>
      `
      
      const listItems = document.querySelectorAll('li')
      const firstText = listItems[0].firstChild
      const secondText = listItems[1].firstChild
      
      // Select from "First" to "Second"
      const range = document.createRange()
      range.setStart(firstText, 0)
      range.setEnd(secondText, 6)
      
      const selection = window.getSelection()
      selection.addRange(range)
      
      // Try to create highlight
      const highlight = highlightEngine.createHighlight('green', selection)
      
      // Multi-container highlights might not be implemented yet
      if (highlight === null) {
        // Verify it was detected as multi-container
        expect(highlightEngine.isMultiContainerSelection(range)).toBe(true)
      } else {
        // If implemented, verify it works correctly
        expect(highlight.text).toContain('First item')
        expect(highlight.text).toContain('Second')
      }
    })

    it('should highlight entire list item content', () => {
      document.body.innerHTML = `
        <ul>
          <li>Complete list item text</li>
        </ul>
      `
      
      const li = document.querySelector('li')
      const textNode = li.firstChild
      const range = document.createRange()
      range.selectNodeContents(textNode)
      
      const selection = window.getSelection()
      selection.addRange(range)
      
      const highlight = highlightEngine.createHighlight('blue', selection)
      
      expect(highlight).not.toBeNull()
      expect(highlight.text).toBe('Complete list item text')
      
      // Verify list structure remains intact
      expect(document.querySelectorAll('li')).toHaveLength(1)
      expect(li.querySelector('.web-highlighter-highlight')).not.toBeNull()
    })

    it('should handle nested list highlighting', () => {
      document.body.innerHTML = `
        <ul>
          <li>Parent item
            <ul>
              <li>Nested item 1</li>
              <li>Nested item 2</li>
            </ul>
          </li>
        </ul>
      `
      
      const nestedLi = document.querySelector('ul ul li')
      const textNode = nestedLi.firstChild
      
      const range = document.createRange()
      range.selectNodeContents(textNode)
      
      const selection = window.getSelection()
      selection.addRange(range)
      
      const highlight = highlightEngine.createHighlight('pink', selection)
      
      expect(highlight).not.toBeNull()
      expect(highlight.text).toBe('Nested item 1')
      
      // Verify nested structure is preserved
      expect(document.querySelectorAll('ul ul li')).toHaveLength(2)
    })
  })

  describe('Special Character Highlighting', () => {
    it('should highlight text containing colons', () => {
      document.body.innerHTML = '<p>Label: Value with colon</p>'
      const textNode = document.querySelector('p').firstChild
      
      // Select "Label: Value"
      const range = document.createRange()
      range.setStart(textNode, 0)
      range.setEnd(textNode, 12)
      
      const selection = window.getSelection()
      selection.addRange(range)
      
      const highlight = highlightEngine.createHighlight('yellow', selection)
      
      expect(highlight).not.toBeNull()
      expect(highlight.text).toBe('Label: Value')
      
      const highlightEl = document.querySelector('.web-highlighter-highlight')
      expect(highlightEl.textContent).toBe('Label: Value')
    })

    it('should highlight text with multiple special characters', () => {
      document.body.innerHTML = '<p>Price: $99.99 + 10% tax (estimated)</p>'
      const textNode = document.querySelector('p').firstChild
      
      const range = document.createRange()
      range.selectNodeContents(textNode)
      
      const selection = window.getSelection()
      selection.addRange(range)
      
      const highlight = highlightEngine.createHighlight('green', selection)
      
      expect(highlight).not.toBeNull()
      expect(highlight.text).toBe('Price: $99.99 + 10% tax (estimated)')
    })

    it('should highlight quoted text', () => {
      document.body.innerHTML = '<p>He said "Hello world" to everyone</p>'
      const textNode = document.querySelector('p').firstChild
      
      // Select just the quoted portion
      const range = document.createRange()
      range.setStart(textNode, 8)
      range.setEnd(textNode, 21)
      
      const selection = window.getSelection()
      selection.addRange(range)
      
      const highlight = highlightEngine.createHighlight('blue', selection)
      
      expect(highlight).not.toBeNull()
      expect(highlight.text).toBe('"Hello world"')
    })
  })

  describe('Complex DOM Structure Highlighting', () => {
    it('should handle list items with inline formatting', () => {
      document.body.innerHTML = `
        <ul>
          <li>Item with <strong>bold</strong> and <em>italic</em> text</li>
        </ul>
      `
      
      const li = document.querySelector('li')
      const range = document.createRange()
      range.selectNodeContents(li)
      
      const selection = window.getSelection()
      selection.addRange(range)
      
      const highlight = highlightEngine.createHighlight('yellow', selection)
      
      expect(highlight).not.toBeNull()
      expect(highlight.text).toBe('Item with bold and italic text')
      
      // Verify inline elements are preserved
      const highlightedStrong = li.querySelector('strong')
      const highlightedEm = li.querySelector('em')
      expect(highlightedStrong).not.toBeNull()
      expect(highlightedEm).not.toBeNull()
    })

    it('should handle empty list items gracefully', () => {
      document.body.innerHTML = `
        <ul>
          <li>Item 1</li>
          <li></li>
          <li>Item 3</li>
        </ul>
      `
      
      const thirdLi = document.querySelectorAll('li')[2]
      const textNode = thirdLi.firstChild
      
      const range = document.createRange()
      range.selectNodeContents(textNode)
      
      const selection = window.getSelection()
      selection.addRange(range)
      
      const highlight = highlightEngine.createHighlight('green', selection)
      
      expect(highlight).not.toBeNull()
      expect(highlight.text).toBe('Item 3')
      
      // Verify empty list item is not affected
      const emptyLi = document.querySelectorAll('li')[1]
      expect(emptyLi.textContent).toBe('')
    })

    it('should handle deeply nested structures', () => {
      document.body.innerHTML = `
        <div>
          <ul>
            <li>
              <div>
                <span>Deeply <code>nested</code> text</span>
              </div>
            </li>
          </ul>
        </div>
      `
      
      const span = document.querySelector('span')
      const range = document.createRange()
      range.selectNodeContents(span)
      
      const selection = window.getSelection()
      selection.addRange(range)
      
      const highlight = highlightEngine.createHighlight('pink', selection)
      
      expect(highlight).not.toBeNull()
      expect(highlight.text).toBe('Deeply nested text')
      
      // Verify structure is maintained
      expect(document.querySelector('ul li div span')).not.toBeNull()
      expect(document.querySelector('code')).not.toBeNull()
    })
  })

  describe('Highlight Deletion in Lists', () => {
    it('should delete highlight without breaking list structure', () => {
      // First create a highlight
      document.body.innerHTML = `
        <ul>
          <li>Item to highlight</li>
          <li>Another item</li>
        </ul>
      `
      
      const li = document.querySelector('li')
      const textNode = li.firstChild
      const range = document.createRange()
      range.setStart(textNode, 0)
      range.setEnd(textNode, 4) // "Item"
      
      const selection = window.getSelection()
      selection.addRange(range)
      
      const highlight = highlightEngine.createHighlight('yellow', selection)
      expect(highlight).not.toBeNull()
      
      // Now delete it
      const deleted = highlightEngine.deleteHighlight(highlight.id)
      expect(deleted).toBe(true)
      
      // Verify list structure is intact
      expect(document.querySelectorAll('li')).toHaveLength(2)
      expect(li.textContent).toBe('Item to highlight')
      
      // Verify highlight is gone
      expect(document.querySelector('.web-highlighter-highlight')).toBeNull()
    })
  })

  describe('Partial Word Selection in Lists', () => {
    it('should handle partial word selection in list items', () => {
      document.body.innerHTML = `
        <ul>
          <li>Partially selected word</li>
        </ul>
      `
      
      const li = document.querySelector('li')
      const textNode = li.firstChild
      
      // Select "artial" from "Partially"
      const range = document.createRange()
      range.setStart(textNode, 1)
      range.setEnd(textNode, 7)
      
      const selection = window.getSelection()
      selection.addRange(range)
      
      const highlight = highlightEngine.createHighlight('green', selection)
      
      expect(highlight).not.toBeNull()
      expect(highlight.text).toBe('artial')
      
      // Verify the word is split correctly
      expect(li.textContent).toBe('Partially selected word')
      const highlightEl = document.querySelector('.web-highlighter-highlight')
      expect(highlightEl.textContent).toBe('artial')
    })
  })
})