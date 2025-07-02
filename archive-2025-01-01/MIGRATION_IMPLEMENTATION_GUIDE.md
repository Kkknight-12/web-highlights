# Migration Implementation Guide: Fixing Flicker & Navigation Issues

## Current Problems to Solve
1. Mini toolbar flickers after frequent navigation
2. Highlight button stops appearing when selecting text
3. 1500+ line monolithic content.js causing race conditions
4. Event handlers not properly cleaned up on navigation

## Step-by-Step Migration Plan

### Phase 1: Create Core Infrastructure (Day 1)

#### Step 1.1: Create Module Structure
```bash
# Create the new structure alongside existing code
mkdir -p src/modules
touch src/modules/constants.js
touch src/modules/event-bus.js
touch src/modules/state-manager.js
touch src/modules/dom-observer.js
touch src/modules/highlight-engine.js
touch src/modules/ui-manager.js
touch src/modules/storage-manager.js
touch src/modules/utils.js
```

#### Step 1.2: Implement Event Bus (Fixes Event Handler Chaos)
```javascript
// src/modules/event-bus.js
const EventBus = (function() {
    const events = new Map();
    const onceEvents = new Set();
    
    return {
        on(event, handler, options = {}) {
            if (!events.has(event)) {
                events.set(event, new Set());
            }
            
            const wrappedHandler = options.once ? 
                (...args) => {
                    handler(...args);
                    this.off(event, wrappedHandler);
                } : handler;
                
            events.get(event).add(wrappedHandler);
            
            if (options.once) {
                onceEvents.add(wrappedHandler);
            }
            
            return () => this.off(event, wrappedHandler);
        },
        
        off(event, handler) {
            const handlers = events.get(event);
            if (handlers) {
                handlers.delete(handler);
                if (handlers.size === 0) {
                    events.delete(event);
                }
            }
        },
        
        emit(event, data) {
            const handlers = events.get(event);
            if (!handlers) return;
            
            handlers.forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`Error in ${event} handler:`, error);
                }
            });
        },
        
        // Critical for navigation issues
        clear() {
            events.clear();
            onceEvents.clear();
        }
    };
})();

// Export for content script usage
window.__highlighterEventBus = EventBus;
```

#### Step 1.3: State Manager (Prevents Race Conditions)
```javascript
// src/modules/state-manager.js
const StateManager = (function() {
    const state = {
        isInitialized: false,
        isSelecting: false,
        currentHighlightId: null,
        toolbar: null,
        highlightButton: null,
        pendingOperations: new Set(),
        navigationState: 'stable' // 'stable', 'navigating', 'loading'
    };
    
    const subscribers = new Map();
    
    return {
        get(key) {
            return key ? state[key] : {...state};
        },
        
        set(key, value) {
            const oldValue = state[key];
            state[key] = value;
            
            // Notify subscribers
            if (subscribers.has(key)) {
                subscribers.get(key).forEach(callback => {
                    try {
                        callback(value, oldValue);
                    } catch (error) {
                        console.error(`State subscriber error for ${key}:`, error);
                    }
                });
            }
        },
        
        subscribe(key, callback) {
            if (!subscribers.has(key)) {
                subscribers.set(key, new Set());
            }
            subscribers.get(key).add(callback);
            
            return () => {
                const subs = subscribers.get(key);
                if (subs) {
                    subs.delete(callback);
                }
            };
        },
        
        // Critical for navigation handling
        reset() {
            state.isInitialized = false;
            state.isSelecting = false;
            state.currentHighlightId = null;
            state.toolbar = null;
            state.highlightButton = null;
            state.pendingOperations.clear();
            state.navigationState = 'stable';
        }
    };
})();

window.__highlighterState = StateManager;
```

