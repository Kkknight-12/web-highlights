#!/bin/bash

echo "Preparing Chrome Web Highlighter for Chrome Web Store..."

# Create assets directory if it doesn't exist
mkdir -p assets

# Check if icons exist
if [ ! -f "assets/icon16.png" ] || [ ! -f "assets/icon48.png" ] || [ ! -f "assets/icon128.png" ]; then
    echo "⚠️  Icons missing! Please:"
    echo "1. Open generate-icons.html in a browser"
    echo "2. Download all three icons"
    echo "3. Save them in the assets/ folder"
    echo ""
    read -p "Press Enter once icons are saved..."
fi

# Clean up any debug or temporary files
echo "Cleaning up debug files..."
rm -f src/content-debug.js
rm -f src/error-handler.js
rm -f src/content.js.debug-backup
rm -f src/content.js.original
rm -f test-runner.js

# Create the ZIP file for upload
echo "Creating web-highlighter.zip..."
zip -r web-highlighter.zip . \
  -x "*.git*" \
  -x "node_modules/*" \
  -x "*.md" \
  -x "test/*" \
  -x "*.sh" \
  -x "generate-icons.html" \
  -x ".DS_Store" \
  -x "screenshots/*" \
  -x "*.log" \
  -x "web-highlighter.zip"

echo ""
echo "✅ Extension prepared for publishing!"
echo ""
echo "📋 Next steps:"
echo "1. Make sure you have generated the icons"
echo "2. Take 2-3 screenshots of the extension in action"
echo "3. Go to https://chrome.google.com/webstore/devconsole"
echo "4. Upload web-highlighter.zip"
echo "5. Fill in the store listing details"
echo ""
echo "📝 Store listing content available in PUBLISH_CHECKLIST.md"
echo ""
echo "File created: web-highlighter.zip ($(du -h web-highlighter.zip | cut -f1))"