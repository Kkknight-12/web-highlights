// Chrome Web Highlighter - Debug Version with Enhanced Error Handling
// This version includes additional logging for debugging

(function() {
    'use strict';
    
    // Debug configuration
    const DEBUG = {
        enabled: true,
        logLevel: 'info', // 'error', 'warn', 'info', 'debug'
        logLifecycle: true,
        logApiCalls: true,
        logPerformance: true
    };
    
    // Debug logger
    const log = {
        error: (...args) => console.error('[Highlighter]', ...args),
        warn: (...args) => DEBUG.logLevel !== 'error' && console.warn('[Highlighter]', ...args),
        info: (...args) => ['info', 'debug'].includes(DEBUG.logLevel) && console.info('[Highlighter]', ...args),
        debug: (...args) => DEBUG.logLevel === 'debug' && console.debug('[Highlighter]', ...args)
    };
    
    // Performance tracking
    const perf = {
        marks: {},
        start: (name) => {
            if (DEBUG.logPerformance) {
                perf.marks[name] = performance.now();
            }
        },
        end: (name) => {
            if (DEBUG.logPerformance && perf.marks[name]) {
                const duration = performance.now() - perf.marks[name];
                log.debug(`Performance: ${name} took ${duration.toFixed(2)}ms`);
                delete perf.marks[name];
            }
        }
    };
    
    // Early exit if no chrome runtime
    if (typeof chrome === 'undefined' || !chrome.runtime) {
        log.info('Chrome runtime not available - extension may be reloading');
        return;
    }
    
    // State tracking
    const state = {
        isOrphaned: false,
        isInitialized: false,
        contextCheckCount: 0,
        errorCount: 0,
        highlightCount: 0
    };
    
    // Check if extension context is valid
    function isExtensionContextValid() {
        try {
            const valid = !!(chrome && chrome.runtime && chrome.runtime.id);
            if (!valid && DEBUG.logApiCalls) {
                log.debug('Context check failed', {
                    hasChrome: !!chrome,
                    hasRuntime: !!(chrome && chrome.runtime),
                    hasId: !!(chrome && chrome.runtime && chrome.runtime.id)
                });
            }
            return valid;
        } catch (e) {
            log.debug('Context check threw error:', e.message);
            return false;
        }
    }
    
    // Enhanced error handler
    async function executeWithErrorHandling(operation, callback) {
        const startTime = performance.now();
        
        try {
            if (DEBUG.logApiCalls) {
                log.debug(`Starting operation: ${operation}`);
            }
            
            const result = await callback();
            
            if (DEBUG.logApiCalls) {
                log.debug(`Completed operation: ${operation} (${(performance.now() - startTime).toFixed(2)}ms)`);
            }
            
            return result;
        } catch (error) {
            state.errorCount++;
            
            // Check if it's a context error
            const isContextError = error.message?.includes('Extension context invalidated') ||
                                 error.message?.includes('Cannot access a chrome');
            
            if (isContextError) {
                state.isOrphaned = true;
                if (DEBUG.logLifecycle) {
                    log.info(`Context invalidated during ${operation} - continuing without Chrome APIs`);
                }
            } else {
                // Log non-context errors
                log.error(`Error in ${operation}:`, error);
            }
            
            // Don't re-throw context errors
            if (!isContextError) {
                throw error;
            }
        }
    }
    
    // Constants
    const HIGHLIGHT_COLORS = {
        yellow: { bg: 'rgba(255, 224, 102, 0.4)', border: 'rgba(255, 224, 102, 0.6)', name: 'Yellow' },
        green: { bg: 'rgba(110, 231, 183, 0.4)', border: 'rgba(110, 231, 183, 0.6)', name: 'Green' },
        blue: { bg: 'rgba(147, 197, 253, 0.4)', border: 'rgba(147, 197, 253, 0.6)', name: 'Blue' },
        pink: { bg: 'rgba(252, 165, 165, 0.4)', border: 'rgba(252, 165, 165, 0.6)', name: 'Pink' }
    };
    const DEFAULT_COLOR = 'yellow';
    const STORAGE_KEY = 'highlights';
    
    // UI elements
    let highlightButtonContainer = null;
    let highlightButton = null;
    let colorPicker = null;
    let miniToolbar = null;
    
    // Selection state
    let selectedText = '';
    let selectedRange = null;
    let selectedColor = DEFAULT_COLOR;
    let currentHighlightId = null;
    
    // Flags
    let highlightsLoaded = false;
    
    // Initialize the extension
    async function initialize() {
        if (state.isInitialized) {
            log.warn('Already initialized');
            return;
        }
        
        log.info('Initializing Chrome Web Highlighter...');
        perf.start('initialization');
        
        if (!document.body) {
            log.warn('No document.body, deferring initialization');
            return;
        }
        
        // Create UI regardless of context
        createUI();
        setupEventListeners();
        
        // Only load highlights if context is valid
        if (isExtensionContextValid()) {
            // Delay to ensure DOM is ready
            setTimeout(() => {
                executeWithErrorHandling('loadHighlights', loadHighlights);
            }, 100);
            
            observeDOMChanges();
        } else {
            log.info('Context invalid at init, UI ready but no Chrome API access');
        }
        
        state.isInitialized = true;
        perf.end('initialization');
        
        // Set up debug interface
        if (DEBUG.enabled) {
            setupDebugInterface();
        }
    }
    
    // Create UI elements
    function createUI() {
        if (highlightButtonContainer) {
            log.debug('UI already created');
            return;
        }
        
        log.debug('Creating UI elements');
        
        // Create highlight button container
        highlightButtonContainer = document.createElement('div');
        highlightButtonContainer.id = 'web-highlighter-button-container';
        highlightButtonContainer.style.cssText = `
            position: absolute;
            z-index: 2147483647;
            display: none;
            align-items: center;
            gap: 8px;
        `;
        
        // ... (rest of UI creation code - keeping it the same for brevity)
        
        document.body.appendChild(highlightButtonContainer);
        log.debug('UI elements created and added to DOM');
    }
    
    // Save highlight with enhanced error handling
    async function saveHighlight(highlight) {
        return executeWithErrorHandling('saveHighlight', async () => {
            // Check context before attempting save
            if (!chrome.runtime || !chrome.runtime.id) {
                log.debug('Cannot save - no Chrome runtime');
                return false;
            }
            
            const highlights = await getHighlights();
            highlights.push(highlight);
            await chrome.storage.local.set({ [STORAGE_KEY]: highlights });
            
            state.highlightCount++;
            log.info(`Highlight saved (total: ${state.highlightCount})`);
            return true;
        });
    }
    
    // Get highlights with error handling
    async function getHighlights() {
        if (state.isOrphaned || !isExtensionContextValid()) {
            log.debug('Returning empty highlights - invalid context');
            return [];
        }
        
        return executeWithErrorHandling('getHighlights', async () => {
            if (!chrome.runtime?.id) {
                state.isOrphaned = true;
                return [];
            }
            
            const result = await chrome.storage.local.get(STORAGE_KEY);
            const highlights = result[STORAGE_KEY] || [];
            log.debug(`Retrieved ${highlights.length} highlights`);
            return highlights;
        }) || [];
    }
    
    // Debug interface for testing
    function setupDebugInterface() {
        window.__chromeHighlighterDebug = {
            state: () => ({ ...state }),
            
            stats: () => ({
                isOrphaned: state.isOrphaned,
                isInitialized: state.isInitialized,
                contextValid: isExtensionContextValid(),
                errorCount: state.errorCount,
                highlightCount: state.highlightCount,
                hasUI: !!highlightButtonContainer,
                highlightsLoaded
            }),
            
            testError: async () => {
                try {
                    await chrome.storage.local.get('test');
                } catch (e) {
                    console.log('Error test result:', e.message);
                }
            },
            
            forceOrphan: () => {
                state.isOrphaned = true;
                log.info('Forced orphan state');
            },
            
            resetState: () => {
                state.isOrphaned = false;
                state.errorCount = 0;
                log.info('State reset');
            }
        };
        
        log.info('Debug interface available at window.__chromeHighlighterDebug');
    }
    
    // Context monitoring
    if (DEBUG.logLifecycle) {
        setInterval(() => {
            state.contextCheckCount++;
            const valid = isExtensionContextValid();
            
            if (!valid && !state.isOrphaned) {
                log.info('Context lost - marking as orphaned');
                state.isOrphaned = true;
            } else if (valid && state.isOrphaned) {
                log.info('Context restored - but keeping orphaned state');
            }
        }, 5000);
    }
    
    // Initialize when ready
    if (!window.location.href.startsWith('chrome://')) {
        log.info('Chrome Web Highlighter loading...');
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initialize);
        } else {
            initialize();
        }
        
        // Fallback initialization
        window.addEventListener('load', () => {
            if (!state.isInitialized) {
                log.warn('Fallback initialization on window load');
                initialize();
            }
        });
    } else {
        log.info('Skipping initialization on chrome:// page');
    }
    
})();