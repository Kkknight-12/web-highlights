# Chrome Extension Architecture Guide
## Building Complex Extensions the Right Way

### Table of Contents
1. [Core Architecture Principles](#core-architecture-principles)
2. [Module Organization](#module-organization)
3. [Communication Patterns](#communication-patterns)
4. [State Management](#state-management)
5. [Storage Architecture](#storage-architecture)
6. [Event Handling](#event-handling)
7. [Performance Patterns](#performance-patterns)
8. [Error Handling](#error-handling)
9. [Security Best Practices](#security-best-practices)
10. [Testing Strategy](#testing-strategy)

---

## Core Architecture Principles

### 1. **Separation of Concerns**
Each module should have a single, well-defined responsibility.

```javascript
// ❌ BAD: Mixed responsibilities
const ExtensionManager = {
  saveHighlight() { /* storage logic */ },
  showButton() { /* UI logic */ },
  trackEvent() { /* analytics logic */ },
  syncToCloud() { /* sync logic */ }
};

// ✅ GOOD: Separated concerns
const StorageManager = { /* storage logic */ };
const UIManager = { /* UI logic */ };
const Analytics = { /* analytics logic */ };
const SyncService = { /* sync logic */ };
```

### 2. **Event-Driven Architecture**
Components communicate through events, not direct calls.

```javascript
// ❌ BAD: Direct coupling
function onTextSelected() {
  UIManager.showButton();
  StorageManager.prepare();
  Analytics.track();
}

// ✅ GOOD: Event-driven
function onTextSelected() {
  EventBus.emit('text:selected', { text, range });
}
// Each module listens independently
EventBus.on('text:selected', UIManager.handleSelection);
EventBus.on('text:selected', StorageManager.prepare);
EventBus.on('text:selected', Analytics.track);
```

### 3. **Fail Gracefully**
Always assume things can fail, especially Chrome APIs.

```javascript
// ✅ GOOD: Defensive programming
async function saveToStorage(data) {
  try {
    if (!chrome?.storage?.local) {
      console.warn('Storage API not available');
      return false;
    }
    await chrome.storage.local.set(data);
    return true;
  } catch (error) {
    console.error('Storage save failed:', error);
    return false;
  }
}
```

---

## Module Organization

### Directory Structure
```
extension/
├── manifest.json
├── background/
│   ├── index.js          # Entry point
│   ├── modules/
│   │   ├── storage.js
│   │   ├── messaging.js
│   │   ├── contextMenu.js
│   │   └── analytics.js
│   └── services/
│       ├── sync.js
│       └── ai.js
├── content/
│   ├── index.js          # Entry point
│   ├── modules/
│   │   ├── highlighter.js
│   │   ├── selection.js
│   │   └── ui/
│   │       ├── button.js
│   │       └── toolbar.js
│   └── styles/
│       └── content.css
├── popup/
│   ├── index.html
│   ├── index.js
│   └── styles.css
├── shared/
│   ├── constants.js
│   ├── utils.js
│   └── eventBus.js
└── lib/
    └── third-party/
```

### Module Template
Every module should follow this pattern:

```javascript
// modules/example.js

// Module definition
const ExampleModule = (() => {
  // Private state
  let initialized = false;
  const privateData = new Map();
  
  // Private methods
  function privateMethod() {
    // Implementation
  }
  
  // Public API
  return {
    // Initialization
    async init() {
      if (initialized) return;
      
      // Setup code
      EventBus.on('some:event', this.handleEvent);
      
      initialized = true;
    },
    
    // Cleanup
    destroy() {
      EventBus.off('some:event', this.handleEvent);
      privateData.clear();
      initialized = false;
    },
    
    // Public methods
    publicMethod() {
      if (!initialized) {
        console.warn('Module not initialized');
        return;
      }
      // Implementation
    },
    
    // Event handlers
    handleEvent(data) {
      // Handle event
    }
  };
})();

export default ExampleModule;
```

---

## Communication Patterns

### 1. **Message Bus Pattern**
Central communication hub for all modules.

```javascript
// shared/messageBus.js
class MessageBus {
  constructor() {
    this.channels = new Map();
    this.messageId = 0;
  }
  
  // Subscribe to a channel
  on(channel, handler, options = {}) {
    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Set());
    }
    
    const wrappedHandler = {
      handler,
      once: options.once || false,
      filter: options.filter || null
    };
    
    this.channels.get(channel).add(wrappedHandler);
    
    // Return unsubscribe function
    return () => {
      const handlers = this.channels.get(channel);
      if (handlers) {
        handlers.delete(wrappedHandler);
      }
    };
  }
  
  // Publish to a channel
  emit(channel, data) {
    const handlers = this.channels.get(channel);
    if (!handlers) return;
    
    const message = {
      id: ++this.messageId,
      channel,
      data,
      timestamp: Date.now()
    };
    
    handlers.forEach(({ handler, once, filter }) => {
      if (filter && !filter(data)) return;
      
      try {
        handler(message);
      } catch (error) {
        console.error(`Error in handler for ${channel}:`, error);
      }
      
      if (once) {
        handlers.delete(handler);
      }
    });
  }
  
  // Request-response pattern
  async request(channel, data, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const requestId = ++this.messageId;
      const responseChannel = `${channel}:response:${requestId}`;
      
      const timer = setTimeout(() => {
        this.off(responseChannel);
        reject(new Error(`Request timeout for ${channel}`));
      }, timeout);
      
      const unsubscribe = this.on(responseChannel, (response) => {
        clearTimeout(timer);
        unsubscribe();
        resolve(response.data);
      }, { once: true });
      
      this.emit(channel, { ...data, requestId });
    });
  }
  
  // Respond to a request
  respond(originalMessage, responseData) {
    const { channel, requestId } = originalMessage;
    if (!requestId) return;
    
    this.emit(`${channel}:response:${requestId}`, responseData);
  }
}

export const messageBus = new MessageBus();
```

### 2. **Chrome Message Passing**
Wrapper for Chrome's message passing API.

```javascript
// modules/chromeMessaging.js
const ChromeMessaging = (() => {
  const handlers = new Map();
  
  // Initialize listener
  function init() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      const { type, data } = message;
      const handler = handlers.get(type);
      
      if (!handler) {
        console.warn(`No handler for message type: ${type}`);
        return false;
      }
      
      // Handle async responses
      const result = handler(data, sender);
      if (result instanceof Promise) {
        result
          .then(response => sendResponse({ success: true, data: response }))
          .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Keep channel open
      }
      
      // Handle sync responses
      sendResponse({ success: true, data: result });
      return false;
    });
  }
  
  // Register a message handler
  function on(type, handler) {
    handlers.set(type, handler);
  }
  
  // Send a message
  async function send(type, data, tabId = null) {
    const message = { type, data };
    
    try {
      if (tabId) {
        return await chrome.tabs.sendMessage(tabId, message);
      }
      return await chrome.runtime.sendMessage(message);
    } catch (error) {
      console.error(`Failed to send message ${type}:`, error);
      throw error;
    }
  }
  
  // Broadcast to all tabs
  async function broadcast(type, data) {
    const tabs = await chrome.tabs.query({});
    const promises = tabs.map(tab => 
      send(type, data, tab.id).catch(() => null)
    );
    return Promise.all(promises);
  }
  
  return { init, on, send, broadcast };
})();
```

---

## State Management

### Centralized State Manager
```javascript
// modules/stateManager.js
class StateManager {
  constructor() {
    this.state = new Map();
    this.subscribers = new Map();
    this.history = [];
    this.maxHistory = 10;
  }
  
  // Initialize a module's state
  register(module, initialState = {}) {
    this.state.set(module, {
      current: { ...initialState },
      initial: { ...initialState }
    });
    this.subscribers.set(module, new Set());
  }
  
  // Get state
  get(module, path = null) {
    const moduleState = this.state.get(module);
    if (!moduleState) return undefined;
    
    if (!path) return moduleState.current;
    
    // Support dot notation: 'user.settings.theme'
    return path.split('.').reduce((obj, key) => 
      obj?.[key], moduleState.current
    );
  }
  
  // Set state with change tracking
  set(module, updates, options = {}) {
    const moduleState = this.state.get(module);
    if (!moduleState) {
      console.warn(`Module ${module} not registered`);
      return;
    }
    
    const previousState = { ...moduleState.current };
    
    // Handle function updates
    if (typeof updates === 'function') {
      updates = updates(previousState);
    }
    
    // Merge updates
    moduleState.current = {
      ...previousState,
      ...updates
    };
    
    // Track history
    if (!options.silent) {
      this.history.push({
        module,
        previous: previousState,
        current: moduleState.current,
        timestamp: Date.now()
      });
      
      if (this.history.length > this.maxHistory) {
        this.history.shift();
      }
    }
    
    // Notify subscribers
    this.notify(module, moduleState.current, previousState);
  }
  
  // Subscribe to state changes
  subscribe(module, callback, options = {}) {
    const subscribers = this.subscribers.get(module);
    if (!subscribers) {
      console.warn(`Module ${module} not registered`);
      return () => {};
    }
    
    const subscriber = {
      callback,
      filter: options.filter || null
    };
    
    subscribers.add(subscriber);
    
    // Return unsubscribe function
    return () => subscribers.delete(subscriber);
  }
  
  // Notify subscribers
  notify(module, current, previous) {
    const subscribers = this.subscribers.get(module);
    if (!subscribers) return;
    
    subscribers.forEach(({ callback, filter }) => {
      if (filter && !filter(current, previous)) return;
      
      try {
        callback(current, previous);
      } catch (error) {
        console.error(`State subscriber error in ${module}:`, error);
      }
    });
  }
  
  // Reset module state
  reset(module) {
    const moduleState = this.state.get(module);
    if (!moduleState) return;
    
    const previous = { ...moduleState.current };
    moduleState.current = { ...moduleState.initial };
    
    this.notify(module, moduleState.current, previous);
  }
  
  // Get state history
  getHistory(module = null) {
    if (!module) return this.history;
    return this.history.filter(entry => entry.module === module);
  }
}

export const stateManager = new StateManager();
```

---

## Storage Architecture

### Layered Storage System
```javascript
// modules/storage/index.js
import { MemoryStorage } from './memoryStorage.js';
import { LocalStorage } from './localStorage.js';
import { SessionStorage } from './sessionStorage.js';
import { CloudStorage } from './cloudStorage.js';

class StorageManager {
  constructor() {
    this.layers = {
      memory: new MemoryStorage(),
      session: new SessionStorage(),
      local: new LocalStorage(),
      cloud: new CloudStorage()
    };
    
    this.config = {
      syncInterval: 30000, // 30 seconds
      cacheExpiry: 3600000 // 1 hour
    };
  }
  
  async init() {
    // Initialize all storage layers
    await Promise.all(
      Object.values(this.layers).map(layer => layer.init())
    );
    
    // Start sync timer
    this.startSync();
  }
  
  // Get with fallback through layers
  async get(key, options = {}) {
    const layers = options.layers || ['memory', 'session', 'local'];
    
    for (const layerName of layers) {
      const layer = this.layers[layerName];
      if (!layer) continue;
      
      const value = await layer.get(key);
      if (value !== undefined) {
        // Promote to higher layers
        if (layerName !== 'memory' && layers.includes('memory')) {
          await this.layers.memory.set(key, value);
        }
        return value;
      }
    }
    
    // Check cloud if enabled
    if (options.includeCloud && this.layers.cloud.isEnabled()) {
      const cloudValue = await this.layers.cloud.get(key);
      if (cloudValue !== undefined) {
        // Cache in local layers
        await this.set(key, cloudValue, { layers: layers });
        return cloudValue;
      }
    }
    
    return options.default || null;
  }
  
  // Set with write-through
  async set(key, value, options = {}) {
    const layers = options.layers || ['memory', 'session', 'local'];
    const promises = [];
    
    for (const layerName of layers) {
      const layer = this.layers[layerName];
      if (layer) {
        promises.push(layer.set(key, value));
      }
    }
    
    await Promise.all(promises);
    
    // Queue for cloud sync if enabled
    if (options.sync && this.layers.cloud.isEnabled()) {
      this.queueSync(key, value);
    }
  }
  
  // Delete from all layers
  async delete(key, options = {}) {
    const layers = options.layers || Object.keys(this.layers);
    const promises = [];
    
    for (const layerName of layers) {
      const layer = this.layers[layerName];
      if (layer) {
        promises.push(layer.delete(key));
      }
    }
    
    await Promise.all(promises);
  }
  
  // Batch operations
  async getBatch(keys, options = {}) {
    const results = {};
    
    // Try to get all from memory first
    const memoryResults = await this.layers.memory.getBatch(keys);
    const missingKeys = keys.filter(key => 
      memoryResults[key] === undefined
    );
    
    // Get missing from other layers
    if (missingKeys.length > 0) {
      const promises = missingKeys.map(async key => {
        const value = await this.get(key, options);
        results[key] = value;
      });
      await Promise.all(promises);
    }
    
    return { ...memoryResults, ...results };
  }
  
  // Storage statistics
  async getStats() {
    const stats = {};
    
    for (const [name, layer] of Object.entries(this.layers)) {
      stats[name] = await layer.getStats();
    }
    
    return stats;
  }
  
  // Sync management
  queueSync(key, value) {
    if (!this.syncQueue) {
      this.syncQueue = new Map();
    }
    this.syncQueue.set(key, { value, timestamp: Date.now() });
  }
  
  async performSync() {
    if (!this.syncQueue || this.syncQueue.size === 0) return;
    
    const batch = Array.from(this.syncQueue.entries());
    this.syncQueue.clear();
    
    try {
      await this.layers.cloud.setBatch(
        Object.fromEntries(batch)
      );
    } catch (error) {
      console.error('Sync failed:', error);
      // Re-queue failed items
      batch.forEach(([key, value]) => this.queueSync(key, value));
    }
  }
  
  startSync() {
    setInterval(() => this.performSync(), this.config.syncInterval);
  }
}

export const storage = new StorageManager();
```

### Memory Storage Implementation
```javascript
// modules/storage/memoryStorage.js
export class MemoryStorage {
  constructor() {
    this.cache = new Map();
    this.metadata = new Map();
  }
  
  async init() {
    // Memory storage doesn't need initialization
    return true;
  }
  
  async get(key) {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    
    const meta = this.metadata.get(key);
    
    // Check expiry
    if (meta?.expiry && Date.now() > meta.expiry) {
      this.delete(key);
      return undefined;
    }
    
    // Update access time
    if (meta) {
      meta.lastAccess = Date.now();
      meta.accessCount++;
    }
    
    return entry;
  }
  
  async set(key, value, options = {}) {
    this.cache.set(key, value);
    
    this.metadata.set(key, {
      created: Date.now(),
      lastAccess: Date.now(),
      accessCount: 0,
      size: this.estimateSize(value),
      expiry: options.ttl ? Date.now() + options.ttl : null
    });
    
    // Implement LRU if cache is too large
    this.evictIfNeeded();
  }
  
  async delete(key) {
    this.cache.delete(key);
    this.metadata.delete(key);
  }
  
  async getBatch(keys) {
    const results = {};
    for (const key of keys) {
      const value = await this.get(key);
      if (value !== undefined) {
        results[key] = value;
      }
    }
    return results;
  }
  
  estimateSize(value) {
    // Rough estimation
    return JSON.stringify(value).length;
  }
  
  evictIfNeeded() {
    const maxSize = 50 * 1024 * 1024; // 50MB
    let totalSize = 0;
    
    for (const meta of this.metadata.values()) {
      totalSize += meta.size;
    }
    
    if (totalSize <= maxSize) return;
    
    // Sort by last access time (LRU)
    const entries = Array.from(this.metadata.entries())
      .sort((a, b) => a[1].lastAccess - b[1].lastAccess);
    
    // Remove least recently used
    while (totalSize > maxSize && entries.length > 0) {
      const [key, meta] = entries.shift();
      totalSize -= meta.size;
      this.delete(key);
    }
  }
  
  async getStats() {
    let totalSize = 0;
    let totalItems = this.cache.size;
    
    for (const meta of this.metadata.values()) {
      totalSize += meta.size;
    }
    
    return {
      items: totalItems,
      size: totalSize,
      hits: Array.from(this.metadata.values())
        .reduce((sum, meta) => sum + meta.accessCount, 0)
    };
  }
}
```

---

## Event Handling

### Event Manager with Throttling
```javascript
// modules/eventManager.js
class EventManager {
  constructor() {
    this.listeners = new Map();
    this.throttled = new Map();
    this.debounced = new Map();
  }
  
  // Add event listener with options
  on(element, event, handler, options = {}) {
    const { 
      throttle, 
      debounce, 
      once, 
      passive = true,
      capture = false 
    } = options;
    
    let finalHandler = handler;
    
    // Apply throttling
    if (throttle) {
      finalHandler = this.throttle(handler, throttle);
      this.throttled.set(handler, finalHandler);
    }
    
    // Apply debouncing
    if (debounce) {
      finalHandler = this.debounce(handler, debounce);
      this.debounced.set(handler, finalHandler);
    }
    
    // Apply once
    if (once) {
      const originalHandler = finalHandler;
      finalHandler = (e) => {
        originalHandler(e);
        this.off(element, event, handler);
      };
    }
    
    // Store listener info
    const key = this.getKey(element, event);
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    
    const listenerInfo = {
      original: handler,
      wrapped: finalHandler,
      options: { passive, capture }
    };
    
    this.listeners.get(key).add(listenerInfo);
    
    // Add to DOM
    element.addEventListener(event, finalHandler, { passive, capture });
  }
  
  // Remove event listener
  off(element, event, handler) {
    const key = this.getKey(element, event);
    const listeners = this.listeners.get(key);
    
    if (!listeners) return;
    
    for (const info of listeners) {
      if (info.original === handler) {
        element.removeEventListener(event, info.wrapped, info.options);
        listeners.delete(info);
        
        // Clean up throttled/debounced
        this.throttled.delete(handler);
        this.debounced.delete(handler);
        
        break;
      }
    }
  }
  
  // Delegate events
  delegate(parent, selector, event, handler, options = {}) {
    const delegatedHandler = (e) => {
      const target = e.target.closest(selector);
      if (target && parent.contains(target)) {
        handler.call(target, e);
      }
    };
    
    this.on(parent, event, delegatedHandler, options);
    
    // Return unsubscribe function
    return () => this.off(parent, event, delegatedHandler);
  }
  
  // Throttle function
  throttle(func, delay) {
    let lastCall = 0;
    let timeout;
    
    return function throttled(...args) {
      const now = Date.now();
      const remaining = delay - (now - lastCall);
      
      if (remaining <= 0) {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
        lastCall = now;
        func.apply(this, args);
      } else if (!timeout) {
        timeout = setTimeout(() => {
          lastCall = Date.now();
          timeout = null;
          func.apply(this, args);
        }, remaining);
      }
    };
  }
  
  // Debounce function
  debounce(func, delay) {
    let timeout;
    
    return function debounced(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        func.apply(this, args);
      }, delay);
    };
  }
  
  // Get unique key for element-event pair
  getKey(element, event) {
    const id = element === window ? 'window' : 
               element === document ? 'document' : 
               element.id || 'element';
    return `${id}:${event}`;
  }
  
  // Remove all listeners
  removeAll() {
    for (const [key, listeners] of this.listeners) {
      const [elementId, event] = key.split(':');
      const element = elementId === 'window' ? window :
                     elementId === 'document' ? document :
                     document.getElementById(elementId);
      
      if (element) {
        for (const info of listeners) {
          element.removeEventListener(event, info.wrapped, info.options);
        }
      }
    }
    
    this.listeners.clear();
    this.throttled.clear();
    this.debounced.clear();
  }
}

export const eventManager = new EventManager();
```

---

## Performance Patterns

### 1. **Lazy Loading**
```javascript
// modules/lazyLoader.js
class LazyLoader {
  constructor() {
    this.modules = new Map();
    this.loading = new Map();
  }
  
  // Register a module for lazy loading
  register(name, loader) {
    this.modules.set(name, {
      loader,
      instance: null,
      loaded: false
    });
  }
  
  // Load a module
  async load(name) {
    const module = this.modules.get(name);
    if (!module) {
      throw new Error(`Module ${name} not registered`);
    }
    
    // Return existing instance
    if (module.loaded) {
      return module.instance;
    }
    
    // Return loading promise if already loading
    if (this.loading.has(name)) {
      return this.loading.get(name);
    }
    
    // Start loading
    const loadPromise = (async () => {
      try {
        module.instance = await module.loader();
        module.loaded = true;
        
        // Initialize if it has init method
        if (module.instance.init) {
          await module.instance.init();
        }
        
        return module.instance;
      } finally {
        this.loading.delete(name);
      }
    })();
    
    this.loading.set(name, loadPromise);
    return loadPromise;
  }
  
  // Preload modules
  async preload(names) {
    const promises = names.map(name => 
      this.load(name).catch(error => {
        console.error(`Failed to preload ${name}:`, error);
        return null;
      })
    );
    
    return Promise.all(promises);
  }
  
  // Unload a module
  async unload(name) {
    const module = this.modules.get(name);
    if (!module || !module.loaded) return;
    
    // Call destroy if available
    if (module.instance.destroy) {
      await module.instance.destroy();
    }
    
    module.instance = null;
    module.loaded = false;
  }
}

// Usage
const lazyLoader = new LazyLoader();

// Register modules
lazyLoader.register('ai', () => import('./services/ai.js'));
lazyLoader.register('sync', () => import('./services/sync.js'));
lazyLoader.register('analytics', () => import('./services/analytics.js'));

// Load when needed
async function useAI() {
  const ai = await lazyLoader.load('ai');
  return ai.generateSummary(text);
}
```

### 2. **Request Batching**
```javascript
// modules/batchProcessor.js
class BatchProcessor {
  constructor(processor, options = {}) {
    this.processor = processor;
    this.options = {
      maxBatchSize: options.maxBatchSize || 100,
      maxWaitTime: options.maxWaitTime || 100,
      processInterval: options.processInterval || 50
    };
    
    this.queue = [];
    this.processing = false;
    this.timer = null;
  }
  
  // Add item to batch
  add(item) {
    return new Promise((resolve, reject) => {
      this.queue.push({ item, resolve, reject });
      
      // Start timer if not already running
      if (!this.timer) {
        this.timer = setTimeout(
          () => this.processBatch(),
          this.options.maxWaitTime
        );
      }
      
      // Process immediately if batch is full
      if (this.queue.length >= this.options.maxBatchSize) {
        this.processBatch();
      }
    });
  }
  
  // Process the batch
  async processBatch() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    clearTimeout(this.timer);
    this.timer = null;
    
    // Extract batch
    const batch = this.queue.splice(0, this.options.maxBatchSize);
    const items = batch.map(b => b.item);
    
    try {
      // Process batch
      const results = await this.processor(items);
      
      // Resolve promises
      batch.forEach((b, index) => {
        b.resolve(results[index]);
      });
    } catch (error) {
      // Reject all promises
      batch.forEach(b => b.reject(error));
    } finally {
      this.processing = false;
      
      // Schedule next batch if queue not empty
      if (this.queue.length > 0) {
        setTimeout(
          () => this.processBatch(),
          this.options.processInterval
        );
      }
    }
  }
}

// Usage example
const highlightBatcher = new BatchProcessor(
  async (highlights) => {
    // Save multiple highlights at once
    return storage.setBatch(highlights);
  },
  { maxBatchSize: 50, maxWaitTime: 200 }
);
```

---

## Error Handling

### Global Error Handler
```javascript
// modules/errorHandler.js
class ErrorHandler {
  constructor() {
    this.handlers = new Map();
    this.errorLog = [];
    this.maxLogSize = 100;
    this.listeners = new Set();
  }
  
  // Initialize global error handling
  init() {
    // Handle uncaught errors
    window.addEventListener('error', (event) => {
      this.handle(new Error(event.message), {
        type: 'uncaught',
        filename: event.filename,
        line: event.lineno,
        column: event.colno
      });
    });
    
    // Handle promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handle(event.reason, {
        type: 'unhandledRejection',
        promise: event.promise
      });
      event.preventDefault();
    });
    
    // Chrome extension specific
    if (chrome?.runtime?.lastError) {
      this.handle(new Error(chrome.runtime.lastError.message), {
        type: 'chromeRuntime'
      });
    }
  }
  
  // Register error handler for specific error types
  register(errorType, handler) {
    this.handlers.set(errorType, handler);
  }
  
  // Handle an error
  handle(error, context = {}) {
    // Log error
    this.log(error, context);
    
    // Check for specific handler
    const handler = this.handlers.get(error.constructor.name) ||
                   this.handlers.get(error.code) ||
                   this.handlers.get('default');
    
    if (handler) {
      try {
        handler(error, context);
      } catch (handlerError) {
        console.error('Error in error handler:', handlerError);
      }
    }
    
    // Notify listeners
    this.notify(error, context);
    
    // Check if error is critical
    if (this.isCritical(error)) {
      this.handleCriticalError(error, context);
    }
  }
  
  // Log error
  log(error, context) {
    const entry = {
      timestamp: Date.now(),
      message: error.message,
      stack: error.stack,
      context,
      type: error.constructor.name
    };
    
    this.errorLog.push(entry);
    
    // Trim log if too large
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error logged:', entry);
    }
  }
  
  // Check if error is critical
  isCritical(error) {
    const criticalPatterns = [
      /quota.*exceeded/i,
      /out of memory/i,
      /maximum call stack/i,
      /extension context invalidated/i
    ];
    
    return criticalPatterns.some(pattern => 
      pattern.test(error.message)
    );
  }
  
  // Handle critical errors
  handleCriticalError(error, context) {
    // Notify user
    if (chrome?.notifications) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon.png',
        title: 'Extension Error',
        message: 'A critical error occurred. Please reload the extension.'
      });
    }
    
    // Try to recover
    this.attemptRecovery(error);
  }
  
  // Attempt recovery
  attemptRecovery(error) {
    if (error.message.includes('quota')) {
      // Clear cache
      storage.layers.memory.clear();
      storage.layers.session.clear();
    } else if (error.message.includes('context invalidated')) {
      // Reload extension
      chrome.runtime.reload();
    }
  }
  
  // Subscribe to errors
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
  
  // Notify listeners
  notify(error, context) {
    this.listeners.forEach(callback => {
      try {
        callback(error, context);
      } catch (e) {
        console.error('Error in error listener:', e);
      }
    });
  }
  
  // Get error statistics
  getStats() {
    const stats = {
      total: this.errorLog.length,
      byType: {},
      recent: this.errorLog.slice(-10)
    };
    
    this.errorLog.forEach(entry => {
      stats.byType[entry.type] = (stats.byType[entry.type] || 0) + 1;
    });
    
    return stats;
  }
}

export const errorHandler = new ErrorHandler();

// Utility function for safe execution
export function safeExecute(fn, defaultValue = null) {
  try {
    const result = fn();
    if (result instanceof Promise) {
      return result.catch(error => {
        errorHandler.handle(error, { function: fn.name });
        return defaultValue;
      });
    }
    return result;
  } catch (error) {
    errorHandler.handle(error, { function: fn.name });
    return defaultValue;
  }
}
```

---

## Security Best Practices

### 1. **Content Security Policy**
```javascript
// manifest.json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

### 2. **Input Sanitization**
```javascript
// modules/security.js
const Security = {
  // Sanitize HTML
  sanitizeHTML(html) {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
  },
  
  // Validate URLs
  isValidURL(string) {
    try {
      const url = new URL(string);
      return ['http:', 'https:'].includes(url.protocol);
    } catch {
      return false;
    }
  },
  
  // Generate secure IDs
  generateId() {
    return crypto.getRandomValues(new Uint32Array(4)).join('-');
  },
  
  // Hash sensitive data
  async hash(data) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
};
```

### 3. **Permission Management**
```javascript
// modules/permissions.js
const Permissions = {
  // Check if permission is granted
  async has(permission) {
    try {
      return await chrome.permissions.contains({ permissions: [permission] });
    } catch {
      return false;
    }
  },
  
  // Request permission
  async request(permission) {
    try {
      const granted = await chrome.permissions.request({ 
        permissions: [permission] 
      });
      
      if (granted) {
        messageBus.emit('permission:granted', permission);
      }
      
      return granted;
    } catch (error) {
      errorHandler.handle(error, { permission });
      return false;
    }
  },
  
  // Remove permission
  async remove(permission) {
    try {
      return await chrome.permissions.remove({ 
        permissions: [permission] 
      });
    } catch {
      return false;
    }
  }
};
```

---

## Testing Strategy

### Unit Testing Template
```javascript
// tests/example.test.js
import { ExampleModule } from '../modules/example.js';

describe('ExampleModule', () => {
  let module;
  
  beforeEach(() => {
    module = new ExampleModule();
    module.init();
  });
  
  afterEach(() => {
    module.destroy();
  });
  
  describe('publicMethod', () => {
    it('should return expected result', async () => {
      const result = await module.publicMethod('input');
      expect(result).toBe('expected');
    });
    
    it('should handle errors gracefully', async () => {
      const result = await module.publicMethod(null);
      expect(result).toBeNull();
    });
  });
});
```

### Integration Testing
```javascript
// tests/integration/highlight.test.js
describe('Highlight Integration', () => {
  it('should save highlight when text is selected', async () => {
    // Setup
    await browser.newPage();
    await page.goto('http://example.com');
    
    // Select text
    await page.evaluate(() => {
      const range = document.createRange();
      range.selectNodeContents(document.body);
      window.getSelection().addRange(range);
    });
    
    // Trigger highlight
    await page.keyboard.down('Control');
    await page.keyboard.press('H');
    await page.keyboard.up('Control');
    
    // Verify
    const highlights = await storage.get('highlights');
    expect(highlights).toHaveLength(1);
  });
});
```

---

## UI Components in Content Scripts

### Best Practices from Production Extensions

Based on analysis of uBlock Origin and AdBlock Plus:

#### 1. **NO Web Components in Content Scripts**
Web Components (`customElements`) are not reliable in content scripts due to:
- Isolated world execution context
- `customElements` API may be null
- Timing and compatibility issues

#### 2. **Use Regular DOM Elements**
Following uBlock Origin's proven approach:

```javascript
// Create regular DOM element with unique ID
const button = document.createElement('div');
const uniqueId = '__extension__button__' + Math.random().toString(36).substr(2, 9);
button.setAttribute('id', uniqueId);

// Apply inline styles with !important
button.style.cssText = `
  position: fixed !important;
  z-index: 2147483647 !important;
  /* all styles with !important */
`;

// Add methods directly to element or module
const ButtonModule = {
  show() { button.style.display = 'block !important'; },
  hide() { button.style.display = 'none !important'; }
};
```

#### 3. **uBlock Origin's UI Patterns**
- **IFrame isolation** for complex UI (element picker)
- **Unique attribute selectors** with random tokens
- **CSS injection via background script**
- **Very high z-index** (2147483647 - max 32-bit integer)
- **No Shadow DOM or Web Components**

##### uBlock's CSS Injection System (Exact Implementation)

**Content Script Side:**
```javascript
// vAPI.userStylesheet batches CSS operations
vAPI.userStylesheet = {
  added: new Set(),
  removed: new Set(),
  
  apply: function(callback) {
    if (this.added.size === 0 && this.removed.size === 0) { return; }
    
    vAPI.messaging.send('vapi', {
      what: 'userCSS',
      add: Array.from(this.added),
      remove: Array.from(this.removed),
    }).then(() => {
      if (callback instanceof Function) { callback(); }
    });
    
    this.added.clear();
    this.removed.clear();
  },
  
  add: function(cssText, now) {
    if (cssText === '') { return; }
    this.added.add(cssText);
    if (now) { this.apply(); }
  },
  
  remove: function(cssText, now) {
    if (cssText === '') { return; }
    this.removed.add(cssText);
    if (now) { this.apply(); }
  }
};
```

**Background Script Handler:**
```javascript
// In message handler
case 'userCSS': {
  if (tabId === undefined) { break; }
  const promises = [];
  
  if (msg.add) {
    const details = {
      code: undefined,
      frameId: portDetails.frameId,
      matchAboutBlank: true,
      runAt: 'document_start',
    };
    for (const cssText of msg.add) {
      details.code = cssText;
      promises.push(vAPI.tabs.insertCSS(tabId, details));
    }
  }
  
  if (msg.remove) {
    const details = {
      code: undefined,
      frameId: portDetails.frameId,
      matchAboutBlank: true,
    };
    for (const cssText of msg.remove) {
      details.code = cssText;
      promises.push(vAPI.tabs.removeCSS(tabId, details));
    }
  }
  
  Promise.all(promises).then(() => { callback(); });
  break;
}
```

**Key Features:**
- **Batching**: CSS operations are batched in Sets before sending
- **Port-based messaging**: Uses `browser.runtime.connect()` for long-lived connections
- **Frame-specific**: Injects CSS into specific frames using frameId
- **Error resilience**: All operations wrapped in try-catch
- **Early injection**: Uses `runAt: 'document_start'` for CSS

#### 4. **AdBlock Plus's UI Patterns**
- **Direct DOM injection** with regular elements
- **Inline styles with !important**
- **High z-index** (0x7FFFFFFE)
- **Event capture phase** for all events
- **No frameworks or complex abstractions**

#### 5. **Recommended Approach**
```javascript
const UIComponent = (() => {
  let element = null;
  const uniqueId = '__ext__' + Math.random().toString(36).substr(2, 9);
  
  function create() {
    element = document.createElement('div');
    element.setAttribute('id', uniqueId);
    element.style.cssText = 'position: fixed !important; z-index: 2147483647 !important;';
    document.documentElement.appendChild(element);
  }
  
  return {
    init() { if (!element) create(); },
    show() { element.style.display = 'block !important'; },
    hide() { element.style.display = 'none !important'; }
  };
})();
```

## Summary

This architecture provides:
1. **Modularity** - Each component has single responsibility
2. **Scalability** - Easy to add new features
3. **Performance** - Optimized for extension constraints
4. **Reliability** - Comprehensive error handling
5. **Maintainability** - Clear patterns and structure
6. **Proven UI Patterns** - Following successful production extensions

Follow these patterns and your Chrome extension will be robust, performant, and maintainable at any scale.