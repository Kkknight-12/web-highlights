// Test script for SPA Navigation Fix
// Run this in the browser console to test the fix

console.log('=== Testing SPA Navigation Fix ===');

// Test 1: URL normalization
console.log('\n1. Testing URL normalization:');
const testUrls = [
    'https://github.com/user/repo/blob/main/file.js',
    'https://github.com/user/repo/blob/main/file.js#L10',
    'https://github.com/user/repo/blob/main/file.js?tab=spaces',
    'https://github.com/user/repo/blob/main/file.js#L10?tab=spaces'
];

if (window.SPANavigationFix) {
    testUrls.forEach(url => {
        console.log(`URL: ${url}`);
        console.log(`Normalized: ${window.SPANavigationFix.normalizeUrl(url)}`);
    });
    
    // Test 2: URL matching
    console.log('\n2. Testing URL matching:');
    const url1 = 'https://github.com/user/repo/blob/main/file.js#L10';
    const url2 = 'https://github.com/user/repo/blob/main/file.js?tab=spaces';
    console.log(`Do these match? ${url1} and ${url2}`);
    console.log(`Result: ${window.SPANavigationFix.urlsMatch(url1, url2)}`);
    
    // Test 3: Navigation detection
    console.log('\n3. Testing navigation detection:');
    console.log('Current URL:', window.location.href);
    console.log('Registered callbacks:', window.SPANavigationFix.navigationCallbacks.length);
    
    // Test 4: UI cleanup
    console.log('\n4. Testing UI cleanup:');
    const toolbars = document.querySelectorAll('#web-highlighter-toolbar');
    const containers = document.querySelectorAll('#web-highlighter-button-container');
    console.log(`Found ${toolbars.length} toolbars and ${containers.length} containers`);
    
    // Test 5: Simulate navigation
    console.log('\n5. Simulating navigation (change hash):');
    const originalUrl = window.location.href;
    window.location.hash = '#test-' + Date.now();
    
    setTimeout(() => {
        console.log('Navigation should have been detected');
        console.log('New URL:', window.location.href);
        
        // Check if UI was cleaned up
        const newToolbars = document.querySelectorAll('#web-highlighter-toolbar');
        const newContainers = document.querySelectorAll('#web-highlighter-button-container');
        console.log(`After navigation: ${newToolbars.length} toolbars and ${newContainers.length} containers`);
        
        // Restore original URL
        history.replaceState(null, '', originalUrl);
    }, 500);
} else {
    console.error('SPANavigationFix not loaded! Make sure the extension is reloaded.');
}

console.log('\n=== Test Complete ===');