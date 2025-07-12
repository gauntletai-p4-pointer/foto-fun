import type { TypedEventBus, EventRegistry } from '@/lib/events/core/TypedEventBus'
import type { CanvasObject as NewCanvasObject } from '@/lib/editor/objects/types'

export interface ObjectStoreState {
  objects: Map<string, NewCanvasObject>
  objectOrder: string[]
  selectedObjectIds: Set<string>
}

export class ObjectStore {
  private state: ObjectStoreState
  private listeners = new Set<(state: ObjectStoreState) => void>()
  private subscriptions: Array<() => void> = []
  
  constructor(private eventBus: TypedEventBus) {
    this.state = {
      objects: new Map(),
      objectOrder: [],
      selectedObjectIds: new Set()
    }
    
    this.subscribeToEvents()
  }
  
  private subscribeToEvents(): void {
    // Subscribe to object events
    this.subscriptions.push(
      this.eventBus.on('canvas.object.added', (data: EventRegistry['canvas.object.added']) => {
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
    
    this.subscriptions.push(
      this.eventBus.on('canvas.object.removed', (data: EventRegistry['canvas.object.removed']) => {
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
    
    this.subscriptions.push(
      this.eventBus.on('canvas.object.modified', (data: EventRegistry['canvas.object.modified']) => {
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
    
    this.subscriptions.push(
      this.eventBus.on('selection.changed', (data: EventRegistry['selection.changed']) => {
        // Extract object IDs from selection
        const selectedIds = this.extractObjectIdsFromSelection(data.selection)
        this.setState(state => ({
          ...state,
          selectedObjectIds: new Set(selectedIds)
        }))
      })
    )
  }
  
  private setState(updater: (state: ObjectStoreState) => ObjectStoreState): void {
    const newState = updater(this.state)
    if (newState !== this.state) {
      this.state = newState
      this.notifyListeners()
    }
  }
  
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.state)
      } catch (error) {
        console.error('Error in object store listener:', error)
      }
    })
  }
  
  subscribe(listener: (state: ObjectStoreState) => void): () => void {
    this.listeners.add(listener)
    listener(this.state) // Call immediately with current state
    
    return () => {
      this.listeners.delete(listener)
    }
  }
  
  // Getters
  getState(): ObjectStoreState {
    return this.state
  }
  
  getObject(id: string): NewCanvasObject | undefined {
    return this.state.objects.get(id)
  }
  
  getAllObjects(): NewCanvasObject[] {
    return Array.from(this.state.objects.values())
  }
  
  getObjectsInOrder(): NewCanvasObject[] {
    return this.state.objectOrder
      .map(id => this.state.objects.get(id))
      .filter((obj): obj is NewCanvasObject => obj !== undefined)
  }
  
  getSelectedObjects(): NewCanvasObject[] {
    return Array.from(this.state.selectedObjectIds)
      .map(id => this.state.objects.get(id))
      .filter((obj): obj is NewCanvasObject => obj !== undefined)
  }
  
  isObjectSelected(id: string): boolean {
    return this.state.selectedObjectIds.has(id)
  }
  
  /**
   * Helper method to get updated object from new state
   * Since the event doesn't include the full object, we need to reconstruct it
   */
  private getUpdatedObjectFromNewState(objectId: string, newState: Record<string, unknown>): NewCanvasObject | null {
    const existingObject = this.state.objects.get(objectId)
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

  dispose(): void {
    this.subscriptions.forEach(unsubscribe => unsubscribe())
    this.subscriptions = []
    this.listeners.clear()
  }
} 