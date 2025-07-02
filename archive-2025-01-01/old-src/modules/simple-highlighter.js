/**
 * Simple Highlighter Module
 * Handles text highlighting functionality
 */

(function() {
  'use strict';
  
  // Highlight storage
  const highlights = new Map();
  let highlightIdCounter = 0;
  
  // Default highlight styles
  const highlightColors = {
    yellow: { bg: 'rgba(255, 224, 102, 0.4)', border: 'rgba(255, 224, 102, 0.8)' },
    green: { bg: 'rgba(110, 231, 183, 0.4)', border: 'rgba(110, 231, 183, 0.8)' },
    blue: { bg: 'rgba(147, 197, 253, 0.4)', border: 'rgba(147, 197, 253, 0.8)' },
    pink: { bg: 'rgba(252, 165, 165, 0.4)', border: 'rgba(252, 165, 165, 0.8)' }
  };
  
  // Generate unique ID
  function generateId() {
    return `highlight-${Date.now()}-${++highlightIdCounter}`;
  }
  
  // Get page key for storage
  function getPageKey() {
    // Just use the full URL - simple is better
    return window.location.href;
  }
  
  // Apply highlight to range
  function highlightRange(range, color = 'yellow') {
    if (!range || range.collapsed) return null;
    
    const id = generateId();
    const colorConfig = highlightColors[color] || highlightColors.yellow;
    
    try {
      // Create wrapper span
      const wrapper = document.createElement('span');
      wrapper.className = 'web-highlighter-highlight';
      wrapper.dataset.highlightId = id;
      wrapper.dataset.color = color;
      wrapper.style.cssText = `
        background-color: ${colorConfig.bg} !important;
        border-bottom: 2px solid ${colorConfig.border} !important;
        cursor: pointer !important;
      `;
      
      // Wrap the range content
      try {
        range.surroundContents(wrapper);
      } catch (e) {
        // If surroundContents fails, use extractContents
        const contents = range.extractContents();
        wrapper.appendChild(contents);
        range.insertNode(wrapper);
      }
      
      // Store highlight info with context for better restoration
      const highlight = {
        id: id,
        text: wrapper.textContent,
        color: color,
        timestamp: Date.now(),
        url: getPageKey(),
        fullUrl: window.location.href,
        context: {
          before: range.startContainer.textContent.substring(Math.max(0, range.startOffset - 20), range.startOffset),
          after: range.endContainer.textContent.substring(range.endOffset, Math.min(range.endOffset + 20, range.endContainer.textContent.length))
        }
      };
      
      highlights.set(id, highlight);
      
      // Save to storage
      saveHighlight(highlight);
      
      window.webHighlighter.log('Created highlight:', id);
      return highlight;
      
    } catch (error) {
      console.error('Failed to create highlight:', error);
      return null;
    }
  }
  
  // Save highlight to storage
  async function saveHighlight(highlight) {
    try {
      // Store highlights by normalized URL
      const url = getPageKey();
      const result = await chrome.storage.local.get(url);
      const pageHighlights = result[url] || [];
      
      // Add or update highlight
      const existingIndex = pageHighlights.findIndex(h => h.id === highlight.id);
      if (existingIndex >= 0) {
        pageHighlights[existingIndex] = highlight;
      } else {
        pageHighlights.push(highlight);
      }
      
      // Save back to storage
      const data = {};
      data[url] = pageHighlights;
      await chrome.storage.local.set(data);
      
      window.webHighlighter.log('Saved highlight to storage');
    } catch (error) {
      console.error('Failed to save highlight:', error);
    }
  }
  
  // Remove highlight
  async function removeHighlight(id) {
    const element = document.querySelector(`[data-highlight-id="${id}"]`);
    if (element) {
      // Unwrap the highlight
      const parent = element.parentNode;
      while (element.firstChild) {
        parent.insertBefore(element.firstChild, element);
      }
      element.remove();
      
      // Remove from storage
      highlights.delete(id);
      
      try {
        const url = getPageKey();
        const result = await chrome.storage.local.get(url);
        const pageHighlights = result[url] || [];
        
        // Filter out the removed highlight
        const updatedHighlights = pageHighlights.filter(h => h.id !== id);
        
        // Save back to storage
        const data = {};
        data[url] = updatedHighlights;
        await chrome.storage.local.set(data);
      } catch (error) {
        console.error('Failed to remove highlight from storage:', error);
      }
      
      window.webHighlighter.log('Removed highlight:', id);
    }
  }
  
  // Load highlights for current page
  async function loadHighlights() {
    try {
      const url = getPageKey();
      const result = await chrome.storage.local.get(url);
      const pageHighlights = result[url] || [];
      
      window.webHighlighter.log('Loading highlights for:', url, 'Count:', pageHighlights.length);
      
      // Clear existing highlights first
      highlights.clear();
      document.querySelectorAll('.web-highlighter-highlight').forEach(el => {
        // Safely remove highlight element
        const parent = el.parentNode;
        if (parent) {
          while (el.firstChild) {
            parent.insertBefore(el.firstChild, el);
          }
          el.remove();
        }
      });
      
      // Wait a bit for DOM to stabilize
      setTimeout(() => {
        // Restore each highlight
        for (const highlight of pageHighlights) {
          highlights.set(highlight.id, highlight);
          restoreHighlight(highlight);
        }
        
        window.webHighlighter.log('Restored highlights:', highlights.size);
      }, 100);
      
    } catch (error) {
      console.error('Failed to load highlights:', error);
    }
  }
  
  // Restore a highlight to the DOM - use context to find correct occurrence
  function restoreHighlight(highlight) {
    try {
      const searchText = highlight.text;
      const beforeContext = highlight.context?.before || '';
      const afterContext = highlight.context?.after || '';
      
      // Find all text nodes
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      
      let node;
      let bestMatch = null;
      let bestScore = -1;
      
      // Look for all occurrences and score them
      while (node = walker.nextNode()) {
        // Skip already highlighted text
        if (node.parentElement && node.parentElement.classList.contains('web-highlighter-highlight')) {
          continue;
        }
        
        const nodeText = node.textContent;
        let searchIndex = 0;
        
        // Check all occurrences in this text node
        while ((searchIndex = nodeText.indexOf(searchText, searchIndex)) !== -1) {
          let score = 0;
          
          // Check before context
          if (beforeContext && searchIndex >= beforeContext.length) {
            const actualBefore = nodeText.substring(searchIndex - beforeContext.length, searchIndex);
            if (actualBefore === beforeContext) {
              score += 10; // Exact match is best
            } else if (actualBefore.endsWith(beforeContext.slice(-10))) {
              score += 5; // Partial match
            }
          }
          
          // Check after context
          const afterStart = searchIndex + searchText.length;
          if (afterContext && afterStart + afterContext.length <= nodeText.length) {
            const actualAfter = nodeText.substring(afterStart, afterStart + afterContext.length);
            if (actualAfter === afterContext) {
              score += 10; // Exact match is best
            } else if (actualAfter.startsWith(afterContext.slice(0, 10))) {
              score += 5; // Partial match
            }
          }
          
          // If this is a better match, save it
          if (score > bestScore) {
            bestScore = score;
            bestMatch = { node, index: searchIndex };
          }
          
          searchIndex += searchText.length;
        }
      }
      
      // Apply highlight to best match (or first match if no context matches)
      if (bestMatch) {
        const { node, index } = bestMatch;
        const range = document.createRange();
        range.setStart(node, index);
        range.setEnd(node, index + searchText.length);
        
        // Create highlight wrapper
        const wrapper = document.createElement('span');
        wrapper.className = 'web-highlighter-highlight';
        wrapper.dataset.highlightId = highlight.id;
        wrapper.dataset.color = highlight.color;
        
        const colorConfig = highlightColors[highlight.color] || highlightColors.yellow;
        wrapper.style.cssText = `
          background-color: ${colorConfig.bg} !important;
          border-bottom: 2px solid ${colorConfig.border} !important;
          cursor: pointer !important;
        `;
        
        try {
          range.surroundContents(wrapper);
          window.webHighlighter.log('Restored highlight:', highlight.id, 'with score:', bestScore);
        } catch (e) {
          // If surroundContents fails, use simple insert
          const contents = range.extractContents();
          wrapper.appendChild(contents);
          range.insertNode(wrapper);
        }
      } else {
        window.webHighlighter.log('Could not find text for highlight:', highlight.id, highlight.text);
      }
    } catch (error) {
      console.error('Failed to restore highlight:', error);
    }
  }
  
  // Initialize
  function init() {
    // Load existing highlights
    loadHighlights();
    
    // Handle clicks on highlights
    document.addEventListener('click', function(e) {
      const highlight = e.target.closest('.web-highlighter-highlight');
      if (highlight) {
        const id = highlight.dataset.highlightId;
        if (window.webHighlighter.ui.miniToolbar) {
          const rect = highlight.getBoundingClientRect();
          window.webHighlighter.ui.miniToolbar.show(rect, id);
        }
      }
    });
    
    window.webHighlighter.log('Highlighter initialized');
  }
  
  // Export API
  window.webHighlighter.modules.highlighter = {
    init: init,
    highlightRange: highlightRange,
    removeHighlight: removeHighlight,
    loadHighlights: loadHighlights,
    saveHighlight: saveHighlight,
    highlights: highlights
  };
  
})();