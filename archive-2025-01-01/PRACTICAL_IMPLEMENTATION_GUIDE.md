# Practical Implementation Guide: Building a Production Chrome Extension

## Quick Start: From Zero to Working Extension

### Step 1: Project Setup (5 minutes)
```bash
mkdir my-extension && cd my-extension
mkdir -p src/{background,content,popup,common}/{modules}
mkdir -p src/{css,assets,libs}
touch manifest.json
```

### Step 2: Core Files Structure
```
my-extension/
├── manifest.json
├── src/
│   ├── background/
│   │   ├── main.js
│   │   └── modules/
│   │       ├── state.js
│   │       ├── messaging.js
│   │       └── storage.js
│   ├── content/
│   │   ├── main.js
│   │   └── modules/
│   │       └── dom-observer.js
│   ├── popup/
│   │   ├── popup.html
│   │   ├── main.js
│   │   └── modules/
│   │       └── ui.js
│   └── common/
│       ├── constants.js
│       ├── utils.js
│       └── broadcast.js
```

## Real Implementation Examples

### 1. Manifest Configuration
```json
{
  "manifest_version": 3,
  "name": "My Extension",
  "version": "1.0.0",
  "description": "A production-ready Chrome extension",
  
  "permissions": [
    "storage",
    "tabs",
    "activeTab"
  ],
  
  "host_permissions": [
    "<all_urls>"
  ],
  
  "background": {
    "service_worker": "src/background/main.js",
    "type": "module"
  },
  
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["src/content/main.js"],
      "run_at": "document_start",
      "all_frames": false
    }
  ],
  
  "action": {
    "default_popup": "src/popup/popup.html",
    "default_icon": {
      "16": "src/assets/icon16.png",
      "48": "src/assets/icon48.png",
      "128": "src/assets/icon128.png"
    }
  },
  
  "icons": {
    "16": "src/assets/icon16.png",
    "48": "src/assets/icon48.png",
    "128": "src/assets/icon128.png"
  },
  
  "web_accessible_resources": [
    {
      "resources": ["src/assets/*"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

### 2. Common Utilities Setup

#### constants.js
```javascript
// src/common/constants.js
export const EXTENSION_NAME = 'my-extension';

export const STORAGE_KEYS = {
    SETTINGS: 'settings',
    USER_DATA: 'userData',
    CACHE: 'cache'
};

export const MESSAGE_TYPES = {
    GET_STATE: 'getState',
    UPDATE_SETTING: 'updateSetting',
    CONTENT_READY: 'contentReady'
};

export const DEFAULT_SETTINGS = {
    enabled: true,
    theme: 'auto',
    features: {
        autoSave: true,
        notifications: true
    }
};
```

#### broadcast.js
```javascript
// src/common/broadcast.js
let channel = null;

export function getBroadcastChannel() {
    if (!channel) {
        channel = new BroadcastChannel('my-extension');
    }
    return channel;
}

export function broadcast(message) {
    const bc = getBroadcastChannel();
    bc.postMessage({
        timestamp: Date.now(),
        ...message
    });
}

export function onBroadcast(callback) {
    const bc = getBroadcastChannel();
    const handler = (event) => callback(event.data);
    bc.addEventListener('message', handler);
    
    // Return cleanup function
    return () => bc.removeEventListener('message', handler);
}
```

#### utils.js
```javascript
// src/common/utils.js
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

export function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

export async function safeAsync(asyncFn, fallback = null) {
    try {
        return await asyncFn();
    } catch (error) {
        console.error('Async operation failed:', error);
        return fallback;
    }
}

export function generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
```

### 3. Background Script Implementation

#### main.js
```javascript
// src/background/main.js
import { StateManager } from './modules/state.js';
import { MessageHandler } from './modules/messaging.js';
import { StorageManager } from './modules/storage.js';
import { broadcast } from '../common/broadcast.js';
import { DEFAULT_SETTINGS } from '../common/constants.js';

class BackgroundService {
    constructor() {
        this.state = new StateManager();
        this.messaging = new MessageHandler(this);
        this.storage = new StorageManager();
        this.initialized = false;
    }

