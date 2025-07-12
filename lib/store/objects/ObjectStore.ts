import { BaseStore } from '../base/BaseStore'
import type { EventStore } from '@/lib/events/core/EventStore'
import type { Event } from '@/lib/events/core/Event'
import type { TypedEventBus, EventRegistry } from '@/lib/events/core/TypedEventBus'
import type { CanvasObject as NewCanvasObject } from '@/lib/editor/objects/types'

export interface ObjectStoreState {
  objects: Map<string, NewCanvasObject>
  objectOrder: string[]
  selectedObjectIds: Set<string>
}

const initialState: ObjectStoreState = {
  objects: new Map(),
  objectOrder: [],
  selectedObjectIds: new Set()
}

export class ObjectStore extends BaseStore<ObjectStoreState> {
  private typedEventBus: TypedEventBus
  private typedSubscriptions: Array<() => void> = []
  
  constructor(eventStore: EventStore, typedEventBus: TypedEventBus) {
    super(initialState, eventStore)
    this.typedEventBus = typedEventBus
    this.initializeTypedSubscriptions()
  }
  
  /**
   * Initialize typed event subscriptions for UI events
   */
  private initializeTypedSubscriptions(): void {
    // Subscribe to object events
    this.typedSubscriptions.push(
      this.typedEventBus.on('canvas.object.added', (data: EventRegistry['canvas.object.added']) => {
        const { object } = data
        const objectId = object.id
        this.setState(state => {
          const newObjects = new Map(state.objects)
          newObjects.set(objectId, object)
          const newOrder = [...state.objectOrder, objectId].sort((a, b) => {
            const objA = newObjects.get(a)
            const objB = newObjects.get(b)
            return (objA?.zIndex || 0) - (objB?.zIndex || 0)
          })
          
          return {
            ...state,
            objects: newObjects,
            objectOrder: newOrder
          }
        })
      })
    )
    
    this.typedSubscriptions.push(
      this.typedEventBus.on('canvas.object.removed', (data: EventRegistry['canvas.object.removed']) => {
        const { objectId } = data
        this.setState(state => {
          const newObjects = new Map(state.objects)
          newObjects.delete(objectId)
          const newSelectedIds = new Set(state.selectedObjectIds)
          newSelectedIds.delete(objectId)
          
          return {
            ...state,
            objects: newObjects,
            objectOrder: state.objectOrder.filter(id => id !== objectId),
            selectedObjectIds: newSelectedIds
          }
        })
      })
    )
    
    this.typedSubscriptions.push(
      this.typedEventBus.on('canvas.object.modified', (data: EventRegistry['canvas.object.modified']) => {
        const { objectId, newState } = data
        // Get the updated object from the canvas manager since event doesn't include full object
        const object = this.getUpdatedObjectFromNewState(objectId, newState)
        if (!object) return // Skip if object doesn't exist
        
        this.setState(state => {
          const newObjects = new Map(state.objects)
          newObjects.set(objectId, object)
          
          // Re-sort if z-index changed
          let newOrder = state.objectOrder
          if (newState?.zIndex !== undefined) {
            newOrder = [...state.objectOrder].sort((a, b) => {
              const objA = newObjects.get(a)
              const objB = newObjects.get(b)
              return (objA?.zIndex || 0) - (objB?.zIndex || 0)
            })
          }
          
          return {
            ...state,
            objects: newObjects,
            objectOrder: newOrder
          }
        })
      })
    )
    
    this.typedSubscriptions.push(
      this.typedEventBus.on('selection.changed', (data: EventRegistry['selection.changed']) => {
        // Extract object IDs from selection
        const selectedIds = this.extractObjectIdsFromSelection(data.selection)
        this.setState(state => ({
          ...state,
          selectedObjectIds: new Set(selectedIds)
        }))
      })
    )
  }

  /**
   * Define event handlers for event sourcing (from BaseStore)
   */
  protected getEventHandlers(): Map<string, (event: Event) => void> {
    return new Map([
      // Add event sourcing handlers here if needed
      // For now, we rely on TypedEventBus for UI events
    ])
  }

  /**
   * Override dispose to clean up typed subscriptions
   */
  dispose(): void {
    // Clean up typed subscriptions
    this.typedSubscriptions.forEach(unsubscribe => unsubscribe())
    this.typedSubscriptions = []
    
    // Call parent dispose
    super.dispose()
  }

  // Getters
  getObject(id: string): NewCanvasObject | undefined {
    return this.getState().objects.get(id)
  }
  
  getAllObjects(): NewCanvasObject[] {
    return Array.from(this.getState().objects.values())
  }
  
  getObjectsInOrder(): NewCanvasObject[] {
    const state = this.getState()
    return state.objectOrder
      .map(id => state.objects.get(id))
      .filter((obj): obj is NewCanvasObject => obj !== undefined)
  }
  
  getSelectedObjects(): NewCanvasObject[] {
    const state = this.getState()
    return Array.from(state.selectedObjectIds)
      .map(id => state.objects.get(id))
      .filter((obj): obj is NewCanvasObject => obj !== undefined)
  }
  
  isObjectSelected(id: string): boolean {
    return this.getState().selectedObjectIds.has(id)
  }
  
  /**
   * Helper method to get updated object from new state
   * Since the event doesn't include the full object, we need to reconstruct it
   */
  private getUpdatedObjectFromNewState(objectId: string, newState: Record<string, unknown>): NewCanvasObject | null {
    const existingObject = this.getState().objects.get(objectId)
    if (!existingObject) return null
    
    // Merge the existing object with the new state
    return {
      ...existingObject,
      ...newState
    } as NewCanvasObject
  }

  /**
   * Helper method to extract object IDs from a selection
   */
  private extractObjectIdsFromSelection(selection: EventRegistry['selection.changed']['selection']): string[] {
    if (!selection) return []
    
    // Handle different selection types
    if (selection.type === 'objects' && 'objectIds' in selection && Array.isArray(selection.objectIds)) {
      return selection.objectIds as string[]
    }
    
    // For other selection types (pixel, rectangle, etc.), return empty array
    // as they don't directly correspond to object selections
    return []
  }
} 