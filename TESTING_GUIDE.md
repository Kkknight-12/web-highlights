# Simple Testing Guide

## Getting Started

### 1. Run Your First Test
```bash
npm test
```

### 2. Test File Structure
Create test files next to the code they test:
```
src/content/core/
├── event-bus.js
├── event-bus.test.js    # Test file
```

### 3. Basic Test Example
```javascript
// event-bus.test.js
import { describe, it, expect } from 'vitest'
import { EventBus } from './event-bus.js'

describe('EventBus', () => {
  it('should emit and receive events', () => {
    const bus = new EventBus()
    let received = false
    
    bus.on('test', () => { received = true })
    bus.emit('test')
    
    expect(received).toBe(true)
  })
})
```

## What to Test First

### Phase 1: Core Functionality (Start Here)
1. **Event System** - Does it emit/receive events?
2. **Highlight Creation** - Can we create a highlight?
3. **Storage** - Can we save/load highlights?

### Phase 2: User Actions
1. Text selection → Highlight button appears
2. Click highlight button → Creates highlight
3. Click highlight → Shows toolbar
4. Delete highlight → Removes from page and storage

### Phase 3: Edge Cases (Add Later)
- Multiple highlights
- Page reload
- Nested elements

## Chrome API Mocking

For Chrome APIs, use the mock library:
```javascript
import { chrome } from 'jest-webextension-mock'

// Chrome storage is automatically mocked
chrome.storage.local.get.mockResolvedValue({ highlights: [] })
```

## Running Tests
- `npm test` - Run all tests
- `npm run test:ui` - Open test UI
- `npm run test:coverage` - See code coverage

## Writing Tests

### Keep It Simple
```javascript
// Good - Test one thing
it('should create highlight with yellow color', () => {
  const highlight = createHighlight('test', 'yellow')
  expect(highlight.color).toBe('yellow')
})

// Bad - Testing too many things
it('should create highlight, save it, restore it, change color, and delete it', () => {
  // Too complex!
})
```

### Test User Behavior, Not Implementation
```javascript
// Good - Tests what user experiences
it('should show highlight button when text is selected', () => {
  selectText('Hello world')
  expect(highlightButton.isVisible()).toBe(true)
})

// Bad - Tests internal details
it('should call updateButtonVisibility with correct parameters', () => {
  // Users don't care about internal methods
})
```

## Linting

Run before committing:
```bash
npm run lint        # Check for issues
npm run lint:fix    # Auto-fix issues
npm run format      # Format code
```

## Common Testing Patterns

### Testing Async Code
```javascript
it('should load highlights from storage', async () => {
  const highlights = await loadHighlights()
  expect(highlights).toHaveLength(2)
})
```

### Testing Events
```javascript
it('should emit event when highlight is created', () => {
  let eventFired = false
  eventBus.on('highlight.created', () => { eventFired = true })
  
  createHighlight('test')
  expect(eventFired).toBe(true)
})
```

### Testing DOM Changes
```javascript
it('should add highlight class to element', () => {
  const element = document.createElement('span')
  highlightElement(element)
  
  expect(element.classList.contains('highlight')).toBe(true)
})
```

## Start Small

1. Pick one module (start with `event-bus.js`)
2. Write 3-5 simple tests
3. Run tests, make them pass
4. Move to next module

Don't try to test everything at once. Build confidence with small wins.

## Need Help?

- Vitest docs: https://vitest.dev/
- Chrome Extension Testing: Look at how other extensions test (most don't!)
- Keep tests simple and focused