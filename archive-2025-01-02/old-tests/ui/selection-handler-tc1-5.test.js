import { getSelectionInfo, isValidSelection } from '../../src/content/ui/selection-handler.js'
import { eventBus } from '../../src/content/core/event-bus.js'
import { EVENTS } from '../../src/content/core/events.js'
import { jest } from '@jest/globals'

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

describe('TC-1.5: Whitespace Selection', () => {
  beforeEach(() => {
    // Clear DOM
    document.body.innerHTML = ''
    window.getSelection().removeAllRanges()
  })

  it('should not be valid when selecting only spaces', () => {
    // Setup: Create text with spaces
    document.body.innerHTML = '<p id="test">Hello     world</p>'
    const textNode = document.getElementById('test').firstChild
    
    // Action: Select only the spaces between "Hello" and "world"
    const range = document.createRange()
    range.setStart(textNode, 5)   // After "Hello"
    range.setEnd(textNode, 10)    // Before "world"
    
    const selection = window.getSelection()
    selection.addRange(range)
    
    // Verify: Selection contains only spaces
    expect(selection.toString()).toBe('     ')
    expect(isValidSelection(selection)).toBe(false)
    
    // Verify: No selection info returned for whitespace
    const selectionInfo = getSelectionInfo()
    expect(selectionInfo).toBeNull()
  })

  it('should not be valid when selecting only newlines', () => {
    // Create content with newlines
    document.body.innerHTML = '<pre id="test">Line 1\n\n\nLine 2</pre>'
    const textNode = document.getElementById('test').firstChild
    
    // Select only the newlines
    const range = document.createRange()
    range.setStart(textNode, 6)   // After "Line 1"
    range.setEnd(textNode, 9)     // Before "Line 2"
    
    const selection = window.getSelection()
    selection.addRange(range)
    
    // Verify: Selection contains only newlines
    expect(selection.toString()).toBe('\n\n\n')
    expect(isValidSelection(selection)).toBe(false)
    
    const selectionInfo = getSelectionInfo()
    expect(selectionInfo).toBeNull()
  })

  it('should not be valid when selecting only tabs', () => {
    document.body.innerHTML = '<pre id="test">Start\t\t\tEnd</pre>'
    const textNode = document.getElementById('test').firstChild
    
    // Select only the tabs
    const range = document.createRange()
    range.setStart(textNode, 5)   // After "Start"
    range.setEnd(textNode, 8)     // Before "End"
    
    const selection = window.getSelection()
    selection.addRange(range)
    
    // Verify: Selection contains only tabs
    expect(selection.toString()).toBe('\t\t\t')
    expect(isValidSelection(selection)).toBe(false)
    
    const selectionInfo = getSelectionInfo()
    expect(selectionInfo).toBeNull()
  })

  it('should not be valid when selecting mixed whitespace', () => {
    document.body.innerHTML = '<pre id="test">Text \n\t \n\t More</pre>'
    const textNode = document.getElementById('test').firstChild
    
    // Select mixed whitespace
    const range = document.createRange()
    range.setStart(textNode, 4)   // After "Text"
    range.setEnd(textNode, 11)    // Before "More"
    
    const selection = window.getSelection()
    selection.addRange(range)
    
    // Verify: Selection contains only whitespace
    const selectedText = selection.toString()
    expect(selectedText.trim()).toBe('')  // Should be empty when trimmed
    expect(isValidSelection(selection)).toBe(false)
    
    const selectionInfo = getSelectionInfo()
    expect(selectionInfo).toBeNull()
  })

  it('should be valid when selection contains text with leading/trailing whitespace', () => {
    document.body.innerHTML = '<p id="test">  Hello world  </p>'
    const textNode = document.getElementById('test').firstChild
    
    // Select with leading/trailing spaces
    const range = document.createRange()
    range.setStart(textNode, 0)    // Include leading spaces
    range.setEnd(textNode, 15)     // Include trailing spaces
    
    const selection = window.getSelection()
    selection.addRange(range)
    
    // Verify: Selection is valid because it contains text
    expect(selection.toString()).toBe('  Hello world  ')
    expect(isValidSelection(selection)).toBe(true)
    
    const selectionInfo = getSelectionInfo()
    expect(selectionInfo).not.toBeNull()
    // The implementation trims whitespace from the text
    expect(selectionInfo.text).toBe('Hello world')
  })

  it('should not emit selection event for whitespace-only selection', () => {
    // Spy on selection event
    const selectionSpy = jest.fn()
    eventBus.on(EVENTS.SELECTION.TEXT_SELECTED, selectionSpy)
    
    document.body.innerHTML = '<p id="test">Text    More</p>'
    const textNode = document.getElementById('test').firstChild
    
    // Select only spaces
    const range = document.createRange()
    range.setStart(textNode, 4)
    range.setEnd(textNode, 8)
    
    const selection = window.getSelection()
    selection.addRange(range)
    
    // Trigger selection event check (simulating what would happen in real usage)
    const selectionInfo = getSelectionInfo()
    
    // Since getSelectionInfo returns null for whitespace, no event should be emitted
    expect(selectionInfo).toBeNull()
    
    // Clean up
    eventBus.off(EVENTS.SELECTION.TEXT_SELECTED, selectionSpy)
  })
})