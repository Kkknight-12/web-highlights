# URL Normalization Fix - Highlight Persistence Issue

## Issue Description

### Problem
Users reported that highlights would disappear after a few days, particularly on Wikipedia and similar websites. The highlights were not actually deleted - they were still visible in the "All Highlights" section of the popup, but wouldn't appear on the page itself.

### Root Cause
The extension was storing highlights using the **exact URL** including:
- Hash fragments (e.g., `#cite_note-17`)
- Query parameters (e.g., `?useskin=vector`)
- Tracking parameters (e.g., `?utm_source=...`)

This meant that highlights saved on:
```
https://en.wikipedia.org/wiki/Artificial_intelligence#cite_note-17
```

Would NOT appear when visiting:
```
https://en.wikipedia.org/wiki/Artificial_intelligence
```

Even though both URLs show the same content.

### Example from User's Data
```json
{
  "url": "https://en.wikipedia.org/wiki/Artificial_intelligence#cite_note-Intractability_and_efficiency_and_the_combinatorial_explosion-17",
  "text": "Artificial intelligence",
  "id": "highlight-1751949013664-7qbkzfbeh"
}
```

### Additional Issues Found
1. **Copy Link Bug**: The copy link feature was creating invalid URLs with double hash fragments:
   ```
   https://example.com#section#highlight=abc123
   ```

2. **Navigation Inconsistency**: The popup used normalized URLs while the content script used raw URLs, creating mismatches.

## Solution Implemented

### 1. Created URL Normalization Function
Added `normalizeUrlForStorage()` in `text-sanitizer.js` that:
- Removes hash fragments
- Removes tracking/session parameters (utm_*, fbclid, gclid, useskin, wprov)
- Keeps content-affecting parameters (oldid, diff, action)
- Removes trailing slashes
- Returns consistent URLs for storage

```javascript
// Example normalization:
// Input:  https://en.wikipedia.org/wiki/AI#cite_note-17?useskin=vector
// Output: https://en.wikipedia.org/wiki/AI
```

### 2. Updated All URL Usage Points

#### Highlight Creation (`highlight-engine.js`)
- `createHighlight()` - Uses normalized URL for storage
- `createMultipleHighlights()` - Uses normalized URL
- `deleteHighlight()` - Uses normalized URL for deletion
- `changeHighlightColor()` - Uses normalized URL for updates

#### Highlight Restoration (`highlight-restorer.js`)
- `restoreHighlights()` - Looks up highlights using normalized URL

#### Initial Loading (`content/index.js`)
- Sets current URL using normalized version
- Loads highlights using normalized URL

#### Navigation Detection (`navigation.js`)
- Tracks normalized URLs to avoid unnecessary reloads
- Only triggers when normalized URL actually changes

### 3. Fixed Copy Link Feature
Updated `copyHighlightLink()` in `popup-options-menu.js` to:
- Use URL API to properly handle fragments
- Replace existing fragment instead of appending
- Prevent double hash fragments

## Impact

### Before Fix
- Highlights tied to exact URL including fragments
- Lost when URL varies even slightly
- Wikipedia citations caused highlight loss
- Copy link created invalid URLs

### After Fix
- Highlights persist across URL variations
- Work regardless of hash fragments
- Work despite tracking parameters
- Copy link creates valid, shareable URLs

## Technical Details

### Files Modified
1. `src/utils/text-sanitizer.js` - Added `normalizeUrlForStorage()`
2. `src/content/highlighting/highlight-engine.js` - Updated all URL usage
3. `src/content/highlighting/highlight-restorer.js` - Updated restoration lookup
4. `src/content/index.js` - Updated initialization
5. `src/content/features/navigation.js` - Updated navigation detection
6. `src/popup/modules/popup-options-menu.js` - Fixed copy link

### Preserved Parameters
The normalization preserves these Wikipedia-specific parameters that affect content:
- `oldid` - Shows specific revision
- `diff` - Shows revision comparison
- `action` - Shows edit/history views

### Removed Parameters
The normalization removes these tracking/session parameters:
- `useskin` - UI preference
- `wprov` - Wikipedia tracking
- `utm_*` - Marketing tracking
- `fbclid` - Facebook tracking
- `gclid` - Google tracking

## Testing Recommendations

1. **Test Wikipedia Articles**:
   - Create highlights on article with citation link
   - Navigate to base article URL
   - Verify highlights appear

2. **Test URL Variations**:
   - Add highlights with tracking parameters
   - Visit without parameters
   - Verify highlights persist

3. **Test Copy Link**:
   - Copy highlight link from citation URL
   - Verify single hash fragment
   - Verify link works when shared

4. **Test Navigation**:
   - Use browser back/forward
   - Verify highlights persist
   - Check console for normalization logs

## Migration Note

Existing highlights stored with fragments will need manual migration or users will need to revisit the exact URLs to see them. Future highlights will be stored with normalized URLs and work across variations.