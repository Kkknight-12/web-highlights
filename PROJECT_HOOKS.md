# Chrome Web Highlighter - Project Coding Principles & Rules

This document defines the coding standards and principles that must be followed for the Chrome Web Highlighter project. These rules are enforced by Claude Code hooks.

## 🏗️ Architecture Principles

### 1. Modular Architecture
- **Single Responsibility**: Each module handles ONE specific concern
- **Size Limit**: Each module MUST be under 200 lines
- **Naming Convention**: Use `feature-name.js` format (e.g., `highlight-engine.js`)
- **File Versioning**: NEVER create duplicate files (no file-v2.js, file-simple.js)
- **Module Structure**:
  ```
  src/
  ├── modules/        # Shared utilities
  ├── content/        # Content script modules
  ├── store/          # Redux store and slices
  └── utils/          # Helper utilities
  ```

### 2. Redux State Management
- **Single Source of Truth**: All state in Redux store
- **Direct Store Usage**: Components import and use store directly
- **No Event-Driven Architecture**: Avoid EventBus pattern (causes circular dependencies)
- **State Structure**:
  ```javascript
  {
    highlights: { items: [], loading: false },
    ui: { highlightButton: {}, miniToolbar: {}, colorPicker: {} },
    preferences: { defaultColor: 'yellow' }
  }
  ```

### 3. Chrome Extension Best Practices
- **Context Validation**: Always check `chrome.runtime && chrome.runtime.id`
- **Error Handling**: Wrap ALL Chrome API calls in try-catch
- **Use Wrappers**: Use `chrome-api.js` wrapper for consistency
- **Handle Invalidation**: Gracefully handle "Extension context invalidated" errors
- **Manifest V3**: Follow Manifest V3 guidelines and restrictions

## 📋 Development Rules

### Code Modification
1. **NEVER create new versions of files** - Modify existing files directly
2. **Comment out old code** with clear explanation when refactoring:
   ```javascript
   // OLD IMPLEMENTATION - ISSUE: O(n²) complexity
   // function oldSearch() { ... }
   
   // NEW IMPLEMENTATION - Linear search algorithm
   function improvedSearch() { ... }
   ```
3. **Add comments** explaining new approaches and why they're better
4. **Preserve code history** - Don't delete, comment out with reason
5. **Keep changes minimal** - Solve the problem simply, don't over-engineer

### Development Workflow (7-Step Process) - APPLIES TO ALL WORK
1. **User requests information** - User asks about a feature or topic
2. **Discuss approach** - Present analysis and proposed solution
3. **Wait for approval** - User explicitly asks to code
4. **Check existing code** - Review current implementation first
5. **Code with comments** - Write clear, commented code
   - Add comments explaining the implementation
   - Verify completeness before proceeding
6. **Test with user** - User verifies functionality works
7. **Commit when asked** - Only commit after explicit user request
   - No AI references in commit messages

### Debugging Approach (7-Step Process)
1. **Identify the problem** - Get clear reproduction steps from user
2. **Read and understand** - Study current implementation thoroughly
3. **Analyze root cause** - Trace execution flow to find issue origin
4. **Discuss with user** - Present findings and proposed solution
5. **Code minimal fix** - Keep changes simple and focused
6. **Test with user** - Have user verify fix in Chrome
7. **Commit and continue** - Only commit after user approval

### Code Understanding Requirements
- **Read existing code first** - Understand before changing
- **Trace the flow** - Follow data from start to end
- **Use existing functions** - Don't recreate existing functionality
- **Respect architecture** - Maintain established patterns
- **Keep it simple** - Minimal changes that solve the problem

### Code Implementation Verification ⚠️
After writing ANY code, ALWAYS verify:
1. **Complete Implementations**:
   - All functions have bodies (no empty functions)
   - All imports exist and are exported from source
   - No placeholder or TODO implementations
   - All code paths return appropriate values

2. **Import/Export Verification**:
   ```javascript
   // WRONG: Importing non-existent function
   import { safeStorageGet } from './chrome-api.js' // Function doesn't exist!
   
   // RIGHT: Verify function exists before importing
   import { storage } from './chrome-api.js' // storage.get() exists
   ```

3. **Common Mistakes to Avoid**:
   - Creating functions without implementations
   - Importing non-existent functions
   - Forgetting to export created functions
   - Using functions before they're defined
   - Circular import dependencies

## 🛡️ DOM Safety & Security

### DOM Safety
- **Element Existence**: Always check before using
  ```javascript
  if (element && element.nodeType === Node.ELEMENT_NODE) {
    // Safe to use element
  }
  ```
- **Use Utilities**: Use `dom-safety.js` for all DOM operations
- **Node Types**: Handle both Element and Text nodes appropriately
- **Batch Operations**: Use DocumentFragment to minimize reflows
- **Scroll Position**: Always account for `window.scrollX/Y` in positioning

