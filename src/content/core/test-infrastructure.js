/**
 * Test file for core infrastructure
 * Run this to verify event system works correctly
 */

import { eventBus } from './event-bus.js'
import { BaseComponent } from './base-component.js'
import { EVENTS } from './events.js'
import { componentRegistry } from './component-registry.js'

// Test Component 1
class TestButton extends BaseComponent {
  constructor() {
    super('TestButton')
    this.clickCount = 0
  }

  init() {
    console.log('[TestButton] Initializing')
    
    // Listen for selection changes
    this.on(EVENTS.SELECTION.CHANGED, this.handleSelectionChange)
    
    // Listen for highlight creation
    this.on(EVENTS.HIGHLIGHT.CREATED, this.handleHighlightCreated)
  }

  handleSelectionChange(event) {
    console.log('[TestButton] Selection changed:', event.detail)
    this.clickCount++
    
    // Request highlight creation
    this.emit(EVENTS.HIGHLIGHT.CREATE_REQUESTED, {
      color: 'yellow',
      text: event.detail.text
    })
  }

  handleHighlightCreated(event) {
    console.log('[TestButton] Highlight created:', event.detail)
  }

  onClick() {
    console.log('[TestButton] Button clicked')
    this.emit(EVENTS.UI.BUTTON_CLICKED, { count: this.clickCount })
  }

  onDestroy() {
    console.log('[TestButton] Custom cleanup')
  }
}

// Test Component 2
class TestHighlighter extends BaseComponent {
  constructor() {
    super('TestHighlighter')
    this.highlights = []
  }

  init() {
    console.log('[TestHighlighter] Initializing')
    
    // Listen for highlight requests
    this.on(EVENTS.HIGHLIGHT.CREATE_REQUESTED, this.createHighlight)
    this.on(EVENTS.HIGHLIGHT.DELETE_REQUESTED, this.deleteHighlight)
  }

  createHighlight(event) {
    const { color, text } = event.detail
    console.log(`[TestHighlighter] Creating ${color} highlight for: "${text}"`)
    
    const highlight = {
      id: `highlight-${Date.now()}`,
      color,
      text,
      timestamp: Date.now()
    }
    
    this.highlights.push(highlight)
    
    // Emit success event
    this.emit(EVENTS.HIGHLIGHT.CREATED, highlight)
    
    // Also emit storage event
    this.emit(EVENTS.STORAGE.SAVE_REQUESTED, { highlights: this.highlights })
  }

  deleteHighlight(event) {
    const { id } = event.detail
    console.log(`[TestHighlighter] Deleting highlight: ${id}`)
    
    this.highlights = this.highlights.filter(h => h.id !== id)
    this.emit(EVENTS.HIGHLIGHT.DELETED, { id })
  }
}

// Test Runner
async function runTests() {
  console.log('\n=== Starting Core Infrastructure Tests ===\n')

  // Enable debug mode
  eventBus.setDebug(true)

  // Test 1: Event Bus
  console.log('Test 1: Event Bus')
  eventBus.emit(EVENTS.SYSTEM.READY, { test: true })
  
  // Test 2: Component Registration
  console.log('\nTest 2: Component Registration')
  const button = new TestButton()
  const highlighter = new TestHighlighter()
  
  componentRegistry.register('button', button, { priority: 1 })
  componentRegistry.register('highlighter', highlighter, { priority: 2 })
  
  // Test 3: Component Initialization
  console.log('\nTest 3: Component Initialization')
  await componentRegistry.initializeAll()
  
  // Test 4: Event Flow
  console.log('\nTest 4: Event Flow')
  eventBus.emit(EVENTS.SELECTION.CHANGED, { text: 'Hello World' })
  
  // Test 5: Direct Component Communication
  console.log('\nTest 5: Direct Component Communication')
  button.onClick()
  
  // Test 6: Get Stats
  console.log('\nTest 6: Component Stats')
  console.log('Registry Stats:', componentRegistry.getStats())
  console.log('Event Stats:', eventBus.getStats())
  
  // Test 7: Memory Cleanup
  console.log('\nTest 7: Memory Cleanup')
  console.log('Before destroy - Button info:', button.getInfo())
  componentRegistry.destroy('button')
  console.log('After destroy - Button is alive:', button.isAlive())
  
  // Test 8: Destroy All
  console.log('\nTest 8: Destroy All Components')
  componentRegistry.destroyAll()
  
  console.log('\n=== Tests Complete ===\n')
}

// Export test runner
export { runTests }

// Auto-run if this file is loaded directly
if (import.meta.url === `file://${window.location.pathname}`) {
  runTests()
}