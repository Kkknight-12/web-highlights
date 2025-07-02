# Archive Folder

This folder contains old files from the Chrome Web Highlighter project that were replaced during the modular architecture migration.

## Contents

### `/src/` - Old Source Files
- `content.js.monolithic` - The original monolithic content script before modular refactoring
- `content-debug.js` - Debug version of content script
- `content.js.backup-before-refactor` - Backup made before starting the refactoring
- `content.js.debug-backup` - Another debug backup

### `/tests/` - Test Files
- `test-*.html` - All test HTML files used during the modular migration
- `test-*.js` - Test JavaScript files

## Migration Details

The project was migrated from a monolithic architecture to a modular, event-driven architecture following the patterns in CHROME_EXTENSION_ARCHITECTURE_GUIDE.md.

### New Architecture
- **Core modules**: EventBus, StateManager, Constants
- **Feature modules**: Storage, Highlighter, Selection, Navigation, ErrorHandler
- **UI components**: HighlightButton, MiniToolbar, ColorPicker (Web Components)
- **Utilities**: DOM utilities

All modules now communicate via EventBus, eliminating direct dependencies and improving maintainability.

## Date Archived
2025-07-01

## Note
These files are kept for reference only. The active codebase uses the modular architecture with all functionality split into focused modules.