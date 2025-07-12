import type { Event } from './Event'

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

export interface EventStoreConfig {
  persistence?: boolean
  indexing?: boolean
  compression?: boolean
  maxEvents?: number
  snapshotInterval?: number
  batchSize?: number
}

export type EventHandler = (event: Event) => void | Promise<void>

/**
 * EventStore - Central storage and management of all events
 * 
 * This is the single source of truth for all state changes.
 * Events are immutable and append-only.
 * 
 * Now uses dependency injection instead of singleton pattern.
 */
export class EventStore {
  // In-memory storage (can be replaced with IndexedDB or server storage)
  private events: Map<string, Event> = new Map()
  private eventsByAggregate: Map<string, string[]> = new Map()
  private eventsByTimestamp: Event[] = []
  
  // Event subscriptions
  private handlers: Map<string, Set<EventHandler>> = new Map()
  private globalHandlers: Set<EventHandler> = new Set()
  
  // Version tracking for optimistic concurrency
  private aggregateVersions: Map<string, number> = new Map()
  
  // Configuration
  private config: EventStoreConfig
  
  // Disposal tracking
  private disposed = false
  private cleanupTimer: NodeJS.Timeout | null = null

  constructor(config: EventStoreConfig = {}) {
    this.config = {
      persistence: true,
      indexing: true,
      compression: true,
      maxEvents: 10000,
      snapshotInterval: 1000,
      batchSize: 50,
      ...config
    }
    this.initialize()
  }
  
  private initialize(): void {
    this.setupPersistence()
    this.setupIndexes()
    this.setupCleanup()
    console.log('[EventStore] Initialized with config:', this.config)
  }
  
  private setupPersistence(): void {
    if (this.config.persistence) {
      // Setup persistence layer
      console.log('[EventStore] Persistence enabled')
    }
  }
  
  private setupIndexes(): void {
    if (this.config.indexing) {
      // Setup indexing for fast queries
      console.log('[EventStore] Indexing enabled')
    }
  }
  
  private setupCleanup(): void {
    // Setup periodic cleanup
    if (this.config.maxEvents && this.config.maxEvents > 0) {
      this.cleanupTimer = setInterval(() => {
        this.performCleanup()
      }, 60000) // Every minute
    }
  }
  
  private performCleanup(): void {
    if (this.disposed || !this.config.maxEvents) return
    
    const currentCount = this.events.size
    if (currentCount > this.config.maxEvents) {
      const eventsToRemove = currentCount - this.config.maxEvents
      const oldestEvents = this.eventsByTimestamp.slice(0, eventsToRemove)
      
      for (const event of oldestEvents) {
        this.events.delete(event.id)
        // Remove from aggregate index
        const aggregateKey = `${event.aggregateType}:${event.aggregateId}`
        const aggregateEvents = this.eventsByAggregate.get(aggregateKey) || []
        const index = aggregateEvents.indexOf(event.id)
        if (index > -1) {
          aggregateEvents.splice(index, 1)
          if (aggregateEvents.length === 0) {
            this.eventsByAggregate.delete(aggregateKey)
          } else {
            this.eventsByAggregate.set(aggregateKey, aggregateEvents)
          }
        }
      }
      
      // Update timestamp index
      this.eventsByTimestamp = this.eventsByTimestamp.slice(eventsToRemove)
      
      console.log(`[EventStore] Cleaned up ${eventsToRemove} old events`)
    }
  }

  /**
   * Dispose of the EventStore and clean up resources
   */
  dispose(): void {
    if (this.disposed) return
    
    this.disposed = true
    this.cleanup()
    this.persistenceCleanup()
    
    console.log('[EventStore] Disposed')
  }
  
  private cleanup(): void {
    // Clear all handlers
    this.handlers.clear()
    this.globalHandlers.clear()
    
    // Clear cleanup timer
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
    
    // Clear data structures
    this.events.clear()
    this.eventsByAggregate.clear()
    this.eventsByTimestamp = []
    this.aggregateVersions.clear()
  }
  