    async init() {
        try {
            console.log('Initializing background service...');
            
            // Load saved state
            await this.state.load();
            
            // Setup message handlers
            this.messaging.init();
            
            // Setup Chrome event listeners
            this.setupEventListeners();
            
            // Setup alarms for periodic tasks
            this.setupAlarms();
            
            this.initialized = true;
            broadcast({ type: 'backgroundReady' });
            
            console.log('Background service initialized');
        } catch (error) {
            console.error('Failed to initialize background:', error);
        }
    }

    setupEventListeners() {
        // Handle extension install/update
        chrome.runtime.onInstalled.addListener((details) => {
            if (details.reason === 'install') {
                this.handleInstall();
            } else if (details.reason === 'update') {
                this.handleUpdate(details.previousVersion);
            }
        });

        // Handle tab events
        chrome.tabs.onActivated.addListener((activeInfo) => {
            this.handleTabActivated(activeInfo);
        });

        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            if (changeInfo.status === 'complete') {
                this.handleTabUpdated(tab);
            }
        });

        // Handle extension icon click (when no popup)
        chrome.action.onClicked.addListener((tab) => {
            this.handleActionClick(tab);
        });
    }

    setupAlarms() {
        // Cleanup every hour
        chrome.alarms.create('cleanup', { periodInMinutes: 60 });
        
        // Sync every 30 minutes
        chrome.alarms.create('sync', { periodInMinutes: 30 });
        
        chrome.alarms.onAlarm.addListener((alarm) => {
            switch (alarm.name) {
                case 'cleanup':
                    this.performCleanup();
                    break;
                case 'sync':
                    this.performSync();
                    break;
            }
        });
    }

    async handleInstall() {
        // Set default settings
        await this.storage.set('settings', DEFAULT_SETTINGS);
        
        // Open welcome page
        chrome.tabs.create({
            url: chrome.runtime.getURL('src/pages/welcome.html')
        });
    }

    async handleUpdate(previousVersion) {
        // Perform any necessary migrations
        console.log(`Updated from version ${previousVersion}`);
    }

    async handleTabActivated(activeInfo) {
        this.state.setActiveTab(activeInfo.tabId);
        broadcast({ 
            type: 'tabActivated', 
            tabId: activeInfo.tabId 
        });
    }

    async handleTabUpdated(tab) {
        // Update tab info in state
        this.state.updateTab(tab.id, {
            url: tab.url,
            title: tab.title,
            status: tab.status
        });
    }

    async handleActionClick(tab) {
        // Toggle extension for current tab
        const enabled = await this.state.toggleTab(tab.id);
        
        // Update icon
        chrome.action.setIcon({
            tabId: tab.id,
            path: enabled 
                ? 'src/assets/icon-active.png' 
                : 'src/assets/icon-inactive.png'
        });
    }

    async performCleanup() {
        console.log('Performing cleanup...');
        await this.storage.cleanup();
        await this.state.cleanup();
    }

    async performSync() {
        console.log('Performing sync...');
        // Implement sync logic
    }
}

// Initialize service
const service = new BackgroundService();
service.init();

// Keep service worker alive
self.addEventListener('activate', event => {
    event.waitUntil(service.init());
});
```

#### state.js
```javascript
// src/background/modules/state.js
import { broadcast } from '../../common/broadcast.js';

export class StateManager {
    constructor() {
        this.state = {
            global: {
                enabled: true,
                settings: {}
            },
            tabs: new Map(),
            activeTabId: null
        };
    }

    async load() {
        const stored = await chrome.storage.local.get(['globalState']);
        if (stored.globalState) {
            this.state.global = stored.globalState;
        }
    }

    async save() {
        await chrome.storage.local.set({
            globalState: this.state.global
        });
    }

    setActiveTab(tabId) {
        this.state.activeTabId = tabId;
    }

    updateTab(tabId, info) {
        const existing = this.state.tabs.get(tabId) || {};
        this.state.tabs.set(tabId, {
            ...existing,
            ...info,
            lastUpdated: Date.now()
        });
    }

    async toggleTab(tabId) {
        const tab = this.state.tabs.get(tabId) || {};
        tab.enabled = !tab.enabled;
        this.state.tabs.set(tabId, tab);
        
        broadcast({
            type: 'tabStateChanged',
            tabId,
            enabled: tab.enabled
        });
        
        return tab.enabled;
    }

    getTabState(tabId) {
        return this.state.tabs.get(tabId) || {
            enabled: this.state.global.enabled
        };
    }

