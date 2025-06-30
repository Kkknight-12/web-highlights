// Chrome Web Highlighter - Centralized Error Handler
// This module provides consistent error handling across the extension

(function() {
    'use strict';
    
    // Error types we want to suppress
    const SUPPRESSED_ERROR_PATTERNS = [
        'Extension context invalidated',
        'Cannot access a chrome',
        'chrome is not defined',
        'chrome.runtime is not defined'
    ];
    
    // Development mode flag (set to false in production)
    const DEBUG_MODE = false;
    
    // Error statistics for debugging
    const errorStats = {
        suppressed: 0,
        logged: 0,
        contexts: new Set()
    };
    
    /**
     * Check if an error should be suppressed
     */
    function shouldSuppressError(error) {
        if (!error) return false;
        
        const errorMessage = error.message || error.toString();
        return SUPPRESSED_ERROR_PATTERNS.some(pattern => 
            errorMessage.includes(pattern)
        );
    }
    
    /**
     * Log error with context information
     */
    function logError(context, error, additionalInfo = {}) {
        if (shouldSuppressError(error)) {
            errorStats.suppressed++;
            errorStats.contexts.add(context);
            
            if (DEBUG_MODE) {
                console.debug(`[SUPPRESSED] ${context}:`, error.message);
            }
            return;
        }
        
        errorStats.logged++;
        
        // In production, log minimal info
        if (!DEBUG_MODE) {
            console.error(`[${context}]`, error.message);
            return;
        }
        
        // In debug mode, log full details
        console.error(`[${new Date().toISOString()}] ${context}:`, {
            message: error.message,
            stack: error.stack,
            ...additionalInfo
        });
    }
    
    /**
     * Wrap a function with error handling
     */
    function wrapWithErrorHandler(fn, context) {
        return async function(...args) {
            try {
                return await fn.apply(this, args);
            } catch (error) {
                logError(context, error, {
                    functionName: fn.name,
                    arguments: args
                });
                
                // Re-throw non-suppressed errors
                if (!shouldSuppressError(error)) {
                    throw error;
                }
            }
        };
    }
    
    /**
     * Safe Chrome API call wrapper
     */
    async function safeChromeCall(apiPath, ...args) {
        try {
            // Check if Chrome APIs are available
            if (!window.chrome) {
                throw new Error('chrome is not defined');
            }
            
            // Navigate to the API method
            const pathParts = apiPath.split('.');
            let api = chrome;
            
            for (const part of pathParts) {
                if (!api[part]) {
                    throw new Error(`chrome.${pathParts.slice(0, pathParts.indexOf(part) + 1).join('.')} is not defined`);
                }
                api = api[part];
            }
            
            // Call the API method
            if (typeof api === 'function') {
                return await api(...args);
            }
            
            return api;
        } catch (error) {
            logError(`ChromeAPI:${apiPath}`, error);
            return null;
        }
    }
    
    /**
     * Check if extension context is valid
     */
    function isContextValid() {
        try {
            return !!(chrome && chrome.runtime && chrome.runtime.id);
        } catch (e) {
            return false;
        }
    }
    
    /**
     * Get error statistics (for debugging)
     */
    function getErrorStats() {
        return {
            ...errorStats,
            contexts: Array.from(errorStats.contexts)
        };
    }
    
    /**
     * Reset error statistics
     */
    function resetErrorStats() {
        errorStats.suppressed = 0;
        errorStats.logged = 0;
        errorStats.contexts.clear();
    }
    
    // Export for use in other parts of the extension
    window.ChromeHighlighterErrorHandler = {
        logError,
        wrapWithErrorHandler,
        safeChromeCall,
        isContextValid,
        shouldSuppressError,
        getErrorStats,
        resetErrorStats,
        DEBUG_MODE
    };
    
})();