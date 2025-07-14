# Chrome Web Store - Permission Justifications

## Single Purpose Description
```
This extension allows users to highlight text on web pages with persistent storage, enabling them to mark and annotate important information while browsing, similar to using a physical highlighter on paper.
```

## Permission Justifications

### 1. **activeTab**
```
This permission is required to access and modify the content of the currently active tab when the user selects text to highlight. It allows the extension to inject highlighting functionality only on the page where the user is actively working, ensuring minimal permission scope.
```

### 2. **contextMenus**
```
This permission enables right-click context menu options for highlighted text, allowing users to quickly access highlight-related actions like copying, deleting, or changing colors directly from the context menu. This improves user experience and accessibility.
```

### 3. **downloads**
```
This permission is necessary for the export feature, which allows users to download their highlights as JSON or text files for backup, sharing, or importing into other applications. Users explicitly trigger downloads through the export button.
```

### 4. **host permissions (<all_urls>)**
```
This broad host permission is essential because users need to highlight text on any website they visit. Since we cannot predict which websites users will want to use the highlighter on, we need permission to work on all URLs. The extension only activates when users explicitly select text and choose to highlight it.
```

### 5. **remote code**
```
This extension does NOT use remote code. All JavaScript is bundled with the extension and no code is loaded from external sources. If this warning appears, it may be due to the build process, but no remote code execution occurs.
```

### 6. **scripting**
```
This permission is required to inject the highlighting functionality (content scripts) into web pages. It allows the extension to add the necessary JavaScript and CSS to create, display, and manage highlights on the page. Without this, the core highlighting feature would not function.
```

### 7. **storage**
```
This permission is essential for saving users' highlights locally. It allows the extension to persist highlight data (text, color, position, notes) so that highlights reappear when users revisit pages. All data is stored locally on the user's device for privacy.
```

### 8. **webNavigation**
```
This permission is used to detect when users navigate to new pages or reload existing ones, allowing the extension to restore previously saved highlights automatically. It ensures highlights appear consistently across browsing sessions without user intervention.
```

## Data Use Practices

### Data Collection
- **None** - We do not collect any user data

### Data Usage
- Highlights and notes are stored locally using Chrome's storage API
- No data is transmitted to external servers
- No analytics or tracking

### Data Sharing
- **None** - We do not share any data with third parties

## Certification Statement
```
I certify that this extension's data usage practices comply with the Chrome Web Store Developer Program Policies. The extension:
- Does not collect or transmit user data
- Stores all data locally on the user's device
- Does not include analytics or tracking
- Does not sell or share user information
- Respects user privacy as outlined in our privacy policy
```

## Missing Items Checklist

### ✅ Items Provided Above:
1. Single purpose description
2. All permission justifications
3. Data use practices

### ❌ Still Need From You:
1. **Screenshot(s)** - At least one 1280x800 or 640x400 screenshot
2. **Icon** - 128x128 PNG icon (you have icons8-highlighter-100.png, may need to resize)
3. **Contact email** - Add and verify in Account tab
4. **Certify compliance** - Check the box on Privacy practices tab

## How to Add These in Chrome Developer Dashboard:

1. **Privacy Practices Tab**:
   - Copy each permission justification to its respective field
   - Add the single purpose description
   - Check the certification checkbox

2. **Store Listing Tab**:
   - Upload at least one screenshot
   - Upload the 128x128 icon

3. **Account Tab**:
   - Add your contact email (mayanksarasiya@gmail.com)
   - Verify the email

4. **Remote Code Clarification**:
   - If asked about remote code, select "No, this extension does not use remote code"
   - The warning may appear due to Vite's build process, but no remote code is actually used