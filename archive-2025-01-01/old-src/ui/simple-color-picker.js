/**
 * Simple Color Picker
 * Shows color options for highlights
 */

(function() {
  'use strict';
  
  const vAPI = window.webHighlighter.core.vAPI;
  const sessionId = vAPI.sessionId;
  const pickerAttr = 'wh-cp-' + sessionId;
  
  // Picker state
  let picker = null;
  let currentHighlightId = null;
  let cssInjected = false;
  
  // Available colors
  const colors = {
    yellow: { bg: 'rgba(255, 224, 102, 0.4)', border: 'rgba(255, 224, 102, 0.8)' },
    green: { bg: 'rgba(110, 231, 183, 0.4)', border: 'rgba(110, 231, 183, 0.8)' },
    blue: { bg: 'rgba(147, 197, 253, 0.4)', border: 'rgba(147, 197, 253, 0.8)' },
    pink: { bg: 'rgba(252, 165, 165, 0.4)', border: 'rgba(252, 165, 165, 0.8)' }
  };
  
  // Picker CSS
  const pickerCSS = `
    [${pickerAttr}] {
      position: absolute !important;
      z-index: 2147483647 !important;
      display: none !important;
      background: rgba(255, 255, 255, 0.98) !important;
      border: 1px solid rgba(0, 0, 0, 0.08) !important;
      border-radius: 24px !important;
      padding: 10px !important;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12) !important;
      gap: 10px !important;
      backdrop-filter: blur(20px) !important;
      animation: fadeIn 0.2s ease-out !important;
    }
    
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: scale(0.95);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }
    
    [${pickerAttr}][data-visible="true"] {
      display: flex !important;
    }
    
    [${pickerAttr}] button {
      width: 36px !important;
      height: 36px !important;
      border: 3px solid rgba(255, 255, 255, 0.9) !important;
      border-radius: 50% !important;
      cursor: pointer !important;
      transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) !important;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15) !important;
      padding: 0 !important;
      position: relative !important;
      overflow: hidden !important;
    }
    
    [${pickerAttr}] button::before {
      content: '' !important;
      position: absolute !important;
      top: 50% !important;
      left: 50% !important;
      width: 0 !important;
      height: 0 !important;
      background: rgba(255, 255, 255, 0.3) !important;
      border-radius: 50% !important;
      transform: translate(-50%, -50%) !important;
      transition: width 0.3s, height 0.3s !important;
    }
    
    [${pickerAttr}] button:hover {
      transform: scale(1.2) translateY(-2px) !important;
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2) !important;
    }
    
    [${pickerAttr}] button:hover::before {
      width: 100% !important;
      height: 100% !important;
    }
    
    [${pickerAttr}] button:active {
      transform: scale(1.1) !important;
    }
  `;
  
  // Inject CSS
  function injectCSS() {
    if (!cssInjected) {
      vAPI.userStylesheet.add(pickerCSS);
      cssInjected = true;
    }
  }
  
  // Create picker
  function createPicker() {
    if (picker) return;
    
    injectCSS();
    
    picker = document.createElement('div');
    picker.setAttribute(pickerAttr, '');
    
    // Create color buttons
    const buttons = Object.entries(colors).map(([name, config]) => 
      `<button data-color="${name}" style="background-color: ${config.bg} !important;" title="${name}"></button>`
    ).join('');
    
    picker.innerHTML = buttons;
    picker.addEventListener('click', handleColorSelect);
    
    if (document.body) {
      document.body.appendChild(picker);
    }
  }
  
  // Handle color selection
  function handleColorSelect(e) {
    const button = e.target.closest('button');
    if (!button) return;
    
    const color = button.dataset.color;
    if (!color || !currentHighlightId) return;
    
    // Update highlight color using new API
    if (window.webHighlighter.modules.highlighter) {
      window.webHighlighter.modules.highlighter.updateHighlightColor(currentHighlightId, color);
    }
    
    hide();
  }
  
  // Show picker
  function show(rect, highlightId) {
    if (!picker) {
      createPicker();
    }
    
    currentHighlightId = highlightId;
    
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    
    picker.style.left = (rect.left + scrollX) + 'px';
    picker.style.top = (rect.top + scrollY - 50) + 'px';
    picker.setAttribute('data-visible', 'true');
  }
  
  // Hide picker
  function hide() {
    if (!picker) return;
    picker.setAttribute('data-visible', 'false');
    currentHighlightId = null;
  }
  
  // Initialize
  function init() {
    createPicker();
    
    // Hide on click outside
    document.addEventListener('mousedown', function(e) {
      if (picker && !picker.contains(e.target)) {
        hide();
      }
    });
    
    window.webHighlighter.log('Color picker initialized');
  }
  
  // Export API
  window.webHighlighter.ui.colorPicker = {
    init: init,
    show: show,
    hide: hide
  };
  
})();