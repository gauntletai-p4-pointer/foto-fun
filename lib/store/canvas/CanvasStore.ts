import { BaseStore } from '../base/BaseStore'
import type { EventStore } from '@/lib/events/core/EventStore'
import type { Event } from '@/lib/events/core/Event'
// Layer, Selection, Point imports removed - using object-based architecture
import type { CanvasObject } from '@/lib/editor/objects/types'

export interface CanvasState {
  // Canvas objects (infinite canvas)
  objects: CanvasObject[]
  selectedObjectIds: string[]
  
  // Project properties (not document)
  projectId: string | null
  projectName: string
  
  // Infinite canvas viewport
  zoom: number
  pan: { x: number; y: number }
  
  // Canvas properties
  version: number
  createdAt: number
  lastModified: number
}

const initialState: CanvasState = {
  objects: [],
  selectedObjectIds: [],
  projectId: null,
  projectName: 'Untitled Project',
  zoom: 1,
  pan: { x: 0, y: 0 },
  version: 1,
  createdAt: Date.now(),
  lastModified: Date.now()
}

/**
 * Event-driven Canvas Store
 * Maintains canvas state by listening to events
 */
export class CanvasStore extends BaseStore<CanvasState> {
  constructor(eventStore: EventStore) {
    super(initialState, eventStore)
  }
  
  protected getEventHandlers(): Map<string, (event: Event) => void> {
    return new Map([
      ['ObjectAddedEvent', this.handleObjectAdded.bind(this)],
      ['ObjectModifiedEvent', this.handleObjectModified.bind(this)],
      ['ObjectRemovedEvent', this.handleObjectRemoved.bind(this)],
      ['ObjectsBatchModifiedEvent', this.handleBatchModified.bind(this)],
      ['ViewportChangedEvent', this.handleViewportChanged.bind(this)],
      ['ProjectLoadedEvent', this.handleProjectLoaded.bind(this)],
      ['ProjectSavedEvent', this.handleProjectSaved.bind(this)]
    ])
  }
  
  // Event Handlers for Infinite Canvas
  
  private handleObjectAdded(event: Event): void {
    const objEvent = event as Event & { object: CanvasObject }
    this.setState(state => ({
      ...state,
      objects: [...state.objects, objEvent.object],
      version: state.version + 1,
      lastModified: event.timestamp
    }))
  }
  
  private handleObjectModified(event: Event): void {
    const modEvent = event as Event & { objectId: string; previousState: Record<string, unknown>; newState: Record<string, unknown> }
    this.setState(state => ({
      ...state,
      objects: state.objects.map(obj =>
        obj.id === modEvent.objectId
          ? { ...obj, ...modEvent.newState }
          : obj
      ),
      version: state.version + 1,
      lastModified: event.timestamp
    }))
  }
  
  private handleObjectRemoved(event: Event): void {
    const remEvent = event as Event & { objectId: string }
    this.setState(state => ({
      ...state,
      objects: state.objects.filter(obj => obj.id !== remEvent.objectId),
      selectedObjectIds: state.selectedObjectIds.filter(id => id !== remEvent.objectId),
      version: state.version + 1,
      lastModified: event.timestamp
    }))
  }
  
  private handleBatchModified(event: Event): void {
    const batchEvent = event as Event & { modifications: Array<{ objectId: string; previousState: Record<string, unknown>; newState: Record<string, unknown> }> }
    this.setState(state => {
      const modificationMap = new Map(batchEvent.modifications.map(mod => [mod.objectId, mod.newState]))
      
      return {
        ...state,
        objects: state.objects.map(obj =>
          modificationMap.has(obj.id)
            ? { ...obj, ...modificationMap.get(obj.id) }
            : obj
        ),
        version: state.version + 1,
        lastModified: event.timestamp
      }
    })
  }
  
  private handleViewportChanged(event: Event): void {
    const vpEvent = event as Event & { zoom?: number; pan?: { x: number; y: number } }
    this.setState(state => ({
      ...state,
      zoom: vpEvent.zoom ?? state.zoom,
      pan: vpEvent.pan ?? state.pan
    }))
  }
  
  private handleProjectLoaded(event: Event): void {
    const projEvent = event as Event & { project: { id: string; name: string; createdAt: number; lastModified: number } }
    this.setState(() => ({
      ...initialState,
      projectId: projEvent.project.id,
      projectName: projEvent.project.name,
      createdAt: projEvent.project.createdAt,
      lastModified: projEvent.project.lastModified
    }))
  }
  
  private handleProjectSaved(event: Event): void {
    const saveEvent = event as Event & { projectId: string }
    this.setState(state => ({
      ...state,
      projectId: saveEvent.projectId,
      lastModified: event.timestamp
    }))
  }
  
  // Infinite Canvas Operations
  
  /**
   * Get all objects (infinite canvas has no layers)
   */
  getAllObjects(): CanvasObject[] {
    return this.getState().objects
  }
  
  /**
   * Get selected objects
   */
  getSelectedObjects(): CanvasObject[] {
    const state = this.getState()
    return state.objects.filter(obj => state.selectedObjectIds.includes(obj.id))
  }
  
  /**
   * Get object by ID
   */
  getObjectById(objectId: string): CanvasObject | undefined {
    return this.getState().objects.find(obj => obj.id === objectId)
  }
  
  /**
   * Check if an object is selected
   */
  isObjectSelected(objectId: string): boolean {
    return this.getState().selectedObjectIds.includes(objectId)
  }
  
  /**
   * Get objects in viewport bounds
   */
  getObjectsInViewport(bounds: { x: number; y: number; width: number; height: number }): CanvasObject[] {
    return this.getState().objects.filter(obj => {
      // Simple bounds check - can be optimized with spatial indexing
      return obj.x < bounds.x + bounds.width &&
             obj.x + obj.width > bounds.x &&
             obj.y < bounds.y + bounds.height &&
             obj.y + obj.height > bounds.y
    })
  }
} 