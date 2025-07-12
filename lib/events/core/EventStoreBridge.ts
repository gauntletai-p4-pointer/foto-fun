import { EventStore } from './EventStore'
import { TypedEventBus } from './TypedEventBus'
import { Event } from './Event'
import type { Selection } from '@/lib/editor/canvas/types'
import type { CanvasObject } from '@/lib/editor/objects/types'

export interface EventStoreBridgeConfig {
  batchingEnabled?: boolean
  batchSize?: number
  batchTimeout?: number
  errorHandling?: 'log' | 'throw' | 'ignore'
  debugging?: boolean
}

/**
 * Bridge between EventStore and TypedEventBus
 * Handles event persistence and real-time notifications
 */
export class EventStoreBridge {
  private eventStore: EventStore
  private typedEventBus: TypedEventBus
  private config: EventStoreBridgeConfig
  private batchQueue: Event[] = []
  private batchTimer: NodeJS.Timeout | null = null
  private disposed = false

  constructor(eventStore: EventStore, typedEventBus: TypedEventBus, config: EventStoreBridgeConfig = {}) {
    this.eventStore = eventStore
    this.typedEventBus = typedEventBus
    this.config = {
      batchingEnabled: true,
      batchSize: 10,
      batchTimeout: 100,
      errorHandling: 'log',
      debugging: false,
      ...config
    }
    
    this.setupEventHandlers()
  }

  private initialize(): void {
    this.setupEventHandlers()
    this.setupBatching()
    this.setupErrorHandling()
  }

  private setupEventHandlers(): void {
    // Canvas events
    this.typedEventBus.on('canvas.ready', (data) => {
      this.persistEvent('canvas.ready', data)
    })

    this.typedEventBus.on('canvas.object.added', (data) => {
      this.persistEvent('canvas.object.added', data)
    })

    this.typedEventBus.on('canvas.object.modified', (data) => {
      this.persistEvent('canvas.object.modified', data)
    })

    this.typedEventBus.on('canvas.object.removed', (data) => {
      this.persistEvent('canvas.object.removed', data)
    })

    // Selection events
    this.typedEventBus.on('selection.changed', (data) => {
      this.persistEvent('selection.changed', data)
    })

    // Tool events
    this.typedEventBus.on('tool.activated', (data) => {
      this.persistEvent('tool.activated', data)
    })

    this.typedEventBus.on('tool.option.changed', (data) => {
      this.persistEvent('tool.option.changed', data)
    })

    // Project events (not document events)
    this.typedEventBus.on('project.created', (data) => {
      this.persistEvent('project.created', data)
    })

    this.typedEventBus.on('project.saved', (data) => {
      this.persistEvent('project.saved', data)
    })

    // History events
    this.typedEventBus.on('history.navigated', (data) => {
      this.persistEvent('history.navigated', data)
    })
  }

  private setupBatching(): void {
    if (!this.config.batchingEnabled) return

    // Batching logic for performance
    this.batchTimer = setInterval(() => {
      this.processBatch()
    }, this.config.batchTimeout)
  }

  private setupErrorHandling(): void {
    if (this.config.errorHandling === 'ignore') return

    process.on('unhandledRejection', (error) => {
      this.handleError(new Error(`Unhandled rejection in EventStoreBridge: ${error}`))
    })
  }

  private persistEvent(eventType: string, eventData: unknown): void {
    try {
      if (this.disposed) return

      // Create event for persistence
      const event = this.createEventForPersistence(eventType, eventData)
      
      if (this.config.batchingEnabled) {
        this.addToBatch(event)
      } else {
        this.eventStore.append(event)
      }

      if (this.config.debugging) {
        console.log(`[EventStoreBridge] Persisted event: ${eventType}`, eventData)
      }
    } catch (error) {
      this.handleError(error as Error)
    }
  }

  private createEventForPersistence(eventType: string, eventData: unknown): Event {
    // Create a proper Event instance for persistence
    const event = new (class extends Event {
      constructor(type: string, data: unknown) {
        super(type, 'system', 'canvas', {
          source: 'system',
          correlationId: `bridge-${Date.now()}`
        })
        this.data = data
      }
      
      apply(currentState: unknown): unknown {
        return currentState
      }
      
      reverse(): Event | null {
        return null
      }
      
      canApply(currentState: unknown): boolean {
        return true
      }
      
      getDescription(): string {
        return `Bridge event: ${this.type}`
      }
      
      getEventData(): Record<string, unknown> {
        return { data: this.data }
      }
      
      private data: unknown
    })(eventType, eventData)
    
    return event
  }

  private addToBatch(event: Event): void {
    if (this.disposed) return
    
    this.batchQueue.push(event)
    
    if (this.batchQueue.length >= (this.config.batchSize || 10)) {
      this.processBatch()
    } else if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.processBatch()
      }, this.config.batchTimeout || 100)
    }
  }

  private processBatch(): void {
    if (this.batchQueue.length === 0) return

    const batch = [...this.batchQueue]
    this.batchQueue = []

    try {
      this.eventStore.appendBatch(batch)
    } catch (error) {
      this.handleError(error as Error)
    }
  }

  private handleError(error: Error): void {
    switch (this.config.errorHandling) {
      case 'throw':
        throw error
      case 'log':
        console.error('[EventStoreBridge] Error:', error)
        break
      case 'ignore':
      default:
        break
    }
  }

  start(): void {
    if (this.disposed) {
      throw new Error('Cannot start disposed EventStoreBridge')
    }
    // Bridge is automatically active when created
  }

  stop(): void {
    this.dispose()
  }

  dispose(): void {
    if (this.disposed) return

    this.disposed = true
    
    // Process any remaining batched events
    this.processBatch()
    
    // Clear batch timer
    if (this.batchTimer) {
      clearInterval(this.batchTimer)
      this.batchTimer = null
    }

    // Clear batch queue
    this.batchQueue = []
  }

  isDisposed(): boolean {
    return this.disposed
  }

  // Object events (updated from layer events)
  emitObjectEvent(eventType: 'canvas.object.added' | 'canvas.object.modified' | 'canvas.object.removed', data: {
    canvasId: string
    objectId: string
    objectData?: unknown
  }): void {
    this.typedEventBus.emit(eventType, data)
  }
} 