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

describe('TC-1.4: Empty Selection', () => {
  beforeEach(() => {
    // Clear DOM
    document.body.innerHTML = ''
    window.getSelection().removeAllRanges()
  })

  it('should return null when no text is selected (just clicked)', () => {
    // Setup: Create test content
    document.body.innerHTML = '<p id="test">Click anywhere in this text</p>'
    
    // Action: No selection - just a click
    // Window selection is empty by default after removeAllRanges()
    const selection = window.getSelection()
    
    // Verify: No valid selection
    expect(selection.rangeCount).toBe(0)
    expect(isValidSelection(selection)).toBe(false)
    
    // Get selection info should return null
    const selectionInfo = getSelectionInfo()
    expect(selectionInfo).toBeNull()
  })

  it('should return null when selection is collapsed (cursor position)', () => {
    document.body.innerHTML = '<p id="test">Click to place cursor here</p>'
    const textNode = document.getElementById('test').firstChild
    
    // Create a collapsed selection (cursor position)
    const range = document.createRange()
    range.setStart(textNode, 5)
    range.setEnd(textNode, 5) // Same position = collapsed
    
    const selection = window.getSelection()
    selection.addRange(range)
    
    // Verify: Selection exists but is collapsed
    expect(selection.rangeCount).toBe(1)
    expect(selection.isCollapsed).toBe(true)
    expect(isValidSelection(selection)).toBe(false)
    
    const selectionInfo = getSelectionInfo()
    expect(selectionInfo).toBeNull()
  })

  it('should hide previous button when selection is cleared', () => {
    document.body.innerHTML = '<p id="test">Select then click elsewhere</p>'
    const textNode = document.getElementById('test').firstChild
    
    // First, create a valid selection
    const range = document.createRange()
    range.setStart(textNode, 0)
    range.setEnd(textNode, 6) // "Select"
    
    const selection = window.getSelection()
    selection.addRange(range)
    
    // Verify valid selection
    expect(isValidSelection(selection)).toBe(true)
    expect(getSelectionInfo()).not.toBeNull()
    
    // Now clear the selection (simulate clicking elsewhere)
    selection.removeAllRanges()
    
    // Verify: No selection
    expect(selection.rangeCount).toBe(0)
    expect(isValidSelection(selection)).toBe(false)
    expect(getSelectionInfo()).toBeNull()
  })

  it('should handle multiple clicks without selection', () => {
    document.body.innerHTML = '<p>Paragraph 1</p><p>Paragraph 2</p><p>Paragraph 3</p>'
    
    // Simulate clicking in different places without selecting
    const selection = window.getSelection()
    
    // Click 1: No selection
    expect(isValidSelection(selection)).toBe(false)
    expect(getSelectionInfo()).toBeNull()
    
    // Click 2: Still no selection
    expect(isValidSelection(selection)).toBe(false)
    expect(getSelectionInfo()).toBeNull()
    
    // Click 3: Still no selection
    expect(isValidSelection(selection)).toBe(false)
    expect(getSelectionInfo()).toBeNull()
  })

  it('should handle selection then immediate deselection', () => {
    document.body.innerHTML = '<p id="test">Quick select and deselect</p>'
    const textNode = document.getElementById('test').firstChild
    
    // Create selection
    const range = document.createRange()
    range.setStart(textNode, 0)
    range.setEnd(textNode, 5)
    
    const selection = window.getSelection()
    selection.addRange(range)
    
    // Immediately clear it (like accidental selection)
    selection.removeAllRanges()
    
    // Verify: No selection remains
    expect(selection.rangeCount).toBe(0)
    expect(isValidSelection(selection)).toBe(false)
    expect(getSelectionInfo()).toBeNull()
  })

  it('should handle clicking on non-text elements', () => {
    document.body.innerHTML = `
      <div id="container">
        <img src="test.jpg" alt="Test image">
        <button>Click me</button>
        <input type="text" value="Input field">
      </div>
    `
    
    // No text selection on these elements
    const selection = window.getSelection()
    
    // Should return null for empty selection
    expect(isValidSelection(selection)).toBe(false)
    expect(getSelectionInfo()).toBeNull()
  })
})