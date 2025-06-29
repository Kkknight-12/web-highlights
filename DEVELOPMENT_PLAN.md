# Development Plan - Chrome Web Highlighter

## Day 1 Tasks (4-6 hours)

### Morning Session (2-3 hours)
1. **Basic Setup** ✓ (Done)
   - Created folder structure
   - Added manifest.json
   - Project documentation

2. **Create Popup Interface**
   ```html
   <!-- popup.html -->
   - Logo and title
   - Highlight count for current page
   - "View All Highlights" button
   - "Get Pro Features" button (email capture)
   - Settings icon
   ```

3. **Content Script Foundation**
   ```javascript
   // content.js
   - Listen for text selection
   - Add highlight button on selection
   - Apply yellow highlight
   - Save to Chrome storage
   ```

### Afternoon Session (2-3 hours)
4. **Highlight Persistence**
   - Save highlights with page URL
   - Restore highlights on page load
   - Handle dynamic content

5. **Basic Popup Functionality**
   - Show highlights for current tab
   - Delete individual highlights
   - Clear all for current page

## Day 2 Tasks (4-6 hours)

### Morning Session (2-3 hours)
1. **Polish UI**
   - Better highlight animation
   - Hover effects
   - Keyboard shortcuts (Ctrl+H)
   - Mobile-responsive popup

2. **Edge Cases**
   - Handle iframes
   - Work with SPAs
   - Prevent highlighting in inputs
   - Handle text changes

### Afternoon Session (2-3 hours)
3. **Pro Features Skeleton**
   - Add color picker (disabled)
   - Add note button (disabled)
   - "Upgrade to Pro" tooltips

4. **Store Assets**
   - Create icon set (16, 32, 48, 128px)
   - Take 5 screenshots
   - Write store description
   - Create promotional tile

## Day 3 Tasks (2 hours)

### Morning Only
1. **Testing**
   - Test on 10 popular sites
   - Fix any bugs
   - Performance check

2. **Submit to Store**
   - Package extension
   - Fill store listing
   - Submit for review
   - Tweet about launch

## Code Structure

### content.js - Core Logic
```javascript
// Main functions needed:
- detectTextSelection()
- showHighlightButton()
- applyHighlight()
- saveHighlight()
- loadHighlights()
- removeHighlight()
```

### popup.js - UI Logic
```javascript
// Main functions needed:
- getCurrentTabHighlights()
- renderHighlightsList()
- handleDeleteHighlight()
- handleClearAll()
- handleProUpgrade()
```

### storage.js - Data Layer
```javascript
// Structure:
{
  "highlights": {
    "https://example.com": [
      {
        "id": "uuid",
        "text": "highlighted text",
        "context": "surrounding text",
        "timestamp": 1234567890,
        "color": "yellow" // pro only
      }
    ]
  }
}
```

## MVP Checklist

### Must Have (Day 1-2)
- [ ] Select text → Highlight button appears
- [ ] Click button → Text highlighted yellow
- [ ] Highlights persist on refresh
- [ ] View highlights in popup
- [ ] Delete highlights
- [ ] Works on 90% of websites

### Nice to Have (If Time)
- [ ] Keyboard shortcut
- [ ] Highlight count badge
- [ ] Smooth animations
- [ ] Export as text (pro teaser)

### Not Needed for MVP
- ❌ Account system
- ❌ Cloud sync (use Chrome sync)
- ❌ Advanced text matching
- ❌ Multiple colors (pro feature)
- ❌ Notes (pro feature)

## Success Metrics

### Day 3 (Launch)
- ✅ Submitted to Chrome Web Store
- ✅ Shared on Twitter
- ✅ Asked 5 friends to test

### Week 1
- 📊 100 installs
- 📊 5 email signups
- 📊 4.0+ rating

### Month 1
- 📊 1,000 installs
- 📊 50 email signups
- 📊 2 pro upgrades

## Technical Decisions

1. **No Framework** - Keep it simple, fast load
2. **Chrome Storage** - No backend needed
3. **Vanilla JS** - Smaller size, faster
4. **CSS Variables** - Easy theming for pro
5. **UUID for IDs** - Simple ID generation

## Potential Issues & Solutions

1. **Dynamic Sites (SPAs)**
   - Solution: MutationObserver
   
2. **Cross-origin Iframes**
   - Solution: Skip them
   
3. **Text Changes**
   - Solution: Fuzzy matching
   
4. **Performance**
   - Solution: Limit highlights per page

## Next Steps After Launch

1. **Week 1**: Monitor reviews, fix bugs
2. **Week 2**: Add pro features backend
3. **Week 3**: Email campaign to list
4. **Month 2**: Port to Firefox/Edge

---

**Remember**: SHIP FAST! Perfect is the enemy of done. Get it working, get users, iterate based on feedback! 🚀