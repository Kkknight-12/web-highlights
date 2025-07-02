// SPA Navigation Fix for Chrome Web Highlighter
(function() {
    'use strict';
    
    // Use shared URL matcher if available
    const urlMatcher = window.ChromeHighlighterUrlMatcher || {
        urlsMatch: (url1, url2) => url1 === url2,
        getStorageUrl: (url) => url,
        filterHighlightsByUrl: (highlights, url) => highlights.filter(h => h.url === url)
    };
    
    // Detect SPA navigation and handle URL matching
    window.SPANavigationFix = {
        lastUrl: window.location.href,
        navigationCallbacks: [],
        
        // Delegate to shared URL matcher
        urlsMatch(url1, url2) {
            return urlMatcher.urlsMatch(url1, url2);
        },
        
        getStorageUrl(url) {
            return urlMatcher.getStorageUrl(url);
        },
        
        filterHighlightsByUrl(highlights, currentUrl) {
            return urlMatcher.filterHighlightsByUrl(highlights, currentUrl);
        },
        
        // Detect navigation
        detectNavigation() {
            const currentUrl = window.location.href;
            if (currentUrl !== this.lastUrl) {
                this.lastUrl = currentUrl;
                // Trigger callbacks
                this.navigationCallbacks.forEach(callback => {
                    try {
                        callback(currentUrl);
                    } catch (e) {
                        console.error('Navigation callback error:', e);
                    }
                });
            }
        },
        
        // Register navigation callback
        onNavigation(callback) {
            this.navigationCallbacks.push(callback);
        },
        
        // Initialize navigation detection
        init() {
            // Listen for popstate (back/forward navigation)
            window.addEventListener('popstate', () => {
                setTimeout(() => this.detectNavigation(), 50);
            });
            
            // Override pushState and replaceState
            const originalPushState = history.pushState;
            const originalReplaceState = history.replaceState;
            
            history.pushState = function() {
                originalPushState.apply(history, arguments);
                setTimeout(() => window.SPANavigationFix.detectNavigation(), 50);
            };
            
            history.replaceState = function() {
                originalReplaceState.apply(history, arguments);
                setTimeout(() => window.SPANavigationFix.detectNavigation(), 50);
            };
            
            // Also monitor DOM changes for SPAs that don't use History API
            let observer = new MutationObserver(() => {
                if (window.location.href !== this.lastUrl) {
                    this.detectNavigation();
                }
            });
            
            // Start observing when DOM is ready
            if (document.body) {
                observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });
            } else {
                document.addEventListener('DOMContentLoaded', () => {
                    observer.observe(document.body, {
                        childList: true,
                        subtree: true
                    });
                });
            }
        }
    };
    
    // Initialize
    window.SPANavigationFix.init();
})();