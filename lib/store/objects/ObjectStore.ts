import type { TypedEventBus } from '@/lib/events/core/TypedEventBus'
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
      this.eventBus.on('canvas.object.added' as any, (data) => {
        const { objectId, object } = data
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
      this.eventBus.on('canvas.object.removed' as any, (data) => {
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
      this.eventBus.on('canvas.object.modified' as any, (data) => {
        const { objectId, object, updates } = data
        this.setState(state => {
          const newObjects = new Map(state.objects)
          newObjects.set(objectId, object)
          
          // Re-sort if z-index changed
          let newOrder = state.objectOrder
          if (updates?.zIndex !== undefined) {
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
      this.eventBus.on('selection.changed' as any, (data) => {
        const { selectedIds } = data
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
  
  dispose(): void {
    this.subscriptions.forEach(unsubscribe => unsubscribe())
    this.subscriptions = []
    this.listeners.clear()
  }
} 