    cleanup() {
        // Remove data for closed tabs
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        const now = Date.now();
        
        for (const [tabId, tab] of this.state.tabs) {
            if (now - tab.lastUpdated > maxAge) {
                this.state.tabs.delete(tabId);
            }
        }
    }
}
```

#### messaging.js
```javascript
// src/background/modules/messaging.js
import { MESSAGE_TYPES } from '../../common/constants.js';

export class MessageHandler {
    constructor(service) {
        this.service = service;
        this.handlers = new Map();
        this.setupHandlers();
    }

    init() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.handleMessage(request, sender)
                .then(sendResponse)
                .catch(error => {
                    console.error('Message handling error:', error);
                    sendResponse({ error: error.message });
                });
            return true; // Keep channel open for async response
        });
    }

    setupHandlers() {
        this.handlers.set(MESSAGE_TYPES.GET_STATE, this.handleGetState.bind(this));
        this.handlers.set(MESSAGE_TYPES.UPDATE_SETTING, this.handleUpdateSetting.bind(this));
        this.handlers.set(MESSAGE_TYPES.CONTENT_READY, this.handleContentReady.bind(this));
    }

    async handleMessage(request, sender) {
        const { type, ...data } = request;
        
        const handler = this.handlers.get(type);
        if (!handler) {
            throw new Error(`Unknown message type: ${type}`);
        }

        return await handler(data, sender);
    }

    async handleGetState(data, sender) {
        const tabId = sender.tab?.id || data.tabId;
        const tabState = this.service.state.getTabState(tabId);
        const globalState = this.service.state.state.global;
        
        return {
            success: true,
            state: {
                ...globalState,
                ...tabState,
                tabId
            }
        };
    }

    async handleUpdateSetting(data, sender) {
        const { key, value } = data;
        
        // Update setting
        this.service.state.state.global.settings[key] = value;
        await this.service.state.save();
        
        // Broadcast change
        this.service.broadcast({
            type: 'settingChanged',
            key,
            value
        });
        
        return { success: true, key, value };
    }

    async handleContentReady(data, sender) {
        console.log(`Content script ready for tab ${sender.tab.id}`);
        
        // Send initial configuration
        return {
            success: true,
            config: this.service.state.getTabState(sender.tab.id)
        };
    }
}
```

#### storage.js
```javascript
// src/background/modules/storage.js
import { STORAGE_KEYS } from '../../common/constants.js';

export class StorageManager {
    constructor() {
        this.cache = new Map();
        this.syncQueue = [];
        this.syncInterval = null;
    }

    async get(key) {
        // Check cache first
        if (this.cache.has(key)) {
            return this.cache.get(key);
        }

        // Fetch from storage
        const result = await chrome.storage.local.get(key);
        const value = result[key];
        
        // Update cache
        if (value !== undefined) {
            this.cache.set(key, value);
        }
        
        return value;
    }

    async set(key, value) {
        // Update cache immediately
        this.cache.set(key, value);
        
        // Queue for sync
        this.syncQueue.push({ key, value });
        
        // Start sync if not running
        if (!this.syncInterval) {
            this.startSync();
        }
    }

    startSync() {
        this.syncInterval = setTimeout(() => {
            this.sync();
        }, 1000); // Sync after 1 second
    }

    async sync() {
        if (this.syncQueue.length === 0) {
            this.syncInterval = null;
            return;
        }

        // Batch all updates
        const updates = {};
        for (const { key, value } of this.syncQueue) {
            updates[key] = value;
        }

        // Clear queue
        this.syncQueue = [];
        this.syncInterval = null;

        // Save to storage
        try {
            await chrome.storage.local.set(updates);
        } catch (error) {
            console.error('Storage sync failed:', error);
            // Re-queue failed updates
            for (const [key, value] of Object.entries(updates)) {
                this.syncQueue.push({ key, value });
            }
        }
    }

    async remove(key) {
        this.cache.delete(key);
        await chrome.storage.local.remove(key);
    }

    async clear() {
        this.cache.clear();
        this.syncQueue = [];
        await chrome.storage.local.clear();
    }

