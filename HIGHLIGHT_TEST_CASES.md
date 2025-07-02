# Highlight Functionality Test Cases

## Overview
This document outlines all test cases for the Chrome Web Highlighter extension's core functionality. Tests are organized by feature area and include various text samples to ensure robust highlighting.

## Test Sample Texts

### Basic Samples
1. **Simple Text**: "Hello world"
2. **Multi-word**: "The quick brown fox jumps over the lazy dog"
3. **With Punctuation**: "Hello, world! How are you?"
4. **With Numbers**: "The year 2024 has 365 days"
5. **Special Characters**: "Price: $99.99 (20% off!)"

### Complex Samples
1. **Multi-line Text**: 
   ```
   First line of text
   Second line of text
   Third line of text
   ```

2. **Nested HTML**:
   ```html
   <p>This is <strong>bold</strong> and <em>italic</em> text</p>
   ```

3. **List Items**:
   ```html
   <ul>
     <li>First item</li>
     <li>Second item</li>
     <li>Third item</li>
   </ul>
   ```

4. **Mixed Content**:
   ```html
   <div>
     <p>Paragraph with <a href="#">link</a></p>
     <span>Some <code>code</code> here</span>
   </div>
   ```

## Test Cases by Feature

### 1. Text Selection Tests

#### TC-1.1: Basic Text Selection
- **Input**: Select "Hello world"
- **Expected**: Selection is detected, highlight button appears
- **Verify**: Button position is near selection

#### TC-1.2: Partial Word Selection
- **Input**: Select "ello wor" from "Hello world"
- **Expected**: Selection is valid, button appears
- **Verify**: Only selected portion will be highlighted

#### TC-1.3: Cross-Element Selection
- **Input**: Select across `<strong>` and `<em>` tags
- **Expected**: Selection spans multiple elements
- **Verify**: All selected text is captured

#### TC-1.4: Empty Selection
- **Input**: Click without selecting text
- **Expected**: No highlight button appears
- **Verify**: Previous button is hidden

#### TC-1.5: Whitespace Selection
- **Input**: Select only spaces or newlines
- **Expected**: No highlight button appears
- **Verify**: Selection is ignored

### 2. Highlight Creation Tests

#### TC-2.1: Single Highlight
- **Input**: Select "Hello" and click highlight button
- **Expected**: Text is highlighted in default color
- **Verify**: Highlight has unique ID, correct bounds

#### TC-2.2: Multiple Separate Highlights
- **Input**: Create highlights on "Hello" and "world" separately
- **Expected**: Two distinct highlights exist
- **Verify**: Each has unique ID, no overlap

#### TC-2.3: Overlapping Highlights
- **Input**: Highlight "Hello world", then highlight "world"
- **Expected**: Second highlight either merges or creates nested highlight
- **Verify**: No text corruption, both visible

#### TC-2.4: Color Selection
- **Input**: Select text, choose different colors
- **Expected**: Highlight uses selected color
- **Verify**: Color persists after page reload

#### TC-2.5: Highlight in Lists
- **Input**: Select text within `<li>` elements
- **Expected**: Highlight preserves list structure
- **Verify**: List items remain functional

### 3. State Management Tests

#### TC-3.1: Redux State Update
- **Input**: Create highlight
- **Expected**: Redux store contains highlight data
- **Verify**: State includes ID, text, color, position

#### TC-3.2: Chrome Storage Sync
- **Input**: Create highlight
- **Expected**: Data saved to chrome.storage.local
- **Verify**: Storage contains serialized highlight

#### TC-3.3: Multiple Page State
- **Input**: Create highlights on different URLs
- **Expected**: Each page maintains separate highlights
- **Verify**: No cross-page interference

#### TC-3.4: State Cleanup
- **Input**: Delete highlight
- **Expected**: Removed from Redux and storage
- **Verify**: No orphaned data remains

### 4. Highlight Restoration Tests

#### TC-4.1: Page Reload
- **Input**: Create highlight, reload page
- **Expected**: Highlight restored in same position
- **Verify**: Text, color, ID match original

