/**
 * MiniToolbar Module - Following uBlock Origin's exact pattern
 * Uses attribute selectors and CSS injection via background script
 */

(function() {
  'use strict';
  
  // Check if namespace exists
  const namespace = (typeof window !== 'undefined' && window.webHighlighter) || 
                   (typeof self !== 'undefined' && self.webHighlighter);
  
  if (!namespace) {
    console.error('MiniToolbar: webHighlighter namespace not found');
    return;
  }
  
  // Dependencies will be resolved when module initializes
  let vAPI, EventBus, StateManager;
  
  // These will be set when module initializes
  let miniToolbarAttr;
  let toolbarSelector;
  
  const MiniToolbar = (() => {
    // Resolve dependencies
    function resolveDependencies() {
      if (!vAPI && namespace.modules && namespace.modules.core) {
        vAPI = namespace.modules.core.vAPI;
        EventBus = namespace.modules.core.EventBus;
        StateManager = namespace.modules.core.StateManager;
      }
      return vAPI && EventBus && StateManager;
    }
    
    // Private state
    let toolbar = null;
    let isVisible = false;
    let currentHighlightId = null;
    let currentHighlightText = '';
    let cssInjected = false;
    
    // CSS will be generated when dependencies are available
    let toolbarCSS = '';
    
    function generateToolbarCSS() {
      return `
      ${toolbarSelector} {
        position: absolute !important;
        z-index: 2147483647 !important;
        display: flex !important;
        background: #ffffff !important;
        border: 1px solid #e5e7eb !important;
        border-radius: 8px !important;
        padding: 4px !important;
        gap: 4px !important;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04) !important;
        animation: miniToolbarFadeIn 0.2s ease-out !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      }
      
      @keyframes miniToolbarFadeIn {
        from {
          opacity: 0;
          transform: translateY(-4px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      ${toolbarSelector}[data-hidden="true"] {
        display: none !important;
      }
      
      ${toolbarSelector} button {
        background: none !important;
        border: none !important;
        padding: 6px !important;
        cursor: pointer !important;
        border-radius: 4px !important;
        color: #374151 !important;
        transition: all 0.2s !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        position: relative !important;
        margin: 0 !important;
        outline: none !important;
      }
      
      ${toolbarSelector} button:hover {
        background-color: #f3f4f6 !important;
      }
      
      ${toolbarSelector} button:active {
        background-color: #e5e7eb !important;
        transform: scale(0.95) !important;
      }
      
      ${toolbarSelector} button svg {
        width: 16px !important;
        height: 16px !important;
        pointer-events: none !important;
      }
      
      /* Tooltip */
      ${toolbarSelector} button::after {
        content: attr(data-tooltip) !important;
        position: absolute !important;
        bottom: 100% !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        margin-bottom: 4px !important;
        padding: 4px 8px !important;
        background: #1f2937 !important;
        color: white !important;
        font-size: 12px !important;
        border-radius: 4px !important;
        white-space: nowrap !important;
        opacity: 0 !important;
        pointer-events: none !important;
        transition: opacity 0.2s !important;
      }
      
      ${toolbarSelector} button:hover::after {
        opacity: 1 !important;
      }
      
      /* Success animation for copy */
      ${toolbarSelector} button.success {
        animation: miniToolbarSuccessPulse 0.3s ease-out !important;
      }
      
      @keyframes miniToolbarSuccessPulse {
        0% {
          background-color: #10b981 !important;
          transform: scale(1);
        }
        50% {
          transform: scale(1.1);
        }
        100% {
          background-color: transparent !important;
          transform: scale(1);
        }
      }
    `;
    }
    
    // Private methods
    function injectCSS() {
      if (!cssInjected && vAPI) {
        // Generate CSS with session-specific selectors
        miniToolbarAttr = 'wh-mt-' + vAPI.sessionId;
        toolbarSelector = `[${miniToolbarAttr}]`;
        
        // Update CSS with correct selector
        toolbarCSS = generateToolbarCSS();
        vAPI.userStylesheet.add(toolbarCSS, true);
        cssInjected = true;
      }
    }
    
    function createToolbar() {
      if (toolbar) return;
      
      // Inject CSS first
      injectCSS();
      
      // Create toolbar with attribute selector (uBlock pattern)
      toolbar = document.createElement('div');
      toolbar.setAttribute(miniToolbarAttr, '');
      toolbar.setAttribute('data-hidden', 'true');
      
      // Create buttons
      toolbar.innerHTML = `
        <button data-action="copy" data-tooltip="Copy text">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/>
            <path d="M5 15H4C2.89543 15 2 14.1046 2 13V4C2 2.89543 2.89543 2 4 2H13C14.1046 2 15 2.89543 15 4V5" stroke="currentColor" stroke-width="2"/>
          </svg>
        </button>
        
        <button data-action="remove" data-tooltip="Remove highlight">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 6L18 18M6 18L18 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
        
        <button data-action="note" data-tooltip="Add note">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/>
          </svg>
        </button>
        
        <button data-action="color" data-tooltip="Change color">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
            <circle cx="12" cy="8" r="2" fill="#ef4444"/>
            <circle cx="16" cy="12" r="2" fill="#22c55e"/>
            <circle cx="12" cy="16" r="2" fill="#3b82f6"/>
            <circle cx="8" cy="12" r="2" fill="#eab308"/>
          </svg>
        </button>
      `;
      
      // Add event handler
      toolbar.addEventListener('click', handleAction);
      
      // Append to body
      if (document.body) {
        document.body.appendChild(toolbar);
      }
    }
    
    async function handleAction(e) {
      const button = e.target.closest('button');
      if (!button) return;
      
      const action = button.dataset.action;
      
      switch (action) {
        case 'copy':
          await copyText(button);
          break;
          
        case 'remove':
          await removeHighlight();
          break;
          
        case 'note':
          addNote();
          break;
          
        case 'color':
          changeColor();
          break;
      }
      
      // Emit action event
      EventBus.emit('miniToolbar:action', {
        action,
        highlightId: currentHighlightId
      });
    }
    
    async function copyText(button) {
      try {
        if (currentHighlightText) {
          await navigator.clipboard.writeText(currentHighlightText);
          
          // Visual feedback
          button.classList.add('success');
          setTimeout(() => button.classList.remove('success'), 300);
          
          // Emit success event
          EventBus.emit('miniToolbar:copied', {
            text: currentHighlightText,
            highlightId: currentHighlightId
          });
        }
      } catch (error) {
        console.error('Failed to copy text:', error);
      }
    }
    
    async function removeHighlight() {
      if (currentHighlightId) {
        // Request highlight removal
        EventBus.emit('miniToolbar:removeRequest', {
          highlightId: currentHighlightId
        });
        
        hide();
      }
    }
    
    function addNote() {
      if (currentHighlightId) {
        // Request note addition
        EventBus.emit('miniToolbar:noteRequest', {
          highlightId: currentHighlightId
        });
      }
    }
    
    function changeColor() {
      if (currentHighlightId) {
        // Request color change
        EventBus.emit('miniToolbar:colorRequest', {
          highlightId: currentHighlightId
        });
      }
    }
    
    function updatePosition(rect) {
      if (!toolbar) return;
      
      // Calculate position
      const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
      const scrollY = window.pageYOffset || document.documentElement.scrollTop;
      
      // Position below the highlight
      const left = rect.left + scrollX;
      const top = rect.bottom + scrollY + 5;
      
      // Update position using style attribute (necessary for absolute positioning)
      toolbar.style.left = `${left}px`;
      toolbar.style.top = `${top}px`;
      
      // Ensure toolbar is within viewport
      requestAnimationFrame(() => {
        const toolbarRect = toolbar.getBoundingClientRect();
        
        // Adjust horizontal position if toolbar extends beyond viewport
        if (toolbarRect.right > window.innerWidth) {
          toolbar.style.left = `${window.innerWidth - toolbarRect.width - 10 + scrollX}px`;
        }
        
        // Adjust vertical position if toolbar extends beyond viewport
        if (toolbarRect.bottom > window.innerHeight) {
          // Position above the highlight instead
          toolbar.style.top = `${rect.top + scrollY - toolbarRect.height - 5}px`;
        }
      });
    }
    
    // Public API
    function init() {
      // Ensure dependencies are resolved
      if (!resolveDependencies()) {
        console.error('MiniToolbar: Dependencies not available');
        return;
      }
      
      createToolbar();
      
      // Global event listeners
      document.addEventListener('mousedown', (e) => {
        if (isVisible && toolbar && !toolbar.contains(e.target)) {
          // Check if clicking on a highlight
          const highlightElement = e.target.closest('.web-highlighter-highlight');
          if (!highlightElement || highlightElement.dataset.highlightId !== currentHighlightId) {
            hide();
          }
        }
      });
      
      // Hide on scroll
      window.addEventListener('scroll', hide, { passive: true });
      
      // Listen for events
      EventBus.on('highlight:removed', (data) => {
        if (data.id === currentHighlightId) {
          hide();
        }
      });
      
      EventBus.on('page:scrolled', hide);
      EventBus.on('selection:changed', hide);
      
      // Emit initialization event
      EventBus.emit('miniToolbar:initialized');
    }
    
    function show(rect, highlightId, highlightText) {
      if (!rect) return;
      
      if (!toolbar) {
        createToolbar();
      }
      
      isVisible = true;
      currentHighlightId = highlightId;
      currentHighlightText = highlightText || '';
      
      // Update position and show
      updatePosition(rect);
      toolbar.setAttribute('data-hidden', 'false');
      
      // Update state
      StateManager.set('miniToolbar', {
        currentHighlightId: highlightId,
        currentHighlightText: highlightText
      });
      
      // Emit event
      EventBus.emit('miniToolbar:shown', {
        rect,
        highlightId,
        highlightText
      });
    }
    
    function hide() {
      if (!toolbar || !isVisible) return;
      
      isVisible = false;
      toolbar.setAttribute('data-hidden', 'true');
      currentHighlightId = null;
      currentHighlightText = '';
      
      // Update state
      StateManager.set('miniToolbar', {
        currentHighlightId: null,
        currentHighlightText: ''
      });
      
      // Emit event
      EventBus.emit('miniToolbar:hidden');
    }
    
    function cleanup() {
      // Remove CSS
      if (cssInjected) {
        vAPI.userStylesheet.remove(toolbarCSS, true);
        cssInjected = false;
      }
      
      // Remove toolbar
      if (toolbar && toolbar.parentNode) {
        toolbar.parentNode.removeChild(toolbar);
        toolbar = null;
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
    window.webHighlighter.register('ui', 'MiniToolbar', MiniToolbar);
    window.MiniToolbar = MiniToolbar;
  } else if (typeof self !== 'undefined' && self.webHighlighter) {
    self.webHighlighter.register('ui', 'MiniToolbar', MiniToolbar);
  }
  
})();