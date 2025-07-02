# How to Load and Test the Chrome Web Highlighter Extension

## Loading the Extension

1. **Open Chrome** and navigate to `chrome://extensions/`

2. **Enable Developer Mode** by toggling the switch in the top-right corner

3. **Click "Load unpacked"** button

4. **Navigate to and select** the `dist` folder:
   ```
   /Users/knight/Desktop/projects/mcp-testing/on/projects/chrome-web-highlighter/dist
   ```

5. The extension should now appear in your extensions list with the highlighter icon

## Testing the Extension

1. **Navigate to any webpage** (e.g., Wikipedia, news article, blog post)

2. **Select some text** on the page
   - The highlight button should appear near your selection

3. **Click the highlight button** or choose a color
   - The text should be highlighted in the selected color

4. **Test multiple features:**
   - Create multiple highlights on the same page
   - Try different colors (yellow, green, blue, pink)
   - Highlight text in lists
   - Highlight across different elements
   - Refresh the page - highlights should be restored

5. **Click on a highlight** to see the mini toolbar with options:
   - Copy text
   - Change color
   - Delete highlight

## Build Information

- **Build Date**: July 2, 2025
- **Build Command**: `npm run build`
- **Output Directory**: `dist/`
- **Manifest Version**: 3
- **Key Features**:
  - Text highlighting with 4 colors
  - Automatic save and restore
  - Cross-element selection support
  - List structure preservation
  - Redux state management
  - Chrome storage sync

## Troubleshooting

If the extension doesn't work:
1. Check the console for errors (Right-click → Inspect → Console)
2. Make sure you're not on a chrome:// or chrome-extension:// page
3. Try reloading the extension
4. Check if the extension has the necessary permissions

## Development

To make changes:
1. Edit the source files in `src/`
2. Run `npm run build` again
3. Go to chrome://extensions/
4. Click the refresh icon on the extension card
5. Reload the webpage to see changes