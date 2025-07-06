/**
 * Popup Export Functionality
 * Functions for exporting highlights in different formats
 */

// Handle export functionality - shows export dialog
export async function handleExport(state) {
  // DISCUSSED: Show export dialog with format and scope options
  // APPROVED: User wants export dialog UI with JSON/Text and page filter
  
  // Check if we have any highlights to export
  const hasPageHighlights = state.pageHighlightsList.length > 0
  const hasAllHighlights = state.allHighlightsList.length > 0
  
  if (!hasPageHighlights && !hasAllHighlights) {
    alert('No highlights to export')
    return
  }
  
  // Show export options dialog
  showExportDialog(state, hasPageHighlights, hasAllHighlights)
}

// Show export format and scope dialog
function showExportDialog(state, hasPageHighlights, hasAllHighlights) {
  // Create dialog overlay
  const overlay = document.createElement('div')
  overlay.className = 'export-dialog-overlay'
  
  const dialog = document.createElement('div')
  dialog.className = 'export-dialog'
  
  // Determine available scope options
  const currentPageCount = state.pageHighlightsList.length
  const allPagesCount = state.allHighlightsList.length
  
  dialog.innerHTML = `
    <h3>Export Highlights</h3>
    <p>Choose export format and scope</p>
    
    <div class="export-options">
      <h4 style="margin: 0 0 8px 0; font-size: 14px; color: var(--color-text-secondary);">Format:</h4>
      <label class="export-option">
        <input type="radio" name="format" value="json" checked>
        <span>JSON (Full data with metadata)</span>
      </label>
      <label class="export-option">
        <input type="radio" name="format" value="text">
        <span>Plain Text (Simple text list)</span>
      </label>
    </div>
    
    <div class="export-scope">
      <h4 style="margin: 0 0 8px 0; font-size: 14px; color: var(--color-text-secondary);">Scope:</h4>
      <label class="export-option">
        <input type="radio" name="scope" value="page" ${hasPageHighlights ? 'checked' : 'disabled'}>
        <span>Current page only (${currentPageCount} highlight${currentPageCount !== 1 ? 's' : ''})</span>
      </label>
      <label class="export-option">
        <input type="radio" name="scope" value="all" ${!hasPageHighlights ? 'checked' : ''}>
        <span>All pages (${allPagesCount} highlight${allPagesCount !== 1 ? 's' : ''})</span>
      </label>
    </div>
    
    <div class="export-actions">
      <button class="export-cancel">Cancel</button>
      <button class="export-confirm">Export</button>
    </div>
  `
  
  overlay.appendChild(dialog)
  document.body.appendChild(overlay)
  
  // Handle dialog actions
  dialog.querySelector('.export-cancel').addEventListener('click', () => {
    overlay.remove()
  })
  
  dialog.querySelector('.export-confirm').addEventListener('click', () => {
    const format = dialog.querySelector('input[name="format"]:checked').value
    const scope = dialog.querySelector('input[name="scope"]:checked').value
    overlay.remove()
    
    // Get highlights based on scope
    const highlightsToExport = scope === 'page' ? 
      state.pageHighlightsList : state.allHighlightsList
    
    // Export based on format
    if (format === 'json') {
      exportAsJSON(highlightsToExport, scope, state)
    } else {
      exportAsText(highlightsToExport, scope, state)
    }
  })
  
  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove()
    }
  })
}

// Export as JSON with full metadata
function exportAsJSON(highlights, scope, state) {
  const data = {
    exportDate: new Date().toISOString(),
    exportScope: scope === 'page' ? 'Current page' : 'All pages',
    source: scope === 'page' ? state.currentTab.url : 'Multiple pages',
    totalHighlights: highlights.length,
    highlights: highlights.map(h => ({
      text: h.text,
      url: h.url,
      color: h.color,
      timestamp: h.timestamp,
      dateCreated: new Date(h.timestamp).toLocaleString()
    }))
  }
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const dateStr = new Date().toISOString().split('T')[0]
  const scopeStr = scope === 'page' ? 'current-page' : 'all-pages'
  
  chrome.downloads.download({
    url: url,
    filename: `web-highlights-${scopeStr}-${dateStr}.json`,
    saveAs: true
  })
}

// Export as plain text - human readable format
function exportAsText(highlights, scope, state) {
  let textContent = `Web Highlights Export\n`
  textContent += `${'='.repeat(50)}\n`
  textContent += `Export Date: ${new Date().toLocaleString()}\n`
  textContent += `Total Highlights: ${highlights.length}\n`
  textContent += `Scope: ${scope === 'page' ? state.currentTab.url : 'All pages'}\n`
  textContent += `${'='.repeat(50)}\n\n`
  
  // Group highlights by URL for better organization
  const highlightsByUrl = {}
  highlights.forEach(h => {
    const url = h.url || 'Unknown URL'
    if (!highlightsByUrl[url]) {
      highlightsByUrl[url] = []
    }
    highlightsByUrl[url].push(h)
  })
  
  // Format highlights by URL
  Object.entries(highlightsByUrl).forEach(([url, urlHighlights]) => {
    textContent += `📍 Page: ${url}\n`
    textContent += `${'-'.repeat(40)}\n\n`
    
    urlHighlights.forEach((h, index) => {
      const date = new Date(h.timestamp).toLocaleDateString()
      const time = new Date(h.timestamp).toLocaleTimeString()
      
      textContent += `${index + 1}. [${h.color.toUpperCase()}] - ${date} at ${time}\n`
      textContent += `   "${h.text}"\n\n`
    })
    
    textContent += `\n`
  })
  
  textContent += `${'='.repeat(50)}\n`
  textContent += `End of Export\n`
  
  const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const dateStr = new Date().toISOString().split('T')[0]
  const scopeStr = scope === 'page' ? 'current-page' : 'all-pages'
  
  chrome.downloads.download({
    url: url,
    filename: `web-highlights-${scopeStr}-${dateStr}.txt`,
    saveAs: true
  })
}