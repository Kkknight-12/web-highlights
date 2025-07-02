# Highlight Logic Specification

## Problem Statement
Current issues:
1. Rangy uses character offsets that break with dynamic content
2. Old simple-highlighter had bugs (selected first match regardless of context)
3. Lists cause wrong text to be highlighted after reload
4. Emojis and special characters affect character counting

## Core Requirements
1. Highlight the EXACT text that was selected
2. Restore highlights to the SAME location after page reload
3. Handle all edge cases correctly
4. Work on dynamic websites (GitHub, SPAs, etc.)

## Detailed Logic Specification

### 1. Creating Highlights

#### A. Capture Selection Data
```
When user selects text:
1. Get selection object
2. Validate:
   - Not empty
   - Not collapsed
   - Contains actual text (not just whitespace)
3. Extract:
   - Selected text
   - Start container + offset
   - End container + offset
   - Common ancestor
```

#### B. Build Location Context
```
For accurate restoration, capture:
1. Text Context:
   - 50 chars before selection (or until block boundary)
   - 50 chars after selection (or until block boundary)
   - Stop at block elements (p, div, li, etc.)
   
2. Structural Context:
   - Parent element type (li, p, div, etc.)
   - Parent element's full text
   - Which occurrence of selected text within parent (1st, 2nd, etc.)
   - CSS selector path to parent
   
3. List-Specific Context:
   - If in list item:
     - List type (ul/ol)
     - Item index in list
     - Item's full text
     - Previous item text (if exists)
     - Next item text (if exists)
```

#### C. Handle Edge Cases
```
1. Selection across multiple elements:
   - Split into separate highlights per element
   - Maintain relationship between parts
   
2. Selection includes existing highlights:
   - Merge overlapping highlights
   - Preserve original highlight IDs
   
3. Special characters/emojis:
   - Store normalized text for searching
   - Keep original text for display
```

### 2. Storing Highlights

#### Data Structure
```javascript
{
  id: 'unique-id',
  text: 'exact selected text',
  normalizedText: 'text without special chars for searching',
  color: 'yellow',
  url: 'page url',
  timestamp: Date.now(),
  
  location: {
    // Context for finding
    context: {
      before: 'text before (up to 50 chars)',
      after: 'text after (up to 50 chars)',
      beforeNormalized: 'normalized version',
      afterNormalized: 'normalized version'
    },
    
    // Parent information
    parent: {
      tagName: 'LI',
      className: 'list-item',
      id: 'item-1',
      fullText: 'entire parent element text',
      selector: 'ul > li:nth-child(2)',  // CSS selector
      childIndex: 0  // which child contains our text
    },
    
    // Position within parent
    occurrence: {
      index: 0,  // which occurrence of text in parent (0-based)
      total: 2   // total occurrences in parent
    },
    
    // List-specific data
    listContext: {
      isInList: true,
      listType: 'UL',
      itemIndex: 1,  // 0-based
      itemText: 'full text of this list item',
      prevItemText: 'text of previous item',
      nextItemText: 'text of next item',
      listSelector: 'ul.feature-list'
    }
  }
}
```

### 3. Restoring Highlights

#### Search Algorithm
```
function findTextLocation(highlight):
  candidates = []
  
  // Phase 1: Find all text occurrences
  for each textNode in document:
    if textNode contains highlight.text:
      candidates.push({
        node: textNode,
        index: position in node,
        score: 0
      })
  
  // Phase 2: Score each candidate
  for each candidate:
    score = 0
    
    // Context matching (highest weight)
    if text before matches:
      score += 30
    else if partial before match (last 10 chars):
      score += 15
      
    if text after matches:
      score += 30
    else if partial after match (first 10 chars):
      score += 15
    
    // Parent matching
    parentElement = candidate.node.parentElement
    if parentElement.tagName === highlight.parent.tagName:
      score += 10
    if parentElement.className === highlight.parent.className:
      score += 10
    if parentElement matches highlight.parent.selector:
      score += 20
    
    // List context matching (for list items)
    if highlight.listContext.isInList:
      listItem = parentElement.closest('li')
      if listItem:
        itemIndex = Array.from(listItem.parentElement.children).indexOf(listItem)
        if itemIndex === highlight.listContext.itemIndex:
          score += 40  // High weight for correct list position
        
        // Check siblings
        prevItem = listItem.previousElementSibling
        nextItem = listItem.nextElementSibling
        
        if prevItem?.textContent === highlight.listContext.prevItemText:
          score += 20
        if nextItem?.textContent === highlight.listContext.nextItemText:
          score += 20
    
    // Occurrence matching
    occurrenceIndex = getOccurrenceIndex(candidate.node, highlight.text)
    if occurrenceIndex === highlight.occurrence.index:
      score += 15
    
    candidate.score = score
  
  // Phase 3: Select best match
  candidates.sort((a, b) => b.score - a.score)
  
  // Only use if score is above threshold
  if candidates[0]?.score >= 30:
    return candidates[0]
  else:
    return null  // Don't highlight wrong text
```

#### Minimum Score Requirements
- Score >= 30: Acceptable match
- Score >= 60: Good match  
- Score >= 80: Excellent match
- Score < 30: Reject (don't highlight)

### 4. Special Cases

#### A. Dynamic Content
```
If content has changed:
1. Try normalized text search
2. Use fuzzy matching for context
3. Prefer structural markers (list position, parent selector)
4. Reject if confidence too low
```

#### B. Identical Text Multiple Occurrences
```
Example: Multiple "Chrome Storage API" in a list
1. Use occurrence index within parent
2. Verify with list position
3. Check sibling context
4. Use parent's full text as tiebreaker
```

#### C. Cross-Element Selections
```
When selection spans multiple elements:
1. Create separate highlight for each element
2. Store relationship between parts
3. Restore all parts or none
```

#### D. Nested Lists
```
For nested lists:
1. Store full path (ul > li > ul > li)
2. Include parent list item context
3. Use depth in scoring
```

### 5. Implementation Order

1. **Phase 1**: Basic highlight creation/removal
2. **Phase 2**: Context capture and storage
3. **Phase 3**: Smart restoration with scoring
4. **Phase 4**: List-specific handling
5. **Phase 5**: Edge cases and optimization

### 6. Testing Scenarios

1. **Basic**: Single word in paragraph
2. **List**: Items in ordered/unordered lists
3. **Duplicate**: Same text multiple times
4. **Dynamic**: GitHub README with collapsible sections
5. **Complex**: Nested lists, mixed content
6. **Special**: Emojis, special characters
7. **Cross**: Selection across elements

### 7. Fallback Strategy

If text cannot be found with high confidence:
1. Log warning with details
2. Store but don't display highlight
3. Retry on next page interaction
4. Never highlight wrong text

## Success Metrics

1. **Accuracy**: 100% correct text highlighted
2. **Reliability**: Works after page reload
3. **Performance**: < 100ms to restore all highlights
4. **Robustness**: Handles all edge cases gracefully