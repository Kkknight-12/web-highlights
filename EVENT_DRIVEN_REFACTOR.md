# Event-Driven Architecture Refactoring Plan

## Overview
This document outlines the refactoring plan to transform the Chrome Web Highlighter from direct module coupling to a clean event-driven architecture. This will improve maintainability, testability, and resilience to Chrome extension context issues.

## Current Architecture Problems

### 1. Direct Coupling
- UI components directly import and call highlighter functions
- Multiple unused highlighter implementations (812+ lines each)
- Global window objects for API access (`window.__robustHighlighter`)

### 2. Memory Management Issues
- No systematic cleanup of event listeners
- Risk of memory leaks on page navigation
- Chrome context invalidation causes orphaned listeners

### 3. Code Organization
- 774-line monolithic highlighter file
- Mixed responsibilities (DOM, storage, events in one file)
- No clear separation of concerns

## Proposed Event-Driven Architecture

### Core Components

#### 1. Event Bus System
```javascript
// src/content/core/event-bus.js
class EventBus extends EventTarget {
  emit(eventName, data) {
    this.dispatchEvent(new CustomEvent(eventName, { detail: data }))
  }
  
  on(eventName, handler, options = {}) {
    this.addEventListener(eventName, handler, options)
  }
  
  off(eventName, handler) {
    this.removeEventListener(eventName, handler)
  }
}
```

#### 2. Base Component with Lifecycle
```javascript
// src/content/core/base-component.js
class BaseComponent {
  constructor(eventBus) {
    this.eventBus = eventBus
    this.abortController = new AbortController()
  }
  
  on(event, handler) {
    this.eventBus.on(event, handler, {
      signal: this.abortController.signal
    })
  }
  
  emit(event, data) {
    this.eventBus.emit(event, data)
  }
  
  destroy() {
    this.abortController.abort()
  }
}
```

### Event Catalog

```javascript
// src/content/core/events.js
export const EVENTS = {
  // Highlight Operations
  HIGHLIGHT_CREATE_REQUESTED: 'highlight:create:requested',
  HIGHLIGHT_CREATED: 'highlight:created',
  HIGHLIGHT_DELETE_REQUESTED: 'highlight:delete:requested',
  HIGHLIGHT_DELETED: 'highlight:deleted',
  HIGHLIGHT_COLOR_CHANGE_REQUESTED: 'highlight:color:change:requested',
  HIGHLIGHT_COLOR_CHANGED: 'highlight:color:changed',
  HIGHLIGHT_CLICKED: 'highlight:clicked',
  
  // Restoration
  HIGHLIGHTS_RESTORE_REQUESTED: 'highlights:restore:requested',
  HIGHLIGHTS_RESTORED: 'highlights:restored',
  
  // UI Events
  SELECTION_CHANGED: 'selection:changed',
  BUTTON_SHOW_REQUESTED: 'button:show:requested',
  BUTTON_HIDE_REQUESTED: 'button:hide:requested',
  TOOLBAR_SHOW_REQUESTED: 'toolbar:show:requested',
  TOOLBAR_HIDE_REQUESTED: 'toolbar:hide:requested',
  
  // System Events
  PAGE_NAVIGATED: 'page:navigated',
  CONTEXT_INVALIDATED: 'context:invalidated',
  STORAGE_UPDATED: 'storage:updated'
}
```

## Refactoring Phases

### Phase 1: Core Infrastructure (Day 1)
1. Create event bus system
2. Create base component class
3. Create event catalog
4. Set up component registry for lifecycle management

### Phase 2: Split Highlighter Module (Day 2)
Break down the 774-line `highlighter-robust.js` into:

```
src/content/
├── core/
│   ├── event-bus.js
│   ├── base-component.js
│   ├── events.js
│   └── component-registry.js
├── highlighting/
│   ├── highlight-engine.js      (core logic, ~150 lines)
│   ├── text-finder.js          (text location, ~200 lines)
│   ├── dom-highlighter.js      (DOM manipulation, ~100 lines)
│   ├── highlight-restorer.js   (restoration logic, ~150 lines)
│   └── highlight-storage.js    (storage operations, ~100 lines)
├── services/
│   ├── selection-service.js
│   ├── navigation-service.js
│   └── storage-service.js
└── utils/
    ├── dom-utils.js
    ├── range-utils.js
    └── text-utils.js
```

### Phase 3: Convert UI Components (Day 3)
Convert each UI component to event-driven:

