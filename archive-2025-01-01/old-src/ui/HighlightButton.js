/**
 * HighlightButton Module - Following uBlock Origin's exact pattern
 * Uses attribute selectors and CSS injection via background script
 */

(function() {
  'use strict';
  
  // Check if namespace exists
  const namespace = (typeof window !== 'undefined' && window.webHighlighter) || 
                   (typeof self !== 'undefined' && self.webHighlighter);
  
  if (!namespace) {
    console.error('HighlightButton: webHighlighter namespace not found');
    return;
  }
  
  // Dependencies will be resolved when module initializes
  let vAPI, EventBus, Constants, StateManager;
  
  // These will be set when module initializes
  let highlightButtonAttr;
  let buttonSelector;
  
  const HighlightButton = (() => {
    // Resolve dependencies
    function resolveDependencies() {
      if (!vAPI && namespace.modules && namespace.modules.core) {
        vAPI = namespace.modules.core.vAPI;
        EventBus = namespace.modules.core.EventBus;
        Constants = namespace.modules.core.Constants;
        StateManager = namespace.modules.core.StateManager;
      }
      return vAPI && EventBus && Constants && StateManager;
    }
    
    // Private state
    let button = null;
    let isVisible = false;
    let hideTimeout = null;
    let cssInjected = false;
    
    // CSS will be generated when dependencies are available
    let buttonCSS = '';
    
    // Private methods
    function injectCSS() {
      if (!cssInjected && vAPI) {
        // Generate CSS with session-specific selectors
        highlightButtonAttr = 'wh-hb-' + vAPI.sessionId;
        buttonSelector = `[${highlightButtonAttr}]`;
        
        // Update CSS with correct selector
        buttonCSS = generateButtonCSS();
        
        vAPI.userStylesheet.add(buttonCSS, true);
        cssInjected = true;
      }
    }
    
    function generateButtonCSS() {
      return `
        ${buttonSelector} {
          position: absolute !important;
          z-index: 2147483647 !important;
          padding: 8px 16px !important;
          background: #ffffff !important;
          border: 1px solid #e5e7eb !important;
          border-radius: 8px !important;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1), 0 6px 10px rgba(0, 0, 0, 0.08) !important;
          color: #374151 !important;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
          font-size: 14px !important;
          font-weight: 500 !important;
          cursor: pointer !important;
          user-select: none !important;
          -webkit-user-select: none !important;
          pointer-events: auto !important;
          display: flex !important;
          align-items: center !important;
          margin: 0 !important;
          outline: none !important;
          text-decoration: none !important;
          line-height: 1.2 !important;
          white-space: nowrap !important;
          transition: all 0.2s ease !important;
        }
        
        ${buttonSelector}:hover {
          box-shadow: 0 20px 25px rgba(0, 0, 0, 0.15), 0 10px 10px rgba(0, 0, 0, 0.12) !important;
          transform: translateY(-1px) !important;
        }
        
        ${buttonSelector}:active {
          transform: translateY(0) !important;
        }
        
        ${buttonSelector}[data-hidden="true"] {
          display: none !important;
        }
        
        ${buttonSelector} svg {
          display: inline-block !important;
          vertical-align: middle !important;
          margin-right: 6px !important;
          width: 20px !important;
          height: 20px !important;
        }
      `;
    }
    
    function createButton() {
      if (button) return;
      
      // Inject CSS first
      injectCSS();
      
      // Create button with attribute selector (uBlock pattern)
      button = document.createElement('button');
      button.setAttribute(highlightButtonAttr, '');
      button.setAttribute('data-hidden', 'true');
      button.title = 'Click to highlight selected text';
      
      // Get color configuration
      const selectedColor = (StateManager && StateManager.get('ui.selectedColor')) || 
                           (Constants && Constants.COLORS.DEFAULT_COLOR) || 
                           'yellow';
      const colors = (Constants && Constants.COLORS.HIGHLIGHT_COLORS) || {
        yellow: { bg: 'rgba(255, 224, 102, 0.4)', border: 'rgba(255, 224, 102, 0.6)', name: 'Yellow' }
      };
      const colorConfig = colors[selectedColor] || colors.yellow;
      
      // Set button content
      button.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="5" y="8" width="14" height="8" rx="1" 
                fill="${colorConfig.bg}" 
                stroke="${colorConfig.border}" 
                stroke-width="2"/>
          <path d="M7 8V6C7 5.44772 7.44772 5 8 5H16C16.5523 5 17 5.44772 17 6V8" 
                stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <path d="M10 20L12 16L14 20" 
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>Highlight</span>
      `;
      
      // Add click handler
      button.addEventListener('click', handleButtonClick);
      
      // Append to body
      if (document.body) {
        document.body.appendChild(button);
      }
    }
    
    function handleButtonClick(event) {
      event.preventDefault();
      event.stopPropagation();
      
      const selectedColor = (StateManager && StateManager.get('ui.selectedColor')) || 
                           (Constants && Constants.COLORS.DEFAULT_COLOR) || 
                           'yellow';
      
      if (EventBus) {
        EventBus.emit('highlightButton:clicked', {
          color: selectedColor
        });
      }
      
      hide();
    }
    
    function updatePosition(bounds) {
      if (!button) return;
      
      // Calculate position
      const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
      const scrollY = window.pageYOffset || document.documentElement.scrollTop;
      
      // Position button above selection
      const buttonHeight = 40;
      const offset = 10;
      const top = bounds.top + scrollY - buttonHeight - offset;
      const left = bounds.left + scrollX;
      
      // Update position using style attribute (necessary for absolute positioning)
      button.style.top = `${top}px`;
      button.style.left = `${left}px`;
      
      // Ensure button stays in viewport
      requestAnimationFrame(() => {
        const rect = button.getBoundingClientRect();
        
        // Adjust if too close to top
        if (rect.top < 10) {
          button.style.top = `${bounds.bottom + scrollY + offset}px`;
        }
        
        // Adjust if too close to right edge
        if (rect.right > window.innerWidth - 10) {
          button.style.left = `${window.innerWidth - rect.width - 10 + scrollX}px`;
        }
      });
    }
    
    // Public API
    function init() {
      // Ensure dependencies are resolved
      if (!resolveDependencies()) {
        console.error('HighlightButton: Dependencies not available');
        return;
      }
      
      createButton();
      
      // Subscribe to color changes
      if (StateManager && Constants) {
        StateManager.subscribe('ui', (state) => {
          if (state.selectedColor && button) {
            const colors = Constants.COLORS.HIGHLIGHT_COLORS;
            const colorConfig = colors[state.selectedColor] || colors[Constants.COLORS.DEFAULT_COLOR];
            
            // Update SVG color
            const rect = button.querySelector('rect');
            if (rect) {
              rect.setAttribute('fill', colorConfig.bg);
              rect.setAttribute('stroke', colorConfig.border);
            }
          }
        });
      }
      
      // Global event listeners
      document.addEventListener('click', (e) => {
        if (e.target !== button && !button?.contains(e.target)) {
          hide();
        }
      });
      
      window.addEventListener('scroll', hide, { passive: true });
      window.addEventListener('blur', hide);
      
      // Emit initialization event
      if (EventBus) {
        EventBus.emit('highlightButton:initialized');
      }
    }
    
    function show(bounds) {
      if (!button) {
        createButton();
      }
      
      // Clear any existing hide timeout
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }
      
      // Update position and show
      updatePosition(bounds);
      button.setAttribute('data-hidden', 'false');
      isVisible = true;
      
      // Update state
      if (StateManager) {
        StateManager.set('ui', { highlightButtonVisible: true });
      }
    }
    
    function hide() {
      if (!button || !isVisible) return;
      
      // Hide with a small delay to prevent flashing
      hideTimeout = setTimeout(() => {
        if (button) {
          button.setAttribute('data-hidden', 'true');
          isVisible = false;
          
          // Update state
          if (StateManager) {
            StateManager.set('ui', { highlightButtonVisible: false });
          }
        }
      }, 100);
    }
    
    function cleanup() {
      // Remove CSS
      if (cssInjected) {
        vAPI.userStylesheet.remove(buttonCSS, true);
        cssInjected = false;
      }
      
      // Remove button
      if (button && button.parentNode) {
        button.parentNode.removeChild(button);
        button = null;
      }
      
      // Clear timeout
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }
    }
    
    // Return public API
    return {
      init,
      show,
      hide,
      cleanup
    };
  })();
  
  // Register with namespace and export
  if (typeof window !== 'undefined' && window.webHighlighter) {
    window.webHighlighter.register('ui', 'HighlightButton', HighlightButton);
    window.HighlightButton = HighlightButton;
  } else if (typeof self !== 'undefined' && self.webHighlighter) {
    self.webHighlighter.register('ui', 'HighlightButton', HighlightButton);
  }
  
})();