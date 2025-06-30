# Chrome Web Highlighter

A simple, free Chrome extension that lets users highlight text on any webpage.

## Project Status

**Goal**: Build audience for future premium products
**Timeline**: 2 days to MVP
**Type**: Free with Pro upgrade ($9)

## Quick Start

```bash
# No build needed - vanilla JS
# Load unpacked extension in Chrome
chrome://extensions > Developer mode > Load unpacked
```

## Project Structure

```
chrome-web-highlighter/
├── manifest.json        # Chrome extension config
├── src/
│   ├── popup.html      # Extension popup UI
│   ├── popup.js        # Popup logic
│   ├── content.js      # Page highlighting logic
│   ├── background.js   # Service worker
│   └── styles.css      # Highlight styles
├── assets/
│   └── icons/          # Extension icons
└── docs/
    └── store-listing.md # Chrome Web Store assets
```

## Features

### Free Version
- Highlight text in yellow
- Saves automatically
- Syncs across devices
- Works on all sites

### Pro Version ($9)
- Multiple colors
- Add notes
- Export highlights
- Categories/tags

## Development

Day 1: Core highlighting functionality
Day 2: Polish and submit to store
Day 3: Start marketing

## Revenue Model

Primary: Build email list (500+ subscribers)
Secondary: Pro upgrades ($9 one-time)
Future: Upsell to React Text Annotator ($79)

## Troubleshooting

If you encounter issues with the extension, please refer to:
- **[TROUBLESHOOTING_LOG.md](TROUBLESHOOTING_LOG.md)** - Comprehensive log of all issues and solutions
- **[EXTENSION_CONTEXT_FIX.md](EXTENSION_CONTEXT_FIX.md)** - Fixing "Extension context invalidated" errors
- **[RELOAD_FIX.md](RELOAD_FIX.md)** - Fixing highlights disappearing on page reload
- **[FIXES_APPLIED.md](FIXES_APPLIED.md)** - Summary of all fixes applied to the extension

Common issues covered:
- Extension context invalidation
- Highlights not persisting across reloads
- DOM manipulation errors
- Storage synchronization problems
- Highlight button not appearing

## 🧪 Local Testing & Debugging

### Quick Start Testing
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select this folder
4. Open `test/test.html` in Chrome
5. Check console for debug information

### Advanced Debugging
See [LOCAL_TESTING_GUIDE.md](LOCAL_TESTING_GUIDE.md) for:
- Setting up debug environment
- Using debug console commands
- Testing error scenarios
- Performance monitoring

### Debug Mode
The extension includes a debug version with enhanced logging:
```bash
# Use debug version (Node.js required)
node test-runner.js

# Restore original version
node test-runner.js --restore
```

### Console Commands
When using debug version:
```javascript
// Get extension state
__chromeHighlighterDebug.stats()

// Test error handling
__chromeHighlighterDebug.testError()

// Force orphan state
__chromeHighlighterDebug.forceOrphan()
```