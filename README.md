# Web Highlighter - Chrome Extension

A simple, fast Chrome extension for highlighting and saving important text on any webpage.

![Web Highlighter Demo](assets/demo.gif)

## ✨ Features

- 🎨 **Multiple Colors** - Choose from 4 highlight colors to organize your content
- 💾 **Auto-Save** - All highlights are automatically saved locally
- 🔍 **Smart Search** - Quickly find any highlight
- 📤 **Export Options** - Export as Markdown, JSON, or plain text
- 🏷️ **Tags & Notes** - Add context to your highlights
- ⚡ **Fast & Lightweight** - No signup required, works offline

## 🚀 Installation

### From Chrome Web Store
[Coming soon! Add to Chrome →](#)

### For Development

1. Clone this repository:
   ```bash
   git clone https://github.com/Kkknight-12/chrome-web-highlighter.git
   cd chrome-web-highlighter
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable **Developer mode** (toggle in top right)

4. Click **Load unpacked** and select the project folder

5. The extension is now installed! Look for the highlighter icon in your toolbar.

## 📖 How to Use

1. **Highlight Text**: Select any text on a webpage and click the highlight button that appears
2. **Choose Color**: Pick from 4 different colors to categorize your highlights
3. **Add Notes**: Optionally add notes or tags to your highlights
4. **View All**: Click the extension icon to see all your saved highlights
5. **Search**: Use the search bar to find specific highlights
6. **Export**: Export your highlights in various formats

## 🛠️ Development

### Project Structure
```
chrome-web-highlighter/
├── src/
│   ├── content.js       # Main content script
│   ├── popup.js         # Popup functionality
│   ├── popup.html       # Popup UI
│   ├── background.js    # Service worker
│   ├── styles.css       # Extension styles
│   └── error-handler.js # Error handling
├── assets/              # Icons and images
└── manifest.json        # Extension manifest
```

### Key Technologies
- Vanilla JavaScript (ES6+)
- Chrome Extension Manifest V3
- Chrome Storage API
- Chrome Context Menus API

### Testing Locally
1. Make your changes
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Test your changes on any webpage

## 🐛 Known Issues

- Highlights may not work on some dynamic websites that heavily modify the DOM
- Cannot highlight text in PDFs or Chrome system pages
- Text selection across complex HTML structures may be limited

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 Privacy

Web Highlighter respects your privacy:
- All data is stored locally on your device
- No external servers or tracking
- No account required
- You own your data

[Read full privacy policy](https://Kkknight-12.github.io/chrome-web-highlighter/privacy-policy)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Icons from [Icons8](https://icons8.com)
- Inspired by the need for better web annotation tools

## 💬 Support

- **Issues**: [GitHub Issues](https://github.com/Kkknight-12/chrome-web-highlighter/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Kkknight-12/chrome-web-highlighter/discussions)

## 🚀 Roadmap
claude
### Version 1.0 (Current)
- ✅ Basic highlighting functionality
- ✅ Multiple colors
- ✅ Local storage
- ✅ Export features

### Version 1.1 (Planned)
- [ ] Keyboard shortcuts
- [ ] Highlight statistics
- [ ] Bulk operations
- [ ] Improved search with filters

### Version 2.0 (Pro Version)
- [ ] Cloud sync across devices
- [ ] Team collaboration
- [ ] AI-powered summaries
- [ ] Advanced export templates

---

Made with ❤️ for better web reading

**Note**: Remember to star ⭐ this repo if you find it useful!