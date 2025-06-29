// Background script for Web Highlighter
// Handles context menu and other background tasks

// Create context menu on installation
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: 'highlight-selection',
        title: 'Highlight Selected Text',
        contexts: ['selection']
    });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'highlight-selection') {
        // Send message to content script to highlight selection
        chrome.tabs.sendMessage(tab.id, {
            action: 'highlightFromContextMenu'
        });
    }
});

// Update badge with highlight count
chrome.runtime.onMessage.addListener((message, sender) => {
    if (message.action === 'updateBadge') {
        const count = message.count || 0;
        chrome.action.setBadgeText({
            text: count > 0 ? count.toString() : '',
            tabId: sender.tab.id
        });
        chrome.action.setBadgeBackgroundColor({
            color: '#FFE066'
        });
    }
});