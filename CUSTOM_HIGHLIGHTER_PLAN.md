# Custom Highlighter Implementation Plan

## Overview
Replace Rangy with a custom highlighting solution that handles lists and dynamic content reliably.

## Goals
1. Fix the list highlighting issue where wrong text gets highlighted after reload
2. Remove dependency on abandoned Rangy library
3. Maintain all current features (colors, persistence, mini toolbar)
4. Improve reliability on dynamic websites

## Technical Approach

### 1. Highlight Creation
Based on our proven simple-highlighter.js from the archive:

```javascript
// Data structure for each highlight
{
  id: 'highlight-timestamp-random',
  text: 'selected text',
  color: 'yellow',
  url: 'https://example.com',
  timestamp: Date.now(),
  context: {
    before: 'preceding 20 chars',  // Text before selection
    after: 'following 20 chars'    // Text after selection
  }
}
```

This simpler approach has been tested and works well for lists and dynamic content.
```

### 2. Core Functions to Implement

#### A. createHighlight(color)
1. Get current selection using `window.getSelection()`
2. Extract selected text and range
3. Create wrapper span with highlight styles
4. Handle edge cases:
   - Selection across multiple elements
   - Partial text nodes
   - Already highlighted text
5. Generate location data for restoration
6. Save to store

#### B. findTextInDocument(highlight)
1. Use multiple strategies in order:
   - Try exact parent selector + text match
   - Try text with context (before/after)
   - Fallback to first occurrence
2. Score each match based on:
   - Context similarity
   - Parent element match
   - Position in parent
3. Return best match or null

#### C. restoreHighlight(highlight)
1. Find text location using findTextInDocument
2. Create range for found text
3. Wrap in highlight span
4. Handle overlapping highlights

#### D. removeHighlight(id)
1. Find all spans with highlight ID
2. Unwrap text nodes
3. Merge adjacent text nodes
4. Update store

### 3. Implementation Steps

1. **Phase 1: Remove Rangy**
   - Remove rangy imports
   - Remove rangy-specific code
   - Keep the Redux store structure

2. **Phase 2: Implement Core Functions**
   - Create highlight wrapper function
   - Implement text finding algorithm
   - Add restoration logic
   - Update removal function

3. **Phase 3: Handle Edge Cases**
   - Cross-element selections
   - Nested highlights
   - Dynamic content changes
   - Special characters and emojis

4. **Phase 4: Testing**
   - Test on lists (ordered/unordered)
   - Test on dynamic content
   - Test with emojis
   - Test overlapping highlights

### 4. Files to Modify

1. **src/content/features/highlighter.js**
   - Remove all Rangy code
   - Implement new highlight functions
   - Update serialization format

2. **src/lib/rangy/** 
   - Delete entire directory

3. **package.json**
   - Remove rangy dependency

### 5. Key Algorithms

#### Text Finding Algorithm
```
1. Get all text nodes in document
2. For each text node:
   - Check if it contains the target text
   - Calculate context match score
   - Check parent element match
   - Track best match
3. Return position of best match
```

#### Context Scoring
```
Score = 0
if (textBefore matches) Score += 10
if (textAfter matches) Score += 10  
if (parentSelector matches) Score += 20
if (position in parent matches) Score += 5
Return total score
```

### 6. Benefits Over Rangy

1. **No character offset dependency** - Works with dynamic content
2. **Context-aware** - Uses surrounding text for accurate restoration
3. **Parent-aware** - Understands DOM structure
4. **List-friendly** - Handles list items correctly
5. **No external dependency** - Maintainable code

### 7. Backwards Compatibility

- Keep same Redux store structure
- Maintain same highlight data format (add new fields)
- Existing highlights may need migration

### 8. Error Handling

1. Selection validation before highlighting
2. Graceful handling of text not found
3. Console warnings for restoration failures
4. Fallback strategies for edge cases

## Code to Reuse from Archive

From `archive-2025-01-01/old-src/modules/simple-highlighter.js`:

1. **Context extraction logic** (lines 70-72)
2. **Tree walker for finding text** (lines 196-201)
3. **Scoring algorithm** (lines 219-240)
4. **Highlight wrapping with fallback** (lines 52-59)
5. **Text node restoration** (lines 253-280)

This code has been tested and proven to work with lists and dynamic content.

## Success Criteria

1. List items highlight correctly after reload
2. No wrong text highlighted
3. Works on GitHub and other dynamic sites
4. All existing features still work
5. Better performance than Rangy