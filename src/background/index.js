// Background service worker for Chrome Extension
import { safeStorageSet, safeStorageGet, safeSendTabMessage } from '../utils/chrome-api.js'

console.log('[Web Highlighter] Background service worker started')

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[Web Highlighter] Extension installed:', details.reason)
  
  // Set default settings on install
  if (details.reason === 'install') {
    safeStorageSet({
      settings: {
        defaultColor: 'yellow',
        autoSave: true
      }
    })
  }
})

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Web Highlighter] Message received:', request)
  
  switch (request.action) {
    case 'getSettings':
      safeStorageGet('settings').then(result => {
        sendResponse(result.settings || {})
      })
      return true // Keep channel open for async response
      
    case 'saveSettings':
      safeStorageSet({ settings: request.settings }).then(success => {
        sendResponse({ success })
      })
      return true
      
    default:
      sendResponse({ error: 'Unknown action' })
  }
})

// Context menu for highlighting
chrome.runtime.onInstalled.addListener(() => {
  try {
    chrome.contextMenus.create({
      id: 'highlight-selection',
      title: 'Highlight selection',
      contexts: ['selection']
    })
  } catch (error) {
    console.warn('[Web Highlighter] Failed to create context menu:', error)
  }
})

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'highlight-selection') {
    // Use safe wrapper for tab messaging
    await safeSendTabMessage(tab.id, {
      action: 'highlightSelection',
      text: info.selectionText
    })
  }
})