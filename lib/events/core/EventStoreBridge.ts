import { EventStore } from './EventStore'
import { TypedEventBus } from './TypedEventBus'
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
  private config: EventStoreBridgeConfig
  private disposed = false
  private batchQueue: any[] = []
  private batchTimer: NodeJS.Timeout | null = null

  constructor(
    private eventStore: EventStore,
    private typedEventBus: TypedEventBus,
    config: EventStoreBridgeConfig = {}
  ) {
    this.config = {
      batchingEnabled: true,
      batchSize: 10,
      batchTimeout: 100,
      errorHandling: 'log',
      debugging: false,
      ...config
    }
    this.initialize()
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

  private createEventForPersistence(eventType: string, eventData: unknown): any {
    const data = eventData as { canvasId: string; objectData: unknown }
    
    return {
      type: eventType,
      aggregateId: data.canvasId || 'global',
      aggregateType: 'canvas',
      data: eventData,
      metadata: {
        timestamp: Date.now(),
        source: 'EventStoreBridge'
      }
    }
  }

  private addToBatch(event: any): void {
    this.batchQueue.push(event)
    
    if (this.batchQueue.length >= (this.config.batchSize || 10)) {
      this.processBatch()
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
  emitObjectEvent(eventType: 'object.created' | 'object.updated' | 'object.deleted', data: {
    canvasId: string
    objectId: string
    objectData?: unknown
  }): void {
    this.typedEventBus.emit(eventType as any, data)
  }
} 