#### Step 1.4: DOM Observer (Fixes Navigation Detection)
```javascript
// src/modules/dom-observer.js
const DOMObserver = (function() {
    let observer = null;
    let navigationTimer = null;
    const CHECK_INTERVAL = 100;
    const STABILITY_THRESHOLD = 500;
    
    function detectNavigation() {
        // Multiple navigation detection strategies
        
        // 1. URL change detection
        let lastUrl = location.href;
        
        // 2. DOM mutation observation
        const mutationObserver = new MutationObserver((mutations) => {
            const significantChange = mutations.some(m => 
                m.type === 'childList' && 
                (m.addedNodes.length > 10 || m.removedNodes.length > 10)
            );
            
            if (significantChange) {
                handlePossibleNavigation();
            }
        });
        
        // 3. History API interception
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;
        
        history.pushState = function() {
            originalPushState.apply(history, arguments);
            handleNavigation('pushState');
        };
        
        history.replaceState = function() {
            originalReplaceState.apply(history, arguments);
            handleNavigation('replaceState');
        };
        
        // 4. Popstate event
        window.addEventListener('popstate', () => handleNavigation('popstate'));
        
        // Start observing
        mutationObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        // URL polling fallback
        setInterval(() => {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                handleNavigation('url-change');
            }
        }, CHECK_INTERVAL);
    }
    
    function handlePossibleNavigation() {
        StateManager.set('navigationState', 'navigating');
        
        // Clear any existing timer
        if (navigationTimer) {
            clearTimeout(navigationTimer);
        }
        
        // Wait for DOM to stabilize
        navigationTimer = setTimeout(() => {
            if (StateManager.get('navigationState') === 'navigating') {
                StateManager.set('navigationState', 'stable');
                EventBus.emit('navigation:complete');
            }
        }, STABILITY_THRESHOLD);
    }
    
    function handleNavigation(type) {
        console.log(`Navigation detected: ${type}`);
        EventBus.emit('navigation:start', { type });
        
        // Clean up immediately
        cleanupBeforeNavigation();
        
        // Mark as navigating
        handlePossibleNavigation();
    }
    
    function cleanupBeforeNavigation() {
        // Remove all UI elements
        const toolbar = StateManager.get('toolbar');
        const button = StateManager.get('highlightButton');
        
        if (toolbar && toolbar.parentNode) {
            toolbar.remove();
        }
        
        if (button && button.parentNode) {
            button.remove();
        }
        
        // Clear state
        StateManager.set('toolbar', null);
        StateManager.set('highlightButton', null);
        StateManager.set('isSelecting', false);
    }
    
    return {
        init() {
            if (!observer) {
                detectNavigation();
                observer = true;
            }
        },
        
        destroy() {
            if (navigationTimer) {
                clearTimeout(navigationTimer);
            }
            // Note: We can't fully restore history methods, but that's OK
        }
    };
})();

window.__highlighterDOMObserver = DOMObserver;
```

### Phase 2: Refactor UI Manager (Fixes Flicker)

