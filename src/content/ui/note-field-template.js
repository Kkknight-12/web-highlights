/**
 * Note Field Template
 * Lightweight, expandable note input for mini toolbar
 */

import { sanitizeText } from '../../utils/text-sanitizer.js'

// Character limit for notes
export const NOTE_CHAR_LIMIT = 500

/**
 * Create a note field container
 * @param {string} highlightId - ID of the highlight
 * @param {string} existingNote - Existing note text (if any)
 * @returns {HTMLElement} Note field container
 */
export function createNoteField(highlightId, existingNote = '', onSave = null, onCancel = null) {
  const container = document.createElement('div')
  container.className = 'highlighter-ui-component note-field-container'
  container.setAttribute('data-highlight-id', highlightId)
  
  // Create textarea
  const textarea = document.createElement('textarea')
  textarea.className = 'note-field-input'
  textarea.placeholder = 'Add a note...'
  textarea.maxLength = NOTE_CHAR_LIMIT
  textarea.value = existingNote
  textarea.setAttribute('rows', '3')
  
  // Create character counter
  const counter = document.createElement('div')
  counter.className = 'note-field-counter'
  updateCounter(counter, existingNote.length)
  
  // Create button container
  const buttonContainer = document.createElement('div')
  buttonContainer.className = 'note-field-buttons'
  
  // Save button
  const saveBtn = document.createElement('button')
  saveBtn.className = 'note-field-btn note-field-save'
  saveBtn.textContent = 'Save'
  saveBtn.setAttribute('data-action', 'save-note')
  
  // Cancel button
  const cancelBtn = document.createElement('button')
  cancelBtn.className = 'note-field-btn note-field-cancel'
  cancelBtn.textContent = 'Cancel'
  cancelBtn.setAttribute('data-action', 'cancel-note')
  
  // Update counter on input
  textarea.addEventListener('input', () => {
    updateCounter(counter, textarea.value.length)
  })
  
  // Stop propagation for container clicks to prevent toolbar from hiding
  // BUT allow save-note and cancel-note button clicks to bubble up
  container.addEventListener('click', (e) => {
    console.log('[NoteField] Container click, target:', e.target)
    const button = e.target.closest('button')
    if (button) {
      const action = button.dataset.action
      console.log('[NoteField] Button found with action:', action)
      if (action === 'save-note' || action === 'cancel-note') {
        console.log('[NoteField] Allowing', action, 'to bubble up')
        // Let these button clicks bubble up to the toolbar
        return
      }
    }
    console.log('[NoteField] Stopping propagation for non-button click')
    e.stopPropagation()
  })
  
  // Prevent textarea from losing focus on toolbar drag
  textarea.addEventListener('mousedown', (e) => {
    e.stopPropagation()
  })
  
  // Prevent ALL mousedown events on the container from reaching elements below
  container.addEventListener('mousedown', (e) => {
    console.log('[NoteField] Container mousedown, stopping propagation')
    e.stopPropagation()
  }, true) // Use capture phase
  
  // Add direct click handlers to buttons
  saveBtn.addEventListener('click', (e) => {
    console.log('[NoteField] Save button direct click!')
    e.stopPropagation()
    e.preventDefault()
    if (onSave) {
      const noteText = sanitizeText(textarea.value.trim())
      onSave(noteText)
    }
  })
  
  cancelBtn.addEventListener('click', (e) => {
    console.log('[NoteField] Cancel button direct click!')
    e.stopPropagation()
    e.preventDefault()
    if (onCancel) {
      onCancel()
    }
  })
  
  // Add mousedown handler to see if that fires
  saveBtn.addEventListener('mousedown', (e) => {
    console.log('[NoteField] Save button mousedown!')
    e.stopPropagation()
  })
  
  cancelBtn.addEventListener('mousedown', (e) => {
    console.log('[NoteField] Cancel button mousedown!')
    e.stopPropagation()
  })
  
  // Add logs to button container
  buttonContainer.addEventListener('click', (e) => {
    console.log('[NoteField] Button container click, target:', e.target)
  })
  
  // Prevent mousedown from reaching elements below
  buttonContainer.addEventListener('mousedown', (e) => {
    console.log('[NoteField] Button container mousedown, stopping propagation')
    e.stopPropagation()
  }, true) // Use capture phase to catch it early
  
  // Assemble components
  buttonContainer.appendChild(saveBtn)
  buttonContainer.appendChild(cancelBtn)
  
  container.appendChild(textarea)
  container.appendChild(counter)
  container.appendChild(buttonContainer)
  
  return container
}

/**
 * Update character counter
 * @param {HTMLElement} counter - Counter element
 * @param {number} length - Current text length
 */
function updateCounter(counter, length) {
  counter.textContent = `${length}/${NOTE_CHAR_LIMIT}`
  
  // Change color when approaching limit
  if (length >= NOTE_CHAR_LIMIT * 0.9) {
    counter.classList.add('warning')
  } else {
    counter.classList.remove('warning')
  }
}

/**
 * Get note text from field
 * @param {HTMLElement} container - Note field container
 * @returns {string} Sanitized note text
 */
export function getNoteText(container) {
  const textarea = container.querySelector('.note-field-input')
  return textarea ? sanitizeText(textarea.value.trim()) : ''
}

/**
 * Focus the note field
 * @param {HTMLElement} container - Note field container
 */
export function focusNoteField(container) {
  const textarea = container.querySelector('.note-field-input')
  if (textarea) {
    // Use setTimeout to ensure focus after any transitions
    setTimeout(() => {
      textarea.focus()
      // Move cursor to end
      textarea.setSelectionRange(textarea.value.length, textarea.value.length)
    }, 50)
  }
}