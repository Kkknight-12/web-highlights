// Popup functionality for Web Highlighter - Simplified Version

// ================================================================
// ERROR HANDLING SETUP
// ================================================================

// Simple error handler for popup (error-handler.js is for content scripts)
const ErrorHandler = {
    logError: (context, error) => {
        if (error.message?.includes('Extension context invalidated') ||
            error.message?.includes('Cannot access a chrome')) {
            // Suppress these errors
            return;
        }
        console.error(`[${context}]`, error.message);
    }
};

// ================================================================
// STATE & CONFIGURATION
// ================================================================

const state = {
    currentTab: null,
    highlights: [],
    elements: {} // Cached DOM elements
};

const CONFIG = {
    HIGHLIGHT_COLORS: {
        yellow: { bg: 'rgba(255, 224, 102, 0.4)', border: 'rgba(255, 224, 102, 0.6)', name: 'Yellow' },
        green: { bg: 'rgba(110, 231, 183, 0.4)', border: 'rgba(110, 231, 183, 0.6)', name: 'Green' },
        blue: { bg: 'rgba(147, 197, 253, 0.4)', border: 'rgba(147, 197, 253, 0.6)', name: 'Blue' },
        pink: { bg: 'rgba(252, 165, 165, 0.4)', border: 'rgba(252, 165, 165, 0.6)', name: 'Pink' }
    },
    SEARCH_DEBOUNCE_DELAY: 300
};

// ================================================================
// UTILITY FUNCTIONS
// ================================================================

function getColorStyle(color) {
    return CONFIG.HIGHLIGHT_COLORS[color] || CONFIG.HIGHLIGHT_COLORS.yellow;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

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

// ================================================================
// STORAGE OPERATIONS
// ================================================================

// Use shared URL matcher if available, otherwise use simple implementation
const urlMatcher = window.ChromeHighlighterUrlMatcher || {
    normalizeUrl(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.origin + urlObj.pathname.replace(/\/$/, '');
        } catch (e) {
            return url;
        }
    },
    urlsMatch(url1, url2) {
        return this.normalizeUrl(url1) === this.normalizeUrl(url2);
    }
};

async function loadHighlights() {
    try {
        if (!state.currentTab || !state.currentTab.url) {
            return;
        }
        const result = await chrome.storage.local.get(['highlights']);
        const allHighlights = result.highlights || [];
        
        // Filter highlights for current URL with pattern matching
        state.highlights = allHighlights.filter(h => {
            // First try exact match
            if (h.url === state.currentTab.url) return true;
            
            // Then try normalized match (ignores hash/query)
            if (urlMatcher.urlsMatch(h.url, state.currentTab.url)) return true;
            
            // URL matcher already handles GitHub logic
            
            return false;
        });
        
        // Update UI
        updateHighlightsList();
        updateStats();
    } catch (error) {
        ErrorHandler.logError('loadHighlights', error);
    }
}

async function deleteHighlight(highlightId) {
    try {
        if (!highlightId) {
            throw new Error('Invalid highlight ID');
        }
        // Get all highlights from storage
        const result = await chrome.storage.local.get(['highlights']);
        const allHighlights = result.highlights || [];
        
        // Filter out the deleted highlight
        const updatedHighlights = allHighlights.filter(h => h.id !== highlightId);
        
        // Save back to storage
        await chrome.storage.local.set({ highlights: updatedHighlights });
        
        // Update local array for this page with pattern matching
        state.highlights = updatedHighlights.filter(h => {
            // First try exact match
            if (h.url === state.currentTab.url) return true;
            
            // Then try normalized match (ignores hash/query)
            if (urlMatcher.urlsMatch(h.url, state.currentTab.url)) return true;
            
            // URL matcher already handles GitHub logic
            
            return false;
        });
        
        // Update UI
        updateHighlightsList();
        updateStats();
        
        // Notify content script to remove highlight from page
        try {
            await chrome.tabs.sendMessage(state.currentTab.id, {
                action: 'removeHighlight',
                highlightId: highlightId
            });
        } catch (error) {
            // Content script might not be loaded, ignore
            ErrorHandler.logError('deleteHighlight.sendMessage', error);
        }
    } catch (error) {
        ErrorHandler.logError('deleteHighlight', error);
    }
}

async function clearAllHighlights() {
    try {
        // Get all highlights from storage
        const result = await chrome.storage.local.get(['highlights']);
        const allHighlights = result.highlights || [];
        
        // Filter out highlights for current page with pattern matching
        const updatedHighlights = allHighlights.filter(h => {
            // Remove if exact match
            if (h.url === state.currentTab.url) return false;
            
            // Remove if normalized match
            if (urlMatcher.urlsMatch(h.url, state.currentTab.url)) return false;
            
            // URL matcher already handles GitHub logic
            
            return true;
        });
        
        // Save back to storage
        await chrome.storage.local.set({ highlights: updatedHighlights });
        
        // Clear local array
        state.highlights = [];
        
        // Update UI
        updateHighlightsList();
        updateStats();
        
        // Notify content script to remove all highlights
        try {
            await chrome.tabs.sendMessage(state.currentTab.id, {
                action: 'removeAllHighlights'
            });
        } catch (error) {
            // Content script might not be loaded, ignore
            ErrorHandler.logError('clearAllHighlights.sendMessage', error);
        }
    } catch (error) {
        ErrorHandler.logError('clearAllHighlights', error);
    }
}