    async cleanup() {
        // Force sync any pending changes
        if (this.syncQueue.length > 0) {
            await this.sync();
        }
        
        // Clean up old cache entries
        const maxCacheSize = 100;
        if (this.cache.size > maxCacheSize) {
            const entries = Array.from(this.cache.entries());
            const toRemove = entries.slice(0, entries.length - maxCacheSize);
            for (const [key] of toRemove) {
                this.cache.delete(key);
            }
        }
    }
}
```

### 4. Content Script Implementation

#### main.js
```javascript
// src/content/main.js
import { DOMObserver } from './modules/dom-observer.js';
import { generateId, safeAsync } from '../common/utils.js';
import { onBroadcast } from '../common/broadcast.js';
import { MESSAGE_TYPES } from '../common/constants.js';

class ContentScript {
    constructor() {
        this.id = generateId();
        this.observer = null;
        this.state = {
            enabled: false,
            config: {}
        };
        this.cleanupFunctions = [];
    }

    async init() {
        console.log('Initializing content script...');
        
        try {
            // Get initial state
            await this.loadState();
            
            // Only proceed if enabled
            if (!this.state.enabled) {
                console.log('Extension disabled for this site');
                return;
            }
            
            // Setup components
            this.setupObserver();
            this.setupListeners();
            this.injectStyles();
            
            // Notify background that we're ready
            await this.sendMessage({
                type: MESSAGE_TYPES.CONTENT_READY,
                url: window.location.href
            });
            
            console.log('Content script initialized');
        } catch (error) {
            console.error('Content script init failed:', error);
        }
    }

    async loadState() {
        const response = await this.sendMessage({
            type: MESSAGE_TYPES.GET_STATE
        });
        
        if (response.success) {
            this.state = response.state;
        }
    }

    setupObserver() {
        this.observer = new DOMObserver();
        
        this.observer.on('added', (elements) => {
            this.handleElementsAdded(elements);
        });
        
        this.observer.on('removed', (elements) => {
            this.handleElementsRemoved(elements);
        });
        
        this.observer.start();
    }

    setupListeners() {
        // Listen for broadcast messages
        const cleanup = onBroadcast((message) => {
            switch (message.type) {
                case 'settingChanged':
                    this.handleSettingChange(message);
                    break;
                case 'tabStateChanged':
                    this.handleStateChange(message);
                    break;
            }
        });
        
        this.cleanupFunctions.push(cleanup);
        
        // Listen for page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.observer?.pause();
            } else {
                this.observer?.resume();
            }
        });
    }

    injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .my-extension-highlight {
                background-color: yellow !important;
                transition: background-color 0.3s;
            }
            
            .my-extension-tooltip {
                position: absolute;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                z-index: 10000;
                pointer-events: none;
            }
        `;
        document.head.appendChild(style);
    }

    handleElementsAdded(elements) {
        for (const element of elements) {
            this.processElement(element);
        }
    }

    handleElementsRemoved(elements) {
        // Clean up any associated data
    }

    processElement(element) {
        // Skip if already processed
        if (element.dataset.myExtensionProcessed) return;
        
        // Example: Highlight specific text
        if (element.textContent?.includes('important')) {
            element.classList.add('my-extension-highlight');
            element.dataset.myExtensionProcessed = 'true';
        }
    }

    handleSettingChange(message) {
        const { key, value } = message;
        this.state.config[key] = value;
        
        // React to specific settings
        if (key === 'highlightColor') {
            this.updateHighlightColor(value);
        }
    }

    handleStateChange(message) {
        if (message.tabId === this.state.tabId) {
            this.state.enabled = message.enabled;
            
            if (message.enabled) {
                this.enable();
            } else {
                this.disable();
            }
        }
    }

    enable() {
        this.observer?.start();
        document.body.classList.add('my-extension-enabled');
    }

    disable() {
        this.observer?.stop();
        document.body.classList.remove('my-extension-enabled');
    }

    async sendMessage(message) {
        return safeAsync(
            () => chrome.runtime.sendMessage(message),
            { success: false, error: 'Failed to send message' }
        );
    }

    cleanup() {
        this.observer?.stop();
        this.cleanupFunctions.forEach(fn => fn());
        document.body.classList.remove('my-extension-enabled');
    }
}

// Initialize when appropriate
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

async function init() {
    // Check if we should run on this page
    if (window.location.protocol === 'chrome-extension:') return;
    if (window.location.protocol === 'chrome:') return;
    
    const contentScript = new ContentScript();
    await contentScript.init();
    
    // Cleanup on page unload
    window.addEventListener('unload', () => {
        contentScript.cleanup();
    });
}
```

