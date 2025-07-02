/**
 * Simple Highlight Button following uBlock's pattern
 * No complex dependencies, just a simple UI component
 */

(function() {
  'use strict';
  
  const vAPI = window.webHighlighter.core.vAPI;
  const sessionId = vAPI.sessionId;
  const buttonAttr = 'wh-hb-' + sessionId;
  
  // Button state
  let button = null;
  let isVisible = false;
  let cssInjected = false;
  
  // Button CSS
  const buttonCSS = `
    [${buttonAttr}] {
      position: absolute !important;
      z-index: 2147483647 !important;
      padding: 10px 16px !important;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
      color: #ffffff !important;
      border: none !important;
      border-radius: 24px !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      font-size: 14px !important;
      font-weight: 600 !important;
      cursor: pointer !important;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4) !important;
      transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) !important;
      display: none !important;
      white-space: nowrap !important;
      backdrop-filter: blur(10px) !important;
      animation: fadeIn 0.2s ease-out !important;
    }
    
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    [${buttonAttr}]:hover {
      background: linear-gradient(135deg, #764ba2 0%, #667eea 100%) !important;
      transform: translateY(-2px) scale(1.05) !important;
      box-shadow: 0 7px 20px rgba(102, 126, 234, 0.5) !important;
    }
    
    [${buttonAttr}]:active {
      transform: translateY(0) scale(0.98) !important;
    }
    
    [${buttonAttr}][data-visible="true"] {
      display: flex !important;
      align-items: center !important;
      gap: 8px !important;
    }
    
    [${buttonAttr}] svg {
      width: 18px !important;
      height: 18px !important;
      fill: currentColor !important;
    }
  `;
  
  // Inject CSS
  function injectCSS() {
    if (!cssInjected) {
      vAPI.userStylesheet.add(buttonCSS);
      cssInjected = true;
    }
  }
  
  // Create button
  function createButton() {
    if (button) return;
    
    injectCSS();
    
    button = document.createElement('button');
    button.setAttribute(buttonAttr, '');
    button.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20.707 5.826l-3.535-3.533a.999.999 0 0 0-1.408 0L7.096 10.96a.996.996 0 0 0-.273.488l-1.024 4.437a.998.998 0 0 0 1.228 1.228l4.437-1.024a.996.996 0 0 0 .488-.273l8.669-8.669a.999.999 0 0 0 .086-1.321zM8.95 15.463l-2.896.669.669-2.896L14.086 5.873l2.227 2.227-7.363 7.363z" fill="currentColor"/>
        <path d="M19 16.757c0 .265-.105.52-.293.707A.996.996 0 0 1 18 17.757H8c-.265 0-.52-.105-.707-.293A.996.996 0 0 1 7 16.757v-6a1 1 0 0 0-2 0v6c0 .796.316 1.559.879 2.121A2.996 2.996 0 0 0 8 19.757h10a2.996 2.996 0 0 0 2.121-.879A2.996 2.996 0 0 0 21 16.757v-6a1 1 0 0 0-2 0v6z" fill="currentColor"/>
      </svg>
      <span>Highlight</span>
    `;
    button.title = 'Click to highlight selected text';
    
    button.addEventListener('click', handleClick);
    
    if (document.body) {
      document.body.appendChild(button);
    }
  }
  
  // Handle button click
  function handleClick(e) {
    e.preventDefault();
    e.stopPropagation();
    
    // Create highlight using Rangy
    if (window.webHighlighter.modules.highlighter) {
      window.webHighlighter.modules.highlighter.highlightSelection('yellow');
    }
    
    hide();
  }
  
  // Show button
  function show(rect) {
    if (!button) {
      createButton();
    }
    
    if (!button || !rect) return;
    
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    
    button.style.left = (rect.left + scrollX) + 'px';
    button.style.top = (rect.top + scrollY - 40) + 'px';
    button.setAttribute('data-visible', 'true');
    
    isVisible = true;
  }
  
  // Hide button
  function hide() {
    if (!button) return;
    
    button.setAttribute('data-visible', 'false');
    isVisible = false;
  }
  
  // Initialize
  function init() {
    createButton();
    
    // Listen for text selection
    document.addEventListener('mouseup', function() {
      setTimeout(function() {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          const text = selection.toString().trim();
          
          if (text && rect.width > 0 && rect.height > 0) {
            show(rect);
          } else {
            hide();
          }
        } else {
          hide();
        }
      }, 10);
    });
    
    // Hide on click outside
    document.addEventListener('mousedown', function(e) {
      if (button && !button.contains(e.target)) {
        hide();
      }
    });
    
    // Hide on scroll
    window.addEventListener('scroll', hide, { passive: true });
    
    window.webHighlighter.log('Highlight button initialized');
  }
  
  // Export API
  window.webHighlighter.ui.highlightButton = {
    init: init,
    show: show,
    hide: hide
  };
  
})();