/**
 * Virtual Scroller for Popup Highlights List
 * Implements virtual scrolling to handle large numbers of highlights efficiently
 */

export class VirtualScroller {
  constructor(container, itemHeight = 80, buffer = 5) {
    this.container = container
    this.itemHeight = itemHeight
    this.buffer = buffer // Number of items to render outside visible area
    this.items = []
    this.scrollTop = 0
    this.visibleStart = 0
    this.visibleEnd = 0
    
    // Create scroll container
    this.scrollContainer = document.createElement('div')
    this.scrollContainer.className = 'virtual-scroll-container'
    this.scrollContainer.style.height = '100%'
    this.scrollContainer.style.overflow = 'auto'
    this.scrollContainer.style.position = 'relative'
    
    // Create viewport
    this.viewport = document.createElement('div')
    this.viewport.className = 'virtual-viewport'
    this.viewport.style.position = 'relative'
    
    // Create spacer for scrollbar
    this.spacer = document.createElement('div')
    this.spacer.className = 'virtual-spacer'
    this.spacer.style.position = 'absolute'
    this.spacer.style.top = '0'
    this.spacer.style.left = '0'
    this.spacer.style.width = '1px'
    
    // Assemble structure
    this.scrollContainer.appendChild(this.spacer)
    this.scrollContainer.appendChild(this.viewport)
    
    // Replace container content
    this.container.innerHTML = ''
    this.container.appendChild(this.scrollContainer)
    
    // Bind scroll handler
    this.scrollContainer.addEventListener('scroll', this.handleScroll.bind(this))
    
    // Bind resize observer
    this.resizeObserver = new ResizeObserver(() => this.handleResize())
    this.resizeObserver.observe(this.scrollContainer)
  }
  
  /**
   * Set items to be rendered
   */
  setItems(items, renderFunction) {
    this.items = items
    this.renderFunction = renderFunction
    
    // Update spacer height
    const totalHeight = items.length * this.itemHeight
    this.spacer.style.height = `${totalHeight}px`
    
    // Initial render
    this.updateVisibleItems()
  }
  
  /**
   * Handle scroll events
   */
  handleScroll() {
    this.scrollTop = this.scrollContainer.scrollTop
    this.updateVisibleItems()
  }
  
  /**
   * Handle container resize
   */
  handleResize() {
    this.updateVisibleItems()
  }
  
  /**
   * Update which items are visible and render them
   */
  updateVisibleItems() {
    const containerHeight = this.scrollContainer.clientHeight
    
    // Calculate visible range
    const visibleStart = Math.floor(this.scrollTop / this.itemHeight)
    const visibleEnd = Math.ceil((this.scrollTop + containerHeight) / this.itemHeight)
    
    // Add buffer
    const renderStart = Math.max(0, visibleStart - this.buffer)
    const renderEnd = Math.min(this.items.length, visibleEnd + this.buffer)
    
    // Only update if range changed
    if (renderStart === this.visibleStart && renderEnd === this.visibleEnd) {
      return
    }
    
    this.visibleStart = renderStart
    this.visibleEnd = renderEnd
    
    // Clear viewport
    this.viewport.innerHTML = ''
    
    // Render visible items
    for (let i = renderStart; i < renderEnd; i++) {
      const item = this.items[i]
      const element = this.renderFunction(item)
      
      // Position item absolutely
      element.style.position = 'absolute'
      element.style.top = `${i * this.itemHeight}px`
      element.style.left = '0'
      element.style.right = '0'
      element.style.height = `${this.itemHeight}px`
      
      this.viewport.appendChild(element)
    }
    
    // Update viewport height to maintain scroll position
    this.viewport.style.height = `${this.items.length * this.itemHeight}px`
  }
  
  /**
   * Scroll to a specific item
   */
  scrollToItem(index) {
    const scrollTop = index * this.itemHeight
    this.scrollContainer.scrollTop = scrollTop
  }
  
  /**
   * Destroy the virtual scroller
   */
  destroy() {
    this.resizeObserver.disconnect()
    this.scrollContainer.removeEventListener('scroll', this.handleScroll.bind(this))
  }
}

/**
 * Create a virtual scroller for the highlights list
 */
export function createVirtualScroller(container, highlights, createItemFunction, options = {}) {
  const {
    itemHeight = 80,
    buffer = 5
  } = options
  
  const scroller = new VirtualScroller(container, itemHeight, buffer)
  scroller.setItems(highlights, createItemFunction)
  
  return scroller
}