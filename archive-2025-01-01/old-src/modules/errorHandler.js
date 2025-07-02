/**
 * Error Handler Module
 * Centralized error handling with context validation and recovery strategies
 * Following the modular pattern from CHROME_EXTENSION_ARCHITECTURE_GUIDE.md
 */

const ErrorHandlerModule = (() => {
  // Private state
  let initialized = false;
  let errorCount = 0;
  let contextValid = true;
  let lastContextCheck = Date.now();
  let errorLog = [];
  const MAX_ERROR_LOG_SIZE = 50;
  const CONTEXT_CHECK_INTERVAL = 5000;

  // Error types
  const ErrorTypes = {
    CONTEXT_INVALIDATED: 'CONTEXT_INVALIDATED',
    DOM_ERROR: 'DOM_ERROR',
    STORAGE_ERROR: 'STORAGE_ERROR',
    NAVIGATION_ERROR: 'NAVIGATION_ERROR',
    SELECTION_ERROR: 'SELECTION_ERROR',
    HIGHLIGHT_ERROR: 'HIGHLIGHT_ERROR',
    UNKNOWN_ERROR: 'UNKNOWN_ERROR'
  };

  // Private methods
  function classifyError(error) {
    if (!error) return ErrorTypes.UNKNOWN_ERROR;
    
    const message = error.message || '';
    
    if (message.includes('Extension context invalidated') ||
        message.includes('Cannot access chrome') ||
        message.includes('chrome.runtime')) {
      return ErrorTypes.CONTEXT_INVALIDATED;
    }
    
    if (message.includes('DOM') || 
        message.includes('Node') || 
        message.includes('Element') ||
        message.includes('Range')) {
      return ErrorTypes.DOM_ERROR;
    }
    
    if (message.includes('storage') || 
        message.includes('chrome.storage')) {
      return ErrorTypes.STORAGE_ERROR;
    }
    
    if (message.includes('navigation') || 
        message.includes('url') ||
        message.includes('history')) {
      return ErrorTypes.NAVIGATION_ERROR;
    }
    
    if (message.includes('selection') || 
        message.includes('range')) {
      return ErrorTypes.SELECTION_ERROR;
    }
    
    if (message.includes('highlight')) {
      return ErrorTypes.HIGHLIGHT_ERROR;
    }
    
    return ErrorTypes.UNKNOWN_ERROR;
  }

  function logToHistory(context, error, type) {
    const entry = {
      timestamp: Date.now(),
      context,
      type,
      message: error?.message || 'Unknown error',
      stack: error?.stack
    };
    
    errorLog.push(entry);
    
    // Trim log if too large
    if (errorLog.length > MAX_ERROR_LOG_SIZE) {
      errorLog = errorLog.slice(-MAX_ERROR_LOG_SIZE);
    }
    
    // Update state
    if (typeof StateManager !== 'undefined') {
      StateManager.set('errorHandler', {
        errorCount,
        lastError: entry,
        contextValid
      });
    }
  }

  function checkExtensionContext() {
    try {
      // Multiple checks for robustness
      const hasChrome = typeof chrome !== 'undefined';
      const hasRuntime = hasChrome && chrome.runtime;
      const hasId = hasRuntime && chrome.runtime.id;
      
      contextValid = !!(hasChrome && hasRuntime && hasId);
      
      // Try to access a chrome API to verify
      if (contextValid && chrome.runtime.getManifest) {
        chrome.runtime.getManifest();
      }
      
      lastContextCheck = Date.now();
      return contextValid;
    } catch (e) {
      contextValid = false;
      lastContextCheck = Date.now();
      return false;
    }
  }

  // Recovery strategies
  const RecoveryStrategies = {
    [ErrorTypes.CONTEXT_INVALIDATED]: () => {
      // Emit event for cleanup
      EventBus.emit('error:contextInvalidated');
      // Return a flag indicating extension should stop
      return { shouldStop: true };
    },
    
    [ErrorTypes.DOM_ERROR]: (error) => {
      // Log but continue - DOM errors are often recoverable
      console.warn('DOM operation failed:', error.message);
      return { shouldRetry: false };
    },
    
    [ErrorTypes.STORAGE_ERROR]: (error) => {
      // Storage errors might be quota or permission issues
      EventBus.emit('error:storage', { error });
      return { shouldRetry: true, delay: 1000 };
    },
    
    [ErrorTypes.SELECTION_ERROR]: () => {
      // Clear selection state
      EventBus.emit('selection:cleared');
      return { shouldRetry: false };
    },
    
    [ErrorTypes.HIGHLIGHT_ERROR]: () => {
      // Refresh highlights
      EventBus.emit('highlights:refresh');
      return { shouldRetry: true, delay: 500 };
    },
    
    [ErrorTypes.UNKNOWN_ERROR]: () => {
      // Generic recovery
      return { shouldRetry: false };
    }
  };

  // Public API
  return {
    /**
     * Initialize the module
     */
    init() {
      if (initialized) return;
      
      // Register with StateManager
      if (typeof StateManager !== 'undefined') {
        StateManager.register('errorHandler', {
          errorCount: 0,
          lastError: null,
          contextValid: true,
          isInitialized: true
        });
      }
      
      // Initial context check
      checkExtensionContext();
      
      // Set up periodic context checking
      setInterval(() => {
        const wasValid = contextValid;
        const isValid = checkExtensionContext();
        
        if (wasValid && !isValid) {
          // Context was lost
          EventBus.emit('error:contextLost');
        } else if (!wasValid && isValid) {
          // Context restored (rare but possible)
          EventBus.emit('error:contextRestored');
        }
      }, CONTEXT_CHECK_INTERVAL);
      
      initialized = true;
      EventBus.emit('errorHandler:initialized');
    },

    /**
     * Check if extension context is valid
     * @returns {boolean} Whether context is valid
     */
    isContextValid() {
      // Use cached value if checked recently
      if (Date.now() - lastContextCheck < 1000) {
        return contextValid;
      }
      return checkExtensionContext();
    },

    /**
     * Handle an error with appropriate recovery
     * @param {string} context - Where the error occurred
     * @param {Error} error - The error object
     * @returns {Object} Recovery instructions
     */
    handleError(context, error) {
      errorCount++;
      
      const errorType = classifyError(error);
      logToHistory(context, error, errorType);
      
      // Emit error event
      EventBus.emit('error:occurred', {
        context,
        error,
        type: errorType,
        count: errorCount
      });
      
      // Get recovery strategy
      const recovery = RecoveryStrategies[errorType] || RecoveryStrategies[ErrorTypes.UNKNOWN_ERROR];
      const recoveryResult = recovery(error);
      
      // Log based on environment
      if (Constants.IS_PRODUCTION) {
        // In production, only log serious errors
        if (errorType === ErrorTypes.CONTEXT_INVALIDATED || errorCount > 10) {
          console.error(`[ChromeHighlighter] Critical error in ${context}:`, error.message);
        }
      } else {
        // In development, log all errors
        console.error(`[${context}] ${errorType}:`, error);
      }
      
      return recoveryResult;
    },

    /**
     * Execute a function safely with error handling
     * @param {Function} fn - Function to execute
     * @param {string} context - Context for error reporting
     * @param {*} fallback - Fallback value on error
     * @returns {*} Result or fallback
     */
    async safeExecute(fn, context = 'Unknown', fallback = null) {
      try {
        // Check context first
        if (!this.isContextValid()) {
          throw new Error('Extension context invalidated');
        }
        
        const result = await fn();
        return result;
      } catch (error) {
        const recovery = this.handleError(context, error);
        
        if (recovery.shouldStop) {
          throw error; // Re-throw to stop execution
        }
        
        if (recovery.shouldRetry && recovery.delay) {
          // Wait and retry once
          await new Promise(resolve => setTimeout(resolve, recovery.delay));
          try {
            return await fn();
          } catch (retryError) {
            this.handleError(`${context} (retry)`, retryError);
            return fallback;
          }
        }
        
        return fallback;
      }
    },

    /**
     * Wrap a function with error handling
     * @param {Function} fn - Function to wrap
     * @param {string} context - Context for error reporting
     * @returns {Function} Wrapped function
     */
    wrapFunction(fn, context) {
      return async (...args) => {
        return this.safeExecute(() => fn(...args), context);
      };
    },

    /**
     * Get error statistics
     * @returns {Object} Error stats
     */
    getStats() {
      const errorsByType = {};
      errorLog.forEach(entry => {
        errorsByType[entry.type] = (errorsByType[entry.type] || 0) + 1;
      });
      
      return {
        totalErrors: errorCount,
        recentErrors: errorLog.slice(-10),
        errorsByType,
        contextValid,
        lastContextCheck: new Date(lastContextCheck).toISOString()
      };
    },

    /**
     * Clear error history
     */
    clearHistory() {
      errorLog = [];
      errorCount = 0;
      
      if (typeof StateManager !== 'undefined') {
        StateManager.set('errorHandler', {
          errorCount: 0,
          lastError: null,
          contextValid
        });
      }
      
      EventBus.emit('errorHandler:historyCleared');
    },

    /**
     * Check if should suppress an error
     * @param {Error} error - Error to check
     * @returns {boolean} Whether to suppress
     */
    shouldSuppressError(error) {
      if (!error) return false;
      
      const message = error.message || '';
      
      // Suppress known non-critical errors
      const suppressPatterns = [
        'Extension context invalidated',
        'Cannot access a chrome:// URL',
        'The message port closed'
      ];
      
      return suppressPatterns.some(pattern => message.includes(pattern));
    },

    /**
     * Get error type constants
     * @returns {Object} Error types
     */
    getErrorTypes() {
      return { ...ErrorTypes };
    }
  };
})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ErrorHandlerModule;
}
// Also attach to window for browser usage
if (typeof window !== 'undefined') {
  window.ErrorHandler = ErrorHandlerModule;
}
