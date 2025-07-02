# Chrome Web Highlighter - Architecture Proposal

## Current Issues
- Single 1500+ line content.js file
- State management scattered
- Difficult to add new features
- No clear separation of concerns

## Proposed Architecture (No Framework)

### 1. Module Structure
```
src/
├── core/
│   ├── HighlightEngine.js      # Core highlighting logic
│   ├── SelectionManager.js     # Text selection handling
│   ├── RangeSerializer.js      # Save/restore selections
│   └── DOMWalker.js           # DOM traversal utilities
├── ui/
│   ├── HighlightButton.js     # Web Component
│   ├── MiniToolbar.js         # Web Component
│   ├── ColorPicker.js         # Web Component
│   └── NoteEditor.js          # Web Component (Pro)
├── storage/
│   ├── ChromeStorage.js       # Chrome storage API
│   ├── CloudSync.js           # Google Drive (Pro)
│   └── DataMigration.js       # Version upgrades
├── features/
│   ├── AIIntegration.js       # AI features (Pro)
│   ├── ExportManager.js       # Export functionality
│   ├── SearchEngine.js        # Search highlights
│   └── Analytics.js           # Usage tracking (Pro)
├── utils/
│   ├── ErrorHandler.js        # Centralized errors
│   ├── URLMatcher.js          # SPA navigation
│   └── Debounce.js           # Performance utils
└── content.js                 # Thin entry point
```

### 2. Web Components for UI (No Framework Needed)
```javascript
// Clean, encapsulated UI components
class HighlightButton extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }
  
  connectedCallback() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          /* Styles completely isolated */
          /* No conflicts with any website */
        }
      </style>
      <button part="button">
        <slot name="icon"></slot>
        <slot>Highlight</slot>
      </button>
    `;
  }
  
  show(position) {
    this.style.top = `${position.top}px`;
    this.style.left = `${position.left}px`;
    this.style.display = 'block';
  }
}

customElements.define('highlight-button', HighlightButton);
```

### 3. Event-Driven Architecture
```javascript
// Central event bus for complex features
class EventBus {
  constructor() {
    this.events = {};
  }
  
  on(event, callback) {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(callback);
  }
  
  emit(event, data) {
    if (this.events[event]) {
      this.events[event].forEach(cb => cb(data));
    }
  }
}

// Usage
const bus = new EventBus();

// AI features listen for highlights
bus.on('highlight:created', async (highlight) => {
  if (userIsPro) {
    await AIIntegration.generateSummary(highlight);
  }
});

// Analytics track usage
bus.on('highlight:created', (highlight) => {
  Analytics.track('highlight_created', {
    color: highlight.color,
    wordCount: highlight.text.split(' ').length
  });
});
```

### 4. State Management (No Redux Needed)
```javascript
class StateManager {
  constructor() {
    this.state = {
      highlights: [],
      user: null,
      settings: {}
    };
    this.subscribers = [];
  }
  
  subscribe(callback) {
    this.subscribers.push(callback);
  }
  
  setState(updates) {
    this.state = { ...this.state, ...updates };
    this.subscribers.forEach(cb => cb(this.state));
  }
  
  getState() {
    return this.state;
  }
}
```

### 5. Pro Features as Plugins
```javascript
// Easy to add/remove pro features
class ProFeatures {
  static async init() {
    if (!user.isPro) return;
    
    // Lazy load pro features
    const modules = await Promise.all([
      import('./features/AIIntegration.js'),
      import('./features/CloudSync.js'),
      import('./features/AdvancedExport.js')
    ]);
    
    modules.forEach(module => module.init());
  }
}
```

## Benefits of This Approach

1. **No Build Process** - Direct browser compatibility
2. **Modular** - Easy to add/remove features
3. **Performant** - Only load what's needed
4. **Maintainable** - Clear separation of concerns
5. **Scalable** - Can grow with pro features
6. **Modern** - Uses latest web standards

## Migration Path

### Phase 1: Restructure (1 week)
- Split content.js into modules
- Keep existing functionality

### Phase 2: Web Components (1 week)
- Convert UI to Web Components
- Better style isolation

### Phase 3: Pro Features (2 weeks)
- Add plugin architecture
- Implement AI features

### Phase 4: Optimization (1 week)
- Performance tuning
- Code splitting for pro features

## When to Use a Framework

Only consider a framework for:
1. **The web dashboard** (separate project)
2. **The marketing website**
3. **Complex popup UI** (if it grows beyond current scope)

The Chrome extension itself should remain framework-free for best performance and simplicity.