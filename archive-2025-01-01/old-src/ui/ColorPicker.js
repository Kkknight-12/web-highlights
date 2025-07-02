/**
 * ColorPicker Module - Following uBlock Origin's exact pattern
 * Uses attribute selectors and CSS injection via background script
 */

(function() {
  'use strict';
  
  // Check if namespace exists
  const namespace = (typeof window !== 'undefined' && window.webHighlighter) || 
                   (typeof self !== 'undefined' && self.webHighlighter);
  
  if (!namespace) {
    console.error('ColorPicker: webHighlighter namespace not found');
    return;
  }
  
  // Dependencies will be resolved when module initializes
  let vAPI, EventBus, Constants, StateManager;
  
  // These will be set when module initializes
  let colorPickerAttr;
  let pickerSelector;
  
  const ColorPicker = (() => {
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
    let picker = null;
    let isVisible = false;
    let selectedColor = null; // Will be set when Constants is available
    let currentHighlightId = null;
    let cssInjected = false;
    
    // CSS will be generated when dependencies are available
    let pickerCSS = '';
    
    function generatePickerCSS() {
      return `
      ${pickerSelector} {
        position: absolute !important;
        z-index: 2147483647 !important;
        display: flex !important;
        gap: 8px !important;
        background: white !important;
        border: 1px solid #e5e7eb !important;
        border-radius: 24px !important;
        padding: 10px !important;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1), 0 6px 10px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.05) !important;
        animation: colorPickerFadeIn 0.2s ease-out !important;
      }
      
      @keyframes colorPickerFadeIn {
        from {
          opacity: 0;
          transform: scale(0.9);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }
      
      ${pickerSelector}[data-hidden="true"] {
        display: none !important;
      }
      
      ${pickerSelector} button {
        width: 32px !important;
        height: 32px !important;
        border-radius: 50% !important;
        border: 2px solid #ffffff !important;
        cursor: pointer !important;
        transition: all 0.2s !important;
        margin: 0 2px !important;
        box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.15) !important;
        position: relative !important;
        overflow: hidden !important;
        padding: 0 !important;
        outline: none !important;
      }
      
      ${pickerSelector} button:hover {
        transform: scale(1.15) !important;
        box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.15), 0 4px 8px rgba(0, 0, 0, 0.2) !important;
      }
      
      ${pickerSelector} button[data-selected="true"] {
        box-shadow: 0 0 0 3px #3b82f6 !important;
        transform: scale(1.1) !important;
      }
      
      ${pickerSelector} button[data-selected="true"]::after {
        content: '✓' !important;
        position: absolute !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        color: white !important;
        font-size: 16px !important;
        font-weight: bold !important;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3) !important;
      }
      
      /* Tooltip */
      ${pickerSelector} button::before {
        content: attr(title) !important;
        position: absolute !important;
        bottom: 100% !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        background: #1f2937 !important;
        color: white !important;
        padding: 4px 8px !important;
        border-radius: 4px !important;
        font-size: 12px !important;
        white-space: nowrap !important;
        opacity: 0 !important;
        pointer-events: none !important;
        transition: all 0.2s !important;
        margin-bottom: 8px !important;
      }
      
      ${pickerSelector} button:hover::before {
        opacity: 1 !important;
        margin-bottom: 4px !important;
      }
    `;
    }
    
    // Private methods
    function injectCSS() {
      if (!cssInjected && vAPI) {
        // Generate CSS with session-specific selectors
        colorPickerAttr = 'wh-cp-' + vAPI.sessionId;
        pickerSelector = `[${colorPickerAttr}]`;
        
        // Update CSS with correct selector
        pickerCSS = generatePickerCSS();
        vAPI.userStylesheet.add(pickerCSS, true);
        cssInjected = true;
      }
    }
    
    function createPicker() {
      if (picker) return;
      
      // Inject CSS first
      injectCSS();
      
      // Create picker with attribute selector (uBlock pattern)
      picker = document.createElement('div');
      picker.setAttribute(colorPickerAttr, '');
      picker.setAttribute('data-hidden', 'true');
      
      // Create color buttons
      const colors = Constants.COLORS.HIGHLIGHT_COLORS;
      const buttons = Object.entries(colors).map(([key, value]) => {
        const isSelected = key === selectedColor;
        return `
          <button
            data-color="${key}"
            data-selected="${isSelected}"
            title="${value.name}"
            style="background-color: ${value.bg} !important; border-color: ${isSelected ? value.border : '#ffffff'} !important;">
          </button>
        `;
      }).join('');
      
      picker.innerHTML = buttons;
      
      // Add event handler
      picker.addEventListener('click', handleColorSelect);
      
      // Append to body
      if (document.body) {
        document.body.appendChild(picker);
      }
    }
    
    function handleColorSelect(e) {
      const button = e.target.closest('button[data-color]');
      if (!button) return;
      
      const color = button.dataset.color;
      if (!color || !Constants.COLORS.HIGHLIGHT_COLORS[color]) return;
      
      setSelectedColor(color);
      
      // Emit selection event with highlight ID
      EventBus.emit('colorPicker:colorSelected', {
        color,
        highlightId: currentHighlightId
      });
      
      // Hide picker after selection
      hide();
    }
    
    function setSelectedColor(color) {
      if (!Constants.COLORS.HIGHLIGHT_COLORS[color]) return;
      
      selectedColor = color;
      
      // Update UI
      const buttons = picker.querySelectorAll('button[data-color]');
      buttons.forEach(btn => {
        const btnColor = btn.dataset.color;
        const colorConfig = Constants.COLORS.HIGHLIGHT_COLORS[btnColor];
        
        if (btnColor === color) {
          btn.setAttribute('data-selected', 'true');
          btn.style.borderColor = `${colorConfig.border} !important`;
        } else {
          btn.setAttribute('data-selected', 'false');
          btn.style.borderColor = '#ffffff !important';
        }
      });
      
      // Update state
      StateManager.set('ui', { selectedColor: color });
    }
    
    function updatePosition(rect) {
      if (!picker) return;
      
      // Calculate position
      const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
      const scrollY = window.pageYOffset || document.documentElement.scrollTop;
      
      // Position above the element
      const offset = 10;
      const left = rect.left + scrollX;
      const top = rect.top + scrollY - 60; // Height of picker + offset
      
      // Update position using style attribute (necessary for absolute positioning)
      picker.style.left = `${left}px`;
      picker.style.top = `${top}px`;
      
      // Ensure picker is within viewport
      requestAnimationFrame(() => {
        const pickerRect = picker.getBoundingClientRect();
        
        // Adjust horizontal position if picker extends beyond viewport
        if (pickerRect.right > window.innerWidth) {
          picker.style.left = `${window.innerWidth - pickerRect.width - 10 + scrollX}px`;
        }
        
        // Adjust vertical position if picker is above viewport
        if (pickerRect.top < 10) {
          // Position below instead
          picker.style.top = `${rect.bottom + scrollY + offset}px`;
        }
      });
    }
    
    // Public API
    function init() {
      // Ensure dependencies are resolved
      if (!resolveDependencies()) {
        console.error('ColorPicker: Dependencies not available');
        return;
      }
      
      // Set default color
      selectedColor = Constants.COLORS.DEFAULT_COLOR;
      
      createPicker();
      
      // Get initial selected color from state
      const stateColor = StateManager.get('ui.selectedColor');
      if (stateColor) {
        selectedColor = stateColor;
      }
      
      // Subscribe to state changes
      StateManager.subscribe('ui', (state) => {
        if (state.selectedColor && state.selectedColor !== selectedColor) {
          setSelectedColor(state.selectedColor);
        }
      });
      
      // Global event listeners
      document.addEventListener('mousedown', (e) => {
        if (isVisible && picker && !picker.contains(e.target)) {
          hide();
        }
      });
      
      // Emit initialization event
      EventBus.emit('colorPicker:initialized');
    }
    
    function show(rect, highlightId) {
      if (!rect) return;
      
      if (!picker) {
        createPicker();
      }
      
      isVisible = true;
      currentHighlightId = highlightId;
      
      // Update position and show
      updatePosition(rect);
      picker.setAttribute('data-hidden', 'false');
      
      // Emit event
      EventBus.emit('colorPicker:shown', {
        rect,
        highlightId
      });
    }
    
    function hide() {
      if (!picker || !isVisible) return;
      
      isVisible = false;
      picker.setAttribute('data-hidden', 'true');
      currentHighlightId = null;
      
      // Emit event
      EventBus.emit('colorPicker:hidden');
    }
    
    function cleanup() {
      // Remove CSS
      if (cssInjected) {
        vAPI.userStylesheet.remove(pickerCSS, true);
        cssInjected = false;
      }
      
      // Remove picker
      if (picker && picker.parentNode) {
        picker.parentNode.removeChild(picker);
        picker = null;
      }
    }
    
    function getSelectedColor() {
      return selectedColor;
    }
    
    // Return public API
    return {
      init,
      show,
      hide,
      cleanup,
      getSelectedColor
    };
  })();
  
  // Register with namespace and export
  if (typeof window !== 'undefined' && window.webHighlighter) {
    window.webHighlighter.register('ui', 'ColorPicker', ColorPicker);
    window.ColorPicker = ColorPicker;
  } else if (typeof self !== 'undefined' && self.webHighlighter) {
    self.webHighlighter.register('ui', 'ColorPicker', ColorPicker);
  }
  
})();