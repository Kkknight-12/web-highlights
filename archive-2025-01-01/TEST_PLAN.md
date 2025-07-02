# Web Highlighter Extension - Test Plan

## Pre-Test Setup
1. Load extension in Chrome (chrome://extensions > Developer mode > Load unpacked)
2. Pin the extension to toolbar for easy access
3. Open DevTools Console to check for errors

## Test Sites & Scenarios

### 1. Wikipedia (Simple HTML)
**URL**: https://en.wikipedia.org/wiki/Web_browser
- [ ] Highlight single word
- [ ] Highlight full paragraph
- [ ] Highlight across multiple paragraphs
- [ ] Test all 4 colors
- [ ] Check highlights persist on page reload
- [ ] Add note to a highlight
- [ ] Search for highlight in popup

### 2. Medium (Complex layout)
**URL**: Any Medium article
- [ ] Highlight quote blocks
- [ ] Highlight code snippets
- [ ] Highlight text with inline links
- [ ] Test highlighting near images
- [ ] Verify popup shows correct count

### 3. Reddit (Dynamic content)
**URL**: https://www.reddit.com/r/programming
- [ ] Highlight in post titles
- [ ] Highlight in comments
- [ ] Test after expanding collapsed comments
- [ ] Highlight across nested comments

### 4. Stack Overflow (Code-heavy)
**URL**: Any question page
- [ ] Highlight in question text
- [ ] Highlight in code blocks
- [ ] Highlight in answers
- [ ] Test with syntax-highlighted code

### 5. GitHub (SPA - Single Page App)
**URL**: This repo's README
- [ ] Highlight in README
- [ ] Navigate to different file and highlight
- [ ] Go back and check if highlights persist
- [ ] Highlight in code files
- [ ] **Navigation Test**: Check if highlight button appears after file navigation
- [ ] **Navigation Test**: Check if mini toolbar works after navigation
- [ ] **Navigation Test**: Click outside toolbar after navigation - should close

### 6. News Sites
**CNN**: https://www.cnn.com
- [ ] Highlight in article headlines
- [ ] Highlight in article body
- [ ] Test with ads present

**BBC**: https://www.bbc.com
- [ ] Similar tests as CNN
- [ ] Test with video embeds

### 7. Documentation Sites
**MDN**: https://developer.mozilla.org
- [ ] Highlight in code examples
- [ ] Highlight in explanations
- [ ] Test with dark theme if available

### 8. E-commerce
**Amazon**: Product page
- [ ] Highlight in product description
- [ ] Highlight in reviews
- [ ] Test with dynamic price updates

### 9. Blogs
**Any WordPress blog**
- [ ] Standard paragraph highlights
- [ ] Highlight in comments section

### 10. Social Media
**Twitter/X**: https://twitter.com
- [ ] Highlight in tweets
- [ ] Test with infinite scroll

## Feature Testing

### Color Picker
- [ ] All 4 colors work correctly
- [ ] Color picker appears on selection
- [ ] Closes when clicking outside

### Popup Functionality
- [ ] Shows correct highlight count
- [ ] Search filters work
- [ ] Delete individual highlights
- [ ] Clear all highlights (with confirmation)
- [ ] Export to Markdown
- [ ] Export to JSON
- [ ] Export to plain text
- [ ] Copy all highlights button

### Edge Cases
- [ ] Very long text selection (1000+ chars)
- [ ] Selection with special characters (!@#$%^&*)
- [ ] Selection with emojis 😀
- [ ] Selection across different HTML elements
- [ ] Selection including images
- [ ] Empty selection (just spaces)
- [ ] Selection in iframes (should fail gracefully)

### Error Scenarios
- [ ] Reload extension while on page
- [ ] Disable/enable extension
- [ ] Clear browser storage
- [ ] Test with 100+ highlights
- [ ] Test on chrome:// pages (should not work)
- [ ] Test on PDF files (should not work)

### Performance
- [ ] Page load time not affected
- [ ] Smooth highlight creation
- [ ] Popup opens quickly with many highlights
- [ ] No memory leaks after extended use

## Bug Checklist
- [ ] Console errors during normal use
- [ ] Highlights disappear on reload
- [ ] Popup doesn't update
- [ ] Selection detection fails
- [ ] Export produces invalid format
- [ ] Storage quota exceeded warnings

## Navigation & Race Condition Testing
These issues are intermittent - test multiple times:
- [ ] **Highlight Button**: Navigate between pages rapidly, check if button appears
- [ ] **Mini Toolbar**: Navigate then click highlight - toolbar should appear
- [ ] **Mini Toolbar Closing**: After navigation, click outside - should close
- [ ] **Popup Highlights**: Open popup after quick navigation - all highlights should show
- [ ] **Multiple Tabs**: Switch between tabs rapidly and test highlighting
- [ ] **Quick Actions**: Select text immediately after page load

## Notes Section
Record any issues found:

```
Site: ___________
Issue: ___________
Steps to reproduce: ___________
Expected: ___________
Actual: ___________
```

## Chrome Web Store Requirements
After testing, ensure:
- [ ] No console errors on major sites
- [ ] All advertised features work
- [ ] Performance is acceptable
- [ ] No security warnings
- [ ] Privacy policy accessible

---

**Testing Duration**: ~30-45 minutes
**Priority**: Test Wikipedia, Medium, and GitHub first (most common use cases)