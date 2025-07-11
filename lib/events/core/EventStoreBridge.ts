import { EventStore } from './EventStore'
import { TypedEventBus } from './TypedEventBus'
import type { Event } from './Event'
import type { Selection, CanvasObject, Layer } from '@/lib/editor/canvas/types'

/**
 * Bridge between EventStore (event sourcing) and TypedEventBus (UI updates)
 * 
 * This bridge listens to all events in the EventStore and emits corresponding
 * events on the TypedEventBus for UI components to react to.
 * 
 * Architecture:
 * - EventStore: Source of truth, handles versioning, persistence, undo/redo
 * - TypedEventBus: Lightweight UI notifications, no persistence
 * - This bridge: Converts Event objects to typed UI events
 */
export class EventStoreBridge {
  private static instance: EventStoreBridge
  private eventStore: EventStore
  private typedEventBus: TypedEventBus
  private unsubscribe: (() => void) | null = null
  
  private constructor(eventStore: EventStore, typedEventBus: TypedEventBus) {
    this.eventStore = eventStore
    this.typedEventBus = typedEventBus
  }
  
  static getInstance(eventStore: EventStore, typedEventBus: TypedEventBus): EventStoreBridge {
    if (!EventStoreBridge.instance) {
      EventStoreBridge.instance = new EventStoreBridge(eventStore, typedEventBus)
    }
    return EventStoreBridge.instance
  }
  
  /**
   * Start bridging events from EventStore to TypedEventBus
   */
  start(): void {
    if (this.unsubscribe) {
      console.warn('[EventStoreBridge] Already started')
      return
    }
    
    // Subscribe to all events in EventStore
    this.unsubscribe = this.eventStore.subscribe('*', (event) => {
      this.handleEvent(event)
    })
    
    console.log('[EventStoreBridge] Started bridging events')
  }
  
  /**
   * Stop bridging events
   */
  stop(): void {
    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = null
      console.log('[EventStoreBridge] Stopped bridging events')
    }
  }
  
  /**
   * Handle an event from EventStore and emit to TypedEventBus
   */
  private handleEvent(event: Event): void {
    try {
      // Get the serialized event data which includes the 'data' property
      const serializedEvent = event.toJSON()
      const eventData = serializedEvent.data as Record<string, unknown>
      
      // Use event type to determine what to emit
      switch (event.type) {
        case 'canvas.object.added': {
          // For ObjectAddedEvent, we need to reconstruct the data
          const data = eventData as { canvasId: string; objectData: unknown; layerId?: string }
          this.typedEventBus.emit('canvas.object.added', {
            canvasId: data.canvasId,
            object: data.objectData as CanvasObject,
            layerId: data.layerId
          })
          break
        }
        
        case 'canvas.object.modified': {
          const data = eventData as { canvasId: string; objectId: string; previousState: unknown; newState: unknown }
          this.typedEventBus.emit('canvas.object.modified', {
            canvasId: data.canvasId,
            objectId: data.objectId,
            previousState: data.previousState as Record<string, unknown>,
            newState: data.newState as Record<string, unknown>
          })
          break
        }
        
        case 'canvas.object.removed': {
          const data = eventData as { canvasId: string; objectId: string }
          this.typedEventBus.emit('canvas.object.removed', {
            canvasId: data.canvasId,
            objectId: data.objectId
          })
          break
        }
        
        case 'canvas.objects.batch.modified': {
          const data = eventData as { canvasId: string; modifications: Array<{
            object: CanvasObject
            previousState: Record<string, unknown>
            newState: Record<string, unknown>
          }> }
          this.typedEventBus.emit('canvas.objects.batch.modified', {
            canvasId: data.canvasId,
            modifications: data.modifications
          })
          break
        }
        
        // Layer events
        case 'layer.created': {
          const data = eventData as { layer: Layer }
          this.typedEventBus.emit('layer.created', {
            layer: data.layer
          })
          break
        }
        
        case 'layer.removed': {
          const data = eventData as { layerId: string }
          this.typedEventBus.emit('layer.removed', {
            layerId: data.layerId
          })
          break
        }
        
        case 'layer.modified': {
          const data = eventData as { layerId: string; modifications: Partial<Layer> }
          this.typedEventBus.emit('layer.modified', {
            layerId: data.layerId,
            modifications: data.modifications
          })
          break
        }
        
        case 'layers.reordered': {
          const data = eventData as { layerIds: string[]; previousOrder: string[] }
          this.typedEventBus.emit('layer.reordered', {
            layerIds: data.layerIds,
            previousOrder: data.previousOrder
          })
          break
        }
        
        // Selection events
        case 'selection.changed': {
          const data = eventData as { selection: Selection | null; previousSelection: Selection | null }
          this.typedEventBus.emit('selection.changed', {
            selection: data.selection,
            previousSelection: data.previousSelection
          })
          break
        }
        
        case 'selection.cleared': {
          const data = eventData as { previousSelection: Selection }
          this.typedEventBus.emit('selection.cleared', {
            previousSelection: data.previousSelection
          })
          break
        }
        
        // Canvas state events
        case 'canvas.resized': {
          const data = eventData as { previousSize: { width: number; height: number }; newSize: { width: number; height: number } }
          const { previousSize, newSize } = data
          this.typedEventBus.emit('canvas.resized', {
            width: newSize.width,
            height: newSize.height,
            previousWidth: previousSize.width,
            previousHeight: previousSize.height
          })
          break
        }
        
        case 'canvas.background.changed': {
          const data = eventData as { newColor: string; previousColor: string }
          this.typedEventBus.emit('canvas.background.changed', {
            backgroundColor: data.newColor,
            previousColor: data.previousColor
          })
          break
        }
        
        // Tool events
        case 'tool.activated': {
          const data = eventData as { toolId: string; previousToolId: string | null }
          this.typedEventBus.emit('tool.activated', data)
          break
        }
        
        case 'tool.option.changed': {
          const data = eventData as { 
            toolId: string
            optionId?: string
            optionKey?: string
            value: unknown
          }
          this.typedEventBus.emit('tool.option.changed', data)
          break
        }
        
        // Add more event mappings as needed...
        default:
          // Log unhandled events for debugging
          console.debug('[EventStoreBridge] Unhandled event type:', event.type)
      }
      
    } catch (error) {
      console.error('[EventStoreBridge] Error handling event:', event.type, error)
    }
  }
} 