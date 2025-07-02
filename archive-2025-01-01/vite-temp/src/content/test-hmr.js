// Test component to verify HMR is working
import { store } from '../store/store'

// Create a floating test widget
const widget = document.createElement('div')
widget.id = 'hmr-test-widget'
widget.innerHTML = `
  <div style="
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #1e293b;
    color: white;
    padding: 20px;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    z-index: 2147483647;
    font-family: system-ui;
  ">
    <h3 style="margin: 0 0 10px 0; font-size: 16px;">🔥 HMR Test</h3>
    <p style="margin: 0 0 10px 0; font-size: 14px;">
      Clicks: <span id="click-count">0</span>
    </p>
    <button id="test-button" style="
      background: #3b82f6;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
    ">Click Me!</button>
    <p style="margin: 10px 0 0 0; font-size: 12px; opacity: 0.7;">
      Change this text in test-hmr.js
    </p>
  </div>
`

// Add to page
document.body.appendChild(widget)

// Click counter
let clickCount = 0
const countSpan = widget.querySelector('#click-count')
const button = widget.querySelector('#test-button')

button.addEventListener('click', () => {
  clickCount++
  countSpan.textContent = clickCount
  
  // Also test Redux
  console.log('[HMR Test] Button clicked!', clickCount)
  console.log('[HMR Test] Redux state:', store.getState())
})

// Test HMR
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    console.log('[HMR Test] Module updated!')
  })
}

console.log('[HMR Test] Widget loaded! Try changing this message...')