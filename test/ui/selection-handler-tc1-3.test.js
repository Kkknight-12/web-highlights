import { getSelectionInfo, isValidSelection } from '../../src/content/ui/selection-handler.js'

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

describe('TC-1.3: Cross-Element Selection', () => {
  beforeEach(() => {
    // Clear DOM
    document.body.innerHTML = ''
    window.getSelection().removeAllRanges()
  })

  it('should detect selection across strong and em tags', () => {
    // Setup: Create test content with nested HTML
    document.body.innerHTML = '<p id="test">This is <strong>bold</strong> and <em>italic</em> text</p>'
    const p = document.getElementById('test')
    
    // We need to select from "bold" to "italic" (across elements)
    // The structure is:
    // - Text node: "This is "
    // - Strong element with text node: "bold"
    // - Text node: " and "
    // - Em element with text node: "italic"
    // - Text node: " text"
    
    const strongText = p.querySelector('strong').firstChild  // "bold" text node
    const emText = p.querySelector('em').firstChild         // "italic" text node
    
    // Action: Select from "bold" to "italic" (cross-element)
    const range = document.createRange()
    range.setStart(strongText, 0)  // Start at beginning of "bold"
    range.setEnd(emText, 6)        // End after "italic"
    
    const selection = window.getSelection()
    selection.addRange(range)
    
    // Verify: Selection is valid and captures all text
    expect(selection.toString()).toBe('bold and italic')
    expect(isValidSelection(selection)).toBe(true)
    
    // Get selection info
    const selectionInfo = getSelectionInfo()
    
    // Verify: Selection info is correct
    expect(selectionInfo).not.toBeNull()
    expect(selectionInfo.text).toBe('bold and italic')
    expect(selectionInfo.rect).toBeDefined()
    expect(selectionInfo.range).toBeDefined()
  })

  it('should handle selection across multiple nested elements', () => {
    // More complex nested structure
    document.body.innerHTML = `
      <div id="test">
        <p>Start <span>with <strong>nested</strong></span> <em>elements</em> here</p>
      </div>
    `
    
    const div = document.getElementById('test')
    const p = div.querySelector('p')
    
    // Select from "Start" to "elements"
    const startText = p.firstChild  // "Start " text node
    const emText = p.querySelector('em').firstChild  // "elements" text node
    
    const range = document.createRange()
    range.setStart(startText, 0)  // Start at "Start"
    range.setEnd(emText, 8)       // End after "elements"
    
    const selection = window.getSelection()
    selection.addRange(range)
    
    // Verify selection captures all text including nested
    expect(selection.toString()).toBe('Start with nested elements')
    expect(isValidSelection(selection)).toBe(true)
    
    const selectionInfo = getSelectionInfo()
    expect(selectionInfo.text).toBe('Start with nested elements')
  })

  it('should handle partial selection across elements', () => {
    document.body.innerHTML = '<p>Normal <strong>bold text</strong> more text</p>'
    const p = document.querySelector('p')
    
    // Select from middle of "Normal" to middle of "bold text"
    const normalText = p.firstChild  // "Normal " text node
    const boldText = p.querySelector('strong').firstChild  // "bold text" text node
    
    const range = document.createRange()
    range.setStart(normalText, 3)  // Start at "mal "
    range.setEnd(boldText, 4)      // End after "bold"
    
    const selection = window.getSelection()
    selection.addRange(range)
    
    expect(selection.toString()).toBe('mal bold')
    expect(isValidSelection(selection)).toBe(true)
    
    const selectionInfo = getSelectionInfo()
    expect(selectionInfo.text).toBe('mal bold')
  })

  it('should handle selection across list items', () => {
    document.body.innerHTML = `
      <ul>
        <li>First item</li>
        <li>Second item</li>
        <li>Third item</li>
      </ul>
    `
    
    const listItems = document.querySelectorAll('li')
    
    // Select from first item to second item
    const firstText = listItems[0].firstChild
    const secondText = listItems[1].firstChild
    
    const range = document.createRange()
    range.setStart(firstText, 6)   // Start at "item" in first
    range.setEnd(secondText, 6)     // End at "Second"
    
    const selection = window.getSelection()
    selection.addRange(range)
    
    // Note: Cross-list-item selection may include whitespace
    const selectedText = selection.toString().trim()
    expect(selectedText).toContain('item')
    expect(selectedText).toContain('Second')
    expect(isValidSelection(selection)).toBe(true)
  })

  it('should handle selection across mixed content types', () => {
    document.body.innerHTML = `
      <div>
        <p>Paragraph with <a href="#">link</a></p>
        <span>Some <code>code</code> here</span>
      </div>
    `
    
    // Select from "with" to "code"
    const p = document.querySelector('p')
    const codeElement = document.querySelector('code')
    
    // Find the text node containing "with"
    const withText = p.firstChild  // "Paragraph with " text node
    const codeText = codeElement.firstChild  // "code" text node
    
    const range = document.createRange()
    range.setStart(withText, 10)  // Start at "with"
    range.setEnd(codeText, 4)      // End after "code"
    
    const selection = window.getSelection()
    selection.addRange(range)
    
    const selectedText = selection.toString()
    expect(selectedText).toContain('with')
    expect(selectedText).toContain('link')
    expect(selectedText).toContain('code')
    expect(isValidSelection(selection)).toBe(true)
  })
})