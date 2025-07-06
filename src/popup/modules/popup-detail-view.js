/**
 * Popup Detail View
 * Renders and manages the detail view for individual highlights
 */

import { state } from './popup-state.js'
import { showListView } from './popup-view-manager.js'
import { COLORS } from '../../theme/theme-constants.js'
import { getRelativeTime } from './popup-utils.js'
import { handleCopyHighlight, handleDeleteHighlight } from './popup-clear.js'

// Maximum characters for notes
const MAX_NOTE_LENGTH = 500

// Get highlight color
function getHighlightColor(colorName) {
  return COLORS.highlights[colorName] || COLORS.highlights.yellow
}

// Save note to storage
async function saveNote(highlightId, noteText) {
  try {
    // Find the highlight in state to get its URL
    const highlight = state.highlights.find(h => h.id === highlightId)
    if (!highlight || !highlight.url) {
      console.error('[DetailView] Highlight not found or missing URL')
      return
    }
    
    // Get highlights for this URL
    const result = await chrome.storage.local.get([highlight.url])
    const urlHighlights = result[highlight.url] || []
    
    // Find and update highlight
    const highlightIndex = urlHighlights.findIndex(h => h.id === highlightId)
    if (highlightIndex !== -1) {
      urlHighlights[highlightIndex].note = noteText.trim()
      
      // Save back to storage
      await chrome.storage.local.set({ [highlight.url]: urlHighlights })
      
      // Update state
      highlight.note = noteText.trim()
      
      console.log('[DetailView] Note saved for highlight:', highlightId)
    }
  } catch (error) {
    console.error('[DetailView] Error saving note:', error)
  }
}

// Change highlight color
async function changeHighlightColor(highlightId, newColor) {
  try {
    // Find the highlight in state to get its URL
    const highlight = state.highlights.find(h => h.id === highlightId)
    if (!highlight || !highlight.url) {
      console.error('[DetailView] Highlight not found or missing URL')
      return
    }
    
    // Get highlights for this URL
    const result = await chrome.storage.local.get([highlight.url])
    const urlHighlights = result[highlight.url] || []
    
    const highlightIndex = urlHighlights.findIndex(h => h.id === highlightId)
    if (highlightIndex !== -1) {
      urlHighlights[highlightIndex].color = newColor
      await chrome.storage.local.set({ [highlight.url]: urlHighlights })
      
      // Update state
      highlight.color = newColor
      
      // Update color on the webpage
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      await chrome.tabs.sendMessage(tab.id, {
        action: 'changeHighlightColor',
        highlightId: highlightId,
        newColor: newColor
      })
      
      // Re-render detail view to show new color
      renderDetailView(highlight)
    }
  } catch (error) {
    console.error('[DetailView] Error changing color:', error)
  }
}

// Render the detail view
export function renderDetailView(highlight) {
  const container = document.getElementById('detailViewContainer')
  if (!container) return
  
  container.innerHTML = `
    <div class="detail-header">
      <button class="back-button" id="backToListBtn">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>Back</span>
      </button>
    </div>
    
    <div class="detail-content">
      <!-- Highlight text -->
      <div class="detail-highlight-text" style="border-left: 4px solid ${getHighlightColor(highlight.color)};">
        ${highlight.text}
      </div>
      
      <!-- Metadata -->
      <div class="detail-metadata">
        <span class="detail-timestamp">${getRelativeTime(highlight.timestamp)}</span>
        <span class="detail-separator">•</span>
        <span class="detail-url" title="${highlight.url}">${new URL(highlight.url).hostname}</span>
      </div>
      
      <!-- Note section -->
      <div class="detail-note-section">
        <label for="noteTextarea" class="detail-note-label">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M14 2v6h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <line x1="10" y1="9" x2="8" y2="9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Note
        </label>
        <textarea 
          id="noteTextarea" 
          class="detail-note-textarea" 
          placeholder="Add a note about this highlight..."
          maxlength="${MAX_NOTE_LENGTH}">${highlight.note || ''}</textarea>
        <div class="detail-note-footer">
          <span class="detail-note-counter">${(highlight.note || '').length}/${MAX_NOTE_LENGTH}</span>
          <button class="detail-save-note-btn" id="saveNoteBtn" style="display: none;">Save</button>
        </div>
      </div>
      
      <!-- Color picker -->
      <div class="detail-color-section">
        <label class="detail-color-label">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Color
        </label>
        <div class="detail-color-picker">
          ${Object.entries(COLORS.highlights).map(([colorName, colorValue]) => `
            <button class="detail-color-btn ${highlight.color === colorName ? 'active' : ''}" 
                    data-color="${colorName}"
                    style="background-color: ${colorValue};"
                    title="${colorName}">
            </button>
          `).join('')}
        </div>
      </div>
      
      <!-- Actions -->
      <div class="detail-actions">
        <button class="detail-action-btn" id="copyHighlightBtn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" stroke-width="2"/>
          </svg>
          Copy Text
        </button>
        <button class="detail-action-btn delete" id="deleteHighlightBtn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Delete
        </button>
      </div>
    </div>
  `
  
  // Attach event listeners
  attachDetailViewListeners(highlight)
}

// Attach event listeners for detail view
function attachDetailViewListeners(highlight) {
  // Back button
  const backBtn = document.getElementById('backToListBtn')
  if (backBtn) {
    backBtn.addEventListener('click', showListView)
  }
  
  // Note textarea
  const noteTextarea = document.getElementById('noteTextarea')
  const saveNoteBtn = document.getElementById('saveNoteBtn')
  const noteCounter = document.querySelector('.detail-note-counter')
  
  if (noteTextarea) {
    const originalNote = highlight.note || ''
    
    noteTextarea.addEventListener('input', (e) => {
      // Update character counter
      const length = e.target.value.length
      if (noteCounter) {
        noteCounter.textContent = `${length}/${MAX_NOTE_LENGTH}`
      }
      
      // Show/hide save button
      if (saveNoteBtn) {
        saveNoteBtn.style.display = e.target.value !== originalNote ? 'block' : 'none'
      }
    })
    
    // Save note button
    if (saveNoteBtn) {
      saveNoteBtn.addEventListener('click', async () => {
        await saveNote(highlight.id, noteTextarea.value)
        saveNoteBtn.style.display = 'none'
        // Update the original note reference
        highlight.note = noteTextarea.value
      })
    }
    
    // Auto-save on blur
    noteTextarea.addEventListener('blur', async () => {
      if (noteTextarea.value !== originalNote) {
        await saveNote(highlight.id, noteTextarea.value)
        if (saveNoteBtn) saveNoteBtn.style.display = 'none'
        highlight.note = noteTextarea.value
      }
    })
  }
  
  // Color picker
  document.querySelectorAll('.detail-color-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const newColor = e.target.dataset.color
      if (newColor !== highlight.color) {
        // Remove active class from all buttons
        document.querySelectorAll('.detail-color-btn').forEach(b => b.classList.remove('active'))
        // Add active class to clicked button
        e.target.classList.add('active')
        // Change color
        await changeHighlightColor(highlight.id, newColor)
      }
    })
  })
  
  // Copy button
  const copyBtn = document.getElementById('copyHighlightBtn')
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      handleCopyHighlight(highlight.text)
    })
  }
  
  // Delete button
  const deleteBtn = document.getElementById('deleteHighlightBtn')
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      await handleDeleteHighlight([highlight.id], state)
      // Go back to list view after deletion
      showListView()
    })
  }
}