// ================================================================
// UI UPDATE FUNCTIONS
// ================================================================

function updateHighlightsList(filteredHighlights = null) {
    const highlightsToShow = filteredHighlights || state.highlights;
    const container = state.elements.highlightsList;
    
    if (highlightsToShow.length === 0) {
        const isSearching = state.elements.searchInput && state.elements.searchInput.value.trim().length > 0;
        
        // Show empty state
        container.innerHTML = `
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
    
    // Use DocumentFragment for better performance
    const fragment = document.createDocumentFragment();
    
    sortedHighlights.forEach(highlight => {
        const itemDiv = createHighlightItem(highlight);
        fragment.appendChild(itemDiv);
    });
    
    // Clear and append all at once
    container.innerHTML = '';
    container.appendChild(fragment);
}

function createHighlightItem(highlight) {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'highlight-item';
    itemDiv.dataset.id = highlight.id;
    
    const color = highlight.color || 'yellow';
    const colorStyle = getColorStyle(color);
    const hasNote = highlight.note && highlight.note.trim() !== '';
    const hasTags = highlight.tags && highlight.tags.length > 0;
    
    // Create elements safely without innerHTML
    const textDiv = document.createElement('div');
    textDiv.className = 'highlight-text';
    textDiv.style.background = colorStyle.bg;
    textDiv.style.boxShadow = `0 0 0 2px ${colorStyle.bg}`;
    textDiv.textContent = highlight.text;
    itemDiv.appendChild(textDiv);
    
    if (hasTags) {
        const tagsDiv = document.createElement('div');
        tagsDiv.className = 'highlight-tags';
        highlight.tags.forEach(tag => {
            const tagSpan = document.createElement('span');
            tagSpan.className = 'tag';
            tagSpan.textContent = tag;
            tagsDiv.appendChild(tagSpan);
        });
        itemDiv.appendChild(tagsDiv);
    }
    
    if (hasNote) {
        const noteDiv = document.createElement('div');
        noteDiv.className = 'highlight-note';
        
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '14');
        svg.setAttribute('height', '14');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.style.opacity = '0.5';
        
        const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path1.setAttribute('d', 'M12 20H21');
        path1.setAttribute('stroke', 'currentColor');
        path1.setAttribute('stroke-width', '2');
        path1.setAttribute('stroke-linecap', 'round');
        
        const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path2.setAttribute('d', 'M16.5 3.5C16.8978 3.10217 17.4374 2.87868 18 2.87868C18.5626 2.87868 19.1022 3.10217 19.5 3.5C19.8978 3.89782 20.1213 4.43739 20.1213 5C20.1213 5.56261 19.8978 6.10218 19.5 6.5L7 19L3 20L4 16L16.5 3.5Z');
        path2.setAttribute('stroke', 'currentColor');
        path2.setAttribute('stroke-width', '2');
        path2.setAttribute('stroke-linecap', 'round');
        path2.setAttribute('stroke-linejoin', 'round');
        
        svg.appendChild(path1);
        svg.appendChild(path2);
        noteDiv.appendChild(svg);
        
        const noteSpan = document.createElement('span');
        noteSpan.textContent = highlight.note;
        noteDiv.appendChild(noteSpan);
        
        itemDiv.appendChild(noteDiv);
    }
    
    const metaDiv = document.createElement('div');
    metaDiv.className = 'highlight-meta';
    
    const urlSpan = document.createElement('span');
    urlSpan.className = 'highlight-url';
    urlSpan.title = highlight.url;
    urlSpan.textContent = getRelativeTime(highlight.timestamp);
    metaDiv.appendChild(urlSpan);
    
    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete-button';
    deleteButton.dataset.id = highlight.id;
    deleteButton.textContent = 'Delete';
    metaDiv.appendChild(deleteButton);
    
    itemDiv.appendChild(metaDiv);
    
    return itemDiv;
}

function updateStats() {
    const highlightCount = document.querySelector('.highlight-count');
    highlightCount.textContent = state.highlights.length;
}

// ================================================================
// SEARCH FUNCTIONALITY
// ================================================================

function filterHighlights(searchQuery) {
    if (!searchQuery) {
        updateHighlightsList();
        updateStats();
        return;
    }
    
    const filtered = state.highlights.filter(highlight => {
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
    highlightCount.textContent = `${filtered.length} of ${state.highlights.length}`;
}

// ================================================================
// EXPORT FUNCTIONALITY
// ================================================================

function exportAsMarkdown() {
    if (state.highlights.length === 0) {
        alert('No highlights to export!');
        return;
    }
    
    let markdown = `# Web Highlights Export\n\n`;
    markdown += `**Page:** ${state.currentTab.title}\n`;
    markdown += `**URL:** ${state.currentTab.url}\n`;
    markdown += `**Date:** ${new Date().toLocaleDateString()}\n\n`;
    markdown += `---\n\n`;
    
    state.highlights.forEach((highlight, index) => {
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

function exportAsPlainText() {
    if (state.highlights.length === 0) {
        alert('No highlights to export!');
        return;
    }
    
    let text = `Web Highlights Export\n`;
    text += `Page: ${state.currentTab.title}\n`;
    text += `URL: ${state.currentTab.url}\n`;
    text += `Date: ${new Date().toLocaleDateString()}\n\n`;
    text += `${'='.repeat(50)}\n\n`;
    
    state.highlights.forEach((highlight, index) => {
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

function exportAsJSON() {
    if (state.highlights.length === 0) {
        alert('No highlights to export!');
        return;
    }
    
    const exportData = {
        page: {
            title: state.currentTab.title,
            url: state.currentTab.url,
            exportDate: new Date().toISOString()
        },
        highlights: state.highlights
    };
    
    const json = JSON.stringify(exportData, null, 2);
    copyToClipboard(json, 'JSON exported to clipboard!');
}

async function copyToClipboard(text, successMessage) {
    try {
        await navigator.clipboard.writeText(text);
        
        // Show success feedback
        const exportButton = state.elements.exportButton;
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
        ErrorHandler.logError('copyToClipboard', err);
        alert('Failed to copy to clipboard');
    }
}

// ================================================================
// EVENT HANDLERS
// ================================================================

function setupEventListeners() {
    // Delete individual highlight - use event delegation
    state.elements.highlightsList.addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-button')) {
            const highlightId = e.target.dataset.id;
            await deleteHighlight(highlightId);
        }
    });
    
    // Clear all highlights
    state.elements.clearAllButton.addEventListener('click', async () => {
        if (state.highlights.length === 0) return;
        
        if (confirm('Are you sure you want to clear all highlights on this page?')) {
            await clearAllHighlights();
        }
    });
    
    // Copy all highlights
    state.elements.viewAllButton.addEventListener('click', () => {
        if (state.highlights.length === 0) {
            alert('No highlights to copy!');
            return;
        }
        
        const highlightTexts = state.highlights.map(h => h.text).join('\n\n');
        navigator.clipboard.writeText(highlightTexts).then(() => {
            // Show success feedback
            const button = state.elements.viewAllButton;
            const originalText = button.textContent;
            button.textContent = 'Copied!';
            button.style.color = '#10b981';
            
            setTimeout(() => {
                button.textContent = originalText;
                button.style.color = '';
            }, 1500);
        }).catch(err => {
            ErrorHandler.logError('copyAllHighlights', err);
            alert('Failed to copy highlights');
        });
    });
    
    // Search functionality with debouncing
    let searchTimeout;
    state.elements.searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const searchQuery = e.target.value.toLowerCase().trim();
            filterHighlights(searchQuery);
        }, CONFIG.SEARCH_DEBOUNCE_DELAY);
    });
    
    // Settings button
    document.querySelector('.settings-button').addEventListener('click', () => {
        alert('Settings coming soon!');
    });
    
    // Export button and options
    let exportOptionsVisible = false;
    
    state.elements.exportButton.addEventListener('click', (e) => {
        e.stopPropagation();
        exportOptionsVisible = !exportOptionsVisible;
        state.elements.exportOptions.style.display = exportOptionsVisible ? 'block' : 'none';
    });
    
    // Export option buttons
    document.querySelectorAll('.export-option').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const format = button.dataset.format;
            state.elements.exportOptions.style.display = 'none';
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
            state.elements.exportOptions.style.display = 'none';
            exportOptionsVisible = false;
        }
    });
}

// ================================================================
// INITIALIZATION
// ================================================================

async function initialize() {
    try {
        // Cache DOM elements
        state.elements = {
        highlightsList: document.getElementById('highlightsList'),
        searchInput: document.getElementById('searchInput'),
        clearAllButton: document.getElementById('clearAllButton'),
        viewAllButton: document.getElementById('viewAllButton'),
        exportButton: document.getElementById('exportButton'),
        exportOptions: document.getElementById('exportOptions')
    };
    
    // Get current tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    state.currentTab = tabs[0];
    
    // Load highlights for current tab
    await loadHighlights();
    
        // Set up event listeners
        setupEventListeners();
    } catch (error) {
        ErrorHandler.logError('initialize', error);
    }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', initialize);

// Listen for updates from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'highlightAdded' || 
        message.action === 'highlightRemoved' || 
        message.action === 'highlightUpdated') {
        // Reload highlights when one is added, removed, or updated
        loadHighlights();
    }
});