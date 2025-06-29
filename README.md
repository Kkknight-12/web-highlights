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