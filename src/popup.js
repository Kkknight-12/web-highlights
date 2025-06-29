// Popup functionality for Web Highlighter - Performance Optimized Version
// Includes virtual scrolling and compression support

let currentTab = null;
let highlights = [];
let virtualScroller = null;

// Define highlight colors (same as content script)
const HIGHLIGHT_COLORS = {
    yellow: { bg: 'rgba(255, 224, 102, 0.4)', border: 'rgba(255, 224, 102, 0.6)', name: 'Yellow' },
    green: { bg: 'rgba(110, 231, 183, 0.4)', border: 'rgba(110, 231, 183, 0.6)', name: 'Green' },
    blue: { bg: 'rgba(147, 197, 253, 0.4)', border: 'rgba(147, 197, 253, 0.6)', name: 'Blue' },
    pink: { bg: 'rgba(252, 165, 165, 0.4)', border: 'rgba(252, 165, 165, 0.6)', name: 'Pink' }
};

// Virtual scrolling implementation
class VirtualScroller {
    constructor(container, itemHeight = 100) {
        this.container = container;
        this.itemHeight = itemHeight;
        this.items = [];
        this.visibleStart = 0;
        this.visibleEnd = 0;
        this.scrollTop = 0;
        this.containerHeight = 0;
        this.totalHeight = 0;
        this.scrollHandler = null;
        this.renderBuffer = 5; // Render extra items above and below viewport
        
        this.setupContainer();
        this.setupScrollListener();
    }
    
    setupContainer() {
        // Create viewport wrapper
        this.viewport = document.createElement('div');
        this.viewport.className = 'virtual-viewport';
        this.viewport.style.cssText = `
            height: 100%;
            overflow-y: auto;
            position: relative;
        `;
        
        // Create content wrapper
        this.content = document.createElement('div');
        this.content.className = 'virtual-content';
        this.content.style.cssText = `
            position: relative;
            width: 100%;
        `;
        
        // Move existing content
        while (this.container.firstChild) {
            this.container.removeChild(this.container.firstChild);
        }
        
        this.viewport.appendChild(this.content);
        this.container.appendChild(this.viewport);
    }
    
    setupScrollListener() {
        // Use passive listener for better scroll performance
        this.scrollHandler = this.handleScroll.bind(this);
        this.viewport.addEventListener('scroll', this.scrollHandler, { passive: true });
        
        // Also listen for resize
        this.resizeObserver = new ResizeObserver(() => {
            this.updateContainerHeight();
            this.render();
        });
        this.resizeObserver.observe(this.container);
    }
    
    setItems(items) {
        this.items = items;
        this.totalHeight = items.length * this.itemHeight;
        this.content.style.height = `${this.totalHeight}px`;
        this.updateContainerHeight();
        this.render();
    }
    
    updateContainerHeight() {
        this.containerHeight = this.viewport.clientHeight;
        const visibleCount = Math.ceil(this.containerHeight / this.itemHeight);
        this.visibleEnd = Math.min(this.visibleStart + visibleCount + this.renderBuffer * 2, this.items.length);
    }
    
    handleScroll() {
        this.scrollTop = this.viewport.scrollTop;
        const newVisibleStart = Math.floor(this.scrollTop / this.itemHeight) - this.renderBuffer;
        
        if (newVisibleStart !== this.visibleStart) {
            this.visibleStart = Math.max(0, newVisibleStart);
            const visibleCount = Math.ceil(this.containerHeight / this.itemHeight);
            this.visibleEnd = Math.min(this.visibleStart + visibleCount + this.renderBuffer * 2, this.items.length);
            this.render();
        }
    }
    
    render() {
        // Clear current items
        this.content.innerHTML = '';
        
        // Create spacer for items above viewport
        if (this.visibleStart > 0) {
            const spacer = document.createElement('div');
            spacer.style.height = `${this.visibleStart * this.itemHeight}px`;
            this.content.appendChild(spacer);
        }
        
        // Render visible items
        const fragment = document.createDocumentFragment();
        for (let i = this.visibleStart; i < this.visibleEnd; i++) {
            const item = this.renderItem(this.items[i], i);
            fragment.appendChild(item);
        }
        this.content.appendChild(fragment);
        
        // Create spacer for items below viewport
        if (this.visibleEnd < this.items.length) {
            const spacer = document.createElement('div');
            spacer.style.height = `${(this.items.length - this.visibleEnd) * this.itemHeight}px`;
            this.content.appendChild(spacer);
        }
    }
    
