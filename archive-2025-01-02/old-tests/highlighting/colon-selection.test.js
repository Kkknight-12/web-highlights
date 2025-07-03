import { HighlightEngine } from './highlight-engine.js'
import { getSelectionInfo } from '../ui/selection-handler.js'
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

describe('Colon and Special Character Selection Issues', () => {
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

  describe('Colon Selection Problems', () => {
    it('should select and highlight text containing colons', () => {
      document.body.innerHTML = '<p id="test">Name: John Doe</p>'
      const textNode = document.getElementById('test').firstChild
      
      // Select entire text including colon
      const range = document.createRange()
      range.selectNodeContents(textNode)
      
      const selection = window.getSelection()
      selection.addRange(range)
      
      // Verify selection includes colon
      expect(selection.toString()).toBe('Name: John Doe')
      
      // Get selection info
      const selectionInfo = getSelectionInfo()
      expect(selectionInfo).not.toBeNull()
      expect(selectionInfo.text).toBe('Name: John Doe')
      
      // Create highlight
      const highlight = highlightEngine.createHighlight('yellow', selection)
      expect(highlight).not.toBeNull()
      expect(highlight.text).toBe('Name: John Doe')
      
      // Verify DOM contains highlighted text with colon
      const highlightEl = document.querySelector('.web-highlighter-highlight')
      expect(highlightEl).not.toBeNull()
      expect(highlightEl.textContent).toBe('Name: John Doe')
    })

    it('should handle partial selection with colons', () => {
      document.body.innerHTML = '<p>Time: 10:30:45 AM</p>'
      const textNode = document.querySelector('p').firstChild
      
      // Select just the time part "10:30:45"
      const range = document.createRange()
      range.setStart(textNode, 6)  // After "Time: "
      range.setEnd(textNode, 14)   // Before " AM"
      
      const selection = window.getSelection()
      selection.addRange(range)
      
      expect(selection.toString()).toBe('10:30:45')
      
      const highlight = highlightEngine.createHighlight('green', selection)
      expect(highlight).not.toBeNull()
      expect(highlight.text).toBe('10:30:45')
    })

    it('should handle selection ending at colon', () => {
      document.body.innerHTML = '<p>Label: Value here</p>'
      const textNode = document.querySelector('p').firstChild
      
      // Select up to and including the colon
      const range = document.createRange()
      range.setStart(textNode, 0)
      range.setEnd(textNode, 6)  // "Label:"
      
      const selection = window.getSelection()
      selection.addRange(range)
      
      expect(selection.toString()).toBe('Label:')
      
      const highlight = highlightEngine.createHighlight('blue', selection)
      expect(highlight).not.toBeNull()
      expect(highlight.text).toBe('Label:')
    })

    it('should handle selection starting after colon', () => {
      document.body.innerHTML = '<p>Header: Content follows</p>'
      const textNode = document.querySelector('p').firstChild
      
      // Select text after the colon
      const range = document.createRange()
      range.setStart(textNode, 8)  // After "Header: "
      range.setEnd(textNode, 15)   // "Content"
      
      const selection = window.getSelection()
      selection.addRange(range)
      
      expect(selection.toString()).toBe('Content')
      
      const highlight = highlightEngine.createHighlight('pink', selection)
      expect(highlight).not.toBeNull()
      expect(highlight.text).toBe('Content')
    })

    it('should handle multiple colons in selection', () => {
      document.body.innerHTML = '<p>CSS rule: color: blue; font-size: 14px;</p>'
      const textNode = document.querySelector('p').firstChild
      
      // Select text with multiple colons
      const range = document.createRange()
      range.setStart(textNode, 0)
      range.setEnd(textNode, 22)  // Up to semicolon
      
      const selection = window.getSelection()
      selection.addRange(range)
      
      const selectedText = selection.toString()
      expect(selectedText).toBe('CSS rule: color: blue;')
      expect(selectedText.match(/:/g).length).toBe(2)  // Should have 2 colons
      
      const highlight = highlightEngine.createHighlight('yellow', selection)
      expect(highlight).not.toBeNull()
      expect(highlight.text).toBe('CSS rule: color: blue;')
    })
  })

  describe('List Items with Colons', () => {
    it('should handle colons in list items', () => {
      document.body.innerHTML = `
        <ul>
          <li>Item 1: Description one</li>
          <li>Item 2: Description two</li>
        </ul>
      `
      
      const firstLi = document.querySelector('li')
      const textNode = firstLi.firstChild
      
      const range = document.createRange()
      range.selectNodeContents(textNode)
      
      const selection = window.getSelection()
      selection.addRange(range)
      
      expect(selection.toString()).toBe('Item 1: Description one')
      
      const highlight = highlightEngine.createHighlight('yellow', selection)
      expect(highlight).not.toBeNull()
      expect(highlight.text).toBe('Item 1: Description one')
      
      // Verify list structure is intact
      expect(document.querySelectorAll('li')).toHaveLength(2)
    })

    it('should handle partial selection with colons in lists', () => {
      document.body.innerHTML = '<ul><li>Task: Complete by 5:00 PM</li></ul>'
      
      const li = document.querySelector('li')
      const textNode = li.firstChild
      
      // Select from "Complete" to include colon after 5
      const range = document.createRange()
      range.setStart(textNode, 6)   // After "Task: "
      range.setEnd(textNode, 20)    // After "5:" (position 20)
      
      const selection = window.getSelection()
      selection.addRange(range)
      
      const selectedText = selection.toString()
      
      // Verify it includes the colon after 5
      expect(selectedText).toBe('Complete by 5:')
      expect(selectedText).toContain(':')
      
      const highlight = highlightEngine.createHighlight('green', selection)
      expect(highlight).not.toBeNull()
      expect(highlight.text).toBe('Complete by 5:')
    })
  })

  describe('Special Character Combinations', () => {
    it('should handle colon with quotes', () => {
      document.body.innerHTML = '<p>He said: "Hello world"</p>'
      const textNode = document.querySelector('p').firstChild
      
      const range = document.createRange()
      range.selectNodeContents(textNode)
      
      const selection = window.getSelection()
      selection.addRange(range)
      
      expect(selection.toString()).toBe('He said: "Hello world"')
      
      const highlight = highlightEngine.createHighlight('blue', selection)
      expect(highlight).not.toBeNull()
      expect(highlight.text).toBe('He said: "Hello world"')
    })

    it('should handle URL-like text with colons', () => {
      document.body.innerHTML = '<p>Visit: https://example.com:8080</p>'
      const textNode = document.querySelector('p').firstChild
      
      const range = document.createRange()
      range.setStart(textNode, 7)  // After "Visit: "
      range.setEnd(textNode, 31)   // End of URL
      
      const selection = window.getSelection()
      selection.addRange(range)
      
      expect(selection.toString()).toBe('https://example.com:8080')
      
      const highlight = highlightEngine.createHighlight('pink', selection)
      expect(highlight).not.toBeNull()
      expect(highlight.text).toBe('https://example.com:8080')
    })
  })
})