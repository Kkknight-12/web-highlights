/**
 * Simple Mini Toolbar
 * Shows options when clicking on a highlight
 */

(function() {
  'use strict';
  
  const vAPI = window.webHighlighter.core.vAPI;
  const sessionId = vAPI.sessionId;
  const toolbarAttr = 'wh-mt-' + sessionId;
  
  // Toolbar state
  let toolbar = null;
  let currentHighlightId = null;
  let cssInjected = false;
  
  // Toolbar CSS
  const toolbarCSS = `
    [${toolbarAttr}] {
      position: absolute !important;
      z-index: 2147483647 !important;
      display: none !important;
      background: rgba(255, 255, 255, 0.98) !important;
      border: 1px solid rgba(0, 0, 0, 0.08) !important;
      border-radius: 12px !important;
      padding: 6px !important;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12) !important;
      gap: 2px !important;
      backdrop-filter: blur(20px) !important;
      animation: slideIn 0.2s ease-out !important;
    }
    
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    [${toolbarAttr}][data-visible="true"] {
      display: flex !important;
    }
    
    [${toolbarAttr}] button {
      background: transparent !important;
      border: none !important;
      padding: 10px !important;
      cursor: pointer !important;
      border-radius: 8px !important;
      color: #4b5563 !important;
      transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1) !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      position: relative !important;
    }
    
    [${toolbarAttr}] button::after {
      content: attr(title) !important;
      position: absolute !important;
      bottom: -30px !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
      background: rgba(0, 0, 0, 0.8) !important;
      color: white !important;
      padding: 4px 8px !important;
      border-radius: 4px !important;
      font-size: 12px !important;
      white-space: nowrap !important;
      opacity: 0 !important;
      pointer-events: none !important;
      transition: opacity 0.2s !important;
    }
    
    [${toolbarAttr}] button:hover {
      background-color: rgba(0, 0, 0, 0.06) !important;
      color: #1f2937 !important;
      transform: scale(1.1) !important;
    }
    
    [${toolbarAttr}] button:hover::after {
      opacity: 1 !important;
    }
    
    [${toolbarAttr}] button svg {
      width: 20px !important;
      height: 20px !important;
    }
  `;
  
  // Inject CSS
  function injectCSS() {
    if (!cssInjected) {
      vAPI.userStylesheet.add(toolbarCSS);
      cssInjected = true;
    }
  }
  
  // Create toolbar
  function createToolbar() {
    if (toolbar) return;
    
    injectCSS();
    
    toolbar = document.createElement('div');
    toolbar.setAttribute(toolbarAttr, '');
    
    toolbar.innerHTML = `
      <button data-action="copy" title="Copy text">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2"/>
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
        </svg>
      </button>
      <button data-action="color" title="Change color">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="10" fill="#FFE066"/>
        </svg>
      </button>
      <button data-action="remove" title="Remove highlight">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    `;
    
    toolbar.addEventListener('click', handleAction);
    
    if (document.body) {
      document.body.appendChild(toolbar);
    }
  }
  
  // Handle toolbar actions
  function handleAction(e) {
    const button = e.target.closest('button');
    if (!button) return;
    
    const action = button.dataset.action;
    
    switch (action) {
      case 'copy':
        copyHighlightText();
        break;
      case 'color':
        showColorPicker();
        break;
      case 'remove':
        removeHighlight();
        break;
    }
  }
  
  // Copy highlight text
  function copyHighlightText() {
    const highlight = document.querySelector(`[data-highlight-id="${currentHighlightId}"]`);
    if (highlight) {
      navigator.clipboard.writeText(highlight.textContent);
      hide();
    }
  }
  
  // Show color picker
  function showColorPicker() {
    if (window.webHighlighter.ui.colorPicker) {
      const highlight = document.querySelector(`[data-highlight-id="${currentHighlightId}"]`);
      if (highlight) {
        const rect = highlight.getBoundingClientRect();
        window.webHighlighter.ui.colorPicker.show(rect, currentHighlightId);
      }
    }
    hide();
  }
  
  // Remove highlight
  function removeHighlight() {
    if (window.webHighlighter.modules.highlighter) {
      window.webHighlighter.modules.highlighter.removeHighlight(currentHighlightId);
    }
    hide();
  }
  
  // Show toolbar
  function show(rect, highlightId) {
    if (!toolbar) {
      createToolbar();
    }
    
    currentHighlightId = highlightId;
    
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    
    toolbar.style.left = (rect.left + scrollX) + 'px';
    toolbar.style.top = (rect.bottom + scrollY + 5) + 'px';
    toolbar.setAttribute('data-visible', 'true');
  }
  
  // Hide toolbar
  function hide() {
    if (!toolbar) return;
    toolbar.setAttribute('data-visible', 'false');
    currentHighlightId = null;
  }
  
  // Initialize
  function init() {
    createToolbar();
    
    // Hide on click outside
    document.addEventListener('mousedown', function(e) {
      if (toolbar && !toolbar.contains(e.target) && 
          !e.target.closest('.web-highlighter-highlight')) {
        hide();
      }
    });
    
    window.webHighlighter.log('Mini toolbar initialized');
  }
  
  // Export API
  window.webHighlighter.ui.miniToolbar = {
    init: init,
    show: show,
    hide: hide
  };
  
})();