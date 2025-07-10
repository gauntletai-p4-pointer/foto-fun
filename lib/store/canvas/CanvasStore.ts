import { BaseStore } from '../base/BaseStore'
import type { EventStore } from '@/lib/events/core/EventStore'
import type { Event } from '@/lib/events/core/Event'
import type { CanvasObject, Layer, Selection, Point, Size } from '@/lib/editor/canvas/types'
import { 
  ObjectAddedEvent, 
  ObjectModifiedEvent, 
  ObjectRemovedEvent,
  ObjectsBatchModifiedEvent 
} from '@/lib/events/canvas/CanvasEvents'

export interface CanvasStoreState {
  // Document properties
  documentId: string | null
  documentName: string
  width: number
  height: number
  backgroundColor: string
  
  // Canvas state
  isLoading: boolean
  isSaving: boolean
  isDirty: boolean
  
  // Objects and layers
  objects: Record<string, CanvasObject>
  layers: Layer[]
  activeLayerId: string | null
  
  // Selection
  selection: Selection | null
  
  // View state
  zoom: number
  pan: Point
  
  // Metadata
  lastModified: number
  createdAt: number
}

const initialState: CanvasStoreState = {
  documentId: null,
  documentName: 'Untitled',
  width: 800,
  height: 600,
  backgroundColor: '#ffffff',
  isLoading: false,
  isSaving: false,
  isDirty: false,
  objects: {},
  layers: [],
  activeLayerId: null,
  selection: null,
  zoom: 1,
  pan: { x: 0, y: 0 },
  lastModified: Date.now(),
  createdAt: Date.now()
}

/**
 * Event-driven Canvas Store
 * Maintains canvas state by listening to events
 */
export class CanvasStore extends BaseStore<CanvasStoreState> {
  constructor(eventStore: EventStore) {
    super(initialState, eventStore)
  }
  
  protected getEventHandlers(): Map<string, (event: Event) => void> {
    return new Map([
      ['ObjectAddedEvent', this.handleObjectAdded.bind(this)],
      ['ObjectModifiedEvent', this.handleObjectModified.bind(this)],
      ['ObjectRemovedEvent', this.handleObjectRemoved.bind(this)],
      ['ObjectsBatchModifiedEvent', this.handleBatchModified.bind(this)],
      ['LayerCreatedEvent', this.handleLayerCreated.bind(this)],
      ['LayerRemovedEvent', this.handleLayerRemoved.bind(this)],
      ['LayerModifiedEvent', this.handleLayerModified.bind(this)],
      ['SelectionChangedEvent', this.handleSelectionChanged.bind(this)],
      ['CanvasResizedEvent', this.handleCanvasResized.bind(this)],
      ['ViewportChangedEvent', this.handleViewportChanged.bind(this)],
      ['DocumentLoadedEvent', this.handleDocumentLoaded.bind(this)],
      ['DocumentSavedEvent', this.handleDocumentSaved.bind(this)]
    ])
  }
  
  // Event Handlers
  
  private handleObjectAdded(event: Event): void {
    const addEvent = event as ObjectAddedEvent
    const objectData = addEvent.getObjectData()
    
    this.setState(state => ({
      ...state,
      objects: {
        ...state.objects,
        [objectData.id]: objectData as unknown as CanvasObject
      },
      isDirty: true,
      lastModified: event.timestamp
    }))
  }
  
  private handleObjectModified(event: Event): void {
    const modEvent = event as ObjectModifiedEvent
    const objectId = modEvent.getObjectId()
    const newState = modEvent.getNewState()
    
    this.setState(state => {
      const object = state.objects[objectId]
      if (!object) return state
      
      return {
        ...state,
        objects: {
          ...state.objects,
          [objectId]: {
            ...object,
            ...newState
          }
        },
        isDirty: true,
        lastModified: event.timestamp
      }
    })
  }
  
  private handleObjectRemoved(event: Event): void {
    const removeEvent = event as ObjectRemovedEvent
    const objectId = removeEvent.getObjectId()
    
    this.setState(state => {
      const { [objectId]: removed, ...remainingObjects } = state.objects
      
      return {
        ...state,
        objects: remainingObjects,
        isDirty: true,
        lastModified: event.timestamp
      }
    })
  }
  