#### TC-4.2: Dynamic Content
- **Input**: Highlight text that changes position
- **Expected**: Highlight finds text in new location
- **Verify**: Restoration algorithm handles DOM changes

#### TC-4.3: Missing Content
- **Input**: Highlight text that's removed on reload
- **Expected**: Graceful failure, no errors
- **Verify**: Highlight marked as failed in state

#### TC-4.4: Partial Match
- **Input**: Highlight text that's partially changed
- **Expected**: Best effort restoration
- **Verify**: Partial highlight or skip

#### TC-4.5: Performance Test
- **Input**: Restore 50+ highlights
- **Expected**: Completes within 2 seconds
- **Verify**: No UI freezing

### 5. Interaction Tests

#### TC-5.1: Click Highlight
- **Input**: Click on highlighted text
- **Expected**: Mini toolbar appears
- **Verify**: Toolbar positioned correctly

#### TC-5.2: Copy Highlight
- **Input**: Click copy button in toolbar
- **Expected**: Text copied to clipboard
- **Verify**: Clipboard contains exact text

#### TC-5.3: Change Color
- **Input**: Click color button, select new color
- **Expected**: Highlight color updates
- **Verify**: Change persists

#### TC-5.4: Delete Highlight
- **Input**: Click delete button
- **Expected**: Highlight removed immediately
- **Verify**: Cannot be restored without undo

### 6. Edge Cases

#### TC-6.1: IFrame Content
- **Input**: Try to highlight inside iframe
- **Expected**: Graceful handling or skip
- **Verify**: No errors thrown

#### TC-6.2: SVG/Canvas Elements
- **Input**: Select text near SVG/Canvas
- **Expected**: Only text nodes highlighted
- **Verify**: Graphics unaffected

#### TC-6.3: Readonly/Disabled Elements
- **Input**: Select text in disabled input
- **Expected**: Highlight works normally
- **Verify**: Element state unchanged

#### TC-6.4: RTL Text
- **Input**: Select Arabic/Hebrew text
- **Expected**: Correct direction handling
- **Verify**: Highlight bounds are accurate

#### TC-6.5: Very Long Text
- **Input**: Select 1000+ characters
- **Expected**: Highlight created successfully
- **Verify**: Performance acceptable

### 7. Error Handling Tests

#### TC-7.1: Storage Quota Exceeded
- **Input**: Fill storage, create highlight
- **Expected**: User-friendly error message
- **Verify**: Existing highlights intact

#### TC-7.2: Invalid DOM State
- **Input**: Modify DOM during highlight
- **Expected**: Operation cancelled safely
- **Verify**: No partial highlights

#### TC-7.3: Extension Context Invalid
- **Input**: Disable/enable extension
- **Expected**: Graceful recovery
- **Verify**: Highlights restore after enable

## Test Implementation Priority

### Phase 1 (Core - Must Have)
- TC-1.1, TC-1.2, TC-1.4 (Basic selection)
- TC-2.1, TC-2.2 (Basic highlighting)
- TC-3.1, TC-3.2 (State saving)
- TC-4.1 (Basic restoration)

### Phase 2 (Important Features)
- TC-2.4 (Colors)
- TC-5.1, TC-5.4 (Interactions)
- TC-4.2 (Dynamic content)
- TC-1.3 (Cross-element)

### Phase 3 (Edge Cases)
- TC-2.3 (Overlapping)
- TC-6.* (All edge cases)
- TC-7.* (Error handling)
- TC-4.5 (Performance)

## Test Data Structure

Each test should verify the highlight object structure:
```javascript
{
  id: 'unique-id',
  text: 'highlighted text',
  color: 'yellow',
  url: 'current-page-url',
  timestamp: Date.now(),
  context: {
    before: 'text before',
    after: 'text after'
  },
  position: {
    start: { /* node path */ },
    end: { /* node path */ }
  }
}
```

## Success Criteria

- All Phase 1 tests must pass before release
- Phase 2 tests should have 90% pass rate
- Phase 3 tests document known limitations
- Performance tests meet benchmarks
- No memory leaks in long-running tests