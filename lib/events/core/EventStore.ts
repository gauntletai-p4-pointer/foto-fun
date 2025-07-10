import { Event } from './Event'

/**
 * Event query options
 */
export interface EventQuery {
  aggregateId?: string
  aggregateType?: Event['aggregateType']
  eventTypes?: string[]
  fromTimestamp?: number
  toTimestamp?: number
  fromEventId?: string
  workflowId?: string
  sessionId?: string
  source?: Event['metadata']['source']
  limit?: number
  offset?: number
}

/**
 * Event subscription callback
 */
export type EventHandler = (event: Event) => void | Promise<void>

/**
 * EventStore - Central storage and management of all events
 * 
 * This is the single source of truth for all state changes.
 * Events are immutable and append-only.
 */
export class EventStore {
  private static instance: EventStore
  
  // In-memory storage (can be replaced with IndexedDB or server storage)
  private events: Map<string, Event> = new Map()
  private eventsByAggregate: Map<string, string[]> = new Map()
  private eventsByTimestamp: Event[] = []
  
  // Event subscriptions
  private handlers: Map<string, Set<EventHandler>> = new Map()
  private globalHandlers: Set<EventHandler> = new Set()
  
  // Version tracking for optimistic concurrency
  private aggregateVersions: Map<string, number> = new Map()
  
  private constructor() {}
  
  static getInstance(): EventStore {
    if (!EventStore.instance) {
      EventStore.instance = new EventStore()
    }
    return EventStore.instance
  }
  
  /**
   * Append an event to the store
   */
  async append(event: Event): Promise<void> {
    // Check version for optimistic concurrency
    const currentVersion = this.aggregateVersions.get(event.aggregateId) || 0
    if (event.version !== currentVersion + 1) {
      throw new Error(
        `Version conflict: expected version ${currentVersion + 1}, got ${event.version}`
      )
    }
    
    // Store the event
    this.events.set(event.id, event)
    
    // Update indices
    const aggregateKey = `${event.aggregateType}:${event.aggregateId}`
    const aggregateEvents = this.eventsByAggregate.get(aggregateKey) || []
    aggregateEvents.push(event.id)
    this.eventsByAggregate.set(aggregateKey, aggregateEvents)
    
    // Add to timestamp index (maintain sorted order)
    const insertIndex = this.findInsertIndex(event.timestamp)
    this.eventsByTimestamp.splice(insertIndex, 0, event)
    
    // Update version
    this.aggregateVersions.set(event.aggregateId, event.version)
    
    // Notify handlers
    await this.notifyHandlers(event)
    
    // Persist to storage (async, non-blocking)
    this.persistEvent(event).catch(error => {
      console.error('Failed to persist event:', error)
    })
  }
  
  /**
   * Query events based on criteria
   */
  query(options: EventQuery): Event[] {
    let results: Event[] = []
    
    if (options.aggregateId && options.aggregateType) {
      // Fast path: query by aggregate
      const aggregateKey = `${options.aggregateType}:${options.aggregateId}`
      const eventIds = this.eventsByAggregate.get(aggregateKey) || []
      results = eventIds.map(id => this.events.get(id)!).filter(Boolean)
    } else {
      // Slow path: scan all events
      results = Array.from(this.events.values())
    }
    
    // Apply filters
    if (options.aggregateType) {
      results = results.filter(e => e.aggregateType === options.aggregateType)
    }
    
    if (options.eventTypes && options.eventTypes.length > 0) {
      const typeSet = new Set(options.eventTypes)
      results = results.filter(e => typeSet.has(e.type))
    }
    
    if (options.fromTimestamp) {
      results = results.filter(e => e.timestamp >= options.fromTimestamp!)
    }
    
    if (options.toTimestamp) {
      results = results.filter(e => e.timestamp <= options.toTimestamp!)
    }
    
    if (options.workflowId) {
      results = results.filter(e => e.metadata.workflowId === options.workflowId)
    }
    
    if (options.sessionId) {
      results = results.filter(e => e.sessionId === options.sessionId)
    }
    
    if (options.source) {
      results = results.filter(e => e.metadata.source === options.source)
    }
    
    if (options.fromEventId) {
      const fromEvent = this.events.get(options.fromEventId)
      if (fromEvent) {
        results = results.filter(e => e.timestamp > fromEvent.timestamp)
      }
    }
    
    // Sort by timestamp
    results.sort((a, b) => a.timestamp - b.timestamp)
    
    // Apply pagination
    const offset = options.offset || 0
    const limit = options.limit || results.length
    
    return results.slice(offset, offset + limit)
  }
  
