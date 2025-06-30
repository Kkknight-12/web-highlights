// Chrome Web Highlighter - Refactored Version
(function() {
    'use strict';
    
    // ================================================================
    // 1. EARLY CHECKS & INITIALIZATION
    // ================================================================
    
    // Early exit if no chrome runtime
    if (typeof chrome === 'undefined' || !chrome.runtime) {
        return;
    }
    
    // Skip chrome:// pages
    if (window.location.href.startsWith('chrome://')) {
        return;
    }
    
    // Get error handler if available
    const ErrorHandler = window.ChromeHighlighterErrorHandler || {
        logError: (context, error) => console.error(`[${context}]`, error),
        isContextValid: () => !!(chrome && chrome.runtime && chrome.runtime.id),
        shouldSuppressError: (error) => error.message?.includes('Extension context invalidated')
    };
    
    // ================================================================
    // 2. CONSTANTS & CONFIGURATION
    // ================================================================
    
    const CONFIG = {
        HIGHLIGHT_COLORS: {
            yellow: { bg: 'rgba(255, 224, 102, 0.4)', border: 'rgba(255, 224, 102, 0.6)', name: 'Yellow' },
            green: { bg: 'rgba(110, 231, 183, 0.4)', border: 'rgba(110, 231, 183, 0.6)', name: 'Green' },
            blue: { bg: 'rgba(147, 197, 253, 0.4)', border: 'rgba(147, 197, 253, 0.6)', name: 'Blue' },
            pink: { bg: 'rgba(252, 165, 165, 0.4)', border: 'rgba(252, 165, 165, 0.6)', name: 'Pink' }
        },
        DEFAULT_COLOR: 'yellow',
        STORAGE_KEY: 'highlights',
        DEBOUNCE_DELAY: 300,
        CONTEXT_CHECK_INTERVAL: 5000,
        HIGHLIGHT_LOAD_DELAY: 100,
        MUTATION_OBSERVER_DELAY: 500,
        WINDOW_LOAD_DELAY: 500,
        RENDER_BUFFER: 5
    };
    
    // ================================================================
    // 3. STATE MANAGEMENT
    // ================================================================
    
    const state = {
        // Extension state
        isOrphaned: false,
        highlightsLoaded: false,
        contextCheckInterval: null,
        
        // UI elements
        highlightButton: null,
        highlightButtonContainer: null,
        colorPicker: null,
        miniToolbar: null,
        
        // Selection state
        selectedText: '',
        selectedRange: null,
        selectedColor: CONFIG.DEFAULT_COLOR,
        currentHighlightId: null,
        
        // Event handlers
        debouncedHandleTextSelection: null,
        mousedownHandler: null,
        keydownHandler: null,
        hoverTimeout: null,
        buttonHoverHandlers: null
    };
    
    // ================================================================
    // 4. CONTEXT VALIDATION
    // ================================================================
    
    const ContextValidator = {
        isValid() {
            try {
                return !!(chrome && chrome.runtime && chrome.runtime.id);
            } catch (e) {
                return false;
            }
        },
        
        async executeIfValid(callback) {
            try {
                await callback();
            } catch (error) {
                if (ErrorHandler.shouldSuppressError(error)) {
                    state.isOrphaned = true;
                } else {
                    ErrorHandler.logError('ContextValidator', error);
                }
            }
        },
        
        startPeriodicCheck() {
            state.contextCheckInterval = setInterval(() => {
                if (!this.isValid()) {
                    state.isOrphaned = true;
                    clearInterval(state.contextCheckInterval);
                }
            }, CONFIG.CONTEXT_CHECK_INTERVAL);
        },
        
        cleanup() {
            // Remove all event listeners
            document.removeEventListener('mouseup', handleTextSelection);
            document.removeEventListener('selectionchange', state.debouncedHandleTextSelection);
            document.removeEventListener('mousedown', state.mousedownHandler);
            document.removeEventListener('keydown', state.keydownHandler);
            
            // Remove UI elements
            if (state.highlightButtonContainer) {
                state.highlightButtonContainer.remove();
            }
            if (state.miniToolbar) {
                state.miniToolbar.remove();
            }
            
            // Clear intervals
            if (state.contextCheckInterval) {
                clearInterval(state.contextCheckInterval);
            }
            
            // Cleanup DOM observer
            DOMObserver.cleanup();
            
            // Reset state
            state.highlightsLoaded = false;
        }
    };
    
    // ================================================================
    // 5. UTILITY FUNCTIONS
    // ================================================================
    
    const Utils = {
        generateId() {
            return Date.now().toString(36) + Math.random().toString(36).substr(2);
        },
        
        debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },
        
        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },
        
        isColorDark(color) {
            if (!color) return false;
            
            const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
            if (!match) return false;
            
            const r = parseInt(match[1]);
            const g = parseInt(match[2]);
            const b = parseInt(match[3]);
            
            const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            return luminance < 0.5;
        }
    };
    
    // ================================================================
    // 6. DOM UTILITIES
    // ================================================================
    
    const DOMUtils = {
        isValidElement(element) {
            return element && element.nodeType === Node.ELEMENT_NODE;
        },
        
        isInputField(element) {
            if (!this.isValidElement(element)) return false;
            
            return element.tagName === 'INPUT' || 
                   element.tagName === 'TEXTAREA' ||
                   element.contentEditable === 'true' ||
                   (typeof element.closest === 'function' && 
                    element.closest('input, textarea, [contenteditable="true"]'));
        },
        
        getXPath(element) {
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
        },
        
        getElementByXPath(path) {
            return document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        },
        
        findTextNode(element, text) {
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
        },
        
        getTextNodesInRange(range) {
            const textNodes = [];
            const commonAncestor = range.commonAncestorContainer;
            
            if (commonAncestor.nodeType === Node.TEXT_NODE) {
                return [commonAncestor];
            }
            
            const walker = document.createTreeWalker(
                commonAncestor,
                NodeFilter.SHOW_TEXT,
                {
                    acceptNode: function(node) {
                        const nodeRange = document.createRange();
                        nodeRange.selectNodeContents(node);
                        
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
    };
    
    // ================================================================
    // 7. STORAGE MANAGER
    // ================================================================
    
    const StorageManager = {
        async saveHighlight(highlight) {
            try {
                if (!ContextValidator.isValid()) {
                    return;
                }
                const highlights = await this.getHighlights();
                highlights.push(highlight);
                await chrome.storage.local.set({ [CONFIG.STORAGE_KEY]: highlights });
            } catch (error) {
                if (!ErrorHandler.shouldSuppressError(error)) {
                    ErrorHandler.logError('StorageManager.saveHighlight', error);
                }
            }
        },
        
        async getHighlights() {
            if (state.isOrphaned || !ContextValidator.isValid()) {
                return [];
            }
            
            try {
                const result = await chrome.storage.local.get(CONFIG.STORAGE_KEY);
                return result[CONFIG.STORAGE_KEY] || [];
            } catch (error) {
                if (ErrorHandler.shouldSuppressError(error)) {
                    state.isOrphaned = true;
                }
                return [];
            }
        },
        
        async removeHighlight(highlightId) {
            try {
                if (!ContextValidator.isValid()) {
                    return;
                }
                
                const highlights = await this.getHighlights();
                const filtered = highlights.filter(h => h.id !== highlightId);
                await chrome.storage.local.set({ [CONFIG.STORAGE_KEY]: filtered });
            } catch (error) {
                if (!ErrorHandler.shouldSuppressError(error)) {
                    ErrorHandler.logError('StorageManager.removeHighlight', error);
                }
            }
        },
        
        async removeAllHighlights() {
            try {
                if (!ContextValidator.isValid()) {
                    return;
                }
                
                const highlights = await this.getHighlights();
                const filtered = highlights.filter(h => h.url !== window.location.href);
                await chrome.storage.local.set({ [CONFIG.STORAGE_KEY]: filtered });
            } catch (error) {
                if (!ErrorHandler.shouldSuppressError(error)) {
                    ErrorHandler.logError('StorageManager.removeAllHighlights', error);
                }
            }
        }
    };
    
    // ================================================================
    // 8. HIGHLIGHT ENGINE
    // ================================================================
    
    const HighlightEngine = {
        async createHighlight() {
            if (!state.selectedText || !state.selectedRange) return;
            
            await ContextValidator.executeIfValid(async () => {
                const highlightId = Utils.generateId();
                const color = state.selectedColor || CONFIG.DEFAULT_COLOR;
                const highlight = {
                    id: highlightId,
                    text: state.selectedText,
                    color: color,
                    url: window.location.href,
                    timestamp: Date.now(),
                    path: DOMUtils.getXPath(state.selectedRange.startContainer),
                    startOffset: state.selectedRange.startOffset,
                    endOffset: state.selectedRange.endOffset
                };
                
                this.applyHighlight(state.selectedRange, highlightId, color);
                await StorageManager.saveHighlight(highlight);
                
                UIManager.hideHighlightButton();
                
                state.selectedText = '';
                state.selectedRange = null;
            });
        },
        
        applyHighlight(range, id, color) {
            try {
                const textNodes = DOMUtils.getTextNodesInRange(range);
                
                textNodes.forEach(node => {
                    const nodeRange = document.createRange();
                    
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
                    
                    const span = this.createHighlightSpan(id, color);
                    
                    try {
                        nodeRange.surroundContents(span);
                    } catch (e) {
                        const contents = nodeRange.extractContents();
                        span.appendChild(contents);
                        nodeRange.insertNode(span);
                    }
                });
            } catch (e) {
                ErrorHandler.logError('HighlightEngine.applyHighlight', e);
            }
        },
        
        createHighlightSpan(id, color) {
            const span = document.createElement('span');
            span.className = 'web-highlighter-highlight';
            span.dataset.highlightId = id;
            span.dataset.color = color;
            span.style.cssText = `
                background-color: ${CONFIG.HIGHLIGHT_COLORS[color].bg};
                border-bottom: 2px solid ${CONFIG.HIGHLIGHT_COLORS[color].border};
                cursor: pointer;
                transition: all 0.2s;
                display: inline;
            `;
            
            span.addEventListener('mouseenter', function() {
                requestAnimationFrame(() => {
                    try {
                        this.style.filter = 'brightness(0.9)';
                    } catch (e) {
                        // Ignore errors
                    }
                });
            });
            
            span.addEventListener('mouseleave', function() {
                requestAnimationFrame(() => {
                    try {
                        this.style.filter = 'brightness(1)';
                    } catch (e) {
                        // Ignore errors
                    }
                });
            });
            
            span.addEventListener('click', function(e) {
                e.stopPropagation();
                state.currentHighlightId = id;
                const rect = this.getBoundingClientRect();
                UIManager.showMiniToolbar(rect);
            });
            
            return span;
        },
        
        async removeHighlight(highlightId) {
            // Remove from DOM
            const elements = document.querySelectorAll(`[data-highlight-id="${highlightId}"]`);
            elements.forEach(element => {
                const parent = element.parentNode;
                while (element.firstChild) {
                    parent.insertBefore(element.firstChild, element);
                }
                parent.removeChild(element);
            });
            
            // Remove from storage
            await StorageManager.removeHighlight(highlightId);
        },
        
        async removeAllHighlights() {
            // Remove from DOM
            const elements = document.querySelectorAll('.web-highlighter-highlight');
            elements.forEach(element => {
                const parent = element.parentNode;
                while (element.firstChild) {
                    parent.insertBefore(element.firstChild, element);
                }
                parent.removeChild(element);
            });
            
            // Clear storage for this URL
            await StorageManager.removeAllHighlights();
        },
        
        async loadHighlights() {
            if (state.isOrphaned || !ContextValidator.isValid()) {
                return;
            }
            
            // Check if highlights already exist to avoid duplicates
            const existingHighlights = document.querySelectorAll('.web-highlighter-highlight');
            if (existingHighlights.length > 0 && state.highlightsLoaded) {
                return;
            }
            
            try {
                const highlights = await StorageManager.getHighlights();
                const pageHighlights = highlights.filter(h => h.url === window.location.href);
                
                state.highlightsLoaded = true;
                
                pageHighlights.forEach(highlight => {
                    try {
                        if (document.querySelector(`[data-highlight-id="${highlight.id}"]`)) {
                            return;
                        }
                        
                        if (!this.restoreHighlightByXPath(highlight)) {
                            this.restoreHighlightByTextSearch(highlight);
                        }
                    } catch (e) {
                        if (!ErrorHandler.shouldSuppressError(e)) {
                            ErrorHandler.logError('HighlightEngine.loadHighlights', e);
                        }
                    }
                });
            } catch (error) {
                if (!ErrorHandler.shouldSuppressError(error)) {
                    ErrorHandler.logError('HighlightEngine.loadHighlights', error);
                } else {
                    state.isOrphaned = true;
                }
            }
        },
        
        restoreHighlightByXPath(highlight) {
            const element = DOMUtils.getElementByXPath(highlight.path);
            if (element && element.textContent.includes(highlight.text)) {
                const textNode = DOMUtils.findTextNode(element, highlight.text);
                if (textNode) {
                    const range = document.createRange();
                    const startOffset = textNode.textContent.indexOf(highlight.text);
                    if (startOffset !== -1) {
                        range.setStart(textNode, startOffset);
                        range.setEnd(textNode, startOffset + highlight.text.length);
                        this.applyHighlight(range, highlight.id, highlight.color || 'yellow');
                        return true;
                    }
                }
            }
            return false;
        },
        
        restoreHighlightByTextSearch(highlight) {
            const walker = document.createTreeWalker(
                document.body,
                NodeFilter.SHOW_TEXT,
                {
                    acceptNode: function(node) {
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
                    this.applyHighlight(range, highlight.id, highlight.color || 'yellow');
                    return true;
                }
            }
            return false;
        }
    };
    
    // ================================================================
    // 9. UI MANAGER
    // ================================================================
    
    const UIManager = {
        createHighlightButton() {
            // Create container
            state.highlightButtonContainer = document.createElement('div');
            state.highlightButtonContainer.id = 'web-highlighter-button-container';
            state.highlightButtonContainer.style.cssText = `
                position: absolute;
                z-index: 2147483647;
                display: none;
                align-items: center;
                gap: 8px;
            `;
            
            // Create highlight button
            state.highlightButton = document.createElement('button');
            state.highlightButton.style.cssText = `
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
            
            state.highlightButton.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="5" y="8" width="14" height="8" rx="1" fill="${CONFIG.HIGHLIGHT_COLORS[CONFIG.DEFAULT_COLOR].bg}" stroke="${CONFIG.HIGHLIGHT_COLORS[CONFIG.DEFAULT_COLOR].border}" stroke-width="2"/>
                    <path d="M7 8V6C7 5.44772 7.44772 5 8 5H16C16.5523 5 17 5.44772 17 6V8" stroke="#374151" stroke-width="2" stroke-linecap="round"/>
                    <path d="M10 20L12 16L14 20" stroke="#374151" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span>Highlight</span>
            `;
            
            // Add click handler
            state.highlightButton.addEventListener('click', () => HighlightEngine.createHighlight());
            
            // Create color picker
            this.createColorPicker();
            
            // Assemble
            state.highlightButtonContainer.appendChild(state.highlightButton);
            state.highlightButtonContainer.appendChild(state.colorPicker);
            document.body.appendChild(state.highlightButtonContainer);
            
            // Setup hover behavior
            this.setupButtonHoverBehavior();
        },
        
        createColorPicker() {
            state.colorPicker = document.createElement('div');
            state.colorPicker.style.cssText = `
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
            
            Object.entries(CONFIG.HIGHLIGHT_COLORS).forEach(([colorKey, colorValue]) => {
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
                    requestAnimationFrame(() => {
                        this.style.transform = 'scale(1.1)';
                        this.style.borderColor = colorValue.border;
                    });
                });
                
                colorBtn.addEventListener('mouseleave', function() {
                    requestAnimationFrame(() => {
                        this.style.transform = 'scale(1)';
                        this.style.borderColor = '#ffffff';
                    });
                });
                
                colorBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    state.selectedColor = colorKey;
                    UIManager.updateButtonColor(colorKey);
                    HighlightEngine.createHighlight();
                });
                
                state.colorPicker.appendChild(colorBtn);
            });
        },
        
        createMiniToolbar() {
            state.miniToolbar = document.createElement('div');
            state.miniToolbar.id = 'web-highlighter-toolbar';
            state.miniToolbar.style.cssText = `
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
            
            state.miniToolbar.innerHTML = `
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
            
            // Add click handler
            state.miniToolbar.addEventListener('click', (e) => EventHandlers.handleToolbarAction(e));
            
            document.body.appendChild(state.miniToolbar);
        },
        
        setupButtonHoverBehavior() {
            // Store timeout in state for cleanup
            state.hoverTimeout = null;
            
            const showColorPicker = () => {
                if (state.hoverTimeout) {
                    clearTimeout(state.hoverTimeout);
                    state.hoverTimeout = null;
                }
                requestAnimationFrame(() => {
                    state.colorPicker.style.display = 'flex';
                    state.highlightButton.style.transform = 'scale(1.05)';
                });
            };
            
            const hideColorPicker = () => {
                if (state.hoverTimeout) clearTimeout(state.hoverTimeout);
                state.hoverTimeout = setTimeout(() => {
                    requestAnimationFrame(() => {
                        state.colorPicker.style.display = 'none';
                        state.highlightButton.style.transform = 'scale(1)';
                    });
                }, 200);
            };
            
            // Store event handlers for cleanup
            state.buttonHoverHandlers = {
                showColorPicker,
                hideColorPicker,
                preventHide: () => {
                    if (state.hoverTimeout) clearTimeout(state.hoverTimeout);
                }
            };
            
            state.highlightButton.addEventListener('mouseenter', showColorPicker);
            state.colorPicker.addEventListener('mouseenter', state.buttonHoverHandlers.preventHide);
            
            state.highlightButton.addEventListener('mouseleave', hideColorPicker);
            state.colorPicker.addEventListener('mouseleave', hideColorPicker);
        },
        
        showHighlightButton(rect) {
            // Check if button exists in DOM, create if needed
            if (!state.highlightButtonContainer || !document.getElementById('web-highlighter-button-container')) {
                this.createUI();
            }
            
            if (!state.highlightButtonContainer) return;
            
            try {
                // Use requestAnimationFrame for smooth UI updates
                requestAnimationFrame(() => {
                    const left = rect.left + window.scrollX;
                    const top = rect.bottom + window.scrollY + 5;
                    
                    state.highlightButtonContainer.style.left = left + 'px';
                    state.highlightButtonContainer.style.top = top + 'px';
                    state.highlightButtonContainer.style.display = 'flex';
                    
                    this.adjustButtonColorsForBackground();
                });
            } catch (error) {
                if (!ErrorHandler.shouldSuppressError(error)) {
                    ErrorHandler.logError('UIManager.showHighlightButton', error);
                }
            }
        },
        
        hideHighlightButton() {
            try {
                if (state.highlightButtonContainer) {
                    state.highlightButtonContainer.style.display = 'none';
                }
                if (state.colorPicker) {
                    state.colorPicker.style.display = 'none';
                }
                
                const activeElement = document.activeElement;
                if (activeElement && (
                    activeElement.tagName === 'INPUT' || 
                    activeElement.tagName === 'TEXTAREA' ||
                    activeElement.contentEditable === 'true')) {
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
                if (!ErrorHandler.shouldSuppressError(error)) {
                    ErrorHandler.logError('UIManager.hideHighlightButton', error);
                }
            }
        },
        
        showMiniToolbar(rect) {
            if (!state.miniToolbar) return;
            
            try {
                // Use requestAnimationFrame for smooth UI updates
                requestAnimationFrame(() => {
                    const left = rect.left + window.scrollX;
                    const top = rect.bottom + window.scrollY + 5;
                    
                    state.miniToolbar.style.left = left + 'px';
                    state.miniToolbar.style.top = top + 'px';
                    state.miniToolbar.style.display = 'flex';
                    
                    this.adjustToolbarColorsForBackground(rect);
                });
            } catch (error) {
                if (!ErrorHandler.shouldSuppressError(error)) {
                    ErrorHandler.logError('UIManager.showMiniToolbar', error);
                }
            }
        },
        
        hideMiniToolbar() {
            try {
                if (state.miniToolbar) {
                    state.miniToolbar.style.display = 'none';
                }
                state.currentHighlightId = null;
            } catch (error) {
                if (!ErrorHandler.shouldSuppressError(error)) {
                    ErrorHandler.logError('UIManager.hideMiniToolbar', error);
                }
            }
        },
        
        updateButtonColor(color) {
            const rect = state.highlightButton.querySelector('rect');
            if (rect) {
                const colorConfig = CONFIG.HIGHLIGHT_COLORS[color];
                rect.setAttribute('fill', colorConfig.bg);
                rect.setAttribute('stroke', colorConfig.border);
            }
        },
        
        adjustButtonColorsForBackground() {
            if (!state.highlightButton || !state.colorPicker) return;
            
            try {
                const element = document.elementFromPoint(
                    parseFloat(state.highlightButtonContainer.style.left), 
                    parseFloat(state.highlightButtonContainer.style.top) - 10
                );
                
                if (!element) return;
                
                let bgColor = window.getComputedStyle(element).backgroundColor;
                let currentElement = element;
                
                while (bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'transparent') {
                    currentElement = currentElement.parentElement;
                    if (!currentElement || currentElement === document.body) {
                        bgColor = window.getComputedStyle(document.body).backgroundColor;
                        break;
                    }
                    bgColor = window.getComputedStyle(currentElement).backgroundColor;
                }
                
                const isDark = Utils.isColorDark(bgColor);
                
                if (isDark) {
                    this.applyDarkTheme(state.highlightButton, state.colorPicker);
                } else {
                    this.applyLightTheme(state.highlightButton, state.colorPicker);
                }
            } catch (error) {
                ErrorHandler.logError('UIManager.adjustButtonColorsForBackground', error);
            }
        },
        
        adjustToolbarColorsForBackground(rect) {
            if (!state.miniToolbar) return;
            
            try {
                const checkX = rect ? Math.max(0, rect.left - 10) : parseFloat(state.miniToolbar.style.left);
                const checkY = rect ? rect.top + rect.height / 2 : parseFloat(state.miniToolbar.style.top) - 10;
                
                const element = document.elementFromPoint(checkX, checkY);
                
                if (!element) return;
                
                let bgColor = window.getComputedStyle(element).backgroundColor;
                let currentElement = element;
                
                while (bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'transparent') {
                    currentElement = currentElement.parentElement;
                    if (!currentElement || currentElement === document.body) {
                        bgColor = window.getComputedStyle(document.body).backgroundColor;
                        break;
                    }
                    bgColor = window.getComputedStyle(currentElement).backgroundColor;
                }
                
                const isDark = Utils.isColorDark(bgColor);
                
                if (isDark) {
                    this.applyDarkThemeToToolbar(state.miniToolbar);
                } else {
                    this.applyLightThemeToToolbar(state.miniToolbar);
                }
            } catch (error) {
                ErrorHandler.logError('UIManager.adjustToolbarColorsForBackground', error);
            }
        },
        
        applyDarkTheme(button, picker) {
            button.style.background = '#374151';
            button.style.borderColor = '#4b5563';
            button.style.color = '#f3f4f6';
            button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)';
            
            const paths = button.querySelectorAll('path');
            paths.forEach(path => {
                if (!path.getAttribute('fill') || path.getAttribute('fill') === '#374151') {
                    path.setAttribute('stroke', '#f3f4f6');
                }
            });
            
            const span = button.querySelector('span');
            if (span) span.style.color = '#f3f4f6';
            
            picker.style.background = '#374151';
            picker.style.borderColor = '#4b5563';
            picker.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)';
        },
        
        applyLightTheme(button, picker) {
            button.style.background = '#ffffff';
            button.style.borderColor = '#e5e7eb';
            button.style.color = '#374151';
            button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)';
            
            const paths = button.querySelectorAll('path');
            paths.forEach(path => {
                if (!path.getAttribute('fill') || path.getAttribute('fill') === '#f3f4f6') {
                    path.setAttribute('stroke', '#374151');
                }
            });
            
            const span = button.querySelector('span');
            if (span) span.style.color = '#374151';
            
            picker.style.background = '#ffffff';
            picker.style.borderColor = '#e5e7eb';
            picker.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)';
        },
        
        applyDarkThemeToToolbar(toolbar) {
            toolbar.style.background = '#374151';
            toolbar.style.borderColor = '#4b5563';
            toolbar.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)';
            
            const buttons = toolbar.querySelectorAll('.toolbar-btn');
            buttons.forEach(btn => {
                btn.style.color = '#f3f4f6';
                const svgElements = btn.querySelectorAll('rect, path');
                svgElements.forEach(svg => {
                    svg.setAttribute('stroke', '#f3f4f6');
                });
            });
        },
        
        applyLightThemeToToolbar(toolbar) {
            toolbar.style.background = '#ffffff';
            toolbar.style.borderColor = '#e5e7eb';
            toolbar.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)';
            
            const buttons = toolbar.querySelectorAll('.toolbar-btn');
            buttons.forEach(btn => {
                btn.style.color = '#374151';
                const svgElements = btn.querySelectorAll('rect, path');
                svgElements.forEach(svg => {
                    svg.setAttribute('stroke', '#374151');
                });
            });
        },
        
        createUI() {
            // Check if elements actually exist in DOM, not just in state
            const existingContainer = document.getElementById('web-highlighter-button-container');
            const existingToolbar = document.getElementById('web-highlighter-toolbar');
            
            // Clean up state if elements don't exist in DOM
            if (!existingContainer && state.highlightButtonContainer) {
                state.highlightButtonContainer = null;
                state.highlightButton = null;
                state.colorPicker = null;
            }
            
            if (!existingToolbar && state.miniToolbar) {
                state.miniToolbar = null;
            }
            
            // Create elements if they don't exist
            if (!state.highlightButtonContainer) {
                this.createHighlightButton();
            }
            
            if (!state.miniToolbar) {
                this.createMiniToolbar();
            }
        }
    };
    
    // ================================================================
    // 10. EVENT HANDLERS
    // ================================================================
    
    const EventHandlers = {
        handleTextSelection(e) {
            if (e && e.target) {
                const target = e.target;
                const element = target.nodeType === Node.ELEMENT_NODE ? target : target.parentElement;
                
                if (element && element.nodeType === Node.ELEMENT_NODE) {
                    if (DOMUtils.isInputField(element)) {
                        return;
                    }
                }
            }
            
            const selection = window.getSelection();
            const text = selection.toString().trim();
            
            if (text.length > 0 && selection.rangeCount > 0) {
                const anchorNode = selection.anchorNode;
                const parentElement = anchorNode?.nodeType === Node.TEXT_NODE ? 
                    anchorNode.parentElement : anchorNode;
                
                if (parentElement && parentElement.nodeType === Node.ELEMENT_NODE) {
                    if (DOMUtils.isInputField(parentElement)) {
                        UIManager.hideHighlightButton();
                        return;
                    }
                }
                
                state.selectedText = text;
                state.selectedRange = selection.getRangeAt(0).cloneRange();
                
                const rect = state.selectedRange.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    if (!state.highlightButtonContainer) {
                        return;
                    }
                    UIManager.showHighlightButton(rect);
                }
            } else {
                UIManager.hideHighlightButton();
            }
        },
        
        handleMouseDown(e) {
            if (!e.target) return;
            
            const target = e.target;
            const element = target.nodeType === Node.ELEMENT_NODE ? target : target.parentElement;
            
            if (element && element.nodeType === Node.ELEMENT_NODE) {
                if (DOMUtils.isInputField(element)) {
                    UIManager.hideHighlightButton();
                    UIManager.hideMiniToolbar();
                    return;
                }
                
                if (typeof element.closest === 'function' && 
                    !element.closest('#web-highlighter-button-container') && 
                    !element.closest('#web-highlighter-toolbar')) {
                    UIManager.hideHighlightButton();
                    UIManager.hideMiniToolbar();
                }
            } else {
                UIManager.hideHighlightButton();
                UIManager.hideMiniToolbar();
            }
        },
        
        handleKeyDown(e) {
            const activeElement = document.activeElement;
            if (activeElement && DOMUtils.isInputField(activeElement)) {
                return;
            }
            
            const isMac = navigator.userAgent.includes('Mac');
            const modifier = isMac ? e.metaKey : e.ctrlKey;
            
            if (modifier && e.shiftKey && e.key.toLowerCase() === 'h') {
                e.preventDefault();
                const selection = window.getSelection();
                if (selection.toString().trim()) {
                    state.selectedText = selection.toString();
                    state.selectedRange = selection.getRangeAt(0).cloneRange();
                    HighlightEngine.createHighlight();
                }
            }
        },
        
        async handleToolbarAction(e) {
            const button = e.target.closest('.toolbar-btn');
            if (!button) return;
            
            const action = button.dataset.action;
            
            if (action === 'copy' && state.currentHighlightId) {
                const highlightElement = document.querySelector(`[data-highlight-id="${state.currentHighlightId}"]`);
                if (highlightElement) {
                    await navigator.clipboard.writeText(highlightElement.textContent);
                }
            } else if (action === 'remove' && state.currentHighlightId) {
                await HighlightEngine.removeHighlight(state.currentHighlightId);
            }
            
            UIManager.hideMiniToolbar();
        },
        
        setupEventListeners() {
            // Store debounced function
            state.debouncedHandleTextSelection = Utils.debounce(this.handleTextSelection, CONFIG.DEBOUNCE_DELAY);
            
            // Text selection
            document.addEventListener('mouseup', this.handleTextSelection);
            document.addEventListener('selectionchange', state.debouncedHandleTextSelection);
            
            // Store handlers for cleanup
            state.mousedownHandler = (e) => this.handleMouseDown(e);
            state.keydownHandler = (e) => this.handleKeyDown(e);
            
            document.addEventListener('mousedown', state.mousedownHandler);
            document.addEventListener('keydown', state.keydownHandler);
            
            // Chrome messages
            if (chrome.runtime && chrome.runtime.onMessage) {
                try {
                    chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
                        if (!ContextValidator.isValid()) {
                            return false;
                        }
                        try {
                            if (message.action === 'removeHighlight') {
                                HighlightEngine.removeHighlight(message.highlightId);
                            } else if (message.action === 'removeAllHighlights') {
                                HighlightEngine.removeAllHighlights();
                            } else if (message.action === 'reloadHighlights') {
                                state.highlightsLoaded = false;
                                HighlightEngine.loadHighlights();
                            } else if (message.action === 'highlightFromContextMenu') {
                                try {
                                    const selection = window.getSelection();
                                    if (selection && selection.toString().trim()) {
                                        state.selectedText = selection.toString();
                                        state.selectedRange = selection.getRangeAt(0).cloneRange();
                                        HighlightEngine.createHighlight();
                                    }
                                } catch (err) {
                                    ErrorHandler.logError('EventHandlers.contextMenuHighlight', err);
                                }
                            }
                            
                            if (sendResponse) {
                                sendResponse({success: true});
                            }
                        } catch (error) {
                            if (!ErrorHandler.shouldSuppressError(error)) {
                                ErrorHandler.logError('EventHandlers.chromeMessage', error);
                            }
                        }
                        return true; // Will send response asynchronously
                    });
                } catch (error) {
                    // Silently fail if we can't add message listener
                }
            }
        }
    };
    
    // ================================================================
    // 11. DOM OBSERVER
    // ================================================================
    
    const DOMObserver = {
        observer: null,
        debounceTimer: null,
        
        setup() {
            this.observer = new MutationObserver((mutations) => {
                clearTimeout(this.debounceTimer);
                this.debounceTimer = setTimeout(() => {
                    const hasSignificantChanges = mutations.some(mutation => {
                        return mutation.type === 'childList' && 
                               mutation.addedNodes.length > 0 &&
                               Array.from(mutation.addedNodes).some(node => 
                                   node.nodeType === Node.ELEMENT_NODE ||
                                   (node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0)
                               );
                    });
                    
                    if (hasSignificantChanges) {
                        // Check if highlights need to be reloaded
                        const existingHighlights = document.querySelectorAll('.web-highlighter-highlight');
                        if (existingHighlights.length === 0 && !state.isOrphaned) {
                            state.highlightsLoaded = false;
                            HighlightEngine.loadHighlights();
                        }
                    }
                }, CONFIG.MUTATION_OBSERVER_DELAY);
            });
            
            setTimeout(() => {
                if (this.observer && document.body) {
                    this.observer.observe(document.body, {
                        childList: true,
                        subtree: true
                    });
                }
            }, 1000);
        },
        
        cleanup() {
            if (this.observer) {
                this.observer.disconnect();
                this.observer = null;
            }
            if (this.debounceTimer) {
                clearTimeout(this.debounceTimer);
                this.debounceTimer = null;
            }
        }
    };
    
    // ================================================================
    // 12. INITIALIZATION
    // ================================================================
    
    function initialize() {
        if (!document.body) {
            return;
        }
        
        // Reset state for new page load
        state.highlightsLoaded = false;
        state.isOrphaned = false;
        
        // Create UI
        UIManager.createUI();
        
        // Setup event listeners
        EventHandlers.setupEventListeners();
        
        // Start context validation
        if (ContextValidator.isValid()) {
            ContextValidator.startPeriodicCheck();
            
            // Delay highlight loading
            setTimeout(() => {
                HighlightEngine.loadHighlights();
            }, CONFIG.HIGHLIGHT_LOAD_DELAY);
            
            // Setup DOM observer
            DOMObserver.setup();
        }
    }
    
    // Handle text selection properly
    function handleTextSelection(e) {
        EventHandlers.handleTextSelection(e);
    }
    
    // ================================================================
    // 13. STARTUP
    // ================================================================
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else if (document.readyState === 'interactive') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
    
    // Fallback for dynamic content
    window.addEventListener('load', () => {
        if (!state.highlightButtonContainer) {
            initialize();
        }
        
        // Force highlight loading on page load
        if (ContextValidator.isValid()) {
            const existingHighlights = document.querySelectorAll('.web-highlighter-highlight');
            if (existingHighlights.length === 0) {
                state.highlightsLoaded = false;
                setTimeout(() => HighlightEngine.loadHighlights(), CONFIG.WINDOW_LOAD_DELAY);
            }
        }
    });
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        ContextValidator.cleanup();
    });
})();