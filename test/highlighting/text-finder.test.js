import { findTextNodes, createRangeForText } from './text-finder.js'

describe('text-finder functions', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  describe('findTextNodes', () => {
    it('should find text node containing the text', () => {
      document.body.innerHTML = '<p id="test">Hello world</p>'
      const container = document.getElementById('test')
      
      const results = findTextNodes(container, 'Hello')
      
      expect(results).toHaveLength(1)
      expect(results[0].nodeType).toBe(Node.TEXT_NODE)
      expect(results[0].textContent).toBe('Hello world')
    })

    it('should find text node when searching in body', () => {
      document.body.innerHTML = '<p>Hello world. Hello again.</p>'
      
      const results = findTextNodes(document.body, 'Hello')
      
      // findTextNodes returns nodes that contain the text
      // not individual occurrences
      expect(results).toHaveLength(1)
      expect(results[0].textContent).toContain('Hello')
    })

    it('should return empty array when text not found', () => {
      document.body.innerHTML = '<p>Different text</p>'
      
      const results = findTextNodes(document.body, 'Hello')
      
      expect(results).toHaveLength(0)
    })
  })

  describe('createRangeForText', () => {
    it('should create range for text', () => {
      document.body.innerHTML = '<p id="test">Hello world</p>'
      const container = document.getElementById('test')
      
      const range = createRangeForText(container, 'world')
      
      expect(range).toBeDefined()
      expect(range.toString()).toBe('world')
    })
  })
})