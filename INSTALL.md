# Chrome Web Highlighter - Installation Guide

## 🚀 Quick Install (Developer Mode)

1. **Open Chrome Extensions Page**
   - Go to `chrome://extensions/`
   - Or: Menu → More Tools → Extensions

2. **Enable Developer Mode**
   - Toggle "Developer mode" switch (top right)

3. **Load Extension**
   - Click "Load unpacked"
   - Select the `chrome-web-highlighter` folder
   - Extension should appear in your extensions list

4. **Pin Extension (Optional)**
   - Click puzzle piece icon in toolbar
   - Click pin icon next to "Web Highlighter"

## 🧪 Testing the Extension

1. **Basic Highlighting**
   - Go to any website (e.g., wikipedia.org)
   - Select some text
   - Click the yellow highlight button that appears
   - Text should be highlighted in semi-transparent yellow

2. **Keyboard Shortcut**
   - Select text
   - Press Ctrl+Shift+H (Windows/Linux) or Cmd+Shift+H (Mac)
   - Text should be highlighted instantly

3. **Context Menu**
   - Select text
   - Right-click
   - Choose "Highlight Selected Text"
   - Text should be highlighted

4. **Remove Highlight**
   - Click on any highlighted text
   - Click the X button in the mini toolbar
   - Highlight should be removed

5. **Copy Highlight**
   - Click on any highlighted text
   - Click the copy button in the mini toolbar
   - Text is copied to clipboard

6. **Check Persistence**
   - Refresh the page
   - All highlights should still be visible

7. **Popup Features**
   - Click extension icon in toolbar
   - Should see your highlights listed
   - Try deleting a highlight
   - Click "Copy All Highlights" to copy all text
   - Click "Clear All" to remove all highlights

## 📝 Current Features

### Working:
- ✅ Text selection detection
- ✅ Highlight button appears on selection
- ✅ Semi-transparent yellow highlighting (works on dark/light backgrounds)
- ✅ Save highlights to Chrome storage
- ✅ Restore highlights on page load
- ✅ View highlights in popup
- ✅ Delete individual highlights
- ✅ Clear all highlights for current page
- ✅ Highlight count display
- ✅ **Click highlight to show options** (remove, copy)
- ✅ **Keyboard shortcut** (Ctrl/Cmd+Shift+H)
- ✅ **Right-click context menu** "Highlight Selected Text"
- ✅ **Copy all highlights** button in popup
- ✅ **Smart positioning** (adjusts near screen edges)
- ✅ **Prevents duplicate highlights**

### Not Yet Implemented:
- ❌ Icon assets (using defaults)
- ❌ Pro features (color picker, notes, export)
- ❌ Settings page
- ❌ Email capture form
- ❌ Badge counter on icon
- ❌ Undo last highlight

## 🐛 Known Issues

1. **No Icons**: Extension uses default icon (add PNG icons to assets folder)
2. **Complex Selections**: May not work perfectly with selections spanning multiple elements
3. **Dynamic Sites**: Some SPA sites may need manual refresh to show highlights

## 🔧 Troubleshooting

### Extension Not Loading?
- Check for errors in `chrome://extensions/`
- Click "Errors" button if present
- Check console for error messages

### Highlights Not Saving?
- Check Chrome DevTools Console (F12)
- Look for storage permission errors
- Try on a simpler website first

### Button Not Appearing?
- Make sure you're selecting text (not images)
- Try on a different website
- Check if site blocks content scripts

## 📦 Next Steps

1. **Add Icons**
   - Open `generate-icons.html` in browser
   - Save each canvas as PNG in `assets/` folder
   - Update manifest.json to include icons

2. **Test on Multiple Sites**
   - Wikipedia
   - Medium
   - News sites
   - Documentation sites

3. **Submit to Chrome Web Store**
   - Create developer account ($5 one-time fee)
   - Package extension
   - Write store description
   - Submit for review

## 🎯 MVP Checklist

- [x] Select text → highlight button appears
- [x] Click button → text highlighted
- [x] Highlights persist on refresh
- [x] View highlights in popup
- [x] Delete highlights
- [ ] Add proper icons
- [ ] Test on 10+ websites
- [ ] Submit to store

---

**Ready to test!** The core functionality is complete. Just needs icons and final testing.