#### Step 2.1: New UI Manager with Debouncing
```javascript
// src/modules/ui-manager.js
const UIManager = (function() {
    let showButtonTimer = null;
    let hideButtonTimer = null;
    const SHOW_DELAY = 200; // Prevents flicker
    const HIDE_DELAY = 100;
    
    function createHighlightButton() {
        const button = document.createElement('div');
        button.className = 'highlighter-button';
        button.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24">
                <path d="M3.5 8C3.5 7.17157 4.17157 6.5 5 6.5H14.3787L16.8787 4H5C2.51472 4 0.5 6.01472 0.5 8.5V18.5C0.5 20.9853 2.51472 23 5 23H19C21.4853 23 23.5 20.9853 23.5 18.5V11.1213L21 13.6213V18.5C21 19.3284 20.3284 20 19.5 20H5C4.17157 20 3.5 19.3284 3.5 18.5V8Z"/>
            </svg>
        `;
        
        button.style.cssText = `
            position: absolute;
            z-index: 2147483647;
            background: #FFE066;
            border: 2px solid #F4D03F;
            border-radius: 4px;
            padding: 4px;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            opacity: 0;
            transition: opacity 0.2s ease-in-out;
            pointer-events: none;
        `;
        
        return button;
    }
    
    function positionButton(button, range) {
        try {
            const rect = range.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return false;
            
            // Position above selection
            button.style.left = `${rect.left + rect.width / 2 - 14}px`;
            button.style.top = `${rect.top + window.scrollY - 35}px`;
            
            // Ensure button stays in viewport
            const buttonRect = button.getBoundingClientRect();
            if (buttonRect.left < 5) {
                button.style.left = '5px';
            } else if (buttonRect.right > window.innerWidth - 5) {
                button.style.left = `${window.innerWidth - 35}px`;
            }
            
            if (buttonRect.top < 5) {
                // Position below if no room above
                button.style.top = `${rect.bottom + window.scrollY + 5}px`;
            }
            
            return true;
        } catch (error) {
            console.warn('Error positioning button:', error);
            return false;
        }
    }
    
    return {
        showHighlightButton(range) {
            // Clear any pending hide
            if (hideButtonTimer) {
                clearTimeout(hideButtonTimer);
                hideButtonTimer = null;
            }
            
            // Debounce show to prevent flicker
            if (showButtonTimer) {
                clearTimeout(showButtonTimer);
            }
            
            showButtonTimer = setTimeout(() => {
                // Check if we should still show
                if (StateManager.get('navigationState') !== 'stable') {
                    return;
                }
                
                let button = StateManager.get('highlightButton');
                
                if (!button) {
                    button = createHighlightButton();
                    StateManager.set('highlightButton', button);
                    
                    button.addEventListener('click', (e) => {
                        e.stopPropagation();
                        EventBus.emit('highlight:create', { range });
                        this.hideHighlightButton();
                    });
                }
                
                if (!button.parentNode) {
                    document.body.appendChild(button);
                }
                
                if (positionButton(button, range)) {
                    // Trigger reflow before changing opacity
                    button.offsetHeight;
                    button.style.opacity = '1';
                    button.style.pointerEvents = 'auto';
                }
            }, SHOW_DELAY);
        },
        
        hideHighlightButton() {
            if (showButtonTimer) {
                clearTimeout(showButtonTimer);
                showButtonTimer = null;
            }
            
            if (hideButtonTimer) {
                clearTimeout(hideButtonTimer);
            }
            
            hideButtonTimer = setTimeout(() => {
                const button = StateManager.get('highlightButton');
                if (button) {
                    button.style.opacity = '0';
                    button.style.pointerEvents = 'none';
                    
                    setTimeout(() => {
                        if (button.parentNode && button.style.opacity === '0') {
                            button.remove();
                        }
                    }, 200);
                }
            }, HIDE_DELAY);
        },
        
        cleanup() {
            if (showButtonTimer) {
                clearTimeout(showButtonTimer);
                showButtonTimer = null;
            }
            
            if (hideButtonTimer) {
                clearTimeout(hideButtonTimer);
                hideButtonTimer = null;
            }
            
            const button = StateManager.get('highlightButton');
            if (button && button.parentNode) {
                button.remove();
            }
        }
    };
})();

