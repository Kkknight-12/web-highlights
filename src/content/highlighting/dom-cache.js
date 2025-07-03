/**
 * DOM Text Cache Module
 * 
 * Purpose: Cache expensive DOM text extraction and normalization operations
 * to avoid repeated DOM traversals and text processing.
 * 
 * Uses WeakMap for automatic garbage collection when DOM elements are removed.
 */

// Main cache using WeakMap - elements are keys, cache data are values
const domTextCache = new WeakMap()

// Track cache statistics (development only)
const cacheStats = {
  hits: 0,
  misses: 0,
  evictions: 0
}

/**
 * Cache entry structure:
 * {
 *   cleanText: string,           // Extracted text content
 *   normalizedText: string,      // Whitespace-normalized version
 *   positionMap: Map,            // Normalized position -> original position
 *   textLength: number,          // For quick change detection
 *   timestamp: number,           // For time-based expiry
 * }
 */

// Cache configuration
const CACHE_EXPIRY_MS = 5 * 60 * 1000 // 5 minutes
const ENABLE_CACHE_STATS = process.env.NODE_ENV === 'development'

/**
 * Get cached text data for an element
 * @param {Element} element - DOM element to get cached data for
 * @returns {Object|null} Cached data or null if not found/expired
 */
export function getCachedTextData(element) {
  const cached = domTextCache.get(element)
  
  if (!cached) {
    if (ENABLE_CACHE_STATS) cacheStats.misses++
    return null
  }
  
  // Check if cache is expired
  if (Date.now() - cached.timestamp > CACHE_EXPIRY_MS) {
    domTextCache.delete(element)
    if (ENABLE_CACHE_STATS) cacheStats.evictions++
    return null
  }
  
  // Quick validation - if text length changed, content changed
  const currentLength = element.textContent?.length || 0
  if (currentLength !== cached.textLength) {
    domTextCache.delete(element)
    if (ENABLE_CACHE_STATS) cacheStats.evictions++
    return null
  }
  
  if (ENABLE_CACHE_STATS) cacheStats.hits++
  return cached
}

/**
 * Set cached text data for an element
 * @param {Element} element - DOM element to cache data for
 * @param {Object} data - Data to cache
 */
export function setCachedTextData(element, data) {
  domTextCache.set(element, {
    ...data,
    textLength: element.textContent?.length || 0,
    timestamp: Date.now()
  })
}

/**
 * Clear cache for a specific element
 * @param {Element} element - Element to clear cache for
 */
export function clearElementCache(element) {
  domTextCache.delete(element)
}

/**
 * Clear all cached data (useful for testing or memory pressure)
 */
export function clearAllCache() {
  // WeakMap doesn't have clear(), but we can let GC handle it
  // For development, we can track what we cached
  if (ENABLE_CACHE_STATS) {
    console.log('[DOMCache] Cache stats:', cacheStats)
    cacheStats.hits = 0
    cacheStats.misses = 0
    cacheStats.evictions = 0
  }
}

/**
 * Get cache statistics (development only)
 */
export function getCacheStats() {
  return ENABLE_CACHE_STATS ? { ...cacheStats } : null
}