    renderItem(highlight, index) {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'highlight-item';
        itemDiv.dataset.id = highlight.id;
        itemDiv.style.position = 'absolute';
        itemDiv.style.top = `${index * this.itemHeight}px`;
        itemDiv.style.width = '100%';
        
        const color = highlight.color || 'yellow';
        const colorStyle = getColorStyle(color);
        const hasNote = highlight.note && highlight.note.trim() !== '';
        const hasTags = highlight.tags && highlight.tags.length > 0;
        
        itemDiv.innerHTML = `
            <div class="highlight-text" style="background: ${colorStyle.bg}; box-shadow: 0 0 0 2px ${colorStyle.bg};">
                ${escapeHtml(highlight.text)}
            </div>
            ${hasTags ? `
                <div class="highlight-tags">
                    ${highlight.tags.map(tag => `
                        <span class="tag">${escapeHtml(tag)}</span>
                    `).join('')}
                </div>
            ` : ''}
            ${hasNote ? `
                <div class="highlight-note">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="opacity: 0.5;">
                        <path d="M12 20H21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        <path d="M16.5 3.5C16.8978 3.10217 17.4374 2.87868 18 2.87868C18.5626 2.87868 19.1022 3.10217 19.5 3.5C19.8978 3.89782 20.1213 4.43739 20.1213 5C20.1213 5.56261 19.8978 6.10218 19.5 6.5L7 19L3 20L4 16L16.5 3.5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span>${escapeHtml(highlight.note)}</span>
                </div>
            ` : ''}
            <div class="highlight-meta">
                <span class="highlight-url" title="${highlight.url}">${getRelativeTime(highlight.timestamp)}</span>
                <button class="delete-button" data-id="${highlight.id}">Delete</button>
            </div>
        `;
        
        return itemDiv;
    }
    
    destroy() {
        if (this.scrollHandler) {
            this.viewport.removeEventListener('scroll', this.scrollHandler);
        }
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
    }
}

// Get color style for a highlight
function getColorStyle(color) {
    return HIGHLIGHT_COLORS[color] || HIGHLIGHT_COLORS.yellow;
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    // Get current tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tabs[0];
    
    // Initialize virtual scroller
    const highlightsList = document.getElementById('highlightsList');
    virtualScroller = new VirtualScroller(highlightsList);
    
    // Load highlights for current tab
    await loadHighlights();
    
    // Set up event listeners
    setupEventListeners();
});

// Compression utilities
async function decompressHighlights(data) {
    if (!data || !data._compressed || typeof LZString === 'undefined') {
        return data || {};
    }
    
    try {
        const decompressed = LZString.decompressFromUTF16(data.data);
        return JSON.parse(decompressed);
    } catch (error) {
        console.error('Decompression error:', error);
        return {};
    }
}

// Load compression library
async function loadCompressionLibrary() {
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('src/lz-string.min.js');
        script.onload = resolve;
        script.onerror = () => {
            console.warn('Failed to load compression library');
            resolve();
        };
        document.head.appendChild(script);
    });
}

// Load highlights from storage for current tab
async function loadHighlights() {
    try {
        // Load compression library first
        await loadCompressionLibrary();
        
        const result = await chrome.storage.local.get(['highlights']);
        const compressedData = result.highlights || {};
        const allHighlights = await decompressHighlights(compressedData);
        
        // Get highlights for current URL
        const url = normalizeUrl(currentTab.url);
        highlights = allHighlights[url] || [];
        
        // Update UI
        updateHighlightsList();
        updateStats();
    } catch (error) {
        console.error('Error loading highlights:', error);
    }
}

// Normalize URL to handle variations (remove hash, trailing slash, etc.)
function normalizeUrl(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.origin + urlObj.pathname.replace(/\/$/, '');
    } catch {
        return url;
    }
}

