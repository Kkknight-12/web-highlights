# Enable File Access for Testing

To test the Chrome Web Highlighter extension on local HTML files, you need to:

## Steps:

1. **Go to Chrome Extensions Page**
   - Open: `chrome://extensions/`
   
2. **Find Your Extension**
   - Look for "Web Highlighter - Save Text Highlights"
   
3. **Click "Details"**
   - This opens the extension details page
   
4. **Enable File Access**
   - Find the toggle: "Allow access to file URLs"
   - Turn it ON (should be blue/enabled)
   
5. **Reload Extension**
   - Go back to `chrome://extensions/`
   - Click the reload button (circular arrow) on your extension
   
6. **Test on Local File**
   - Open: `file:///Users/knight/Desktop/projects/mcp-testing/on/projects/chrome-web-highlighter/test/test.html`
   - The extension should now work!

## Visual Guide:
```
chrome://extensions/ 
  → Web Highlighter extension 
    → "Details" button
      → "Allow access to file URLs" toggle
        → Enable it
          → Go back and reload extension
```

## Verify It's Working:
1. Open the test.html file
2. Open Chrome DevTools (F12)
3. Look for: "Chrome Web Highlighter loaded" in console
4. Select some text - highlight button should appear

## Note:
This setting is required for security reasons. Chrome doesn't allow extensions to access file:// URLs by default to prevent malicious extensions from reading local files.