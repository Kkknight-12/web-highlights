import { getSelectionInfo } from '../../src/content/ui/selection-handler.js'

describe('TC-1.1: Basic Text Selection', () => {
  beforeEach(() => {
    // Clear any existing selection
    window.getSelection().removeAllRanges()
    // Reset DOM
    document.body.innerHTML = ''
    
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
  })

  it('should detect selection of "Hello world" and return selection info', () => {
    // Setup: Create test content
    document.body.innerHTML = '<p id="test">Hello world</p>'
    const textNode = document.getElementById('test').firstChild
    
    // Action: Select "Hello world"
    const range = document.createRange()
    range.setStart(textNode, 0)
    range.setEnd(textNode, 11) // "Hello world" is 11 characters
    
    const selection = window.getSelection()
    selection.addRange(range)
    
    // Get selection info
    const selectionInfo = getSelectionInfo()
    
    // Verify: Selection is detected
    expect(selectionInfo).not.toBeNull()
    expect(selectionInfo.text).toBe('Hello world')
    expect(selectionInfo.selection).toBe(selection)
    expect(selectionInfo.range).toBeDefined()
    expect(selectionInfo.rect).toBeDefined()
    
    // Verify: Button position info is available (rect)
    expect(selectionInfo.rect.width).toBeGreaterThan(0)
    expect(selectionInfo.rect.height).toBeGreaterThan(0)
    expect(selectionInfo.rect.top).toBeDefined()
    expect(selectionInfo.rect.left).toBeDefined()
  })

  it('should return null when no text is selected', () => {
    document.body.innerHTML = '<p id="test">Hello world</p>'
    
    // No selection made
    const selectionInfo = getSelectionInfo()
    
    expect(selectionInfo).toBeNull()
  })

  it('should return null for collapsed selection (cursor position)', () => {
    document.body.innerHTML = '<p id="test">Hello world</p>'
    const textNode = document.getElementById('test').firstChild
    
    // Create collapsed selection (just a cursor position)
    const range = document.createRange()
    range.setStart(textNode, 5)
    range.setEnd(textNode, 5) // Same position = collapsed
    
    const selection = window.getSelection()
    selection.addRange(range)
    
    const selectionInfo = getSelectionInfo()
    
    expect(selectionInfo).toBeNull()
  })
})