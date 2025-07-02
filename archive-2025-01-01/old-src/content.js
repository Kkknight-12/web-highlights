/**
 * Chrome Web Highlighter - Modular Content Script
 * Main entry point following CHROME_EXTENSION_ARCHITECTURE_GUIDE.md
 * This replaces the monolithic content.js with a modular approach
 */

(function() {
  'use strict';
  
  // ================================================================
  // 1. EARLY CHECKS & INITIALIZATION
  // ================================================================
  
  // Early exit if no chrome runtime
  if (typeof chrome === 'undefined' || !chrome.runtime) {
    console.warn('Chrome runtime not available');
    return;
  }
  
  // Skip chrome:// pages
  if (window.location.href.startsWith('chrome://')) {
    return;
  }
  
  // Check if already initialized
  if (window.__chromeHighlighterInitialized) {
    console.warn('Chrome Highlighter already initialized');
    return;
  }
  
  window.__chromeHighlighterInitialized = true;
  
  // ================================================================
  // 2. MODULE INITIALIZATION
  // ================================================================
  
  /**
   * Initialize the application with all modules
   */
  async function initializeApp() {
    try {
      console.log('Chrome Web Highlighter - Initializing modular architecture...');
      
      // Initialize state management
      initializeState();
      
      // Setup event listeners and wire modules
      setupEventWiring();
      
      // Initialize modules
      await initializeModules();
      
      // Setup UI components
      await setupUIComponents();
      
      // Load existing highlights
      await loadInitialHighlights();
      
      console.log('Chrome Web Highlighter - Initialization complete');
      
    } catch (error) {
      console.error('Failed to initialize Chrome Web Highlighter:', error);
      if (typeof ErrorHandler !== 'undefined') {
        ErrorHandler.handleError('initializeApp', error);
      }
    }
  }
  
  /**
   * Initialize state for all modules
   */
  function initializeState() {
    if (typeof StateManager === 'undefined') {
      console.error('StateManager not found');
      return;
    }
    
    // Register state for each module
    StateManager.register('app', {
      initialized: false,
      version: '1.0.0'
    });
    
    StateManager.register('selection', {
      currentText: '',
      currentRange: null,
      isSelecting: false
    });
    
    StateManager.register('highlights', {
      loaded: false,
      count: 0,
      currentHighlight: null
    });
    
    StateManager.register('ui', {
      highlightButtonVisible: false,
      miniToolbarVisible: false,
      selectedColor: Constants.COLORS.DEFAULT_COLOR
    });
    
    StateManager.register('navigation', {
      currentUrl: window.location.href,
      lastUrl: null
    });
  }
  
  /**
   * Setup event wiring between modules
   */
  function setupEventWiring() {
    if (typeof EventBus === 'undefined') {
      console.error('EventBus not found');
      return;
    }
    
    // Selection events -> UI
    EventBus.on('selection:valid', (data) => {
      if (typeof HighlightButton !== 'undefined') {
        HighlightButton.show(data.bounds);
      }
    });
    
    EventBus.on('selection:cleared', () => {
      if (typeof HighlightButton !== 'undefined') {
        HighlightButton.hide();
      }
    });
    
    // Highlight button -> Highlighter
    EventBus.on('highlightButton:clicked', async (data) => {
      if (typeof Highlighter !== 'undefined' && typeof Selection !== 'undefined') {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const selectionInfo = Selection.getSelectionInfo(selection, range);
          if (selectionInfo) {
            const highlight = await Highlighter.applyHighlight(
              selectionInfo.range,
              data.color || Constants.COLORS.DEFAULT_COLOR
            );
            
            // Save to storage
            if (highlight && typeof Storage !== 'undefined') {
              await Storage.saveHighlight(highlight);
            }
            
            // Clear selection
            Selection.clearSelection();
          }
        }
      }
    });
    
    // Highlight click -> Mini toolbar
    EventBus.on('highlight:clicked', (data) => {
      if (typeof MiniToolbar !== 'undefined' && data.element) {
        const rect = data.element.getBoundingClientRect();
        MiniToolbar.show(rect, data.id, data.text);
      }
    });
    
    // Mini toolbar actions
    EventBus.on('miniToolbar:removeRequest', async (data) => {
      if (typeof Highlighter !== 'undefined' && typeof Storage !== 'undefined') {
        await Highlighter.removeHighlight(data.highlightId);
        await Storage.removeHighlight(data.highlightId);
      }
    });
    
    EventBus.on('miniToolbar:colorRequest', (data) => {
      // Show color picker for highlight
      if (typeof ColorPicker !== 'undefined') {
        const element = document.querySelector(`[data-highlight-id="${data.highlightId}"]`);
        if (element) {
          const rect = element.getBoundingClientRect();
          ColorPicker.show(rect, data.highlightId);
        }
      }
    });
    
    // Color change
    EventBus.on('colorPicker:colorSelected', async (data) => {
      const highlightId = data.highlightId;
      if (highlightId && typeof Highlighter !== 'undefined' && typeof Storage !== 'undefined') {
        // Update highlight color
        const elements = document.querySelectorAll(`[data-highlight-id="${highlightId}"]`);
        elements.forEach(el => {
          const colorConfig = Constants.COLORS.HIGHLIGHT_COLORS[data.color];
          if (colorConfig) {
            el.style.backgroundColor = colorConfig.bg;
            el.style.borderBottomColor = colorConfig.border;
          }
        });
        
        // Update in storage
        await Storage.updateHighlight(highlightId, { color: data.color });
      }
    });
    
    // Navigation events
    EventBus.on('navigation:changed', async (data) => {
      console.log('Navigation detected:', data);
      
      // Clear UI
      if (typeof HighlightButton !== 'undefined') {
        HighlightButton.hide();
      }
      
      if (typeof MiniToolbar !== 'undefined') {
        MiniToolbar.hide();
      }
      
      // Reload highlights for new page
      if (typeof Highlighter !== 'undefined') {
        await Highlighter.removeAllHighlights();
        await loadInitialHighlights();
      }
    });
    
    // Storage events
    EventBus.on('storage:highlightSaved', (data) => {
      console.log('Highlight saved:', data.id);
      StateManager.set('highlights', 'count', StateManager.get('highlights', 'count') + 1);
    });
    
    EventBus.on('storage:highlightRemoved', (data) => {
      console.log('Highlight removed:', data.id);
      StateManager.set('highlights', 'count', Math.max(0, StateManager.get('highlights', 'count') - 1));
    });
    
    // Error events
    EventBus.on('error:contextInvalidated', () => {
      console.warn('Extension context invalidated - stopping operations');
      cleanup();
    });
  }
  
  /**
   * Initialize all modules
   */
  async function initializeModules() {
    // Initialize error handler first
    if (typeof ErrorHandler !== 'undefined') {
      console.log('✓ Error Handler ready');
    }
    
    // Initialize navigation module
    if (typeof Navigation !== 'undefined') {
      Navigation.init();
      console.log('✓ Navigation module initialized');
    }
    
    // Initialize selection module
    if (typeof Selection !== 'undefined') {
      Selection.init();
      console.log('✓ Selection module initialized');
    }
    
    // Initialize storage module
    if (typeof Storage !== 'undefined') {
      await Storage.init();
      console.log('✓ Storage module initialized');
    }
    
    // Initialize highlighter module (already self-initializes)
    if (typeof Highlighter !== 'undefined') {
      console.log('✓ Highlighter module ready');
    }
    
    StateManager.set('app', 'initialized', true);
  }
  
  /**
   * Setup UI components
   */
  async function setupUIComponents() {
    try {
      // Initialize highlight button
      if (typeof HighlightButton !== 'undefined') {
        HighlightButton.init();
        console.log('✓ Highlight button initialized');
      }
      
      // Initialize mini toolbar
      if (typeof MiniToolbar !== 'undefined') {
        MiniToolbar.init();
        console.log('✓ Mini toolbar initialized');
      }
      
      // Initialize color picker
      if (typeof ColorPicker !== 'undefined') {
        ColorPicker.init();
        console.log('✓ Color picker initialized');
      }
      
    } catch (error) {
      console.error('Failed to setup UI components:', error);
      if (typeof ErrorHandler !== 'undefined') {
        ErrorHandler.handleError('setupUIComponents', error);
      }
    }
  }
  
  /**
   * Load initial highlights for current page
   */
  async function loadInitialHighlights() {
    try {
      if (typeof Highlighter === 'undefined' || typeof Navigation === 'undefined') {
        console.warn('Required modules not available for loading highlights');
        return;
      }
      
      const currentUrl = Navigation.getStorageUrl(window.location.href);
      await Highlighter.loadHighlights(currentUrl);
      
      const count = StateManager.get('highlighter', 'loadedHighlights')?.size || 0;
      StateManager.set('highlights', 'count', count);
      StateManager.set('highlights', 'loaded', true);
      
      console.log(`✓ Loaded ${count} highlights for current page`);
      
    } catch (error) {
      console.error('Failed to load highlights:', error);
      if (typeof ErrorHandler !== 'undefined') {
        ErrorHandler.handleError('loadInitialHighlights', error);
      }
    }
  }
  
  /**
   * Cleanup function for extension context invalidation
   */
  function cleanup() {
    try {
      // Cleanup UI components
      if (typeof HighlightButton !== 'undefined') {
        HighlightButton.cleanup();
      }
      
      if (typeof MiniToolbar !== 'undefined') {
        MiniToolbar.cleanup();
      }
      
      if (typeof ColorPicker !== 'undefined') {
        ColorPicker.cleanup();
      }
      
      // Clear state
      if (typeof StateManager !== 'undefined') {
        StateManager.reset('app');
        StateManager.reset('selection');
        StateManager.reset('highlights');
        StateManager.reset('ui');
        StateManager.reset('navigation');
      }
      
      // Mark as not initialized
      window.__chromeHighlighterInitialized = false;
      
      console.log('Chrome Web Highlighter - Cleanup complete');
      
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }
  
  // ================================================================
  // 3. MESSAGE HANDLING
  // ================================================================
  
  /**
   * Setup message listener for popup communication
   */
  function setupMessageListener() {
    if (!chrome.runtime || !chrome.runtime.onMessage) {
      console.warn('Chrome runtime messaging not available');
      return;
    }
    
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (typeof ErrorHandler !== 'undefined' && !ErrorHandler.isContextValid()) {
        sendResponse({ error: 'Extension context invalidated' });
        return true;
      }
      
      switch (request.action) {
        case 'getHighlights':
          handleGetHighlights(sendResponse);
          return true;
          
        case 'removeHighlight':
          handleRemoveHighlight(request.highlightId, sendResponse);
          return true;
          
        case 'removeAllHighlights':
          handleRemoveAllHighlights(sendResponse);
          return true;
          
        case 'getStats':
          handleGetStats(sendResponse);
          return true;
          
        default:
          sendResponse({ error: 'Unknown action' });
          return false;
      }
    });
  }
  
  async function handleGetHighlights(sendResponse) {
    try {
      if (typeof Storage !== 'undefined' && typeof Navigation !== 'undefined') {
        const url = Navigation.getStorageUrl(window.location.href);
        const highlights = await Storage.getHighlightsByUrl(url);
        sendResponse({ highlights });
      } else {
        sendResponse({ error: 'Modules not loaded' });
      }
    } catch (error) {
      sendResponse({ error: error.message });
    }
  }
  
  async function handleRemoveHighlight(highlightId, sendResponse) {
    try {
      if (typeof Highlighter !== 'undefined' && typeof Storage !== 'undefined') {
        await Highlighter.removeHighlight(highlightId);
        await Storage.removeHighlight(highlightId);
        sendResponse({ success: true });
      } else {
        sendResponse({ error: 'Modules not loaded' });
      }
    } catch (error) {
      sendResponse({ error: error.message });
    }
  }
  
  async function handleRemoveAllHighlights(sendResponse) {
    try {
      if (typeof Highlighter !== 'undefined' && typeof Storage !== 'undefined' && typeof Navigation !== 'undefined') {
        await Highlighter.removeAllHighlights();
        const url = Navigation.getStorageUrl(window.location.href);
        await Storage.clearHighlightsByUrl(url);
        sendResponse({ success: true });
      } else {
        sendResponse({ error: 'Modules not loaded' });
      }
    } catch (error) {
      sendResponse({ error: error.message });
    }
  }
  
  async function handleGetStats(sendResponse) {
    try {
      const stats = {
        highlightsCount: StateManager.get('highlights', 'count') || 0,
        loaded: StateManager.get('highlights', 'loaded') || false,
        currentUrl: window.location.href
      };
      
      if (typeof Storage !== 'undefined') {
        const storageStats = await Storage.getStats();
        Object.assign(stats, storageStats);
      }
      
      if (typeof ErrorHandler !== 'undefined') {
        const errorStats = ErrorHandler.getStats();
        stats.errors = errorStats;
      }
      
      sendResponse({ stats });
    } catch (error) {
      sendResponse({ error: error.message });
    }
  }
  
  // ================================================================
  // 4. INITIALIZATION
  // ================================================================
  
  /**
   * Wait for DOM and all modules to be ready
   */
  function waitForModules() {
    const requiredModules = [
      'EventBus',
      'StateManager', 
      'Constants',
      'ErrorHandler',
      'Storage',
      'Highlighter',
      'Selection',
      'Navigation',
      'DOMUtils',
      'HighlightButton',
      'MiniToolbar',
      'ColorPicker'
    ];
    
    const checkModules = () => {
      const allLoaded = requiredModules.every(module => typeof window[module] !== 'undefined');
      if (allLoaded) {
        console.log('All modules loaded, initializing app...');
        initializeApp();
        setupMessageListener();
      } else {
        const missing = requiredModules.filter(module => typeof window[module] === 'undefined');
        console.log('Waiting for modules:', missing);
        setTimeout(checkModules, 100);
      }
    };
    
    // Start checking after DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', checkModules);
    } else {
      checkModules();
    }
  }
  
  // Start the application
  waitForModules();
  
})();