#### dom-observer.js
```javascript
// src/content/modules/dom-observer.js
import { throttle } from '../../common/utils.js';

export class DOMObserver {
    constructor(options = {}) {
        this.options = {
            subtree: true,
            childList: true,
            attributes: false,
            attributeOldValue: false,
            characterData: false,
            characterDataOldValue: false,
            ...options
        };
        
        this.observer = null;
        this.listeners = new Map();
        this.isActive = false;
        this.isPaused = false;
        
        // Throttle mutation handling
        this.handleMutations = throttle(
            this._handleMutations.bind(this),
            100
        );
    }

    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
    }

    off(event, callback) {
        this.listeners.get(event)?.delete(callback);
    }

    emit(event, data) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in DOM observer callback:`, error);
                }
            });
        }
    }

    start(target = document.body) {
        if (this.isActive) return;
        
        this.observer = new MutationObserver(this.handleMutations);
        this.observer.observe(target, this.options);
        this.isActive = true;
        this.isPaused = false;
    }

    stop() {
        if (!this.isActive) return;
        
        this.observer?.disconnect();
        this.observer = null;
        this.isActive = false;
        this.isPaused = false;
    }

    pause() {
        this.isPaused = true;
    }

    resume() {
        this.isPaused = false;
    }

    _handleMutations(mutations) {
        if (this.isPaused) return;
        
        const addedElements = new Set();
        const removedElements = new Set();
        
        for (const mutation of mutations) {
            // Handle added nodes
            for (const node of mutation.addedNodes) {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    addedElements.add(node);
                    // Also get all child elements
                    const children = node.querySelectorAll('*');
                    children.forEach(child => addedElements.add(child));
                }
            }
            
            // Handle removed nodes
            for (const node of mutation.removedNodes) {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    removedElements.add(node);
                }
            }
        }
        
        // Emit events
        if (addedElements.size > 0) {
            this.emit('added', Array.from(addedElements));
        }
        
        if (removedElements.size > 0) {
            this.emit('removed', Array.from(removedElements));
        }
    }
}
```

### 5. Popup Implementation

#### popup.html
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <link rel="stylesheet" href="../css/popup.css">
</head>
<body>
    <div class="popup-container">
        <header class="popup-header">
            <h1>My Extension</h1>
            <button id="settings-btn" class="icon-button" title="Settings">⚙️</button>
        </header>
        
        <main class="popup-content">
            <div class="status-section">
                <div class="status-indicator" id="status"></div>
                <span id="status-text">Loading...</span>
            </div>
            
            <div class="controls-section">
                <label class="toggle-control">
                    <input type="checkbox" id="enabled-toggle">
                    <span>Enable for this site</span>
                </label>
                
                <div class="feature-controls" id="features">
                    <!-- Dynamic feature toggles -->
                </div>
            </div>
            
            <div class="stats-section" id="stats">
                <!-- Dynamic stats -->
            </div>
        </main>
        
        <footer class="popup-footer">
            <a href="#" id="help-link">Help</a>
            <span class="version">v1.0.0</span>
        </footer>
    </div>
    
    <script type="module" src="main.js"></script>
</body>
</html>
```

