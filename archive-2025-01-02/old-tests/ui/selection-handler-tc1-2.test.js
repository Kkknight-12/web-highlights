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

describe('TC-1.2: Partial Word Selection', () => {
  beforeEach(() => {
    // Clear DOM
    document.body.innerHTML = ''
    window.getSelection().removeAllRanges()
  })

  it('should detect partial word selection "ello wor" from "Hello world"', () => {
    // Setup: Create test content
    document.body.innerHTML = '<p id="test">Hello world</p>'
    const textNode = document.getElementById('test').firstChild
    
    // Action: Select "ello wor" (partial words)
    const range = document.createRange()
    range.setStart(textNode, 1)  // Start after 'H'
    range.setEnd(textNode, 9)    // End before 'ld'
    
    const selection = window.getSelection()
    selection.addRange(range)
    
    // Verify: Selection is valid
    expect(selection.toString()).toBe('ello wor')
    expect(isValidSelection(selection)).toBe(true)
    
    // Get selection info
    const selectionInfo = getSelectionInfo()
    
    // Verify: Selection info is correct
    expect(selectionInfo).not.toBeNull()
    expect(selectionInfo.text).toBe('ello wor')
    expect(selectionInfo.rect).toBeDefined()
    expect(selectionInfo.range).toBeDefined()
    
    // Verify: Only selected portion will be highlighted
    // This is verified by the text content
    expect(selectionInfo.text).not.toContain('H')
    expect(selectionInfo.text).not.toContain('ld')
  })

  it('should handle selection starting mid-word', () => {
    document.body.innerHTML = '<p id="test">Testing partial selection</p>'
    const textNode = document.getElementById('test').firstChild
    
    // Select "sting" from "Testing"
    const range = document.createRange()
    range.setStart(textNode, 2)  // Start after 'Te'
    range.setEnd(textNode, 7)    // End at 'g'
    
    const selection = window.getSelection()
    selection.addRange(range)
    
    // Verify selection
    expect(selection.toString()).toBe('sting')
    expect(isValidSelection(selection)).toBe(true)
    
    const selectionInfo = getSelectionInfo()
    expect(selectionInfo.text).toBe('sting')
  })

  it('should handle selection ending mid-word', () => {
    document.body.innerHTML = '<p id="test">Another test case</p>'
    const textNode = document.getElementById('test').firstChild
    
    // Select "Another te" (ends mid-word)
    const range = document.createRange()
    range.setStart(textNode, 0)
    range.setEnd(textNode, 10)  // Ends at 'te' in 'test'
    
    const selection = window.getSelection()
    selection.addRange(range)
    
    expect(selection.toString()).toBe('Another te')
    expect(isValidSelection(selection)).toBe(true)
    
    const selectionInfo = getSelectionInfo()
    expect(selectionInfo.text).toBe('Another te')
  })

  it('should handle single character selection', () => {
    document.body.innerHTML = '<p id="test">Single char test</p>'
    const textNode = document.getElementById('test').firstChild
    
    // Select just "S"
    const range = document.createRange()
    range.setStart(textNode, 0)
    range.setEnd(textNode, 1)
    
    const selection = window.getSelection()
    selection.addRange(range)
    
    expect(selection.toString()).toBe('S')
    expect(isValidSelection(selection)).toBe(true)
    
    const selectionInfo = getSelectionInfo()
    expect(selectionInfo.text).toBe('S')
  })
})