// Update the highlights list in the UI using virtual scrolling
function updateHighlightsList(filteredHighlights = null) {
    const highlightsToShow = filteredHighlights || highlights;
    
    if (highlightsToShow.length === 0) {
        const searchInput = document.getElementById('searchInput');
        const isSearching = searchInput && searchInput.value.trim().length > 0;
        
        // Show empty state
        virtualScroller.container.innerHTML = `
            <div class="empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" opacity="0.3">
                    <path d="M8.5 3H15.5C16.0523 3 16.5 3.44772 16.5 4V11L20.5 15V20C20.5 20.5523 20.0523 21 19.5 21H4.5C3.94772 21 3.5 20.5523 3.5 20V4C3.5 3.44772 3.94772 3 4.5 3H8.5Z" stroke="currentColor" stroke-width="2"/>
                    <path d="M16.5 11H20.5L16.5 15V11Z" fill="currentColor"/>
                </svg>
                <p>${isSearching ? 'No matching highlights found' : 'No highlights yet'}</p>
                <p class="empty-state-hint">${isSearching ? 'Try a different search term' : 'Select text on any webpage and click the highlight button'}</p>
            </div>
        `;
        return;
    }
    
    // Sort highlights by timestamp (newest first)
    const sortedHighlights = [...highlightsToShow].sort((a, b) => b.timestamp - a.timestamp);
    
    // Use virtual scrolling for large lists
    if (sortedHighlights.length > 50) {
        virtualScroller.setItems(sortedHighlights);
    } else {
        // For smaller lists, render normally
        renderNormalList(sortedHighlights);
    }
}

// Render normal list for small datasets
function renderNormalList(sortedHighlights) {
    const container = virtualScroller.container;
    
    // Remove virtual scroller wrapper if exists
    if (container.querySelector('.virtual-viewport')) {
        container.innerHTML = '';
    }
    
    // Use DocumentFragment for better performance
    const fragment = document.createDocumentFragment();
    
    sortedHighlights.forEach(highlight => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'highlight-item';
        itemDiv.dataset.id = highlight.id;
        
        const color = highlight.color || 'yellow';
        const colorStyle = getColorStyle(color);
        const hasNote = highlight.note && highlight.note.trim() !== '';
        const hasTags = highlight.tags && highlight.tags.length > 0;
        
        itemDiv.innerHTML = `
            <div class="highlight-text" style="background: ${colorStyle.bg}; box-shadow: 0 0 0 2px ${colorStyle.bg};">
                ${escapeHtml(highlight.text)}
            </div>
            ${hasTags ? `
                <div class="highlight-tags">
                    ${highlight.tags.map(tag => `
                        <span class="tag">${escapeHtml(tag)}</span>
                    `).join('')}
                </div>
            ` : ''}
            ${hasNote ? `
                <div class="highlight-note">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="opacity: 0.5;">
                        <path d="M12 20H21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        <path d="M16.5 3.5C16.8978 3.10217 17.4374 2.87868 18 2.87868C18.5626 2.87868 19.1022 3.10217 19.5 3.5C19.8978 3.89782 20.1213 4.43739 20.1213 5C20.1213 5.56261 19.8978 6.10218 19.5 6.5L7 19L3 20L4 16L16.5 3.5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span>${escapeHtml(highlight.note)}</span>
                </div>
            ` : ''}
            <div class="highlight-meta">
                <span class="highlight-url" title="${highlight.url}">${getRelativeTime(highlight.timestamp)}</span>
                <button class="delete-button" data-id="${highlight.id}">Delete</button>
            </div>
        `;
        
        fragment.appendChild(itemDiv);
    });
    
    // Clear and append all at once
    container.innerHTML = '';
    container.appendChild(fragment);
}

// Filter highlights based on search query
function filterHighlights(searchQuery) {
    if (!searchQuery) {
        updateHighlightsList();
        updateStats();
        return;
    }
    
    const filtered = highlights.filter(highlight => {
        // Search in text
        if (highlight.text.toLowerCase().includes(searchQuery)) return true;
        
        // Search in notes
        if (highlight.note && highlight.note.toLowerCase().includes(searchQuery)) return true;
        
        // Search in tags
        if (highlight.tags && highlight.tags.some(tag => tag.toLowerCase().includes(searchQuery))) return true;
        
        return false;
    });
    
    updateHighlightsList(filtered);
    
    // Update stats to show filtered count
    const highlightCount = document.querySelector('.highlight-count');
    highlightCount.textContent = `${filtered.length} of ${highlights.length}`;
}

// Update statistics
function updateStats() {
    const highlightCount = document.querySelector('.highlight-count');
    highlightCount.textContent = highlights.length;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Get relative time string
function getRelativeTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 30) return `${days}d ago`;
    
    return new Date(timestamp).toLocaleDateString();
}

