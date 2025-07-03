# Testing Guide - Playwright E2E Tests

## Getting Started with Playwright

### 1. Install Dependencies
```bash
npm install --save-dev @playwright/test
npx playwright install chromium
```

### 2. Run Tests
```bash
# Run all tests
npx playwright test

# Run tests in UI mode (recommended for development)
npx playwright test --ui

# Run specific test file
npx playwright test e2e-tests/highlight-basic.spec.js

# Run with debugging
npx playwright test --debug
```

### 3. Test File Structure
```
e2e-tests/
├── fixtures/
│   └── test-pages.html    # Test HTML pages
├── highlight-basic.spec.js
├── highlight-lists.spec.js
└── highlight-persistence.spec.js
```

### 4. Basic Test Example
```javascript
// e2e-tests/highlight-basic.spec.js
import { test, expect } from '@playwright/test';

test('should create highlight when button is clicked', async ({ page }) => {
  // Load test page
  await page.goto('file:///path/to/test-page.html');
  
  // Select text
  await page.evaluate(() => {
    const range = document.createRange();
    range.selectNodeContents(document.querySelector('p'));
    window.getSelection().addRange(range);
  });
  
  // Click highlight button
  await page.click('#web-highlighter-button-container button');
  
  // Verify highlight was created
  const highlight = await page.waitForSelector('.web-highlighter-highlight');
  expect(highlight).toBeTruthy();
});
```

## Why Playwright for Chrome Extensions?

- **Real Browser Testing**: Tests run in actual Chrome with your extension loaded
- **Catches Real Bugs**: Found issues that unit tests missed (text node splitting, DOM quirks)
- **User-Centric**: Tests actual user interactions, not mocked behavior
- **Cross-Page Testing**: Can test persistence across reloads and navigation
- **Visual Debugging**: See exactly what happens with UI mode and traces

## Test Categories

### 1. Basic Functionality Tests
```javascript
test('should show highlight button when text is selected', async ({ page }) => {
  // Select text
  await page.evaluate(() => {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(document.querySelector('p'));
    selection.addRange(range);
  });
  
  // Button should appear
  await expect(page.locator('#web-highlighter-button-container')).toBeVisible();
});
```

### 2. Persistence Tests
```javascript
test('should restore highlights after page reload', async ({ page }) => {
  // Create highlight
  await createHighlight(page, 'Test text');
  
  // Reload
  await page.reload();
  
  // Verify restoration
  const highlight = await page.locator('.web-highlighter-highlight');
  await expect(highlight).toHaveText('Test text');
});
```

### 3. Edge Case Tests
```javascript
test('should handle text with special characters (colon bug)', async ({ page }) => {
  // This test would have caught our "Text: Select" → "Text: Sel" bug!
  await createHighlight(page, 'Text: Select');
  await page.reload();
  
  const highlight = await page.locator('.web-highlighter-highlight');
  await expect(highlight).toHaveText('Text: Select'); // Not "Text: Sel"
});

test('should create separate highlights for list items', async ({ page }) => {
  // Select across multiple list items
  await page.evaluate(() => {
    const range = document.createRange();
    range.setStart(document.querySelector('li:first-child').firstChild, 0);
    range.setEnd(document.querySelector('li:nth-child(2)').firstChild, 10);
    window.getSelection().addRange(range);
  });
  
  await page.click('#web-highlighter-button-container button');
  
  // Should create 2 separate highlights
  await expect(page.locator('.web-highlighter-highlight')).toHaveCount(2);
});
```

## Writing Effective E2E Tests

### 1. Use Page Helpers
```javascript
// helpers.js
export async function createHighlight(page, text) {
  await page.evaluate((text) => {
    // Find and select the text
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT
    );
    
    let node;
    while (node = walker.nextNode()) {
      if (node.textContent.includes(text)) {
        const range = document.createRange();
        const start = node.textContent.indexOf(text);
        range.setStart(node, start);
        range.setEnd(node, start + text.length);
        window.getSelection().addRange(range);
        break;
      }
    }
  }, text);
  
  await page.mouse.up();
  await page.click('#web-highlighter-button-container button');
}
```

### 2. Test Real Scenarios
```javascript
test.describe('Real-world usage', () => {
  test('GitHub README workflow', async ({ page }) => {
    await page.goto('https://github.com/some/repo');
    // Test highlighting in actual GitHub pages
  });
  
  test('Wikipedia article workflow', async ({ page }) => {
    await page.goto('https://en.wikipedia.org/wiki/Test');
    // Test with complex nested content
  });
});
```

### 3. Debug Failed Tests
```bash
# Run with UI mode to see what's happening
npx playwright test --ui

# Generate trace for failed tests
npx playwright test --trace on

# Open last test trace
npx playwright show-trace
```

## Common Patterns

### Wait for Extension to Load
```javascript
test.beforeEach(async ({ page }) => {
  await page.goto(testPageUrl);
  // Give extension time to initialize
  await page.waitForTimeout(1000);
  // Or wait for specific element
  await page.waitForFunction(() => window.highlightEngine !== undefined);
});
```

### Test Chrome Storage
```javascript
test('should save highlights to Chrome storage', async ({ page }) => {
  await createHighlight(page, 'Test');
  
  // Check Chrome storage
  const storage = await page.evaluate(() => {
    return new Promise(resolve => {
      chrome.storage.local.get(['highlights'], result => {
        resolve(result.highlights);
      });
    });
  });
  
  expect(storage).toHaveLength(1);
});
```

### Test Keyboard Shortcuts
```javascript
test('should highlight with Ctrl+Shift+H', async ({ page }) => {
  // Select text first
  await selectText(page, 'Test text');
  
  // Press shortcut
  await page.keyboard.press('Control+Shift+H');
  
  // Verify highlight created
  await expect(page.locator('.web-highlighter-highlight')).toBeVisible();
});
```

## CI/CD Integration

Add to `.github/workflows/test.yml`:
```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - run: npx playwright install chromium
      - run: npx playwright test
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Start Testing

1. **Build the extension**: `npm run build`
2. **Run tests in UI mode**: `npx playwright test --ui`
3. **Pick a test to run** and see it in action
4. **Write your own test** for a bug you fixed

## Need Help?

- Playwright Docs: https://playwright.dev/
- Chrome Extension Testing: https://playwright.dev/docs/chrome-extensions
- Debug with `--debug` flag or UI mode