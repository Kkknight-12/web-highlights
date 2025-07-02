/**
 * Highlight Storage
 * Handles Chrome storage operations for highlights
 */

import { BaseComponent } from '../core/base-component.js'
import { EVENTS } from '../core/events.js'

class HighlightStorage extends BaseComponent {
  constructor() {
    super('HighlightStorage')
    this.storageKey = 'highlights'
  }

  init() {
    console.log('[HighlightStorage] Initializing')
    
    // Listen for storage events
    this.on(EVENTS.STORAGE.SAVE_REQUESTED, this.handleSaveRequest)
    this.on(EVENTS.STORAGE.LOAD_REQUESTED, this.handleLoadRequest)
    this.on(EVENTS.STORAGE.CLEAR_REQUESTED, this.handleClearRequest)
    
    // Listen for highlight events that need storage
    this.on(EVENTS.HIGHLIGHT.CREATED, this.handleHighlightCreated)
    this.on(EVENTS.HIGHLIGHT.DELETED, this.handleHighlightDeleted)
    this.on(EVENTS.HIGHLIGHT.COLOR_CHANGED, this.handleColorChanged)
    
    // Listen for Chrome storage changes
    chrome.storage.onChanged.addListener(this.handleStorageChanged.bind(this))
  }

  async handleSaveRequest(event) {
    const { highlights, url = window.location.href } = event.detail
    
    try {
      await this.saveHighlights(url, highlights)
      this.emit(EVENTS.STORAGE.SAVED, { url, highlights })
    } catch (error) {
      console.error('[HighlightStorage] Save failed:', error)
      this.emit(EVENTS.STORAGE.SAVE_FAILED, { error: error.message })
    }
  }

  async handleLoadRequest(event) {
    const { url = window.location.href } = event.detail
    
    try {
      const highlights = await this.loadHighlights(url)
      this.emit(EVENTS.STORAGE.LOADED, { url, highlights })
    } catch (error) {
      console.error('[HighlightStorage] Load failed:', error)
      this.emit(EVENTS.STORAGE.LOAD_FAILED, { error: error.message })
    }
  }

  async handleClearRequest(event) {
    const { url } = event.detail
    
    try {
      if (url) {
        await this.clearHighlights(url)
      } else {
        await this.clearAllHighlights()
      }
      this.emit(EVENTS.STORAGE.CLEARED, { url })
    } catch (error) {
      console.error('[HighlightStorage] Clear failed:', error)
    }
  }

  async handleHighlightCreated(event) {
    const highlight = event.detail
    const url = highlight.url || window.location.href
    
    try {
      // Load existing highlights and add new one
      const highlights = await this.loadHighlights(url)
      highlights.push(highlight)
      
      await this.saveHighlights(url, highlights)
    } catch (error) {
      console.error('[HighlightStorage] Failed to save created highlight:', error)
      this.emit(EVENTS.STORAGE.SAVE_FAILED, { error: error.message })
    }
  }

  async handleHighlightDeleted(event) {
    const { id } = event.detail
    const url = window.location.href
    
    try {
      // Load existing highlights and remove deleted one
      const highlights = await this.loadHighlights(url)
      const filtered = highlights.filter(h => h.id !== id)
      
      await this.saveHighlights(url, filtered)
    } catch (error) {
      console.error('[HighlightStorage] Failed to delete highlight:', error)
      this.emit(EVENTS.STORAGE.SAVE_FAILED, { error: error.message })
    }
  }

  async handleColorChanged(event) {
    const { id, newColor } = event.detail
    const url = window.location.href
    
    try {
      // Load existing highlights and update color
      const highlights = await this.loadHighlights(url)
      const highlight = highlights.find(h => h.id === id)
      
      if (highlight) {
        highlight.color = newColor
        await this.saveHighlights(url, highlights)
      }
    } catch (error) {
      console.error('[HighlightStorage] Failed to update highlight color:', error)
      this.emit(EVENTS.STORAGE.SAVE_FAILED, { error: error.message })
    }
  }

  handleStorageChanged(changes, area) {
    if (area !== 'local' || !changes[this.storageKey]) {
      return
    }
    
    const { newValue, oldValue } = changes[this.storageKey]
    
    // Emit update event
    this.emit(EVENTS.STORAGE.UPDATED, {
      newValue,
      oldValue,
      url: window.location.href
    })
  }

  async saveHighlights(url, highlights) {
    const data = await chrome.storage.local.get(this.storageKey)
    const allHighlights = data[this.storageKey] || {}
    
    allHighlights[url] = highlights
    
    await chrome.storage.local.set({
      [this.storageKey]: allHighlights
    })
    
    console.log(`[HighlightStorage] Saved ${highlights.length} highlights for ${url}`)
  }

  async loadHighlights(url) {
    const data = await chrome.storage.local.get(this.storageKey)
    const allHighlights = data[this.storageKey] || {}
    
    return allHighlights[url] || []
  }

  async clearHighlights(url) {
    const data = await chrome.storage.local.get(this.storageKey)
    const allHighlights = data[this.storageKey] || {}
    
    delete allHighlights[url]
    
    await chrome.storage.local.set({
      [this.storageKey]: allHighlights
    })
  }

  async clearAllHighlights() {
    await chrome.storage.local.remove(this.storageKey)
  }

  async getStats() {
    const data = await chrome.storage.local.get(this.storageKey)
    const allHighlights = data[this.storageKey] || {}
    
    const stats = {
      totalUrls: Object.keys(allHighlights).length,
      totalHighlights: 0,
      byUrl: {}
    }
    
    for (const [url, highlights] of Object.entries(allHighlights)) {
      stats.totalHighlights += highlights.length
      stats.byUrl[url] = highlights.length
    }
    
    return stats
  }

  onDestroy() {
    // Note: We can't remove chrome.storage.onChanged listener
    // but it will be garbage collected when the component is destroyed
  }
}

export { HighlightStorage }