#### main.js (popup)
```javascript
// src/popup/main.js
import { PopupUI } from './modules/ui.js';
import { MESSAGE_TYPES } from '../common/constants.js';
import { onBroadcast } from '../common/broadcast.js';

class PopupController {
    constructor() {
        this.ui = new PopupUI();
        this.currentTab = null;
        this.state = null;
    }

    async init() {
        try {
            // Get current tab
            const [tab] = await chrome.tabs.query({ 
                active: true, 
                currentWindow: true 
            });
            this.currentTab = tab;
            
            // Load state
            await this.loadState();
            
            // Setup UI
            this.ui.init(this.state);
            
            // Setup listeners
            this.setupListeners();
            
        } catch (error) {
            console.error('Popup init error:', error);
            this.ui.showError('Failed to initialize');
        }
    }

    async loadState() {
        const response = await chrome.runtime.sendMessage({
            type: MESSAGE_TYPES.GET_STATE,
            tabId: this.currentTab.id
        });
        
        if (response.success) {
            this.state = response.state;
        } else {
            throw new Error('Failed to load state');
        }
    }

    setupListeners() {
        // UI events
        this.ui.on('toggle', (feature, value) => {
            this.updateFeature(feature, value);
        });
        
        this.ui.on('settings', () => {
            chrome.runtime.openOptionsPage();
        });
        
        // Broadcast events
        const cleanup = onBroadcast((message) => {
            if (message.type === 'stateChanged' && 
                message.tabId === this.currentTab.id) {
                this.state = message.state;
                this.ui.update(this.state);
            }
        });
        
        // Clean up on unload
        window.addEventListener('unload', cleanup);
    }

    async updateFeature(feature, value) {
        try {
            const response = await chrome.runtime.sendMessage({
                type: MESSAGE_TYPES.UPDATE_SETTING,
                key: feature,
                value: value
            });
            
            if (response.success) {
                this.ui.showSuccess('Updated');
            }
        } catch (error) {
            this.ui.showError('Update failed');
        }
    }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    const controller = new PopupController();
    controller.init();
});
```

#### ui.js (popup module)
```javascript
// src/popup/modules/ui.js
export class PopupUI {
    constructor() {
        this.elements = {};
        this.listeners = new Map();
    }

    init(state) {
        this.cacheElements();
        this.render(state);
        this.attachListeners();
    }

    cacheElements() {
        this.elements = {
            status: document.getElementById('status'),
            statusText: document.getElementById('status-text'),
            enabledToggle: document.getElementById('enabled-toggle'),
            features: document.getElementById('features'),
            stats: document.getElementById('stats'),
            settingsBtn: document.getElementById('settings-btn'),
            helpLink: document.getElementById('help-link')
        };
    }

    render(state) {
        // Update status
        this.updateStatus(state.enabled);
        
        // Update enabled toggle
        this.elements.enabledToggle.checked = state.enabled;
        
        // Render features
        this.renderFeatures(state.features || {});
        
        // Render stats
        this.renderStats(state.stats || {});
    }

    updateStatus(enabled) {
        this.elements.status.className = `status-indicator ${enabled ? 'active' : 'inactive'}`;
        this.elements.statusText.textContent = enabled ? 'Active' : 'Inactive';
    }

    renderFeatures(features) {
        this.elements.features.innerHTML = '';
        
        for (const [key, value] of Object.entries(features)) {
            const control = this.createFeatureControl(key, value);
            this.elements.features.appendChild(control);
        }
    }

    createFeatureControl(key, value) {
        const label = document.createElement('label');
        label.className = 'feature-control';
        
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = value;
        input.dataset.feature = key;
        
        const span = document.createElement('span');
        span.textContent = this.formatFeatureName(key);
        
        label.appendChild(input);
        label.appendChild(span);
        
        return label;
    }

    renderStats(stats) {
        this.elements.stats.innerHTML = '';
        
        for (const [key, value] of Object.entries(stats)) {
            const stat = document.createElement('div');
            stat.className = 'stat-item';
            stat.innerHTML = `
                <span class="stat-label">${this.formatStatName(key)}:</span>
                <span class="stat-value">${value}</span>
            `;
            this.elements.stats.appendChild(stat);
        }
    }

    attachListeners() {
        // Main toggle
        this.elements.enabledToggle.addEventListener('change', (e) => {
            this.emit('toggle', 'enabled', e.target.checked);
        });
        
        // Feature toggles
        this.elements.features.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox') {
                const feature = e.target.dataset.feature;
                this.emit('toggle', feature, e.target.checked);
            }
        });
        
        // Settings button
        this.elements.settingsBtn.addEventListener('click', () => {
            this.emit('settings');
        });
        
        // Help link
        this.elements.helpLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.emit('help');
        });
    }

    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
    }

    emit(event, ...args) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.forEach(callback => callback(...args));
        }
    }

    update(state) {
        this.render(state);
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }

    formatFeatureName(key) {
        return key.replace(/([A-Z])/g, ' $1')
                  .replace(/^./, str => str.toUpperCase());
    }

    formatStatName(key) {
        return this.formatFeatureName(key);
    }
}
```

### 6. CSS Styling

