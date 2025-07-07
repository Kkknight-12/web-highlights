// Background service worker for Chrome Extension
import { storage, tabs, contextMenus, safeStorageGet, safeStorageSet, safeSendTabMessage } from '../utils/chrome-api.js'

console.log('[Web Highlighter] Background service worker started')

// Test: Log all commands on startup
chrome.commands.getAll((commands) => {
  console.log('[Web Highlighter] All registered commands on startup:', commands)
})

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
  
  // Log registered commands
  chrome.commands.getAll((commands) => {
    console.log('[Web Highlighter] Registered commands:', commands)
    commands.forEach(cmd => {
      console.log(`[Web Highlighter] Command: ${cmd.name}, Shortcut: ${cmd.shortcut}, Description: ${cmd.description}`)
    })
  })
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
    contextMenus.create({
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

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  console.log('[Web Highlighter] Command received:', command)
  
  if (command === 'highlight-selection') {
    console.log('[Web Highlighter] Highlight selection command triggered')
    
    // Get active tab
    const [tab] = await tabs.query({ active: true, currentWindow: true })
    console.log('[Web Highlighter] Active tab:', tab?.url)
    
    if (!tab) {
      console.error('[Web Highlighter] No active tab found')
      return
    }
    
    // Send message to content script to highlight current selection
    const result = await safeSendTabMessage(tab.id, {
      action: 'highlightSelection'
    })
    console.log('[Web Highlighter] Message sent to content script, result:', result)
  }
})