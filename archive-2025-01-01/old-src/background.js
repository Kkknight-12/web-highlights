// Background script for Web Highlighter
// Following uBlock Origin's pattern for CSS injection

// Store injected CSS per tab
const tabCSS = new Map();

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

// Handle messages - uBlock Origin pattern
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Handle vAPI messages (uBlock pattern)
    if (request.channel === 'vapi' && sender.tab) {
        const tabId = sender.tab.id;
        const frameId = sender.frameId || 0;
        
        if (request.msg.what === 'userCSS') {
            handleUserCSS(tabId, frameId, request.msg);
            sendResponse({ success: true });
        }
        return true; // Will respond asynchronously
    }
    
    // Handle legacy badge updates
    try {
        if (request.action === 'updateBadge' && sender.tab?.id) {
            const count = request.count || 0;
            chrome.action.setBadgeText({
                text: count > 0 ? count.toString() : '',
                tabId: sender.tab.id
            });
            chrome.action.setBadgeBackgroundColor({
                color: '#FFE066'
            });
        }
    } catch (error) {
        // Silently fail on context errors
        if (!error.message?.includes('Extension context invalidated')) {
            console.error('Error updating badge:', error);
        }
    }
});

// Handle CSS injection requests - uBlock Origin pattern adapted for Manifest V3
async function handleUserCSS(tabId, frameId, msg) {
    const { add = [], remove = [] } = msg;
    
    try {
        // Validate tab exists before proceeding
        try {
            await chrome.tabs.get(tabId);
        } catch (e) {
            console.warn('Tab no longer exists:', tabId);
            return;
        }
        
        // For Manifest V3, we need to track injected styles per tab/frame
        const tabFrameKey = `${tabId}-${frameId}`;
        let frameCSS = tabCSS.get(tabFrameKey) || new Map();
        
        // Process removals - batch for better performance
        if (remove.length > 0) {
            const removePromises = [];
            
            for (const cssText of remove) {
                if (frameCSS.has(cssText)) {
                    // Remove the CSS injection
                    removePromises.push(
                        chrome.scripting.removeCSS({
                            target: { 
                                tabId, 
                                frameIds: [frameId] 
                            },
                            css: cssText
                        }).catch(error => {
                            // Log specific errors except for already removed
                            if (!error.message?.includes('No frame with id')) {
                                console.debug('CSS removal failed:', error.message);
                            }
                        })
                    );
                    
                    frameCSS.delete(cssText);
                }
            }
            
            await Promise.allSettled(removePromises);
        }
        
        // Process additions - batch for better performance
        if (add.length > 0) {
            const addPromises = [];
            
            for (const cssText of add) {
                if (!frameCSS.has(cssText)) {
                    // Inject new CSS with proper error handling
                    addPromises.push(
                        chrome.scripting.insertCSS({
                            target: { 
                                tabId, 
                                frameIds: [frameId]
                            },
                            css: cssText
                            // Note: origin: 'USER' is default in Manifest V3
                        }).catch(error => {
                            console.error('CSS injection failed:', error.message);
                            // Remove from tracking if injection failed
                            frameCSS.delete(cssText);
                            throw error;
                        })
                    );
                    
                    // Track the CSS text
                    frameCSS.set(cssText, true);
                }
            }
            
            // Use allSettled to handle partial failures
            const results = await Promise.allSettled(addPromises);
            
            // Log any failures
            results.forEach((result, index) => {
                if (result.status === 'rejected') {
                    console.error(`Failed to inject CSS at index ${index}:`, result.reason);
                }
            });
        }
        
        // Update stored CSS
        if (frameCSS.size > 0) {
            tabCSS.set(tabFrameKey, frameCSS);
        } else {
            tabCSS.delete(tabFrameKey);
        }
        
    } catch (error) {
        console.error('CSS injection handler error:', error);
    }
}

// Clean up when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
    // Clean up all frames for this tab
    for (const key of tabCSS.keys()) {
        if (key.startsWith(`${tabId}-`)) {
            tabCSS.delete(key);
        }
    }
});

// Clean up CSS when navigating to a new page
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
    // Only clean up for main frame navigation
    if (details.frameId === 0) {
        // Clean up all CSS for this tab
        for (const key of tabCSS.keys()) {
            if (key.startsWith(`${details.tabId}-`)) {
                tabCSS.delete(key);
            }
        }
    }
});