// Set up event listeners with passive options where appropriate
function setupEventListeners() {
    // Delete individual highlight - use event delegation
    document.getElementById('highlightsList').addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-button')) {
            const highlightId = e.target.dataset.id;
            await deleteHighlight(highlightId);
        }
    }, { passive: true });
    
    // Clear all highlights
    document.getElementById('clearAllButton').addEventListener('click', async () => {
        if (highlights.length === 0) return;
        
        if (confirm('Are you sure you want to clear all highlights on this page?')) {
            await clearAllHighlights();
        }
    });
    
    // View all highlights (Copy all)
    document.getElementById('viewAllButton').addEventListener('click', () => {
        // Copy all highlights to clipboard
        if (highlights.length === 0) {
            alert('No highlights to copy!');
            return;
        }
        
        const highlightTexts = highlights.map(h => h.text).join('\n\n');
        navigator.clipboard.writeText(highlightTexts).then(() => {
            // Show success feedback
            const button = document.getElementById('viewAllButton');
            const originalText = button.textContent;
            button.textContent = 'Copied!';
            button.style.color = '#10b981';
            
            setTimeout(() => {
                button.textContent = originalText;
                button.style.color = '';
            }, 1500);
        }).catch(err => {
            console.error('Failed to copy highlights:', err);
            alert('Failed to copy highlights');
        });
    });
    
    // Search functionality with improved debouncing
    const searchInput = document.getElementById('searchInput');
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const searchQuery = e.target.value.toLowerCase().trim();
            filterHighlights(searchQuery);
        }, 300); // Debounce for 300ms
    }, { passive: true });
    
    // Settings button
    document.querySelector('.settings-button').addEventListener('click', () => {
        // TODO: Implement settings page
        alert('Settings coming soon!');
    });
    
    // Export button
    const exportButton = document.getElementById('exportButton');
    const exportOptions = document.getElementById('exportOptions');
    let exportOptionsVisible = false;
    
    exportButton.addEventListener('click', (e) => {
        e.stopPropagation();
        exportOptionsVisible = !exportOptionsVisible;
        exportOptions.style.display = exportOptionsVisible ? 'block' : 'none';
    });
    
    // Export option buttons
    document.querySelectorAll('.export-option').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const format = button.dataset.format;
            exportOptions.style.display = 'none';
            exportOptionsVisible = false;
            
            switch(format) {
                case 'markdown':
                    exportAsMarkdown();
                    break;
                case 'text':
                    exportAsPlainText();
                    break;
                case 'json':
                    exportAsJSON();
                    break;
            }
        });
    });
    
    // Close export options when clicking outside
    document.addEventListener('click', () => {
        if (exportOptionsVisible) {
            exportOptions.style.display = 'none';
            exportOptionsVisible = false;
        }
    }, { passive: true });
}

// Export as Markdown
function exportAsMarkdown() {
    if (highlights.length === 0) {
        alert('No highlights to export!');
        return;
    }
    
    let markdown = `# Web Highlights Export\n\n`;
    markdown += `**Page:** ${currentTab.title}\n`;
    markdown += `**URL:** ${currentTab.url}\n`;
    markdown += `**Date:** ${new Date().toLocaleDateString()}\n\n`;
    markdown += `---\n\n`;
    
    highlights.forEach((highlight, index) => {
        const color = highlight.color || 'yellow';
        markdown += `## Highlight ${index + 1} (${color})\n\n`;
        markdown += `> ${highlight.text}\n\n`;
        
        if (highlight.tags && highlight.tags.length > 0) {
            markdown += `**Tags:** ${highlight.tags.join(', ')}\n\n`;
        }
        
        if (highlight.note) {
            markdown += `**Note:** ${highlight.note}\n\n`;
        }
        
        markdown += `*Highlighted at: ${new Date(highlight.timestamp).toLocaleString()}*\n\n`;
        markdown += `---\n\n`;
    });
    
    copyToClipboard(markdown, 'Markdown exported to clipboard!');
}

// Export as plain text
function exportAsPlainText() {
    if (highlights.length === 0) {
        alert('No highlights to export!');
        return;
    }
    
    let text = `Web Highlights Export\n`;
    text += `Page: ${currentTab.title}\n`;
    text += `URL: ${currentTab.url}\n`;
    text += `Date: ${new Date().toLocaleDateString()}\n\n`;
    text += `${'='.repeat(50)}\n\n`;
    
    highlights.forEach((highlight, index) => {
        text += `${index + 1}. "${highlight.text}"\n`;
        
        if (highlight.tags && highlight.tags.length > 0) {
            text += `   Tags: ${highlight.tags.join(', ')}\n`;
        }
        
        if (highlight.note) {
            text += `   Note: ${highlight.note}\n`;
        }
        
        text += `   Time: ${new Date(highlight.timestamp).toLocaleString()}\n\n`;
    });
    
    copyToClipboard(text, 'Plain text exported to clipboard!');
}

