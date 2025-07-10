import { EventStore } from './EventStore'
import { TypedEventBus, EventRegistry } from './TypedEventBus'
import type { Event } from './Event'
import { 
  ObjectAddedEvent, 
  ObjectModifiedEvent, 
  ObjectRemovedEvent,
  ObjectsBatchModifiedEvent 
} from '../canvas/CanvasEvents'
import { 
  LayerCreatedEvent,
  LayerRemovedEvent,
  LayerModifiedEvent,
  LayersReorderedEvent
} from '../canvas/LayerEvents'
import {
  SelectionChangedEvent,
  SelectionClearedEvent
} from '../canvas/SelectionEvents'
import {
  CanvasResizedEvent,
  CanvasBackgroundChangedEvent
} from '../canvas/DocumentEvents'

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
      // Use event type to determine what to emit
      switch (event.type) {
        case 'canvas.object.added': {
          // For ObjectAddedEvent, we need to reconstruct the data
          const eventData = (event as any).toJSON()
          this.typedEventBus.emit('canvas.object.added', {
            canvasId: eventData.data.canvasId,
            object: eventData.data.objectData,
            layerId: eventData.data.layerId
          })
          break
        }
        
        case 'canvas.object.modified': {
          const eventData = (event as any).toJSON()
          this.typedEventBus.emit('canvas.object.modified', {
            canvasId: eventData.data.canvasId,
            objectId: eventData.data.objectId,
            previousState: eventData.data.previousState,
            newState: eventData.data.newState
          })
          break
        }
        
        case 'canvas.object.removed': {
          const eventData = (event as any).toJSON()
          this.typedEventBus.emit('canvas.object.removed', {
            canvasId: eventData.data.canvasId,
            objectId: eventData.data.objectId
          })
          break
        }
        
        case 'canvas.objects.batch.modified': {
          const eventData = (event as any).toJSON()
          this.typedEventBus.emit('canvas.objects.batch.modified', {
            canvasId: eventData.data.canvasId,
            modifications: eventData.data.modifications
          })
          break
        }
        
        // Layer events
        case 'layer.created': {
          const eventData = (event as any).toJSON()
          this.typedEventBus.emit('layer.created', {
            layer: eventData.data.layer
          })
          break
        }
        
        case 'layer.removed': {
          const eventData = (event as any).toJSON()
          this.typedEventBus.emit('layer.removed', {
            layerId: eventData.data.layerId
          })
          break
        }
        
        case 'layer.modified': {
          const eventData = (event as any).toJSON()
          this.typedEventBus.emit('layer.modified', {
            layerId: eventData.data.layerId,
            modifications: eventData.data.modifications
          })
          break
        }
        
        case 'layers.reordered': {
          const eventData = (event as any).toJSON()
          this.typedEventBus.emit('layer.reordered', {
            layerIds: eventData.data.layerIds,
            previousOrder: eventData.data.previousOrder
          })
          break
        }
        
        // Selection events
        case 'selection.changed': {
          const eventData = (event as any).toJSON()
          this.typedEventBus.emit('selection.changed', {
            selection: eventData.data.selection,
            previousSelection: eventData.data.previousSelection
          })
          break
        }
        
        case 'selection.cleared': {
          const eventData = (event as any).toJSON()
          this.typedEventBus.emit('selection.cleared', {
            previousSelection: eventData.data.previousSelection
          })
          break
        }
        
        // Canvas state events
        case 'canvas.resized': {
          const eventData = (event as any).toJSON()
          const { previousSize, newSize } = eventData.data
          this.typedEventBus.emit('canvas.resized', {
            width: newSize.width,
            height: newSize.height,
            previousWidth: previousSize.width,
            previousHeight: previousSize.height
          })
          break
        }
        
        case 'canvas.background.changed': {
          const eventData = (event as any).toJSON()
          this.typedEventBus.emit('canvas.background.changed', {
            backgroundColor: eventData.data.newColor,
            previousColor: eventData.data.previousColor
          })
          break
        }
        
        // Tool events
        case 'tool.activated': {
          const eventData = (event as any).toJSON()
          this.typedEventBus.emit('tool.activated', eventData.data)
          break
        }
        
        case 'tool.option.changed': {
          const eventData = (event as any).toJSON()
          this.typedEventBus.emit('tool.option.changed', eventData.data)
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