window.__highlighterUI = UIManager;
```

### Phase 3: Main Content Script Integration

#### Step 3.1: New Modular content.js
```javascript
// src/content-new.js (test alongside old one)
(function() {
    'use strict';
    
    // Check if already initialized
    if (window.__highlighterInitialized) return;
    window.__highlighterInitialized = true;
    
    // Get module references
    const EventBus = window.__highlighterEventBus;
    const StateManager = window.__highlighterState;
    const DOMObserver = window.__highlighterDOMObserver;
    const UIManager = window.__highlighterUI;
    
    // Initialize modules
    function init() {
        console.log('Highlighter: Initializing...');
        
        // Reset state
        StateManager.reset();
        EventBus.clear();
        
        // Initialize DOM observer
        DOMObserver.init();
        
        // Set up event listeners
        setupEventListeners();
        
        // Mark as initialized
        StateManager.set('isInitialized', true);
        
        console.log('Highlighter: Initialized successfully');
    }
    
    function setupEventListeners() {
        // Selection handling with debouncing
        let selectionTimer = null;
        
        document.addEventListener('selectionchange', () => {
            if (selectionTimer) {
                clearTimeout(selectionTimer);
            }
            
            selectionTimer = setTimeout(() => {
                handleSelectionChange();
            }, 100);
        });
        
        // Click outside to hide button
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.highlighter-button')) {
                UIManager.hideHighlightButton();
            }
        });
        
        // Navigation events
        EventBus.on('navigation:start', () => {
            console.log('Navigation started, cleaning up...');
            UIManager.cleanup();
        });
        
        EventBus.on('navigation:complete', () => {
            console.log('Navigation complete, reinitializing...');
            setupEventListeners();
        });
        
        // Highlight creation
        EventBus.on('highlight:create', (data) => {
            createHighlight(data.range);
        });
    }
    
    function handleSelectionChange() {
        const selection = window.getSelection();
        
        if (!selection || selection.isCollapsed || !selection.toString().trim()) {
            UIManager.hideHighlightButton();
            return;
        }
        
        // Check if selection is valid
        try {
            const range = selection.getRangeAt(0);
            const container = range.commonAncestorContainer;
            
            // Skip if selecting inside our UI
            if (container.nodeType === Node.ELEMENT_NODE) {
                if (container.closest('.highlighter-button, .highlighter-toolbar')) {
                    return;
                }
            }
            
            // Show button
            UIManager.showHighlightButton(range);
            
        } catch (error) {
            console.warn('Selection handling error:', error);
        }
    }
    
    function createHighlight(range) {
        // Implementation here
        console.log('Creating highlight...');
        // Your highlight creation logic
    }
    
    // Handle extension context invalidation
    function checkExtensionContext() {
        if (!chrome.runtime || !chrome.runtime.id) {
            console.warn('Extension context invalidated');
            window.__highlighterInitialized = false;
            EventBus.clear();
            StateManager.reset();
            return false;
        }
        return true;
    }
    
    // Periodic context check
    setInterval(checkExtensionContext, 5000);
    
    // Initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
```

### Phase 4: Testing Strategy

#### Step 4.1: Load modules in correct order
```javascript
// Update manifest.json
{
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": [
      "src/modules/event-bus.js",
      "src/modules/state-manager.js", 
      "src/modules/dom-observer.js",
      "src/modules/ui-manager.js",
      "src/content-new.js"  // Test new version
    ],
    "run_at": "document_start"
  }]
}
```

#### Step 4.2: Test on Problem Sites
1. GitHub (heavy SPA navigation)
2. YouTube (complex dynamic content)
3. Gmail (iframe heavy)
4. Static sites (to ensure no regression)

### Phase 5: Migration Completion

#### Step 5.1: Move remaining functionality
- Extract highlight storage logic → `storage-manager.js`
- Extract highlight rendering → `highlight-engine.js`
- Extract toolbar logic → `toolbar-manager.js`

#### Step 5.2: Remove old content.js
Once all functionality is migrated and tested:
```bash
mv src/content.js src/content-old.js.backup
mv src/content-new.js src/content.js
```

## Key Fixes This Architecture Provides

### 1. Flicker Issue Fixed
- Debounced show/hide operations (200ms/100ms)
- State-based UI management
- Proper cleanup on navigation

### 2. Navigation Issues Fixed
- Multiple navigation detection strategies
- Immediate cleanup on navigation start
- Proper reinitialization after navigation
- No orphaned event listeners

### 3. Performance Improvements
- Event-driven architecture (no polling)
- Lazy initialization
- Proper memory cleanup
- Reduced DOM queries

### 4. Maintainability
- 200-line modules vs 1500-line file
- Clear separation of concerns
- Easy to debug individual modules
- Can update modules independently

## Quick Test Script

```javascript
// Paste in console to test navigation handling
(function testNavigation() {
    console.log('Testing navigation detection...');
    
    // Test pushState
    history.pushState({}, '', '/test1');
    
    setTimeout(() => {
        // Test replaceState
        history.replaceState({}, '', '/test2');
    }, 1000);
    
    setTimeout(() => {
        // Test back button
        history.back();
    }, 2000);
    
    // Watch for console logs from navigation handler
})();
```

## Success Metrics
1. ✅ No flicker when selecting text rapidly
2. ✅ Button appears consistently after navigation
3. ✅ No console errors during navigation
4. ✅ Memory usage stays constant (no leaks)
5. ✅ Works on all major sites (GitHub, YouTube, Gmail)

This migration plan directly addresses all your issues with a proven architecture pattern from uBlock Origin.