// Shared URL matching utilities for Chrome Web Highlighter
(function() {
    'use strict';
    
    const UrlMatcher = {
        // Normalize URL for comparison
        normalizeUrl(url) {
            try {
                const urlObj = new URL(url);
                // Remove hash and trailing slash for base comparison
                return urlObj.origin + urlObj.pathname.replace(/\/$/, '');
            } catch (e) {
                return url;
            }
        },
        
        // Pattern-based URL matching for SPAs
        urlsMatch(url1, url2) {
            if (!url1 || !url2) return false;
            
            // Exact match
            if (url1 === url2) return true;
            
            // Normalized match (ignores hash/query)
            const norm1 = this.normalizeUrl(url1);
            const norm2 = this.normalizeUrl(url2);
            
            if (norm1 === norm2) return true;
            
            // GitHub-specific matching
            if (url1.includes('github.com') && url2.includes('github.com')) {
                try {
                    const path1 = new URL(url1).pathname;
                    const path2 = new URL(url2).pathname;
                    
                    // Extract repo path (owner/repo)
                    const repoMatch1 = path1.match(/^\/([^\/]+\/[^\/]+)/);
                    const repoMatch2 = path2.match(/^\/([^\/]+\/[^\/]+)/);
                    
                    if (repoMatch1 && repoMatch2 && repoMatch1[1] === repoMatch2[1]) {
                        // Same repository - consider as same context
                        return true;
                    }
                } catch (e) {
                    // Fall through to default behavior
                }
            }
            
            return false;
        },
        
        // Get a normalized storage URL
        getStorageUrl(url) {
            // For GitHub, store by repository
            if (url.includes('github.com')) {
                try {
                    const path = new URL(url).pathname;
                    const repoMatch = path.match(/^\/([^\/]+\/[^\/]+)/);
                    if (repoMatch) {
                        return `https://github.com${repoMatch[0]}`;
                    }
                } catch (e) {
                    // Fall through to default behavior
                }
            }
            
            // For other sites, use normalized URL
            return this.normalizeUrl(url);
        },
        
        // Filter highlights by URL pattern
        filterHighlightsByUrl(highlights, currentUrl) {
            if (!highlights || !Array.isArray(highlights)) return [];
            return highlights.filter(h => h && h.url && this.urlsMatch(h.url, currentUrl));
        }
    };
    
    // Export for use in extension
    window.ChromeHighlighterUrlMatcher = UrlMatcher;
})();