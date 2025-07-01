// Background service worker for Chrome Extension

console.log('[Web Highlighter] Background service worker started')

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[Web Highlighter] Extension installed:', details.reason)
  
  // Set default settings on install
  if (details.reason === 'install') {
    chrome.storage.local.set({
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
      chrome.storage.local.get('settings', (result) => {
        sendResponse(result.settings || {})
      })
      return true // Keep channel open for async response
      
    case 'saveSettings':
      chrome.storage.local.set({ settings: request.settings }, () => {
        sendResponse({ success: true })
      })
      return true
      
    default:
      sendResponse({ error: 'Unknown action' })
  }
})

// Context menu for highlighting
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'highlight-selection',
    title: 'Highlight selection',
    contexts: ['selection']
  })
})

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'highlight-selection') {
    chrome.tabs.sendMessage(tab.id, {
      action: 'highlightSelection',
      text: info.selectionText
    })
  }
})