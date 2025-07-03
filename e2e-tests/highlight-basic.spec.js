import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testPagePath = `file://${path.join(__dirname, 'fixtures', 'test-pages.html')}`;

test.describe('Basic Highlight Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to test page
    await page.goto(testPagePath);
    
    // Wait for extension to load
    await page.waitForTimeout(1000);
  });

  test('should show highlight button when text is selected', async ({ page }) => {
    // Select text in simple paragraph
    await page.evaluate(() => {
      const paragraph = document.querySelector('#simple-text p');
      const range = document.createRange();
      range.selectNodeContents(paragraph);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    });

    // Trigger mouseup event
    await page.mouse.up();
    
    // Check if highlight button appears
    const highlightButton = await page.waitForSelector('#web-highlighter-button-container', {
      state: 'visible',
      timeout: 5000
    });
    
    expect(highlightButton).toBeTruthy();
  });

  test('should create highlight when button is clicked', async ({ page }) => {
    // Select specific text
    await page.evaluate(() => {
      const paragraph = document.querySelector('#simple-text p');
      const textNode = paragraph.firstChild;
      const range = document.createRange();
      range.setStart(textNode, 10);
      range.setEnd(textNode, 30); // Select "simple paragraph wit"
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    });

    // Trigger selection
    await page.mouse.up();
    
    // Click highlight button
    await page.click('#web-highlighter-button-container button');
    
    // Check if highlight was created
    const highlight = await page.waitForSelector('.web-highlighter-highlight', {
      timeout: 5000
    });
    
    expect(highlight).toBeTruthy();
    
    // Verify highlighted text
    const highlightedText = await highlight.textContent();
    expect(highlightedText).toBe('simple paragraph wit');
  });

  test('should persist highlights after page reload', async ({ page }) => {
    // Create a highlight
    await page.evaluate(() => {
      const paragraph = document.querySelector('#simple-text p');
      const textNode = paragraph.firstChild;
      const range = document.createRange();
      range.setStart(textNode, 10);
      range.setEnd(textNode, 30);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    });

    await page.mouse.up();
    await page.click('#web-highlighter-button-container button');
    
    // Wait for highlight to be created
    await page.waitForSelector('.web-highlighter-highlight');
    
    // Reload the page
    await page.reload();
    await page.waitForTimeout(1000);
    
    // Check if highlight is restored
    const restoredHighlight = await page.waitForSelector('.web-highlighter-highlight', {
      timeout: 5000
    });
    
    expect(restoredHighlight).toBeTruthy();
    
    const highlightedText = await restoredHighlight.textContent();
    expect(highlightedText).toBe('simple paragraph wit');
  });

  test('should handle text with special characters (colon bug)', async ({ page }) => {
    // Select text with colon
    await page.evaluate(() => {
      const paragraph = document.querySelector('#special-chars p');
      const textNode = paragraph.firstChild;
      const range = document.createRange();
      range.setStart(textNode, 0);
      range.setEnd(textNode, 12); // Select "Text: Select"
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    });

    await page.mouse.up();
    await page.click('#web-highlighter-button-container button');
    
    // Wait for highlight
    await page.waitForSelector('.web-highlighter-highlight');
    
    // Reload page
    await page.reload();
    await page.waitForTimeout(1000);
    
    // Check if full text is restored (not just "Text: Sel")
    const restoredHighlight = await page.waitForSelector('.web-highlighter-highlight');
    const highlightedText = await restoredHighlight.textContent();
    
    expect(highlightedText).toBe('Text: Select');
  });

  test('should show mini toolbar when clicking on highlight', async ({ page }) => {
    // Create a highlight first
    await page.evaluate(() => {
      const paragraph = document.querySelector('#simple-text p');
      const textNode = paragraph.firstChild;
      const range = document.createRange();
      range.setStart(textNode, 10);
      range.setEnd(textNode, 30);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    });

    await page.mouse.up();
    await page.click('#web-highlighter-button-container button');
    
    const highlight = await page.waitForSelector('.web-highlighter-highlight');
    
    // Click on the highlight
    await highlight.click();
    
    // Check if mini toolbar appears
    const miniToolbar = await page.waitForSelector('#web-highlighter-toolbar', {
      state: 'visible',
      timeout: 5000
    });
    
    expect(miniToolbar).toBeTruthy();
  });

  test('should delete highlight when delete button is clicked', async ({ page }) => {
    // Create a highlight
    await page.evaluate(() => {
      const paragraph = document.querySelector('#simple-text p');
      const textNode = paragraph.firstChild;
      const range = document.createRange();
      range.setStart(textNode, 10);
      range.setEnd(textNode, 30);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    });

    await page.mouse.up();
    await page.click('#web-highlighter-button-container button');
    
    const highlight = await page.waitForSelector('.web-highlighter-highlight');
    
    // Click on highlight to show toolbar
    await highlight.click();
    await page.waitForSelector('#web-highlighter-toolbar');
    
    // Click delete button
    await page.click('[data-action="remove"]');
    
    // Verify highlight is removed
    await expect(page.locator('.web-highlighter-highlight')).toHaveCount(0);
  });
});