// Chrome Web Highlighter - Plain JavaScript Version
(function() {
    'use strict';
    
    // Early exit if no chrome runtime
    if (typeof chrome === 'undefined' || !chrome.runtime) {
        // Chrome runtime not available - exit silently
        return;
    }
    
    // Check if extension context is valid
    let isOrphaned = false;
    
    function isExtensionContextValid() {
        try {
            // Check multiple conditions to ensure validity
            return !!(chrome && chrome.runtime && chrome.runtime.id);
        } catch (e) {
            return false;
        }
    }
    
    // Execute function only if context is valid
    async function executeIfContextValid(callback) {
        // Still try to execute even if orphaned - let individual operations handle errors
        try {
            await callback();
        } catch (error) {
            if (error.message?.includes('Extension context invalidated')) {
                isOrphaned = true;
                // Don't cleanup - keep UI functional
                // Silently fail - no logging
            } else if (!error.message?.includes('Cannot access a chrome')) {
                // Only log errors that aren't related to Chrome API access
                console.error('Error in content script:', error);
            }
        }
    }
    
    // Cleanup function when context is invalidated
    function cleanup() {
        // Extension context invalidated, cleaning up...
        
        // Remove all event listeners
        document.removeEventListener('mouseup', handleTextSelection);
        document.removeEventListener('selectionchange', debouncedHandleTextSelection);
        document.removeEventListener('mousedown', mousedownHandler);
        document.removeEventListener('keydown', keydownHandler);
        
        // Remove UI elements
        if (highlightButtonContainer) {
            highlightButtonContainer.remove();
        }
        if (miniToolbar) {
            miniToolbar.remove();
        }
        
        // Clear any intervals or timeouts
        if (contextCheckInterval) {
            clearInterval(contextCheckInterval);
        }
        
        // Reset state
        highlightsLoaded = false;
        
        // Cleanup completed
    }
    
    // Check context validity periodically
    let contextCheckInterval = setInterval(() => {
        if (!isExtensionContextValid()) {
            isOrphaned = true;
            clearInterval(contextCheckInterval);
            // Don't cleanup - keep UI functional
            // Context check failed but keeping UI
        }
    }, 5000);
    
    
    // Constants
    const HIGHLIGHT_COLORS = {
        yellow: { bg: 'rgba(255, 224, 102, 0.4)', border: 'rgba(255, 224, 102, 0.6)', name: 'Yellow' },
        green: { bg: 'rgba(110, 231, 183, 0.4)', border: 'rgba(110, 231, 183, 0.6)', name: 'Green' },
        blue: { bg: 'rgba(147, 197, 253, 0.4)', border: 'rgba(147, 197, 253, 0.6)', name: 'Blue' },
        pink: { bg: 'rgba(252, 165, 165, 0.4)', border: 'rgba(252, 165, 165, 0.6)', name: 'Pink' }
    };
    const DEFAULT_COLOR = 'yellow';
    const STORAGE_KEY = 'highlights';
    
    // State
    let highlightButton = null;
    let highlightButtonContainer = null;
    let colorPicker = null;
    let miniToolbar = null;
    let selectedText = '';
    let selectedRange = null;
    let selectedColor = DEFAULT_COLOR;
    let currentHighlightId = null;
    let debouncedHandleTextSelection = null;
    let mousedownHandler = null;
    let keydownHandler = null;
    
    // Initialize the extension
    function initialize() {
        // Initializing...
        
        // Don't check context validity for UI creation
        if (!document.body) {
            // No document.body, waiting...
            return;
        }
        
        // Always create UI and setup listeners
        createUI();
        setupEventListeners();
        
        // Only check context for Chrome API operations
        if (isExtensionContextValid()) {
            // Delay highlight loading to ensure DOM is fully ready
            setTimeout(() => {
                loadHighlights();
            }, 100);
            
            // Set up observer for dynamic content
            observeDOMChanges();
        } else {
            // Context invalid, but UI is ready
        }
    }
    
    // Create UI elements
    function createUI() {
        // Don't create UI if already exists
        if (highlightButtonContainer) {
            // UI already created
            return;
        }
        
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
        
        // Create highlight button
        highlightButton = document.createElement('button');
        highlightButton.style.cssText = `
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 24px;
            padding: 10px 16px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04);
            font-size: 14px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: #374151;
            font-weight: 500;
            line-height: 1.5;
            transition: all 0.2s;
            min-height: 40px;
        `;
        
        highlightButton.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="5" y="8" width="14" height="8" rx="1" fill="${HIGHLIGHT_COLORS[DEFAULT_COLOR].bg}" stroke="${HIGHLIGHT_COLORS[DEFAULT_COLOR].border}" stroke-width="2"/>
                <path d="M7 8V6C7 5.44772 7.44772 5 8 5H16C16.5523 5 17 5.44772 17 6V8" stroke="#374151" stroke-width="2" stroke-linecap="round"/>
                <path d="M10 20L12 16L14 20" stroke="#374151" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>Highlight</span>
        `;
        
        // Create color picker
        colorPicker = document.createElement('div');
        colorPicker.style.cssText = `
            position: absolute;
            left: 100%;
            top: 50%;
            transform: translateY(-50%);
            margin-left: 8px;
            display: none;
            gap: 6px;
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 20px;
            padding: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04);
        `;
        
        // Add color buttons
        Object.entries(HIGHLIGHT_COLORS).forEach(([colorKey, colorValue]) => {
            const colorBtn = document.createElement('button');
            colorBtn.className = 'color-btn';
            colorBtn.style.cssText = `
                width: 28px;
                height: 28px;
                border-radius: 50%;
                border: 2px solid #ffffff;
                background-color: ${colorValue.bg};
                cursor: pointer;
                transition: all 0.2s;
                margin: 0 2px;
                box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.15);
                position: relative;
            `;
            colorBtn.dataset.color = colorKey;
            colorBtn.title = colorValue.name;
            
            colorBtn.addEventListener('mouseenter', function() {
                this.style.transform = 'scale(1.1)';
                this.style.borderColor = colorValue.border;
            });
            
            colorBtn.addEventListener('mouseleave', function() {
                this.style.transform = 'scale(1)';
                this.style.borderColor = '#ffffff';
            });
            
            colorBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                selectedColor = colorKey;
                updateButtonColor(colorKey);
                createHighlight();
            });
            
            colorPicker.appendChild(colorBtn);
        });
        
        // Assemble button container
        highlightButtonContainer.appendChild(highlightButton);
        highlightButtonContainer.appendChild(colorPicker);
        document.body.appendChild(highlightButtonContainer);
        
        // Button container created and added to DOM
        
        // Create mini toolbar
        createMiniToolbar();
        
        // Setup hover behavior
        setupHoverBehavior();
    }
    
    // Create mini toolbar for highlight management
    function createMiniToolbar() {
        miniToolbar = document.createElement('div');
        miniToolbar.id = 'web-highlighter-toolbar';
        miniToolbar.style.cssText = `
            position: absolute;
            z-index: 2147483647;
            display: none;
            background: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 4px;
            gap: 4px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04);
        `;
        
        miniToolbar.innerHTML = `
            <button class="toolbar-btn" data-action="copy" title="Copy text" style="background: none; border: none; padding: 6px; cursor: pointer; border-radius: 4px; color: #374151; transition: all 0.2s;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="9" y="9" width="13" height="13" rx="2" stroke="#374151" stroke-width="2"/>
                    <path d="M5 15H4C2.89543 15 2 14.1046 2 13V4C2 2.89543 2.89543 2 4 2H13C14.1046 2 15 2.89543 15 4V5" stroke="#374151" stroke-width="2"/>
                </svg>
            </button>
            <button class="toolbar-btn" data-action="remove" title="Remove highlight" style="background: none; border: none; padding: 6px; cursor: pointer; border-radius: 4px; color: #374151; transition: all 0.2s;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 6L18 18M6 18L18 6" stroke="#374151" stroke-width="2" stroke-linecap="round"/>
                </svg>
            </button>
        `;
        
        // Add hover styles
        const style = document.createElement('style');
        style.textContent = `
            #web-highlighter-toolbar .toolbar-btn:hover {
                background-color: #f3f4f6 !important;
            }
            #web-highlighter-toolbar .toolbar-btn:active {
                background-color: #e5e7eb !important;
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(miniToolbar);
    }
    
    // Setup hover behavior for color picker
    function setupHoverBehavior() {
        let hoverTimeout = null;
        
        const showColorPicker = () => {
            if (hoverTimeout) {
                clearTimeout(hoverTimeout);
                hoverTimeout = null;
            }
            colorPicker.style.display = 'flex';
            highlightButton.style.transform = 'scale(1.05)';
        };
        
        const hideColorPicker = () => {
            if (hoverTimeout) clearTimeout(hoverTimeout);
            hoverTimeout = setTimeout(() => {
                colorPicker.style.display = 'none';
                highlightButton.style.transform = 'scale(1)';
            }, 200);
        };
        
        highlightButton.addEventListener('mouseenter', showColorPicker);
        colorPicker.addEventListener('mouseenter', () => {
            if (hoverTimeout) clearTimeout(hoverTimeout);
        });
        
        highlightButton.addEventListener('mouseleave', hideColorPicker);
        colorPicker.addEventListener('mouseleave', hideColorPicker);
    }
    
    // Setup event listeners
    function setupEventListeners() {
        // Store debounced function reference for cleanup
        debouncedHandleTextSelection = debounce(handleTextSelection, 300);
        
        // Text selection
        document.addEventListener('mouseup', handleTextSelection);
        document.addEventListener('selectionchange', debouncedHandleTextSelection);
        
        // Store mousedown handler for cleanup
        mousedownHandler = function(e) {
            if (!e.target) return;
            
            // Don't interfere with input fields
            const target = e.target;
            const element = target.nodeType === Node.ELEMENT_NODE ? target : target.parentElement;
            
            // Ensure element exists and is an Element node
            if (element && element.nodeType === Node.ELEMENT_NODE) {
                if (element.tagName === 'INPUT' || 
                    element.tagName === 'TEXTAREA' ||
                    element.contentEditable === 'true' ||
                    (typeof element.closest === 'function' && 
                     element.closest('input, textarea, [contenteditable="true"]'))) {
                    hideHighlightButton();
                    hideMiniToolbar();
                    return;
                }
                
                // Check if click is outside our UI elements
                if (typeof element.closest === 'function' && 
                    !element.closest('#web-highlighter-button-container') && 
                    !element.closest('#web-highlighter-toolbar')) {
                    hideHighlightButton();
                    hideMiniToolbar();
                }
            } else {
                // No valid element, hide UI
                hideHighlightButton();
                hideMiniToolbar();
            }
        };
        document.addEventListener('mousedown', mousedownHandler);
        
        // Highlight button click
        highlightButton.addEventListener('click', createHighlight);
        
        // Toolbar actions
        miniToolbar.addEventListener('click', handleToolbarAction);
        
        // Store keyboard handler for cleanup
        keydownHandler = function(e) {
            // Skip if in input field
            const activeElement = document.activeElement;
            if (activeElement && (
                activeElement.tagName === 'INPUT' || 
                activeElement.tagName === 'TEXTAREA' ||
                activeElement.contentEditable === 'true')) {
                return;
            }
            
            const isMac = navigator.userAgent.includes('Mac');
            const modifier = isMac ? e.metaKey : e.ctrlKey;
            
            if (modifier && e.shiftKey && e.key.toLowerCase() === 'h') {
                e.preventDefault();
                const selection = window.getSelection();
                if (selection.toString().trim()) {
                    selectedText = selection.toString();
                    selectedRange = selection.getRangeAt(0).cloneRange();
                    createHighlight();
                }
            }
        };
        document.addEventListener('keydown', keydownHandler);
        
        // Listen for messages from popup
        if (chrome.runtime && chrome.runtime.onMessage) {
            try {
                chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
                    // Check if context is still valid
                    if (!isExtensionContextValid()) {
                        return false;
                    }
                    try {
                        if (message.action === 'removeHighlight') {
                            removeHighlight(message.highlightId);
                        } else if (message.action === 'removeAllHighlights') {
                            removeAllHighlights();
                        } else if (message.action === 'reloadHighlights') {
                            // Force reload highlights (useful after storage changes)
                            highlightsLoaded = false;
                            loadHighlights();
                        } else if (message.action === 'highlightFromContextMenu') {
                            // Handle context menu highlight request
                            try {
                                const selection = window.getSelection();
                                if (selection && selection.toString().trim()) {
                                    selectedText = selection.toString();
                                    selectedRange = selection.getRangeAt(0).cloneRange();
                                    createHighlight();
                                }
                            } catch (err) {
                                console.warn('Error handling context menu highlight:', err);
                            }
                        }
                        // Send response to avoid errors
                        if (sendResponse) {
                            sendResponse({success: true});
                        }
                    } catch (error) {
                        if (!error.message?.includes('Extension context invalidated') && 
                            !error.message?.includes('Cannot access a chrome')) {
                            console.error('Error handling message:', error);
                        }
                    }
                    // Return true to indicate we'll send a response asynchronously
                    return true;
                });
            } catch (error) {
                // Silently fail if we can't add message listener
            }
        }
    }
    
    // Handle text selection
    function handleTextSelection(e) {
        // Skip if the event originated from an input, textarea, or contenteditable
        if (e && e.target) {
            const target = e.target;
            // Ensure target is an Element node before using closest
            const element = target.nodeType === Node.ELEMENT_NODE ? target : target.parentElement;
            
            // Check element exists and is an Element node
            if (element && element.nodeType === Node.ELEMENT_NODE) {
                if (element.tagName === 'INPUT' || 
                    element.tagName === 'TEXTAREA' ||
                    element.contentEditable === 'true' ||
                    (typeof element.closest === 'function' && 
                     element.closest('input, textarea, [contenteditable="true"]'))) {
                    return;
                }
            }
        }
        
        const selection = window.getSelection();
        const text = selection.toString().trim();
        
        if (text.length > 0 && selection.rangeCount > 0) {
            // Double-check: Don't show button if selecting in input fields
            const anchorNode = selection.anchorNode;
            const parentElement = anchorNode?.nodeType === Node.TEXT_NODE ? 
                anchorNode.parentElement : anchorNode;
            
            // Make sure parentElement exists and is an Element
            if (parentElement && parentElement.nodeType === Node.ELEMENT_NODE) {
                if (parentElement.tagName === 'INPUT' || 
                    parentElement.tagName === 'TEXTAREA' ||
                    parentElement.contentEditable === 'true' ||
                    (typeof parentElement.closest === 'function' && 
                     parentElement.closest('input, textarea, [contenteditable="true"]'))) {
                    hideHighlightButton();
                    return;
                }
            }
            
            selectedText = text;
            selectedRange = selection.getRangeAt(0).cloneRange();
            
            const rect = selectedRange.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                if (!highlightButtonContainer) {
                    // Button container not initialized
                    return;
                }
                showHighlightButton(rect);
            } else {
                // Selection rect has no size
            }
        } else {
            hideHighlightButton();
        }
    }
    
    // Show highlight button
    function showHighlightButton(rect) {
        if (!highlightButtonContainer) return;
        
        try {
            const left = rect.left + window.scrollX;
            const top = rect.bottom + window.scrollY + 5;
            
            highlightButtonContainer.style.left = left + 'px';
            highlightButtonContainer.style.top = top + 'px';
            highlightButtonContainer.style.display = 'flex';
            
            // Detect background color and adjust button colors
            adjustHighlightButtonForBackground();
        } catch (error) {
            // Silently fail if context is invalid
            if (!error.message?.includes('Extension context invalidated') && 
                !error.message?.includes('Cannot access a chrome')) {
                console.error('Error showing highlight button:', error);
            }
        }
    }
    
    // Adjust highlight button colors based on background
    function adjustHighlightButtonForBackground() {
        if (!highlightButton || !colorPicker) return;
        
        try {
            // Get the background color at the button position
            const element = document.elementFromPoint(
                parseFloat(highlightButtonContainer.style.left), 
                parseFloat(highlightButtonContainer.style.top) - 10
            );
            
            if (!element) return;
            
            // Get computed background color
            let bgColor = window.getComputedStyle(element).backgroundColor;
            let currentElement = element;
            
            // Walk up the DOM tree to find a non-transparent background
            while (bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'transparent') {
                currentElement = currentElement.parentElement;
                if (!currentElement || currentElement === document.body) {
                    bgColor = window.getComputedStyle(document.body).backgroundColor;
                    break;
                }
                bgColor = window.getComputedStyle(currentElement).backgroundColor;
            }
            
            // Calculate if background is dark
            const isDark = isColorDark(bgColor);
            
            // Apply appropriate styles
            if (isDark) {
                // Dark background - use light colors
                highlightButton.style.background = '#374151';
                highlightButton.style.borderColor = '#4b5563';
                highlightButton.style.color = '#f3f4f6';
                highlightButton.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)';
                
                // Update SVG colors
                const paths = highlightButton.querySelectorAll('path');
                paths.forEach(path => {
                    if (!path.getAttribute('fill') || path.getAttribute('fill') === '#374151') {
                        path.setAttribute('stroke', '#f3f4f6');
                    }
                });
                
                // Update text color
                const span = highlightButton.querySelector('span');
                if (span) span.style.color = '#f3f4f6';
                
                // Update color picker
                colorPicker.style.background = '#374151';
                colorPicker.style.borderColor = '#4b5563';
                colorPicker.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)';
            } else {
                // Light background - use dark colors
                highlightButton.style.background = '#ffffff';
                highlightButton.style.borderColor = '#e5e7eb';
                highlightButton.style.color = '#374151';
                highlightButton.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)';
                
                // Update SVG colors
                const paths = highlightButton.querySelectorAll('path');
                paths.forEach(path => {
                    if (!path.getAttribute('fill') || path.getAttribute('fill') === '#f3f4f6') {
                        path.setAttribute('stroke', '#374151');
                    }
                });
                
                // Update text color
                const span = highlightButton.querySelector('span');
                if (span) span.style.color = '#374151';
                
                // Update color picker
                colorPicker.style.background = '#ffffff';
                colorPicker.style.borderColor = '#e5e7eb';
                colorPicker.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)';
            }
        } catch (error) {
            // Silently fail on error
            console.warn('Could not detect background color for button:', error);
        }
    }
    
    // Hide highlight button
    function hideHighlightButton() {
        try {
            if (highlightButtonContainer) {
                highlightButtonContainer.style.display = 'none';
            }
            if (colorPicker) {
                colorPicker.style.display = 'none';
            }
            
            // Clear selection only if not in an input field
            const activeElement = document.activeElement;
            if (activeElement && (
                activeElement.tagName === 'INPUT' || 
                activeElement.tagName === 'TEXTAREA' ||
                activeElement.contentEditable === 'true')) {
                // Don't clear selection in input fields
                return;
            }
            
            try {
                const selection = window.getSelection();
                if (selection) {
                    selection.removeAllRanges();
                }
            } catch (e) {
                // Ignore selection clearing errors
            }
        } catch (error) {
            // Silently fail if context is invalid
            if (!error.message?.includes('Extension context invalidated') && 
                !error.message?.includes('Cannot access a chrome')) {
                console.error('Error hiding highlight button:', error);
            }
        }
    }
    
    // Update button color indicator
    function updateButtonColor(color) {
        const rect = highlightButton.querySelector('rect');
        if (rect) {
            const colorConfig = HIGHLIGHT_COLORS[color];
            rect.setAttribute('fill', colorConfig.bg);
            rect.setAttribute('stroke', colorConfig.border);
        }
    }
    
    // Create highlight
    async function createHighlight() {
        if (!selectedText || !selectedRange) return;
        
        executeIfContextValid(async () => {
            const highlightId = generateId();
            // Use default color if selectedColor is undefined
            const color = selectedColor || DEFAULT_COLOR;
            const highlight = {
                id: highlightId,
                text: selectedText,
                color: color,
                url: window.location.href,
                timestamp: Date.now(),
                path: getXPath(selectedRange.startContainer),
                startOffset: selectedRange.startOffset,
                endOffset: selectedRange.endOffset
            };
            
            // Apply highlight to page
            applyHighlight(selectedRange, highlightId, color);
            
            // Save to storage
            await saveHighlight(highlight);
            
            // Hide button
            hideHighlightButton();
            
            // Clear selection
            selectedText = '';
            selectedRange = null;
        });
    }
    
    // Apply highlight to range
    function applyHighlight(range, id, color) {
        try {
            // Get all text nodes in the range
            const textNodes = getTextNodesInRange(range);
            
            textNodes.forEach(node => {
                // Create a new range for each text node
                const nodeRange = document.createRange();
                
                // Set the range boundaries within the text node
                if (node === range.startContainer && node === range.endContainer) {
                    nodeRange.setStart(node, range.startOffset);
                    nodeRange.setEnd(node, range.endOffset);
                } else if (node === range.startContainer) {
                    nodeRange.setStart(node, range.startOffset);
                    nodeRange.setEnd(node, node.textContent.length);
                } else if (node === range.endContainer) {
                    nodeRange.setStart(node, 0);
                    nodeRange.setEnd(node, range.endOffset);
                } else {
                    nodeRange.selectNodeContents(node);
                }
                
                // Create highlight span
                const span = document.createElement('span');
                span.className = 'web-highlighter-highlight';
                span.dataset.highlightId = id;
                span.dataset.color = color;
                span.style.cssText = `
                    background-color: ${HIGHLIGHT_COLORS[color].bg};
                    border-bottom: 2px solid ${HIGHLIGHT_COLORS[color].border};
                    cursor: pointer;
                    transition: all 0.2s;
                    display: inline;
                `;
                
                // Add hover effect
                span.addEventListener('mouseenter', function() {
                    try {
                        this.style.filter = 'brightness(0.9)';
                    } catch (e) {
                        // Ignore errors
                    }
                });
                
                span.addEventListener('mouseleave', function() {
                    try {
                        this.style.filter = 'brightness(1)';
                    } catch (e) {
                        // Ignore errors
                    }
                });
                
                // Add click handler
                span.addEventListener('click', function(e) {
                    e.stopPropagation();
                    currentHighlightId = id;
                    const rect = this.getBoundingClientRect();
                    showMiniToolbar(rect);
                });
                
                // Wrap the text node content
                try {
                    nodeRange.surroundContents(span);
                } catch (e) {
                    // If surroundContents fails, manually wrap
                    const contents = nodeRange.extractContents();
                    span.appendChild(contents);
                    nodeRange.insertNode(span);
                }
            });
        } catch (e) {
            console.error('Error applying highlight:', e);
        }
    }
    
    // Get all text nodes within a range
    function getTextNodesInRange(range) {
        const textNodes = [];
        const commonAncestor = range.commonAncestorContainer;
        
        // If the common ancestor is a text node itself
        if (commonAncestor.nodeType === Node.TEXT_NODE) {
            return [commonAncestor];
        }
        
        // Walk through all nodes in the range
        const walker = document.createTreeWalker(
            commonAncestor,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function(node) {
                    const nodeRange = document.createRange();
                    nodeRange.selectNodeContents(node);
                    
                    // Check if this text node intersects with our range
                    if (range.compareBoundaryPoints(Range.END_TO_START, nodeRange) <= 0 &&
                        range.compareBoundaryPoints(Range.START_TO_END, nodeRange) >= 0) {
                        return NodeFilter.FILTER_ACCEPT;
                    }
                    return NodeFilter.FILTER_REJECT;
                }
            }
        );
        
        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }
        
        return textNodes;
    }
    
    // Show mini toolbar
    function showMiniToolbar(rect) {
        if (!miniToolbar) return;
        
        try {
            const left = rect.left + window.scrollX;
            const top = rect.bottom + window.scrollY + 5;
            
            miniToolbar.style.left = left + 'px';
            miniToolbar.style.top = top + 'px';
            miniToolbar.style.display = 'flex';
            
            // Detect if background is dark and adjust toolbar colors
            // Pass the rect so we can check the background near the highlight
            adjustToolbarForBackground(rect);
        } catch (error) {
            // Silently fail if context is invalid
            if (!error.message?.includes('Extension context invalidated') && 
                !error.message?.includes('Cannot access a chrome')) {
                console.error('Error showing mini toolbar:', error);
            }
        }
    }
    
    // Detect background color and adjust toolbar
    function adjustToolbarForBackground(rect) {
        if (!miniToolbar) return;
        
        try {
            // Get the background color outside the highlighted text to avoid checking the highlight's own background
            // Check to the left of the highlight to avoid the highlight's background color
            const checkX = rect ? Math.max(0, rect.left - 10) : parseFloat(miniToolbar.style.left);
            const checkY = rect ? rect.top + rect.height / 2 : parseFloat(miniToolbar.style.top) - 10;
            
            const element = document.elementFromPoint(checkX, checkY);
            
            if (!element) return;
            
            // Get computed background color
            let bgColor = window.getComputedStyle(element).backgroundColor;
            let currentElement = element;
            
            // Walk up the DOM tree to find a non-transparent background
            while (bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'transparent') {
                currentElement = currentElement.parentElement;
                if (!currentElement || currentElement === document.body) {
                    bgColor = window.getComputedStyle(document.body).backgroundColor;
                    break;
                }
                bgColor = window.getComputedStyle(currentElement).backgroundColor;
            }
            
            // Calculate if background is dark
            const isDark = isColorDark(bgColor);
            
            // Apply appropriate styles
            if (isDark) {
                miniToolbar.style.background = '#374151';
                miniToolbar.style.borderColor = '#4b5563';
                miniToolbar.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)';
                
                const buttons = miniToolbar.querySelectorAll('.toolbar-btn');
                buttons.forEach(btn => {
                    btn.style.color = '#f3f4f6';
                    const svgElements = btn.querySelectorAll('rect, path');
                    svgElements.forEach(svg => {
                        svg.setAttribute('stroke', '#f3f4f6');
                    });
                });
            } else {
                miniToolbar.style.background = '#ffffff';
                miniToolbar.style.borderColor = '#e5e7eb';
                miniToolbar.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)';
                
                const buttons = miniToolbar.querySelectorAll('.toolbar-btn');
                buttons.forEach(btn => {
                    btn.style.color = '#374151';
                    const svgElements = btn.querySelectorAll('rect, path');
                    svgElements.forEach(svg => {
                        svg.setAttribute('stroke', '#374151');
                    });
                });
            }
        } catch (error) {
            // Silently fail on error
            console.warn('Could not detect background color:', error);
        }
    }
    
    // Check if a color is dark
    function isColorDark(color) {
        // Default to light if we can't parse
        if (!color) return false;
        
        // Parse rgb/rgba values
        const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (!match) return false;
        
        const r = parseInt(match[1]);
        const g = parseInt(match[2]);
        const b = parseInt(match[3]);
        
        // Calculate luminance
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        
        // Consider dark if luminance is less than 0.5
        return luminance < 0.5;
    }
    
    // Hide mini toolbar
    function hideMiniToolbar() {
        try {
            if (miniToolbar) {
                miniToolbar.style.display = 'none';
            }
            currentHighlightId = null;
        } catch (error) {
            // Silently fail if context is invalid
            if (!error.message?.includes('Extension context invalidated') && 
                !error.message?.includes('Cannot access a chrome')) {
                console.error('Error hiding mini toolbar:', error);
            }
        }
    }
    
    // Handle toolbar actions
    async function handleToolbarAction(e) {
        const button = e.target.closest('.toolbar-btn');
        if (!button) return;
        
        const action = button.dataset.action;
        
        if (action === 'copy' && currentHighlightId) {
            const highlightElement = document.querySelector(`[data-highlight-id="${currentHighlightId}"]`);
            if (highlightElement) {
                await navigator.clipboard.writeText(highlightElement.textContent);
            }
        } else if (action === 'remove' && currentHighlightId) {
            await removeHighlight(currentHighlightId);
        }
        
        hideMiniToolbar();
    }
    
    // Remove highlight
    async function removeHighlight(highlightId) {
        try {
            // Remove from DOM
            const elements = document.querySelectorAll(`[data-highlight-id="${highlightId}"]`);
            elements.forEach(element => {
                const parent = element.parentNode;
                while (element.firstChild) {
                    parent.insertBefore(element.firstChild, element);
                }
                parent.removeChild(element);
            });
            
            // Check if extension context is valid before storage operations
            if (!chrome.runtime || !chrome.runtime.id) {
                // Silently fail - don't log context errors
                return;
            }
            
            // Remove from storage
            const highlights = await getHighlights();
            const filtered = highlights.filter(h => h.id !== highlightId);
            await chrome.storage.local.set({ [STORAGE_KEY]: filtered });
        } catch (error) {
            // Only log non-context errors
            if (!error.message?.includes('Extension context invalidated') && 
                !error.message?.includes('Cannot access a chrome')) {
                console.error('Error removing highlight:', error);
            }
        }
    }
    
    // Remove all highlights
    async function removeAllHighlights() {
        try {
            // Remove from DOM
            const elements = document.querySelectorAll('.web-highlighter-highlight');
            elements.forEach(element => {
                const parent = element.parentNode;
                while (element.firstChild) {
                    parent.insertBefore(element.firstChild, element);
                }
                parent.removeChild(element);
            });
            
            // Check if extension context is valid before storage operations
            if (!chrome.runtime || !chrome.runtime.id) {
                // Silently fail - don't log context errors
                return;
            }
            
            // Clear storage for this URL
            const highlights = await getHighlights();
            const filtered = highlights.filter(h => h.url !== window.location.href);
            await chrome.storage.local.set({ [STORAGE_KEY]: filtered });
        } catch (error) {
            // Only log non-context errors
            if (!error.message?.includes('Extension context invalidated') && 
                !error.message?.includes('Cannot access a chrome')) {
                console.error('Error removing all highlights:', error);
            }
        }
    }
    
    // Save highlight to storage
    async function saveHighlight(highlight) {
        try {
            // Check if extension context is valid
            if (!chrome.runtime || !chrome.runtime.id) {
                // Silently fail - don't log context errors
                return;
            }
            const highlights = await getHighlights();
            highlights.push(highlight);
            await chrome.storage.local.set({ [STORAGE_KEY]: highlights });
        } catch (error) {
            // Only log non-context errors
            if (!error.message?.includes('Extension context invalidated') && 
                !error.message?.includes('Cannot access a chrome')) {
                console.error('Error saving highlight:', error);
            }
        }
    }
    
    // Get highlights from storage
    async function getHighlights() {
        if (isOrphaned || !isExtensionContextValid()) {
            return [];
        }
        
        try {
            // Double-check before accessing chrome API
            if (!chrome.runtime?.id) {
                isOrphaned = true;
                return [];
            }
            const result = await chrome.storage.local.get(STORAGE_KEY);
            return result[STORAGE_KEY] || [];
        } catch (error) {
            // Silently handle context invalidation
            if (error.message?.includes('Extension context invalidated') ||
                error.message?.includes('Cannot access a chrome')) {
                isOrphaned = true;
                // Don't cleanup - just mark as orphaned
            }
            return [];
        }
    }
    
    // Track if highlights have been loaded to prevent duplicates
    let highlightsLoaded = false;
    
    // Load highlights for current page
    async function loadHighlights() {
        if (isOrphaned || !isExtensionContextValid() || highlightsLoaded) {
            return;
        }
        
        try {
            const highlights = await getHighlights();
            const pageHighlights = highlights.filter(h => h.url === window.location.href);
            
            // Mark as loaded before processing to prevent race conditions
            if (pageHighlights.length > 0) {
                highlightsLoaded = true;
            }
            
            pageHighlights.forEach(highlight => {
                try {
                    // Check if highlight already exists to prevent duplicates
                    if (document.querySelector(`[data-highlight-id="${highlight.id}"]`)) {
                        return;
                    }
                    
                    // Try multiple methods to find and highlight text
                    if (!restoreHighlightByXPath(highlight)) {
                        // Fallback to text search if XPath fails
                        restoreHighlightByTextSearch(highlight);
                    }
                } catch (e) {
                    // Only log non-context errors
                    if (!e.message?.includes('Extension context invalidated') && 
                        !e.message?.includes('Cannot access a chrome')) {
                        console.warn('Error restoring highlight:', e);
                    }
                }
            });
        } catch (error) {
            // Silently fail on context invalidation errors
            if (!error.message?.includes('Extension context invalidated') && 
                !error.message?.includes('Cannot access a chrome')) {
                console.error('Error loading highlights:', error);
            } else {
                // Context invalidated - mark as orphaned but don't cleanup
                // This allows UI to continue functioning
                isOrphaned = true;
                // Context invalidated but keeping UI functional
            }
        }
    }
    
    // Restore highlight using XPath
    function restoreHighlightByXPath(highlight) {
        const element = getElementByXPath(highlight.path);
        if (element && element.textContent.includes(highlight.text)) {
            const textNode = findTextNode(element, highlight.text);
            if (textNode) {
                const range = document.createRange();
                const startOffset = textNode.textContent.indexOf(highlight.text);
                if (startOffset !== -1) {
                    range.setStart(textNode, startOffset);
                    range.setEnd(textNode, startOffset + highlight.text.length);
                    applyHighlight(range, highlight.id, highlight.color || 'yellow');
                    return true;
                }
            }
        }
        return false;
    }
    
    // Fallback: Restore highlight by searching for text
    function restoreHighlightByTextSearch(highlight) {
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function(node) {
                    // Skip already highlighted text
                    if (node.parentElement?.classList?.contains('web-highlighter-highlight')) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    return node.textContent.includes(highlight.text) ? 
                        NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
                }
            }
        );
        
        let node;
        while (node = walker.nextNode()) {
            const startOffset = node.textContent.indexOf(highlight.text);
            if (startOffset !== -1) {
                const range = document.createRange();
                range.setStart(node, startOffset);
                range.setEnd(node, startOffset + highlight.text.length);
                applyHighlight(range, highlight.id, highlight.color || 'yellow');
                return true;
            }
        }
        return false;
    }
    
    // Utility functions
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    function getXPath(element) {
        if (element.nodeType === Node.TEXT_NODE) {
            element = element.parentNode;
        }
        
        if (element.id) {
            return `//*[@id="${element.id}"]`;
        }
        
        const paths = [];
        for (; element && element.nodeType === Node.ELEMENT_NODE; element = element.parentNode) {
            let index = 0;
            for (let sibling = element.previousSibling; sibling; sibling = sibling.previousSibling) {
                if (sibling.nodeType === Node.ELEMENT_NODE && sibling.tagName === element.tagName) {
                    index++;
                }
            }
            const tagName = element.tagName.toLowerCase();
            const pathIndex = index ? `[${index + 1}]` : '';
            paths.unshift(`${tagName}${pathIndex}`);
        }
        
        return paths.length ? `/${paths.join('/')}` : null;
    }
    
    function getElementByXPath(path) {
        return document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    }
    
    function findTextNode(element, text) {
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function(node) {
                    return node.textContent.includes(text) ? 
                        NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
                }
            }
        );
        
        return walker.nextNode();
    }
    
    // Set up DOM observer for dynamic content
    function observeDOMChanges() {
        let debounceTimer;
        const observer = new MutationObserver((mutations) => {
            // Debounce to avoid excessive reloading
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                // Only reload if significant content changes
                const hasSignificantChanges = mutations.some(mutation => {
                    return mutation.type === 'childList' && 
                           mutation.addedNodes.length > 0 &&
                           Array.from(mutation.addedNodes).some(node => 
                               node.nodeType === Node.ELEMENT_NODE ||
                               (node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0)
                           );
                });
                
                if (hasSignificantChanges && !highlightsLoaded) {
                    loadHighlights();
                }
            }, 500);
        });
        
        // Start observing with a slight delay to avoid initial page load mutations
        setTimeout(() => {
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }, 1000);
    }
    
    // Initialize when DOM is ready - skip chrome:// pages only
    if (!window.location.href.startsWith('chrome://')) {
        // Setting up initialization
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initialize);
        } else if (document.readyState === 'interactive') {
            // DOM is parsed but resources still loading
            document.addEventListener('DOMContentLoaded', initialize);
        } else {
            // Document is complete
            initialize();
        }
        
        // Also listen for load event as a fallback
        window.addEventListener('load', () => {
            // Try to initialize if not done yet
            if (!highlightButtonContainer) {
                // Fallback initialization on window load
                initialize();
            }
            
            // Load highlights if context is valid
            if (!highlightsLoaded && isExtensionContextValid()) {
                setTimeout(loadHighlights, 500);
            }
        });
    } else {
        // Not initializing (chrome:// page)
    }
})();