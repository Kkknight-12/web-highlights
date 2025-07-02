#!/usr/bin/env node

/**
 * Chrome Web Highlighter - Local Test Runner
 * 
 * This script helps run the extension locally with debugging enabled
 */

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const EXTENSION_PATH = path.resolve(__dirname);
const TEST_FILE = path.join(EXTENSION_PATH, 'test', 'test.html');

// Check if running on macOS
const isMac = process.platform === 'darwin';
const chromeExecutable = isMac 
    ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    : 'google-chrome'; // Linux/Windows

// Enable debug mode in manifest
function enableDebugMode() {
    const manifestPath = path.join(EXTENSION_PATH, 'manifest.json');
    const contentScriptPath = path.join(EXTENSION_PATH, 'src', 'content.js');
    const debugScriptPath = path.join(EXTENSION_PATH, 'src', 'content-debug.js');
    
    try {
        // Read current manifest
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        
        // Store original content script
        if (!fs.existsSync(contentScriptPath + '.original')) {
            fs.copyFileSync(contentScriptPath, contentScriptPath + '.original');
        }
        
        // Use debug version if it exists
        if (fs.existsSync(debugScriptPath)) {
            console.log('Switching to debug version of content script...');
            fs.copyFileSync(debugScriptPath, contentScriptPath);
        }
        
        console.log('Debug mode enabled');
        return true;
    } catch (error) {
        console.error('Error enabling debug mode:', error);
        return false;
    }
}

// Restore original content script
function restoreOriginal() {
    const contentScriptPath = path.join(EXTENSION_PATH, 'src', 'content.js');
    const originalPath = contentScriptPath + '.original';
    
    if (fs.existsSync(originalPath)) {
        fs.copyFileSync(originalPath, contentScriptPath);
        console.log('Original content script restored');
    }
}

// Launch Chrome with extension
function launchChrome() {
    const args = [
        `--load-extension=${EXTENSION_PATH}`,
        '--no-first-run',
        '--disable-default-apps',
        `file://${TEST_FILE}`
    ];
    
    const command = `"${chromeExecutable}" ${args.join(' ')}`;
    
    console.log('Launching Chrome with extension...');
    console.log('Extension path:', EXTENSION_PATH);
    console.log('Test page:', TEST_FILE);
    
    const chromeProcess = exec(command, (error, stdout, stderr) => {
        if (error && error.code !== 'ENOENT') {
            console.error('Error launching Chrome:', error);
        }
    });
    
    // Handle process termination
    process.on('SIGINT', () => {
        console.log('\nShutting down...');
        restoreOriginal();
        chromeProcess.kill();
        process.exit();
    });
}

// Main execution
console.log('Chrome Web Highlighter - Test Runner');
console.log('=====================================\n');

if (process.argv.includes('--restore')) {
    restoreOriginal();
    process.exit();
}

if (enableDebugMode()) {
    launchChrome();
    
    console.log('\nDebug Commands:');
    console.log('- Open Chrome DevTools (F12)');
    console.log('- Check console for debug logs');
    console.log('- Use window.__chromeHighlighterDebug for debugging');
    console.log('\nPress Ctrl+C to stop and restore original files\n');
} else {
    console.error('Failed to enable debug mode');
    process.exit(1);
}