  /**
   * Get all events for an aggregate
   */
  getAggregateEvents(aggregateType: Event['aggregateType'], aggregateId: string): Event[] {
    return this.query({ aggregateType, aggregateId })
  }
  
  /**
   * Get current version of an aggregate
   */
  getAggregateVersion(aggregateId: string): number {
    return this.aggregateVersions.get(aggregateId) || 0
  }
  
  /**
   * Subscribe to events
   */
  subscribe(eventType: string | '*', handler: EventHandler): () => void {
    if (eventType === '*') {
      this.globalHandlers.add(handler)
      return () => this.globalHandlers.delete(handler)
    }
    
    const handlers = this.handlers.get(eventType) || new Set()
    handlers.add(handler)
    this.handlers.set(eventType, handlers)
    
    return () => {
      handlers.delete(handler)
      if (handlers.size === 0) {
        this.handlers.delete(eventType)
      }
    }
  }
  
  /**
   * Create a snapshot at a specific point in time
   */
  async createSnapshot(timestamp: number = Date.now()): Promise<string> {
    const snapshotId = `snapshot-${timestamp}`
    
    // Get all events up to timestamp
    const events = this.eventsByTimestamp.filter(e => e.timestamp <= timestamp)
    
    // Store snapshot (in production, this would go to persistent storage)
    const snapshot = {
      id: snapshotId,
      timestamp,
      eventCount: events.length,
      events: events.map(e => e.toJSON())
    }
    
    await this.persistSnapshot(snapshot)
    
    return snapshotId
  }
  
  /**
   * Restore from a snapshot
   */
  async restoreFromSnapshot(snapshotId: string): Promise<void> {
    // In production, load from persistent storage
    console.log(`Restoring from snapshot: ${snapshotId}`)
    // Implementation would load events and rebuild state
  }
  
  /**
   * Get events for undo/redo
   */
  getUndoableEvents(limit: number = 1): Event[] {
    // Get recent events that can be reversed
    const recentEvents = this.eventsByTimestamp.slice(-limit).reverse()
    return recentEvents.filter(event => event.reverse() !== null)
  }
  
  /**
   * Clear all events (use with caution!)
   */
  clear(): void {
    this.events.clear()
    this.eventsByAggregate.clear()
    this.eventsByTimestamp = []
    this.aggregateVersions.clear()
  }
  
  // Private methods
  
  private findInsertIndex(timestamp: number): number {
    let low = 0
    let high = this.eventsByTimestamp.length
    
    while (low < high) {
      const mid = Math.floor((low + high) / 2)
      if (this.eventsByTimestamp[mid].timestamp < timestamp) {
        low = mid + 1
      } else {
        high = mid
      }
    }
    
    return low
  }
  
  private async notifyHandlers(event: Event): Promise<void> {
    // Notify specific handlers
    const handlers = this.handlers.get(event.type)
    if (handlers) {
      for (const handler of handlers) {
        try {
          await handler(event)
        } catch (error) {
          console.error(`Handler error for event ${event.type}:`, error)
        }
      }
    }
    
    // Notify global handlers
    for (const handler of this.globalHandlers) {
      try {
        await handler(event)
      } catch (error) {
        console.error('Global handler error:', error)
      }
    }
  }
  
  private async persistEvent(event: Event): Promise<void> {
    // In production, this would save to IndexedDB or server
    // For now, just log
    console.debug('Persisting event:', event.type, event.id)
  }
  
  private async persistSnapshot(snapshot: unknown): Promise<void> {
    // In production, this would save to storage
    console.debug('Persisting snapshot:', snapshot)
  }
} 