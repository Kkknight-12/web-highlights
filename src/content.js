// Chrome Web Highlighter - Plain JavaScript Version
(function() {
    'use strict';
    
    console.log('Chrome Web Highlighter loaded');
    
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
    
    // Initialize the extension
    function initialize() {
        try {
            if (!document.body) return;
            
            // Check if extension context is valid
            if (!chrome.runtime || !chrome.runtime.id) {
                console.warn('Extension context invalidated during initialization');
                return;
            }
            
            createUI();
            setupEventListeners();
            loadHighlights();
        } catch (error) {
            console.error('Error initializing Web Highlighter:', error);
        }
    }
    
    // Create UI elements
    function createUI() {
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
            border-radius: 8px;
            padding: 8px 12px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
            font-size: 14px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: #374151;
            font-weight: 500;
            line-height: 1.5;
            transition: all 0.2s;
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
            gap: 4px;
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 6px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        `;
        
        // Add color buttons
        Object.entries(HIGHLIGHT_COLORS).forEach(([colorKey, colorValue]) => {
            const colorBtn = document.createElement('button');
            colorBtn.className = 'color-btn';
            colorBtn.style.cssText = `
                width: 24px;
                height: 24px;
                border-radius: 4px;
                border: 2px solid transparent;
                background-color: ${colorValue.bg};
                cursor: pointer;
                transition: all 0.2s;
                margin: 0 2px;
            `;
            colorBtn.dataset.color = colorKey;
            colorBtn.title = colorValue.name;
            
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
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 4px;
            gap: 4px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        `;
        
        miniToolbar.innerHTML = `
            <button class="toolbar-btn" data-action="copy" title="Copy text" style="background: none; border: none; padding: 6px; cursor: pointer; border-radius: 4px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/>
                    <path d="M5 15H4C2.89543 15 2 14.1046 2 13V4C2 2.89543 2.89543 2 4 2H13C14.1046 2 15 2.89543 15 4V5" stroke="currentColor" stroke-width="2"/>
                </svg>
            </button>
            <button class="toolbar-btn" data-action="remove" title="Remove highlight" style="background: none; border: none; padding: 6px; cursor: pointer; border-radius: 4px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 6L18 18M6 18L18 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            </button>
        `;
        
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
        // Text selection
        document.addEventListener('mouseup', handleTextSelection);
        document.addEventListener('selectionchange', debounce(handleTextSelection, 300));
        
        // Hide UI on click outside
        document.addEventListener('mousedown', function(e) {
            // Don't interfere with input fields
            const target = e.target;
            const element = target.nodeType === Node.ELEMENT_NODE ? target : target.parentElement;
            
            if (element && (
                element.tagName === 'INPUT' || 
                element.tagName === 'TEXTAREA' ||
                element.contentEditable === 'true' ||
                (typeof element.closest === 'function' && element.closest('input, textarea, [contenteditable="true"]')))) {
                hideHighlightButton();
                hideMiniToolbar();
                return;
            }
            
            if (!element || (
                (typeof element.closest === 'function' && 
                 !element.closest('#web-highlighter-button-container') && 
                 !element.closest('#web-highlighter-toolbar')))) {
                hideHighlightButton();
                hideMiniToolbar();
            }
        });
        
        // Highlight button click
        highlightButton.addEventListener('click', createHighlight);
        
        // Toolbar actions
        miniToolbar.addEventListener('click', handleToolbarAction);
        
        // Keyboard shortcut (Ctrl/Cmd + Shift + H)
        document.addEventListener('keydown', function(e) {
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
        });
        
        // Listen for messages from popup
        if (chrome.runtime && chrome.runtime.onMessage) {
            chrome.runtime.onMessage.addListener(function(message) {
                try {
                    if (message.action === 'removeHighlight') {
                        removeHighlight(message.highlightId);
                    } else if (message.action === 'removeAllHighlights') {
                        removeAllHighlights();
                    }
                } catch (error) {
                    console.error('Error handling message:', error);
                }
            });
        }
    }
    
    // Handle text selection
    function handleTextSelection(e) {
        // Skip if the event originated from an input, textarea, or contenteditable
        if (e && e.target) {
            const target = e.target;
            // Ensure target is an Element node before using closest
            const element = target.nodeType === Node.ELEMENT_NODE ? target : target.parentElement;
            
            if (element && (
                element.tagName === 'INPUT' || 
                element.tagName === 'TEXTAREA' ||
                element.contentEditable === 'true' ||
                (typeof element.closest === 'function' && element.closest('input, textarea, [contenteditable="true"]')))) {
                return;
            }
        }
        
        const selection = window.getSelection();
        const text = selection.toString().trim();
        
        if (text.length > 0 && selection.rangeCount > 0) {
            // Double-check: Don't show button if selecting in input fields
            const anchorNode = selection.anchorNode;
            const parentElement = anchorNode.nodeType === Node.TEXT_NODE ? 
                anchorNode.parentElement : anchorNode;
            
            if (parentElement && (
                parentElement.tagName === 'INPUT' || 
                parentElement.tagName === 'TEXTAREA' ||
                parentElement.contentEditable === 'true' ||
                (typeof parentElement.closest === 'function' && 
                 parentElement.closest('input, textarea, [contenteditable="true"]')))) {
                hideHighlightButton();
                return;
            }
            
            selectedText = text;
            selectedRange = selection.getRangeAt(0).cloneRange();
            
            const rect = selectedRange.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                showHighlightButton(rect);
            }
        } else {
            hideHighlightButton();
        }
    }
    
    // Show highlight button
    function showHighlightButton(rect) {
        if (!highlightButtonContainer) return;
        
        const left = rect.left + window.scrollX;
        const top = rect.bottom + window.scrollY + 5;
        
        highlightButtonContainer.style.left = left + 'px';
        highlightButtonContainer.style.top = top + 'px';
        highlightButtonContainer.style.display = 'flex';
    }
    
    // Hide highlight button
    function hideHighlightButton() {
        if (highlightButtonContainer) {
            highlightButtonContainer.style.display = 'none';
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
        window.getSelection().removeAllRanges();
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
        
        const highlightId = generateId();
        const highlight = {
            id: highlightId,
            text: selectedText,
            color: selectedColor,
            url: window.location.href,
            timestamp: Date.now(),
            path: getXPath(selectedRange.startContainer),
            startOffset: selectedRange.startOffset,
            endOffset: selectedRange.endOffset
        };
        
        // Apply highlight to page
        applyHighlight(selectedRange, highlightId, selectedColor);
        
        // Save to storage
        await saveHighlight(highlight);
        
        // Hide button
        hideHighlightButton();
        
        // Clear selection
        selectedText = '';
        selectedRange = null;
    }
    
    // Apply highlight to range
    function applyHighlight(range, id, color) {
        const span = document.createElement('span');
        span.className = 'web-highlighter-highlight';
        span.dataset.highlightId = id;
        span.dataset.color = color;
        span.style.cssText = `
            background-color: ${HIGHLIGHT_COLORS[color].bg};
            border-bottom: 2px solid ${HIGHLIGHT_COLORS[color].border};
            cursor: pointer;
            transition: all 0.2s;
        `;
        
        // Add hover effect
        span.addEventListener('mouseenter', function() {
            this.style.filter = 'brightness(0.9)';
        });
        
        span.addEventListener('mouseleave', function() {
            this.style.filter = 'brightness(1)';
        });
        
        // Add click handler
        span.addEventListener('click', function(e) {
            e.stopPropagation();
            currentHighlightId = id;
            const rect = this.getBoundingClientRect();
            showMiniToolbar(rect);
        });
        
        try {
            range.surroundContents(span);
        } catch (e) {
            // If surroundContents fails, use alternative method
            const contents = range.extractContents();
            span.appendChild(contents);
            range.insertNode(span);
        }
    }
    
    // Show mini toolbar
    function showMiniToolbar(rect) {
        if (!miniToolbar) return;
        
        const left = rect.left + window.scrollX;
        const top = rect.bottom + window.scrollY + 5;
        
        miniToolbar.style.left = left + 'px';
        miniToolbar.style.top = top + 'px';
        miniToolbar.style.display = 'flex';
    }
    
    // Hide mini toolbar
    function hideMiniToolbar() {
        if (miniToolbar) {
            miniToolbar.style.display = 'none';
        }
        currentHighlightId = null;
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
                console.warn('Extension context invalidated');
                return;
            }
            
            // Remove from storage
            const highlights = await getHighlights();
            const filtered = highlights.filter(h => h.id !== highlightId);
            await chrome.storage.local.set({ [STORAGE_KEY]: filtered });
        } catch (error) {
            console.error('Error removing highlight:', error);
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
                console.warn('Extension context invalidated');
                return;
            }
            
            // Clear storage for this URL
            const highlights = await getHighlights();
            const filtered = highlights.filter(h => h.url !== window.location.href);
            await chrome.storage.local.set({ [STORAGE_KEY]: filtered });
        } catch (error) {
            console.error('Error removing all highlights:', error);
        }
    }
    
    // Save highlight to storage
    async function saveHighlight(highlight) {
        try {
            // Check if extension context is valid
            if (!chrome.runtime || !chrome.runtime.id) {
                console.warn('Extension context invalidated');
                return;
            }
            const highlights = await getHighlights();
            highlights.push(highlight);
            await chrome.storage.local.set({ [STORAGE_KEY]: highlights });
        } catch (error) {
            console.error('Error saving highlight:', error);
        }
    }
    
    // Get highlights from storage
    async function getHighlights() {
        try {
            // Check if extension context is valid
            if (!chrome.runtime || !chrome.runtime.id) {
                console.warn('Extension context invalidated');
                return [];
            }
            const result = await chrome.storage.local.get(STORAGE_KEY);
            return result[STORAGE_KEY] || [];
        } catch (error) {
            console.error('Error getting highlights:', error);
            return [];
        }
    }
    
    // Load highlights for current page
    async function loadHighlights() {
        try {
            // Check if extension context is valid
            if (!chrome.runtime || !chrome.runtime.id) {
                console.warn('Extension context invalidated, skipping highlight load');
                return;
            }
            
            const highlights = await getHighlights();
            const pageHighlights = highlights.filter(h => h.url === window.location.href);
            
            pageHighlights.forEach(highlight => {
                try {
                    const element = getElementByXPath(highlight.path);
                    if (element && element.textContent.includes(highlight.text)) {
                        // Find the text and highlight it
                        const textNode = findTextNode(element, highlight.text);
                        if (textNode) {
                            const range = document.createRange();
                            const startOffset = textNode.textContent.indexOf(highlight.text);
                            range.setStart(textNode, startOffset);
                            range.setEnd(textNode, startOffset + highlight.text.length);
                            applyHighlight(range, highlight.id, highlight.color);
                        }
                    }
                } catch (e) {
                    console.error('Error restoring highlight:', e);
                }
            });
        } catch (error) {
            console.error('Error loading highlights:', error);
        }
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
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();