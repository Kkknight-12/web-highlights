/**
 * DOM Safety Utilities
 * Provides safe DOM operations to prevent null reference errors
 */

/**
 * Safely get parent node
 * @param {Node} node - DOM node
 * @returns {Node|null} Parent node or null
 */
export function getParentNode(node) {
  return node?.parentNode || null
}

/**
 * Safely get parent element
 * @param {Node} node - DOM node
 * @returns {Element|null} Parent element or null
 */
export function getParentElement(node) {
  return node?.parentElement || null
}

/**
 * Safely call closest() method
 * @param {Node} node - DOM node
 * @param {string} selector - CSS selector
 * @returns {Element|null} Closest element or null
 */
export function safeClosest(node, selector) {
  if (!node || !selector) return null
  
  // Check if node is an Element with closest method
  if (node.nodeType === Node.ELEMENT_NODE && typeof node.closest === 'function') {
    try {
      return node.closest(selector)
    } catch (e) {
      // Invalid selector or other error
      return null
    }
  }
  
  // For text nodes, try parent element
  if (node.nodeType === Node.TEXT_NODE && node.parentElement) {
    return safeClosest(node.parentElement, selector)
  }
  
  return null
}

/**
 * Safely normalize element
 * @param {Element} element - DOM element
 */
export function safeNormalize(element) {
  if (element && typeof element.normalize === 'function') {
    try {
      element.normalize()
    } catch (e) {
      // Some elements don't support normalize
      console.debug('[DOM Safety] Could not normalize element:', e.message)
    }
  }
}

/**
 * Safely get text content
 * @param {Node} node - DOM node
 * @returns {string} Text content or empty string
 */
export function safeTextContent(node) {
  return node?.textContent || ''
}

/**
 * Safely insert before
 * @param {Node} parent - Parent node
 * @param {Node} newNode - Node to insert
 * @param {Node} referenceNode - Reference node
 * @returns {Node|null} Inserted node or null
 */
export function safeInsertBefore(parent, newNode, referenceNode) {
  if (parent && newNode) {
    try {
      return parent.insertBefore(newNode, referenceNode)
    } catch (e) {
      console.debug('[DOM Safety] Could not insert node:', e.message)
    }
  }
  return null
}

/**
 * Safely append child
 * @param {Node} parent - Parent node
 * @param {Node} child - Child node
 * @returns {Node|null} Appended node or null
 */
export function safeAppendChild(parent, child) {
  if (parent && child) {
    try {
      return parent.appendChild(child)
    } catch (e) {
      console.debug('[DOM Safety] Could not append child:', e.message)
    }
  }
  return null
}

/**
 * Safely get child at index
 * @param {Element} element - Parent element
 * @param {number} index - Child index
 * @returns {Element|null} Child element or null
 */
export function safeChildAt(element, index) {
  if (element?.children && index >= 0 && index < element.children.length) {
    return element.children[index]
  }
  return null
}

/**
 * Check if node has parent
 * @param {Node} node - DOM node
 * @returns {boolean} True if node has parent
 */
export function hasParent(node) {
  return Boolean(node?.parentNode)
}

/**
 * Safely get first child
 * @param {Node} node - DOM node
 * @returns {Node|null} First child or null
 */
export function safeFirstChild(node) {
  return node?.firstChild || null
}

/**
 * Safely get next sibling
 * @param {Node} node - DOM node
 * @returns {Node|null} Next sibling or null
 */
export function safeNextSibling(node) {
  return node?.nextSibling || null
}

/**
 * Safely add class
 * @param {Element} element - DOM element
 * @param {string} className - Class name
 */
export function safeAddClass(element, className) {
  if (element?.classList && className) {
    try {
      element.classList.add(className)
    } catch (e) {
      console.debug('[DOM Safety] Could not add class:', e.message)
    }
  }
}

/**
 * Safely remove class
 * @param {Element} element - DOM element
 * @param {string} className - Class name
 */
export function safeRemoveClass(element, className) {
  if (element?.classList && className) {
    try {
      element.classList.remove(className)
    } catch (e) {
      console.debug('[DOM Safety] Could not remove class:', e.message)
    }
  }
}

/**
 * Safely set attribute
 * @param {Element} element - DOM element
 * @param {string} name - Attribute name
 * @param {string} value - Attribute value
 */
export function safeSetAttribute(element, name, value) {
  if (element && name) {
    try {
      element.setAttribute(name, value)
    } catch (e) {
      console.debug('[DOM Safety] Could not set attribute:', e.message)
    }
  }
}

/**
 * Safely get attribute
 * @param {Element} element - DOM element
 * @param {string} name - Attribute name
 * @returns {string|null} Attribute value or null
 */
export function safeGetAttribute(element, name) {
  if (element && name) {
    try {
      return element.getAttribute(name)
    } catch (e) {
      console.debug('[DOM Safety] Could not get attribute:', e.message)
    }
  }
  return null
}