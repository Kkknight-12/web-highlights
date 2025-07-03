import { EventBus } from './event-bus.js'

describe('EventBus', () => {
  let eventBus
  
  beforeEach(() => {
    eventBus = new EventBus()
  })

  it('should emit and receive events', () => {
    let received = false
    
    eventBus.on('test-event', () => {
      received = true
    })
    
    eventBus.emit('test-event')
    
    expect(received).toBe(true)
  })

  it('should pass data with events', () => {
    let receivedData = null
    
    eventBus.on('data-event', (event) => {
      receivedData = event.detail
    })
    
    eventBus.emit('data-event', { message: 'hello' })
    
    expect(receivedData).toEqual({ message: 'hello' })
  })

  it('should track event counts', () => {
    eventBus.emit('count-event')
    eventBus.emit('count-event')
    eventBus.emit('count-event')
    
    const stats = eventBus.getStats()
    expect(stats.eventCounts['count-event']).toBe(3)
  })
})