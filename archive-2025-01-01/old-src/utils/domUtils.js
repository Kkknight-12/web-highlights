/**
 * DOM Utilities Module
 * Common DOM manipulation and traversal utilities
 * Following the modular pattern from CHROME_EXTENSION_ARCHITECTURE_GUIDE.md
 */

const DOMUtils = (() => {
  // Public API
  return {
    /**
     * Check if element is a valid DOM element
     * @param {*} element - Element to check
     * @returns {boolean} Whether element is valid
     */
    isValidElement(element) {
      return element && element.nodeType === Node.ELEMENT_NODE;
    },

    /**
     * Check if element is an input field
     * @param {Element} element - Element to check
     * @returns {boolean} Whether element is an input field
     */
    isInputField(element) {
      if (!this.isValidElement(element)) return false;
      
      const tagName = element.tagName;
      
      // Direct input elements
      if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') {
        return true;
      }
      
      // ContentEditable elements
      if (element.contentEditable === 'true') {
        return true;
      }
      
      // Check parent hierarchy
      if (typeof element.closest === 'function') {
        return !!element.closest('input, textarea, select, [contenteditable="true"]');
      }
      
      return false;
    },

    /**
     * Get XPath for an element
     * @param {Element} element - Element to get XPath for
     * @returns {string|null} XPath string or null
     */
    getXPath(element) {
      if (!element) return null;
      
      // Handle text nodes
      if (element.nodeType === Node.TEXT_NODE) {
        element = element.parentNode;
      }
      
      // Use ID if available
      if (element.id) {
        return `//*[@id="${element.id}"]`;
      }
      
      const paths = [];
      
      // Build path from element to root
      for (; element && element.nodeType === Node.ELEMENT_NODE; element = element.parentNode) {
        let index = 0;
        let sibling = element.previousSibling;
        
        // Count preceding siblings with same tag
        while (sibling) {
          if (sibling.nodeType === Node.ELEMENT_NODE && sibling.tagName === element.tagName) {
            index++;
          }
          sibling = sibling.previousSibling;
        }
        
        const tagName = element.tagName.toLowerCase();
        const pathIndex = index ? `[${index + 1}]` : '';
        paths.unshift(`${tagName}${pathIndex}`);
      }
      
      return paths.length ? `/${paths.join('/')}` : null;
    },

    /**
     * Get element by XPath
     * @param {string} path - XPath string
     * @param {Document} doc - Document context (default: document)
     * @returns {Element|null} Found element or null
     */
    getElementByXPath(path, doc = document) {
      if (!path) return null;
      
      try {
        const result = doc.evaluate(
          path, 
          doc, 
          null, 
          XPathResult.FIRST_ORDERED_NODE_TYPE, 
          null
        );
        return result.singleNodeValue;
      } catch (error) {
        console.error('Invalid XPath:', path, error);
        return null;
      }
    },

    /**
     * Find text node containing specific text
     * @param {Element} element - Root element to search within
     * @param {string} text - Text to find
     * @returns {Text|null} First matching text node or null
     */
    findTextNode(element, text) {
      if (!element || !text) return null;
      
      const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: function(node) {
            return node.textContent.includes(text) ? 
              NodeFilter.FILTER_ACCEPT : 
              NodeFilter.FILTER_REJECT;
          }
        }
      );
      
      return walker.nextNode();
    },

    /**
     * Get all text nodes within a range
     * @param {Range} range - DOM range
     * @returns {Text[]} Array of text nodes
     */
    getTextNodesInRange(range) {
      if (!range) return [];
      
      const textNodes = [];
      const commonAncestor = range.commonAncestorContainer;
      
      // If the common ancestor is already a text node
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
            
            // Check if node intersects with our range
            try {
              if (range.compareBoundaryPoints(Range.END_TO_START, nodeRange) <= 0 &&
                  range.compareBoundaryPoints(Range.START_TO_END, nodeRange) >= 0) {
                return NodeFilter.FILTER_ACCEPT;
              }
            } catch (e) {
              // Handle comparison errors
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
    },

    /**
     * Get text content from a range
     * @param {Range} range - DOM range
     * @returns {string} Text content
     */
    getTextFromRange(range) {
      if (!range) return '';
      
      // For simple cases, use toString()
      const simpleText = range.toString();
      if (simpleText) return simpleText;
      
      // For complex cases, extract from text nodes
      const textNodes = this.getTextNodesInRange(range);
      return textNodes.map(node => {
        const nodeRange = document.createRange();
        nodeRange.selectNodeContents(node);
        
        // Determine overlap with main range
        if (range.compareBoundaryPoints(Range.START_TO_START, nodeRange) > 0) {
          nodeRange.setStart(range.startContainer, range.startOffset);
        }
        if (range.compareBoundaryPoints(Range.END_TO_END, nodeRange) < 0) {
          nodeRange.setEnd(range.endContainer, range.endOffset);
        }
        
        return nodeRange.toString();
      }).join('');
    },

    /**
     * Check if element is visible
     * @param {Element} element - Element to check
     * @returns {boolean} Whether element is visible
     */
    isElementVisible(element) {
      if (!this.isValidElement(element)) return false;
      
      // Check inline styles
      if (element.style.display === 'none' || 
          element.style.visibility === 'hidden') {
        return false;
      }
      
      // Check computed styles
      const computed = window.getComputedStyle(element);
      if (computed.display === 'none' || 
          computed.visibility === 'hidden' ||
          computed.opacity === '0') {
        return false;
      }
      
      // Check if element has dimensions
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        return false;
      }
      
      // Check if element is in viewport
      const inViewport = (
        rect.top < window.innerHeight &&
        rect.bottom > 0 &&
        rect.left < window.innerWidth &&
        rect.right > 0
      );
      
      return inViewport;
    },

    /**
     * Get element position relative to document
     * @param {Element} element - Element to get position for
     * @returns {Object} Position object with top, left, bottom, right
     */
    getElementPosition(element) {
      if (!this.isValidElement(element)) {
        return { top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0 };
      }
      
      const rect = element.getBoundingClientRect();
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      
      return {
        top: rect.top + scrollTop,
        left: rect.left + scrollLeft,
        bottom: rect.bottom + scrollTop,
        right: rect.right + scrollLeft,
        width: rect.width,
        height: rect.height
      };
    },

    /**
     * Normalize whitespace in text
     * @param {string} text - Text to normalize
     * @returns {string} Normalized text
     */
    normalizeWhitespace(text) {
      if (!text) return '';
      
      return text
        // Replace multiple spaces with single space
        .replace(/\s+/g, ' ')
        // Remove leading/trailing whitespace
        .trim()
        // Normalize line breaks
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        // Replace multiple line breaks with single
        .replace(/\n+/g, '\n');
    },

    /**
     * Get closest parent matching selector
     * @param {Element} element - Starting element
     * @param {string} selector - CSS selector
     * @returns {Element|null} Matching parent or null
     */
    getClosest(element, selector) {
      if (!this.isValidElement(element) || !selector) return null;
      
      // Use native closest if available
      if (typeof element.closest === 'function') {
        return element.closest(selector);
      }
      
      // Fallback for older browsers
      let parent = element;
      while (parent && parent !== document) {
        if (parent.matches && parent.matches(selector)) {
          return parent;
        }
        parent = parent.parentElement;
      }
      
      return null;
    },

    /**
     * Create element with attributes and content
     * @param {string} tag - Tag name
     * @param {Object} attrs - Attributes object
     * @param {string|Element|Element[]} content - Content
     * @returns {Element} Created element
     */
    createElement(tag, attrs = {}, content = null) {
      const element = document.createElement(tag);
      
      // Set attributes
      Object.entries(attrs).forEach(([key, value]) => {
        if (key === 'style' && typeof value === 'object') {
          Object.assign(element.style, value);
        } else if (key === 'class') {
          element.className = value;
        } else if (key === 'dataset' && typeof value === 'object') {
          Object.entries(value).forEach(([dataKey, dataValue]) => {
            element.dataset[dataKey] = dataValue;
          });
        } else {
          element.setAttribute(key, value);
        }
      });
      
      // Add content
      if (content) {
        if (typeof content === 'string') {
          element.textContent = content;
        } else if (Array.isArray(content)) {
          content.forEach(child => element.appendChild(child));
        } else if (content instanceof Element) {
          element.appendChild(content);
        }
      }
      
      return element;
    },

    /**
     * Wait for element to appear in DOM
     * @param {string} selector - CSS selector
     * @param {number} timeout - Timeout in ms (default: 5000)
     * @returns {Promise<Element>} Promise resolving to element
     */
    waitForElement(selector, timeout = 5000) {
      return new Promise((resolve, reject) => {
        // Check if already exists
        const existing = document.querySelector(selector);
        if (existing) {
          resolve(existing);
          return;
        }
        
        // Set up observer
        const observer = new MutationObserver((mutations, obs) => {
          const element = document.querySelector(selector);
          if (element) {
            obs.disconnect();
            resolve(element);
          }
        });
        
        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
        
        // Set timeout
        setTimeout(() => {
          observer.disconnect();
          reject(new Error(`Element ${selector} not found within ${timeout}ms`));
        }, timeout);
      });
    }
  };
})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DOMUtils;
}
// Also attach to window for browser usage
if (typeof window !== 'undefined') {
  window.DOMUtils = DOMUtils;
}