#### Before:
```javascript
// highlight-button.js
import { createHighlight } from './highlighter-robust'

function handleClick() {
  createHighlight(selectedColor)
}
```

#### After:
```javascript
// highlight-button.js
class HighlightButton extends BaseComponent {
  handleClick() {
    this.emit(EVENTS.HIGHLIGHT_CREATE_REQUESTED, {
      color: this.selectedColor,
      selection: window.getSelection()
    })
  }
}
```

### Phase 4: Redux Integration (Day 4)
Integrate event system with Redux:

```javascript
// src/content/store/event-middleware.js
const eventMiddleware = (eventBus) => (store) => (next) => (action) => {
  const result = next(action)
  
  // Emit events for specific Redux actions
  switch (action.type) {
    case 'highlights/addHighlight':
      eventBus.emit(EVENTS.HIGHLIGHT_CREATED, action.payload)
      break
    case 'highlights/removeHighlight':
      eventBus.emit(EVENTS.HIGHLIGHT_DELETED, action.payload)
      break
  }
  
  return result
}
```

### Phase 5: Testing & Cleanup (Day 5)
1. Add unit tests for event-driven components
2. Remove unused highlighter files
3. Remove global window objects
4. Performance testing

## Implementation Guidelines

### 1. One Task at a Time
- Complete each phase before moving to the next
- Test thoroughly after each change
- Commit after each successful phase

### 2. Backward Compatibility
- Keep existing functionality working during refactor
- Use feature flags if needed
- Gradual migration approach

### 3. Testing Strategy
```javascript
// Example test
describe('HighlightButton', () => {
  it('emits create event on click', () => {
    const eventBus = new EventBus()
    const spy = jest.fn()
    eventBus.on(EVENTS.HIGHLIGHT_CREATE_REQUESTED, spy)
    
    const button = new HighlightButton(eventBus)
    button.handleClick()
    
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: { color: 'yellow' }
      })
    )
  })
})
```

### 4. Memory Management
- Always use AbortController for cleanup
- Register components with ComponentRegistry
- Clean up on page unload/navigation

## Benefits After Refactoring

1. **Loose Coupling**: Components don't know about each other
2. **Easy Testing**: Mock events instead of modules
3. **Better Error Handling**: Centralized error management
4. **Scalability**: Easy to add new features
5. **Chrome Extension Resilience**: Better handling of context invalidation
6. **Clean Code**: Small, focused modules under 200 lines

## Migration Checklist

- [ ] Phase 1: Core Infrastructure
  - [ ] Create event-bus.js
  - [ ] Create base-component.js
  - [ ] Create events.js
  - [ ] Create component-registry.js
  
- [ ] Phase 2: Split Highlighter
  - [ ] Extract highlight-engine.js
  - [ ] Extract text-finder.js
  - [ ] Extract dom-highlighter.js
  - [ ] Extract highlight-restorer.js
  - [ ] Extract highlight-storage.js
  
- [ ] Phase 3: Convert UI Components
  - [ ] Convert highlight-button.js
  - [ ] Convert mini-toolbar.js
  - [ ] Convert color-picker.js
  
- [ ] Phase 4: Redux Integration
  - [ ] Create event-middleware.js
  - [ ] Update store configuration
  - [ ] Test Redux-event integration
  
- [ ] Phase 5: Cleanup
  - [ ] Remove unused files
  - [ ] Remove global variables
  - [ ] Add comprehensive tests
  - [ ] Update documentation

## Code Quality Standards

1. **Module Size**: Keep all modules under 200 lines
2. **Single Responsibility**: One purpose per module
3. **Event Naming**: Use namespaced, descriptive names
4. **Error Handling**: Wrap all event handlers in try-catch
5. **Documentation**: JSDoc comments for all public methods

## Libraries to Consider

1. **EventEmitter3**: Lightweight event emitter (3KB)
   ```bash
   npm install eventemitter3
   ```

2. **Mitt**: Tiny event emitter (200 bytes)
   ```bash
   npm install mitt
   ```

3. **RxJS**: For complex event flows (optional)
   ```bash
   npm install rxjs
   ```

## Next Steps

1. Review this plan with the team
2. Set up development branch
3. Begin Phase 1 implementation
4. Daily progress updates
5. Code review after each phase

---

**Note**: This refactoring will take approximately 5 days to complete properly. Each phase should be tested thoroughly before proceeding to the next.