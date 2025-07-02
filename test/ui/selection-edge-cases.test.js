import { getSelectionInfo, isValidSelection } from './selection-handler.js'

// Mock getBoundingClientRect for Range objects (not implemented in jsdom)
if (!Range.prototype.getBoundingClientRect) {
  Range.prototype.getBoundingClientRect = function() {
    return {
      top: 100,
      left: 50,
      bottom: 120,
      right: 150,
      width: 100,
      height: 20,
      x: 50,
      y: 100
    }
  }
}

describe('Text Selection Edge Cases - Lists and Special Characters', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    window.getSelection().removeAllRanges()
  })

  describe('List Selection Issues', () => {
    it('should handle selection within a single list item', () => {
      document.body.innerHTML = `
        <ul>
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
      
      expect(selection.toString()).toBe('First item')
      expect(isValidSelection(selection)).toBe(true)
      
      const selectionInfo = getSelectionInfo()
      expect(selectionInfo).not.toBeNull()
      expect(selectionInfo.text).toBe('First item')
    })

    it('should handle selection across multiple list items', () => {
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
      range.setEnd(secondText, 6) // "Second"
      
      const selection = window.getSelection()
      selection.addRange(range)
      
      // This would typically include newlines between list items
      const selectedText = selection.toString()
      expect(selectedText).toContain('First item')
      expect(selectedText).toContain('Second')
      expect(isValidSelection(selection)).toBe(true)
      
      const selectionInfo = getSelectionInfo()
      expect(selectionInfo).not.toBeNull()
    })

    it('should handle selection of entire list item', () => {
      document.body.innerHTML = `
        <ul>
          <li>Complete list item text</li>
        </ul>
      `
      
      const li = document.querySelector('li')
      const range = document.createRange()
      range.selectNodeContents(li)
      
      const selection = window.getSelection()
      selection.addRange(range)
      
      expect(selection.toString()).toBe('Complete list item text')
      expect(isValidSelection(selection)).toBe(true)
    })

    it('should handle nested lists', () => {
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
      
      expect(selection.toString()).toBe('Nested item 1')
      expect(isValidSelection(selection)).toBe(true)
    })

    it('should handle ordered lists', () => {
      document.body.innerHTML = `
        <ol>
          <li>First ordered item</li>
          <li>Second ordered item</li>
        </ol>
      `
      
      const li = document.querySelector('li')
      const textNode = li.firstChild
      
      const range = document.createRange()
      range.setStart(textNode, 6) // After "First "
      range.setEnd(textNode, 13) // "ordered"
      
      const selection = window.getSelection()
      selection.addRange(range)
      
      expect(selection.toString()).toBe('ordered')
      expect(isValidSelection(selection)).toBe(true)
    })
  })

  describe('Special Character Issues', () => {
    it('should handle text with colons', () => {
      document.body.innerHTML = '<p>Label: Value with colon</p>'
      const textNode = document.querySelector('p').firstChild
      
      // Select "Label: Value"
      const range = document.createRange()
      range.setStart(textNode, 0)
      range.setEnd(textNode, 12)
      
      const selection = window.getSelection()
      selection.addRange(range)
      
      expect(selection.toString()).toBe('Label: Value')
      expect(isValidSelection(selection)).toBe(true)
      
      const selectionInfo = getSelectionInfo()
      expect(selectionInfo).not.toBeNull()
      expect(selectionInfo.text).toBe('Label: Value')
    })

    it('should handle text with multiple colons', () => {
      document.body.innerHTML = '<p>Time: 10:30:45 AM</p>'
      const textNode = document.querySelector('p').firstChild
      
      const range = document.createRange()
      range.selectNodeContents(textNode)
      
      const selection = window.getSelection()
      selection.addRange(range)
      
      expect(selection.toString()).toBe('Time: 10:30:45 AM')
      expect(isValidSelection(selection)).toBe(true)
    })

    it('should handle text with semicolons', () => {
      document.body.innerHTML = '<p>Item1; Item2; Item3</p>'
      const textNode = document.querySelector('p').firstChild
      
      // Select "Item1; Item2"
      const range = document.createRange()
      range.setStart(textNode, 0)
      range.setEnd(textNode, 12)
      
      const selection = window.getSelection()
      selection.addRange(range)
      
      expect(selection.toString()).toBe('Item1; Item2')
      expect(isValidSelection(selection)).toBe(true)
    })

    it('should handle text with quotes', () => {
      document.body.innerHTML = '<p>He said "Hello world" to everyone</p>'
      const textNode = document.querySelector('p').firstChild
      
      // Select quoted text
      const range = document.createRange()
      range.setStart(textNode, 8) // Start at first quote
      range.setEnd(textNode, 21) // End after last quote
      
      const selection = window.getSelection()
      selection.addRange(range)
      
      expect(selection.toString()).toBe('"Hello world"')
      expect(isValidSelection(selection)).toBe(true)
    })

    it('should handle text with parentheses', () => {
      document.body.innerHTML = '<p>Function (with parameters) works</p>'
      const textNode = document.querySelector('p').firstChild
      
      // Select text including parentheses
      const range = document.createRange()
      range.setStart(textNode, 9)
      range.setEnd(textNode, 26)
      
      const selection = window.getSelection()
      selection.addRange(range)
      
      expect(selection.toString()).toBe('(with parameters)')
      expect(isValidSelection(selection)).toBe(true)
    })

    it('should handle text with special symbols', () => {
      document.body.innerHTML = '<p>Price: $99.99 + 10% tax</p>'
      const textNode = document.querySelector('p').firstChild
      
      const range = document.createRange()
      range.selectNodeContents(textNode)
      
      const selection = window.getSelection()
      selection.addRange(range)
      
      expect(selection.toString()).toBe('Price: $99.99 + 10% tax')
      expect(isValidSelection(selection)).toBe(true)
    })
  })

  describe('Complex List Selection Scenarios', () => {
    it('should handle selection starting mid-item in first list item', () => {
      document.body.innerHTML = `
        <ul>
          <li>First long list item text</li>
          <li>Second list item</li>
        </ul>
      `
      
      const listItems = document.querySelectorAll('li')
      const firstText = listItems[0].firstChild
      const secondText = listItems[1].firstChild
      
      // Select from "long" in first item to "list" in second item
      const range = document.createRange()
      range.setStart(firstText, 6) // After "First "
      range.setEnd(secondText, 11) // After "Second list"
      
      const selection = window.getSelection()
      selection.addRange(range)
      
      const selectedText = selection.toString()
      expect(selectedText).toContain('long list item text')
      expect(selectedText).toContain('Second list')
      expect(isValidSelection(selection)).toBe(true)
    })

    it('should handle selection of non-adjacent list items', () => {
      document.body.innerHTML = `
        <ul>
          <li>Item 1</li>
          <li>Item 2</li>
          <li>Item 3</li>
          <li>Item 4</li>
        </ul>
      `
      
      const listItems = document.querySelectorAll('li')
      
      // Select from item 1 to item 3 (skipping item 2 visually but not in DOM)
      const range = document.createRange()
      range.setStart(listItems[0].firstChild, 0)
      range.setEnd(listItems[2].firstChild, 6)
      
      const selection = window.getSelection()
      selection.addRange(range)
      
      const selectedText = selection.toString()
      expect(selectedText).toContain('Item 1')
      expect(selectedText).toContain('Item 2') // Should include middle item
      expect(selectedText).toContain('Item 3')
      expect(isValidSelection(selection)).toBe(true)
    })

    it('should handle mixed list types', () => {
      document.body.innerHTML = `
        <ul>
          <li>Unordered item</li>
        </ul>
        <ol>
          <li>Ordered item</li>
        </ol>
      `
      
      const ulItem = document.querySelector('ul li').firstChild
      const olItem = document.querySelector('ol li').firstChild
      
      // Select across different list types
      const range = document.createRange()
      range.setStart(ulItem, 0)
      range.setEnd(olItem, 7) // "Ordered"
      
      const selection = window.getSelection()
      selection.addRange(range)
      
      const selectedText = selection.toString()
      expect(selectedText).toContain('Unordered item')
      expect(selectedText).toContain('Ordered')
      expect(isValidSelection(selection)).toBe(true)
    })

    it('should handle list items with inline elements', () => {
      document.body.innerHTML = `
        <ul>
          <li>Item with <strong>bold</strong> text</li>
          <li>Item with <em>italic</em> text</li>
        </ul>
      `
      
      const firstLi = document.querySelector('li')
      const range = document.createRange()
      range.selectNodeContents(firstLi)
      
      const selection = window.getSelection()
      selection.addRange(range)
      
      expect(selection.toString()).toBe('Item with bold text')
      expect(isValidSelection(selection)).toBe(true)
    })

    it('should handle definition lists', () => {
      document.body.innerHTML = `
        <dl>
          <dt>Term 1</dt>
          <dd>Definition 1</dd>
          <dt>Term 2</dt>
          <dd>Definition 2</dd>
        </dl>
      `
      
      const dt = document.querySelector('dt').firstChild
      const dd = document.querySelector('dd').firstChild
      
      // Select from term to definition
      const range = document.createRange()
      range.setStart(dt, 0)
      range.setEnd(dd, 10) // "Definition"
      
      const selection = window.getSelection()
      selection.addRange(range)
      
      const selectedText = selection.toString()
      expect(selectedText).toContain('Term 1')
      expect(selectedText).toContain('Definition')
      expect(isValidSelection(selection)).toBe(true)
    })
  })

  describe('Edge Cases That Break Selection', () => {
    it('should handle empty list items', () => {
      document.body.innerHTML = `
        <ul>
          <li>Item 1</li>
          <li></li>
          <li>Item 3</li>
        </ul>
      `
      
      const listItems = document.querySelectorAll('li')
      const firstText = listItems[0].firstChild
      const thirdText = listItems[2].firstChild
      
      // Select across empty list item
      const range = document.createRange()
      range.setStart(firstText, 0)
      range.setEnd(thirdText, 6)
      
      const selection = window.getSelection()
      selection.addRange(range)
      
      expect(isValidSelection(selection)).toBe(true)
    })

    it('should handle list items with only whitespace', () => {
      document.body.innerHTML = `
        <ul>
          <li>Item 1</li>
          <li>   </li>
          <li>Item 3</li>
        </ul>
      `
      
      const listItems = document.querySelectorAll('li')
      const firstText = listItems[0].firstChild
      const thirdText = listItems[2].firstChild
      
      const range = document.createRange()
      range.setStart(firstText, 0)
      range.setEnd(thirdText, 6)
      
      const selection = window.getSelection()
      selection.addRange(range)
      
      expect(isValidSelection(selection)).toBe(true)
    })

    it('should handle deeply nested structures', () => {
      document.body.innerHTML = `
        <ul>
          <li>
            <div>
              <span>
                <strong>Deeply nested text</strong>
              </span>
            </div>
          </li>
        </ul>
      `
      
      const textNode = document.querySelector('strong').firstChild
      const range = document.createRange()
      range.selectNodeContents(textNode)
      
      const selection = window.getSelection()
      selection.addRange(range)
      
      expect(selection.toString()).toBe('Deeply nested text')
      expect(isValidSelection(selection)).toBe(true)
    })

    it('should handle list items with code blocks', () => {
      document.body.innerHTML = `
        <ul>
          <li>Item with <code>inline code</code> here</li>
          <li>Another <code>code: example</code> item</li>
        </ul>
      `
      
      const firstLi = document.querySelector('li')
      const range = document.createRange()
      range.selectNodeContents(firstLi)
      
      const selection = window.getSelection()
      selection.addRange(range)
      
      expect(selection.toString()).toBe('Item with inline code here')
      expect(isValidSelection(selection)).toBe(true)
    })

    it('should handle RTL text in lists', () => {
      document.body.innerHTML = `
        <ul dir="rtl">
          <li>العربية</li>
          <li>עברית</li>
        </ul>
      `
      
      const firstLi = document.querySelector('li')
      const range = document.createRange()
      range.selectNodeContents(firstLi)
      
      const selection = window.getSelection()
      selection.addRange(range)
      
      expect(selection.toString()).toBe('العربية')
      expect(isValidSelection(selection)).toBe(true)
    })
  })
})