### Security Requirements
- **No innerHTML**: Never use innerHTML (XSS risk)
- **Sanitization**: Use `text-sanitizer.js` for all user input
- **CSP Compliance**: Follow Content Security Policy in manifest
- **Safe DOM Construction**: Use programmatic DOM creation
  ```javascript
  // WRONG
  element.innerHTML = '<div>' + userInput + '</div>'
  
  // RIGHT
  const div = document.createElement('div')
  div.textContent = userInput
  element.appendChild(div)
  ```

## 🧪 Testing Requirements

### Mandatory Testing Before Changes
1. **Multi-Site Testing**: Test on at least 3 different websites:
   - News site (complex DOM)
   - Blog (simple structure)
   - Documentation (nested content)

2. **Viewport Testing**:
   - Different screen sizes
   - With page scroll
   - Zoom levels (90%, 100%, 110%)

3. **Functionality Testing**:
   - Highlight creation and persistence
   - Color changes
   - Copy functionality (multi-element)
   - Delete operations
   - Page reload restoration

4. **Error Scenario Testing**:
   - Storage full/corrupted
   - Extension context invalid
   - Network offline
   - Rapid user actions

### Performance Testing
- **Large Pages**: Test with 1000+ paragraphs
- **Many Highlights**: Create 100+ highlights
- **Memory Usage**: Check for leaks after extended use
- **Responsiveness**: UI should respond within 100ms

## 🎨 UI Consistency Rules

### Theme Requirements
- **Dark Glassmorphic Theme**: All UI components must match
  ```css
  background: rgba(1, 22, 39, 0.75);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  ```
- **Icon Visibility**: White stroke color for dark backgrounds
- **Consistent Spacing**: 8px grid system
- **Animation**: Smooth transitions (200ms ease)

### Positioning Rules
- **Account for Scroll**: Always add `window.scrollX/Y`
- **Viewport Bounds**: Keep UI elements within viewport
- **Z-Index Management**: Use consistent z-index scale
- **Mobile Considerations**: Touch-friendly sizes (min 44px)

## 🚀 Performance Rules

### DOM Operations
1. **Batch Changes**: Use DocumentFragment for multiple operations
2. **RequestAnimationFrame**: For visual updates
3. **Debounce Events**: User input (300ms), scroll (100ms)
4. **Cache Selectors**: Store frequently used queries

### Storage Operations
1. **Batch Writes**: Group storage updates (1-second debounce)
2. **Dirty Tracking**: Only save changed data
3. **Size Limits**: Keep highlights under 5MB total
4. **Cleanup**: Remove orphaned highlights

### Memory Management
1. **Event Cleanup**: Always remove listeners
   ```javascript
   // In constructor
   this.handleClick = this.handleClick.bind(this)
   
   // In destroy()
   element.removeEventListener('click', this.handleClick)
   ```
2. **WeakMap for DOM**: Auto garbage collection
3. **Clear References**: Null out DOM references
4. **Unsubscribe**: Clean up Redux subscriptions

## 📝 Git Commit Rules

### CRITICAL: Never Auto-Commit
1. **ALWAYS ask permission**: "Should I commit these changes?"
2. **Test first**: User must confirm fix works
3. **Descriptive messages**: Explain what and why
4. **Small commits**: One fix per commit
5. **No generated commits**: Until explicitly requested

### Commit Message Format
```
Fix: [Component] Brief description

- Detailed change 1
- Detailed change 2

Fixes: [Issue description]
```

## 🔍 Code Review Checklist

Before considering any task complete:
- [ ] All functions have complete implementations
- [ ] All imports resolve correctly
- [ ] Error handling for external APIs
- [ ] DOM safety checks in place
- [ ] Theme consistency maintained
- [ ] Performance considerations addressed
- [ ] Memory leaks prevented
- [ ] Tested on multiple sites
- [ ] User has verified the fix
- [ ] Code follows modular architecture

## 🚨 Common Pitfalls to Avoid

1. **Missing Implementations**:
   ```javascript
   // WRONG: Function without body
   export function safeStorageGet(keys) {
     // TODO: implement
   }
   
   // RIGHT: Complete implementation
   export async function safeStorageGet(keys) {
     try {
       return await chrome.storage.local.get(keys)
     } catch (error) {
       console.error('Storage get failed:', error)
       return {}
     }
   }
   ```

2. **Context Invalidation**:
   ```javascript
   // WRONG: Direct Chrome API call
   chrome.storage.local.set(data)
   
   // RIGHT: Check context first
   if (chrome.runtime && chrome.runtime.id) {
     chrome.storage.local.set(data)
   }
   ```

3. **Theme Inconsistency**:
   ```javascript
   // WRONG: White background
   element.style.background = 'white'
   
   // RIGHT: Dark glassmorphic
   element.style.background = 'rgba(1, 22, 39, 0.75)'
   ```

## 🎯 Remember

- **NO over-engineering**: Keep it simple
- **Redux only**: No event-driven patterns
- **Ship in 3 days**: Not 3 months
- **Test everything**: With real users
- **Verify implementations**: After every change
- **Ask before committing**: Always

---

These principles ensure code quality, maintainability, and a consistent user experience. Hooks enforce these rules automatically to prevent common issues.