  private persistenceCleanup(): void {
    if (this.config.persistence) {
      // Cleanup persistence resources
      console.log('[EventStore] Persistence cleanup completed')
    }
  }

  /**
   * Append an event to the store
   */
  async append(event: Event): Promise<void> {
    if (this.disposed) {
      throw new Error('EventStore has been disposed')
    }
    
    // Auto-increment version if not set correctly
    const currentVersion = this.aggregateVersions.get(event.aggregateId) || 0
    const expectedVersion = currentVersion + 1
    
    // If event has wrong version, update it
    if (event.version !== expectedVersion) {
      // Override the readonly version property
      Object.defineProperty(event, 'version', {
        value: expectedVersion,
        writable: false,
        enumerable: true,
        configurable: false
      })
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
    if (this.config.persistence) {
      this.persistEvent(event).catch(error => {
        console.error('Failed to persist event:', error)
      })
    }
  }

  /**
   * Append multiple events in a batch
   */
  async appendBatch(events: Event[]): Promise<void> {
    if (this.disposed) {
      throw new Error('EventStore has been disposed')
    }
    
    // Process events in order
    for (const event of events) {
      await this.append(event)
    }
  }

  /**
   * Query events based on criteria
   */
  query(options: EventQuery): Event[] {
    if (this.disposed) {
      throw new Error('EventStore has been disposed')
    }
    
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
   * Get all events until a specific timestamp
   */
  getEventsUntil(timestamp: number): Promise<Event[]> {
    return Promise.resolve(this.query({ toTimestamp: timestamp }))
  }

  /**
   * Get events by their IDs
   */
  getEventsByIds(eventIds: string[]): Promise<Event[]> {
    const events = eventIds
      .map(id => this.events.get(id))
      .filter((event): event is Event => event !== undefined)
    return Promise.resolve(events)
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
    if (this.disposed) {
      throw new Error('EventStore has been disposed')
    }
    
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
    if (this.disposed) {
      throw new Error('EventStore has been disposed')
    }
    
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
    
    if (this.config.persistence) {
      await this.persistSnapshot(snapshot)
    }
    
    return snapshotId
  }
  
  /**
   * Restore from a snapshot
   */
  async restoreFromSnapshot(snapshotId: string): Promise<void> {
    if (this.disposed) {
      throw new Error('EventStore has been disposed')
    }
    
    // In production, load from persistent storage
    console.log(`Restoring from snapshot: ${snapshotId}`)
    // Implementation would load events and rebuild state
  }
  
  /**
   * Get events for undo/redo
   */
  getUndoableEvents(limit: number = 1): Event[] {
    if (this.disposed) {
      return []
    }
    
    // Get recent events that can be reversed
    const recentEvents = this.eventsByTimestamp.slice(-limit).reverse()
    return recentEvents.filter(event => event.reverse() !== null)
  }
  
  /**
   * Get total number of events
   */
  getEventCount(): number {
    return this.events.size
  }
  
  /**
   * Check if store is disposed
   */
  isDisposed(): boolean {
    return this.disposed
  }
  
  /**
   * Clear all events (for testing)
   */
  clear(): void {
    if (this.disposed) {
      throw new Error('EventStore has been disposed')
    }
    
    this.events.clear()
    this.eventsByAggregate.clear()
    this.eventsByTimestamp = []
    this.aggregateVersions.clear()
  }
  
  private findInsertIndex(timestamp: number): number {
    let left = 0
    let right = this.eventsByTimestamp.length
    
    while (left < right) {
      const mid = Math.floor((left + right) / 2)
      if (this.eventsByTimestamp[mid].timestamp <= timestamp) {
        left = mid + 1
      } else {
        right = mid
      }
    }
    
    return left
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
    // In production, this would persist to IndexedDB or server
    // For now, just log
    console.debug('[EventStore] Persisting event:', event.type)
  }
  
  private async persistSnapshot(_snapshot: unknown): Promise<void> {
    // In production, this would persist to storage
    console.debug('[EventStore] Persisting snapshot')
  }
} 