  private handleBatchModified(event: Event): void {
    const batchEvent = event as ObjectsBatchModifiedEvent
    const modifications = batchEvent.getModifications()
    
    this.setState(state => {
      const updatedObjects = { ...state.objects }
      
      modifications.forEach(mod => {
        const objectId = (mod.object as any).id || mod.object.toString()
        const object = updatedObjects[objectId]
        if (object) {
          updatedObjects[objectId] = {
            ...object,
            ...mod.newState
          }
        }
      })
      
      return {
        ...state,
        objects: updatedObjects,
        isDirty: true,
        lastModified: event.timestamp
      }
    })
  }
  
  private handleLayerCreated(event: Event & { layer: Layer }): void {
    this.setState(state => ({
      ...state,
      layers: [...state.layers, event.layer],
      activeLayerId: state.activeLayerId || event.layer.id,
      isDirty: true,
      lastModified: event.timestamp
    }))
  }
  
  private handleLayerRemoved(event: Event & { layerId: string }): void {
    this.setState(state => {
      const layers = state.layers.filter(l => l.id !== event.layerId)
      const activeLayerId = state.activeLayerId === event.layerId 
        ? layers[0]?.id || null 
        : state.activeLayerId
      
      return {
        ...state,
        layers,
        activeLayerId,
        isDirty: true,
        lastModified: event.timestamp
      }
    })
  }
  
  private handleLayerModified(event: Event & { layerId: string; modifications: Partial<Layer> }): void {
    this.setState(state => ({
      ...state,
      layers: state.layers.map(layer =>
        layer.id === event.layerId
          ? { ...layer, ...event.modifications }
          : layer
      ),
      isDirty: true,
      lastModified: event.timestamp
    }))
  }
  
  private handleSelectionChanged(event: Event & { selection: Selection | null }): void {
    this.setState(state => ({
      ...state,
      selection: event.selection
    }))
  }
  
  private handleCanvasResized(event: Event & { width: number; height: number }): void {
    this.setState(state => ({
      ...state,
      width: event.width,
      height: event.height,
      isDirty: true,
      lastModified: event.timestamp
    }))
  }
  
  private handleViewportChanged(event: Event & { zoom?: number; pan?: Point }): void {
    this.setState(state => ({
      ...state,
      zoom: event.zoom ?? state.zoom,
      pan: event.pan ?? state.pan
    }))
  }
  
  private handleDocumentLoaded(event: Event & { document: any }): void {
    this.setState(state => ({
      ...initialState,
      documentId: event.document.id,
      documentName: event.document.name,
      width: event.document.width,
      height: event.document.height,
      backgroundColor: event.document.backgroundColor,
      createdAt: event.document.createdAt,
      lastModified: event.document.lastModified,
      isDirty: false
    }))
  }
  
  private handleDocumentSaved(event: Event & { documentId: string }): void {
    this.setState(state => ({
      ...state,
      documentId: event.documentId,
      isDirty: false,
      isSaving: false
    }))
  }
  
  // Derived values
  
  /**
   * Get all objects in a specific layer
   */
  getLayerObjects(layerId: string): CanvasObject[] {
    const state = this.getState()
    return Object.values(state.objects).filter(obj => obj.layerId === layerId)
  }
  
  /**
   * Get selected objects
   */
  getSelectedObjects(): CanvasObject[] {
    const state = this.getState()
    if (!state.selection || state.selection.type !== 'objects') {
      return []
    }
    
    return state.selection.objectIds
      .map(id => state.objects[id])
      .filter(Boolean)
  }
  
  /**
   * Get active layer
   */
  getActiveLayer(): Layer | null {
    const state = this.getState()
    return state.layers.find(l => l.id === state.activeLayerId) || null
  }
  
  /**
   * Check if an object is selected
   */
  isObjectSelected(objectId: string): boolean {
    const state = this.getState()
    if (!state.selection || state.selection.type !== 'objects') {
      return false
    }
    
    return state.selection.objectIds.includes(objectId)
  }
}

// Singleton instance
let instance: CanvasStore | null = null

export function getCanvasStore(eventStore: EventStore): CanvasStore {
  if (!instance) {
    instance = new CanvasStore(eventStore)
  }
  return instance
} 