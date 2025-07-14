/**
 * Text Sanitizer
 * Provides safe text sanitization to prevent XSS attacks
 */

/**
 * Sanitize text content to prevent XSS
 * Escapes HTML special characters
 * @param {string} text - Text to sanitize
 * @returns {string} Sanitized text
 */
export function sanitizeText(text) {
  if (typeof text !== 'string') {
    return ''
  }
  
  // Create a text node and get its escaped content
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

/**
 * Sanitize text for HTML attribute values
 * More aggressive escaping for use in attributes
 * @param {string} text - Text to sanitize
 * @returns {string} Sanitized text
 */
export function sanitizeAttribute(text) {
  if (typeof text !== 'string') {
    return ''
  }
  
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Sanitize text for storage
 * Removes any potentially dangerous content while preserving text
 * @param {string} text - Text to sanitize
 * @returns {string} Sanitized text
 */
export function sanitizeForStorage(text) {
  if (typeof text !== 'string') {
    return ''
  }
  
  // Remove any HTML tags but keep the text content
  const div = document.createElement('div')
  div.innerHTML = text
  return div.textContent || ''
}

/**
 * Validate and sanitize color values
 * Ensures color values are safe to use in CSS
 * @param {string} color - Color value
 * @returns {string|null} Sanitized color or null if invalid
 */
export function sanitizeColor(color) {
  if (typeof color !== 'string') {
    return null
  }
  
  // Allow only specific formats
  const validFormats = [
    /^#[0-9A-Fa-f]{3}$/,      // #RGB
    /^#[0-9A-Fa-f]{6}$/,      // #RRGGBB
    /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/,  // rgb(R,G,B)
    /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)$/  // rgba(R,G,B,A)
  ]
  
  const cleanColor = color.trim()
  const isValid = validFormats.some(regex => regex.test(cleanColor))
  
  return isValid ? cleanColor : null
}

/**
 * Sanitize URL for safe use
 * @param {string} url - URL to sanitize
 * @returns {string|null} Sanitized URL or null if invalid
 */
export function sanitizeUrl(url) {
  if (typeof url !== 'string') {
    return null
  }
  
  try {
    const urlObj = new URL(url)
    // Only allow http, https, and file protocols
    const allowedProtocols = ['http:', 'https:', 'file:']
    
    if (allowedProtocols.includes(urlObj.protocol)) {
      return urlObj.toString()
    }
  } catch (e) {
    // Invalid URL
  }
  
  return null
}

/**
 * Strip HTML tags from text
 * @param {string} html - HTML string
 * @returns {string} Plain text
 */
export function stripHtml(html) {
  if (typeof html !== 'string') {
    return ''
  }
  
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent || ''
}

/**
 * Normalize URL for storage consistency
 * Removes hash fragments and normalizes the URL to ensure highlights
 * are stored and retrieved consistently across URL variations
 * @param {string} url - URL to normalize
 * @returns {string|null} Normalized URL or null if invalid
 */
export function normalizeUrlForStorage(url) {
  if (typeof url !== 'string') {
    return null
  }
  
  try {
    const urlObj = new URL(url)
    
    // Only allow http, https, and file protocols
    const allowedProtocols = ['http:', 'https:', 'file:']
    if (!allowedProtocols.includes(urlObj.protocol)) {
      return null
    }
    
    // Build normalized URL without hash fragment
    // Keep the origin and pathname, but remove hash and certain query params
    let normalizedUrl = urlObj.origin + urlObj.pathname
    
    // Remove trailing slash for consistency
    normalizedUrl = normalizedUrl.replace(/\/$/, '')
    
    // For Wikipedia and similar sites, preserve important query params
    // but remove tracking/session parameters
    if (urlObj.search) {
      const params = new URLSearchParams(urlObj.search)
      const importantParams = new URLSearchParams()
      
      // Keep only important params (like oldid for Wikipedia)
      for (const [key, value] of params) {
        // Keep params that affect content
        if (['oldid', 'diff', 'action'].includes(key)) {
          importantParams.set(key, value)
        }
        // Skip tracking and session params like:
        // useskin, wprov, utm_*, fbclid, gclid, etc.
      }
      
      const importantSearch = importantParams.toString()
      if (importantSearch) {
        normalizedUrl += '?' + importantSearch
      }
    }
    
    return normalizedUrl
  } catch (e) {
    console.error('[URL Normalizer] Invalid URL:', e)
    return null
  }
}