// Export as JSON
function exportAsJSON() {
    if (highlights.length === 0) {
        alert('No highlights to export!');
        return;
    }
    
    const exportData = {
        page: {
            title: currentTab.title,
            url: currentTab.url,
            exportDate: new Date().toISOString()
        },
        highlights: highlights
    };
    
    const json = JSON.stringify(exportData, null, 2);
    copyToClipboard(json, 'JSON exported to clipboard!');
}

// Copy to clipboard with notification
async function copyToClipboard(text, successMessage) {
    try {
        await navigator.clipboard.writeText(text);
        
        // Show success feedback
        const exportButton = document.getElementById('exportButton');
        const originalHTML = exportButton.innerHTML;
        exportButton.innerHTML = '✓ Copied!';
        exportButton.style.background = '#10b981';
        exportButton.style.color = 'white';
        
        setTimeout(() => {
            exportButton.innerHTML = originalHTML;
            exportButton.style.background = '';
            exportButton.style.color = '';
        }, 2000);
    } catch (err) {
        console.error('Failed to copy:', err);
        alert('Failed to copy to clipboard');
    }
}

// Delete a single highlight
async function deleteHighlight(highlightId) {
    try {
        // Remove from local array
        highlights = highlights.filter(h => h.id !== highlightId);
        
        // Update storage with compression
        const result = await chrome.storage.local.get(['highlights']);
        const compressedData = result.highlights || {};
        const allHighlights = await decompressHighlights(compressedData);
        const url = normalizeUrl(currentTab.url);
        allHighlights[url] = highlights;
        
        // Compress before saving
        const compressed = await compressHighlights(allHighlights);
        await chrome.storage.local.set({ highlights: compressed });
        
        // Update UI
        updateHighlightsList();
        updateStats();
        
        // Notify content script to remove highlight from page
        chrome.tabs.sendMessage(currentTab.id, {
            action: 'removeHighlight',
            highlightId: highlightId
        }, (response) => {
            // Check for errors (e.g., content script not injected)
            if (chrome.runtime.lastError) {
                console.warn('Could not communicate with content script:', chrome.runtime.lastError.message);
                // Still update UI even if content script communication fails
            }
        });
    } catch (error) {
        console.error('Error deleting highlight:', error);
    }
}

// Compression utilities
async function compressHighlights(highlights) {
    if (typeof LZString === 'undefined') {
        // LZString not available, return uncompressed
        return highlights;
    }
    
    try {
        const jsonString = JSON.stringify(highlights);
        const compressed = LZString.compressToUTF16(jsonString);
        
        // Only use compression if it actually saves space
        if (compressed.length < jsonString.length) {
            return { _compressed: true, data: compressed };
        }
    } catch (error) {
        console.error('Compression error:', error);
    }
    
    return highlights;
}

// Clear all highlights for current page
async function clearAllHighlights() {
    try {
        // Clear local array
        highlights = [];
        
        // Update storage
        const result = await chrome.storage.local.get(['highlights']);
        const compressedData = result.highlights || {};
        const allHighlights = await decompressHighlights(compressedData);
        const url = normalizeUrl(currentTab.url);
        delete allHighlights[url];
        
        // Compress before saving
        const compressed = await compressHighlights(allHighlights);
        await chrome.storage.local.set({ highlights: compressed });
        
        // Update UI
        updateHighlightsList();
        updateStats();
        
        // Notify content script to remove all highlights
        chrome.tabs.sendMessage(currentTab.id, {
            action: 'removeAllHighlights'
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.warn('Could not communicate with content script:', chrome.runtime.lastError.message);
            }
        });
    } catch (error) {
        console.error('Error clearing highlights:', error);
    }
}

// Listen for updates from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'highlightAdded' || 
        message.action === 'highlightRemoved' || 
        message.action === 'highlightUpdated') {
        // Reload highlights when one is added, removed, or updated
        loadHighlights();
    }
});

// Clean up on popup close
window.addEventListener('unload', () => {
    if (virtualScroller) {
        virtualScroller.destroy();
    }
});