```css
/* src/css/popup.css */
:root {
    --primary-color: #1a73e8;
    --text-primary: #202124;
    --text-secondary: #5f6368;
    --border-color: #dadce0;
    --bg-hover: #f8f9fa;
    --success-color: #1e8e3e;
    --error-color: #d93025;
}

* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

body {
    width: 320px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    color: var(--text-primary);
}

.popup-container {
    display: flex;
    flex-direction: column;
    min-height: 400px;
}

/* Header */
.popup-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    border-bottom: 1px solid var(--border-color);
}

.popup-header h1 {
    font-size: 16px;
    font-weight: 500;
}

.icon-button {
    background: none;
    border: none;
    cursor: pointer;
    padding: 8px;
    border-radius: 50%;
    transition: background-color 0.2s;
}

.icon-button:hover {
    background-color: var(--bg-hover);
}

/* Content */
.popup-content {
    flex: 1;
    padding: 16px;
}

/* Status Section */
.status-section {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
}

.status-indicator {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    transition: background-color 0.3s;
}

.status-indicator.active {
    background-color: var(--success-color);
}

.status-indicator.inactive {
    background-color: var(--text-secondary);
}

/* Controls */
.controls-section {
    margin-bottom: 20px;
}

.toggle-control,
.feature-control {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 0;
    cursor: pointer;
}

.toggle-control:hover,
.feature-control:hover {
    background-color: var(--bg-hover);
    margin: 0 -8px;
    padding: 8px;
    border-radius: 4px;
}

input[type="checkbox"] {
    cursor: pointer;
}

.feature-controls {
    margin-top: 12px;
    padding-left: 24px;
}

/* Stats */
.stats-section {
    border-top: 1px solid var(--border-color);
    padding-top: 12px;
}

.stat-item {
    display: flex;
    justify-content: space-between;
    padding: 4px 0;
}

.stat-label {
    color: var(--text-secondary);
}

.stat-value {
    font-weight: 500;
}

/* Footer */
.popup-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-top: 1px solid var(--border-color);
    font-size: 12px;
}

.popup-footer a {
    color: var(--primary-color);
    text-decoration: none;
}

.popup-footer a:hover {
    text-decoration: underline;
}

.version {
    color: var(--text-secondary);
}

/* Notifications */
.notification {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%) translateY(-100px);
    background: white;
    padding: 12px 20px;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    transition: transform 0.3s;
    z-index: 1000;
}

.notification.show {
    transform: translateX(-50%) translateY(0);
}

.notification.success {
    border-left: 4px solid var(--success-color);
}

.notification.error {
    border-left: 4px solid var(--error-color);
}
```

## Testing Your Extension

### 1. Load in Chrome
```bash
1. Open Chrome and go to chrome://extensions/
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select your extension directory
```

### 2. Debug Background Script
```javascript
// In Chrome DevTools for service worker
chrome.storage.local.get(null, (items) => {
    console.log('All storage:', items);
});

// Test messaging
chrome.runtime.sendMessage({ type: 'getState' }, (response) => {
    console.log('Response:', response);
});
```

### 3. Debug Content Script
```javascript
// In page console
// Check if content script is loaded
console.log('Extension elements:', 
    document.querySelectorAll('[data-my-extension-processed]')
);
```

## Production Checklist

1. **Performance**
   - [ ] Implement lazy loading for heavy modules
   - [ ] Use throttling/debouncing for frequent operations
   - [ ] Clean up listeners and observers on unload
   - [ ] Implement caching strategies

2. **Error Handling**
   - [ ] Wrap all async operations in try-catch
   - [ ] Implement fallback behaviors
   - [ ] Log errors appropriately
   - [ ] Handle extension context invalidation

3. **Security**
   - [ ] Validate all inputs
   - [ ] Use minimal permissions
   - [ ] Sanitize dynamic content
   - [ ] Implement CSP headers

4. **User Experience**
   - [ ] Show loading states
   - [ ] Provide feedback for actions
   - [ ] Handle edge cases gracefully
   - [ ] Test on various websites

5. **Maintenance**
   - [ ] Use consistent code style
   - [ ] Document complex logic
   - [ ] Implement logging system
   - [ ] Set up error reporting

This implementation guide provides a complete, production-ready Chrome extension structure that you can build upon for any type of extension.