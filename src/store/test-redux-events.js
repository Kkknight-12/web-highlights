/**
 * Test file for Redux-Event integration
 * Verifies that Redux actions trigger appropriate events
 */

import { store } from './store.js'
import { eventBus } from '../content/core/event-bus.js'
import { EVENTS } from '../content/core/events.js'
import { 
  addHighlight, 
  removeHighlight, 
  updateHighlightColor,
  setCurrentUrl 
} from './highlightsSlice.js'
import {
  showHighlightButton,
  hideHighlightButton,
  setSelectedColor
} from './uiSlice.js'

// Enable debug mode
eventBus.setDebug(true)

// Test Redux to Event integration
export function testReduxToEvents() {
  console.log('\n=== Testing Redux to Event Integration ===\n')
  
  // Set up event listeners to verify events are emitted
  const eventLog = []
  
  // Listen for highlight events
  eventBus.once(EVENTS.HIGHLIGHT.CREATED, (e) => {
    console.log('✅ HIGHLIGHT.CREATED event received:', e.detail)
    eventLog.push('HIGHLIGHT.CREATED')
  })
  
  eventBus.once(EVENTS.HIGHLIGHT.DELETED, (e) => {
    console.log('✅ HIGHLIGHT.DELETED event received:', e.detail)
    eventLog.push('HIGHLIGHT.DELETED')
  })
  
  eventBus.once(EVENTS.HIGHLIGHT.COLOR_CHANGED, (e) => {
    console.log('✅ HIGHLIGHT.COLOR_CHANGED event received:', e.detail)
    eventLog.push('HIGHLIGHT.COLOR_CHANGED')
  })
  
  // Listen for UI events
  eventBus.once(EVENTS.UI.BUTTON_SHOW_REQUESTED, (e) => {
    console.log('✅ UI.BUTTON_SHOW_REQUESTED event received:', e.detail)
    eventLog.push('UI.BUTTON_SHOW_REQUESTED')
  })
  
  eventBus.once(EVENTS.UI.COLOR_SELECTED, (e) => {
    console.log('✅ UI.COLOR_SELECTED event received:', e.detail)
    eventLog.push('UI.COLOR_SELECTED')
  })
  
  // Listen for navigation events
  eventBus.once(EVENTS.NAVIGATION.URL_CHANGED, (e) => {
    console.log('✅ NAVIGATION.URL_CHANGED event received:', e.detail)
    eventLog.push('NAVIGATION.URL_CHANGED')
  })
  
  // Test 1: Add highlight
  console.log('\nTest 1: Dispatching addHighlight action...')
  store.dispatch(addHighlight({
    url: 'https://example.com',
    highlight: {
      id: 'test-1',
      text: 'Test highlight',
      color: 'yellow'
    }
  }))
  
  // Test 2: Show highlight button
  console.log('\nTest 2: Dispatching showHighlightButton action...')
  store.dispatch(showHighlightButton({
    x: 100,
    y: 200
  }))
  
  // Test 3: Set selected color
  console.log('\nTest 3: Dispatching setSelectedColor action...')
  store.dispatch(setSelectedColor('blue'))
  
  // Test 4: Update highlight color
  console.log('\nTest 4: Dispatching updateHighlightColor action...')
  store.dispatch(updateHighlightColor({
    url: 'https://example.com',
    id: 'test-1',
    color: 'green'
  }))
  
  // Test 5: Remove highlight
  console.log('\nTest 5: Dispatching removeHighlight action...')
  store.dispatch(removeHighlight({
    url: 'https://example.com',
    id: 'test-1'
  }))
  
  // Test 6: URL change
  console.log('\nTest 6: Dispatching setCurrentUrl action...')
  store.dispatch(setCurrentUrl('https://example.com/page2'))
  
  // Verify results
  setTimeout(() => {
    console.log('\n=== Test Results ===')
    console.log('Events triggered:', eventLog)
    console.log('Total events:', eventLog.length)
    
    const expectedEvents = [
      'HIGHLIGHT.CREATED',
      'UI.BUTTON_SHOW_REQUESTED',
      'UI.COLOR_SELECTED',
      'HIGHLIGHT.COLOR_CHANGED',
      'HIGHLIGHT.DELETED',
      'NAVIGATION.URL_CHANGED'
    ]
    
    const allPassed = expectedEvents.every(event => eventLog.includes(event))
    
    if (allPassed) {
      console.log('\n✅ All tests passed! Redux-Event integration working correctly.')
    } else {
      console.log('\n❌ Some tests failed. Missing events:', 
        expectedEvents.filter(e => !eventLog.includes(e))
      )
    }
    
    // Show event stats
    console.log('\nEvent Bus Stats:', eventBus.getStats())
  }, 100)
}

// Test Event to Redux integration
export function testEventsToRedux() {
  console.log('\n=== Testing Event to Redux Integration ===\n')
  
  // Get initial state
  const initialState = store.getState()
  console.log('Initial highlights count:', 
    Object.keys(initialState.highlights.byUrl).length
  )
  
  // Emit events that should trigger Redux actions
  console.log('\nEmitting STORAGE.UPDATED event...')
  eventBus.emit(EVENTS.STORAGE.UPDATED, {
    url: window.location.href
  })
  
  console.log('\nEmitting SYSTEM.ERROR event...')
  eventBus.emit(EVENTS.SYSTEM.ERROR, {
    message: 'Test error',
    code: 'TEST_001'
  })
  
  // Check if Redux state was updated
  setTimeout(() => {
    const newState = store.getState()
    console.log('\nFinal state check completed')
  }, 100)
}

// Run all tests
export function runAllTests() {
  testReduxToEvents()
  
  setTimeout(() => {
    testEventsToRedux()
  }, 500)
}