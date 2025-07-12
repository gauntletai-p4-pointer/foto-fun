import { TypedEventBus } from '@/lib/events/core/TypedEventBus'
import type { Layer, Selection, Point } from '@/lib/editor/canvas/types'
import type { CanvasObject } from '@/lib/editor/objects/types'

export interface TypedCanvasState {
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

const initialState: TypedCanvasState = {
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
 * Canvas Store using typed event bus
 * Simpler implementation without complex event sourcing
 */
export class TypedCanvasStore {
  private state: TypedCanvasState
  private eventBus: TypedEventBus
  private listeners = new Set<(state: TypedCanvasState) => void>()
  private subscriptions: Array<() => void> = []
  
  constructor(eventBus: TypedEventBus) {
    this.state = { ...initialState }
    this.eventBus = eventBus
    this.subscribeToEvents()
  }
  
  private subscribeToEvents(): void {
    // Viewport events (for infinite canvas navigation)
    this.subscriptions.push(
      this.eventBus.on('viewport.changed', (data) => {
        this.setState(state => ({
          ...state,
          zoom: data.zoom ?? state.zoom,
          pan: data.pan ?? state.pan
        }))
      })
    )

    // Object events
    this.subscriptions.push(
      this.eventBus.on('canvas.object.added', (data) => {
        this.setState(state => ({
          ...state,
          objects: [
            ...state.objects,
            {
              // Spread the object first, then override specific properties if needed
              ...data.object,
              // Only override layerId if not present in the object
              layerId: (data.object as { layerId?: string }).layerId || data.layerId || ''
            } as CanvasObject
          ],
          selectedObjectIds: [...state.selectedObjectIds, (data.object as { id?: string }).id || data.object.toString()],
          lastModified: data.timestamp
        }))
      })
    )
    
    this.subscriptions.push(
      this.eventBus.on('canvas.object.modified', (data) => {
        this.setState(state => {
          const object = state.objects.find(obj => obj.id === data.objectId)
          if (!object) return state
          
          // Safely merge the new state
          const updatedObject = { ...object }
          
          // If data property exists and is an object, merge it
          if (object.data && typeof object.data === 'object' && !(object.data instanceof HTMLImageElement)) {
            updatedObject.data = { ...object.data, ...data.newState }
          } else {
            // Otherwise, replace the whole object with new state
            Object.assign(updatedObject, data.newState)
          }
          
          return {
            ...state,
            objects: state.objects.map(obj => obj.id === data.objectId ? updatedObject : obj),
            selectedObjectIds: state.selectedObjectIds.map(id => id === data.objectId ? updatedObject.id || updatedObject.toString() : id),
            lastModified: data.timestamp
          }
        })
      })
    )
    
    this.subscriptions.push(
      this.eventBus.on('canvas.object.removed', (data) => {
        this.setState(state => {
          const newObjects = state.objects.filter(obj => obj.id !== data.objectId)
          const newSelectedObjectIds = state.selectedObjectIds.filter(id => id !== data.objectId)
          
          return {
            ...state,
            objects: newObjects,
            selectedObjectIds: newSelectedObjectIds,
            lastModified: data.timestamp
          }
        })
      })
    )
    
    this.subscriptions.push(
      this.eventBus.on('canvas.objects.batch.modified', (data) => {
        this.setState(state => {
          const updatedObjects = state.objects.map(obj => {
            const mod = data.modifications.find(mod => mod.objectId === obj.id)
            if (mod) {
              // Safely merge the new state
              const updatedObject = { ...obj }
              
              // If data property exists and is an object, merge it
              if (obj.data && typeof obj.data === 'object' && !(obj.data instanceof HTMLImageElement)) {
                updatedObject.data = { ...obj.data, ...mod.newState }
              } else {
                // Otherwise, replace properties with new state
                Object.assign(updatedObject, mod.newState)
              }
              
              return updatedObject
            }
            return obj
          })
          
          return {
            ...state,
            objects: updatedObjects,
            selectedObjectIds: updatedObjects.map(obj => obj.id || obj.toString()).filter(id => data.modifications.some(mod => mod.objectId === id)),
            lastModified: data.timestamp
          }
        })
      })
    )
    
    // Selection events
    this.subscriptions.push(
      this.eventBus.on('selection.changed', (data) => {
        this.setState(state => ({
          ...state,
          selectedObjectIds: data.selection.objectIds
        }))
      })
    )
  }
  
  private setState(updater: (state: TypedCanvasState) => TypedCanvasState): void {
    const newState = updater(this.state)
    
    // Only update if state actually changed
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
        console.error('Error in canvas store listener:', error)
      }
    })
  }
  
  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: TypedCanvasState) => void): () => void {
    this.listeners.add(listener)
    
    // Call immediately with current state
    listener(this.state)
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener)
    }
  }
  
  /**
   * Get current state
   */
  getState(): TypedCanvasState {
    return this.state
  }
  
  /**
   * Dispose the store
   */
  dispose(): void {
    // Unsubscribe from all events
    this.subscriptions.forEach(unsubscribe => unsubscribe())
    this.subscriptions = []
    
    // Clear listeners
    this.listeners.clear()
  }
  
  // Helper methods
  
  /**
   * Get all objects in a specific layer
   */
  getLayerObjects(layerId: string): CanvasObject[] {
    return this.state.objects.filter(obj => obj.layerId === layerId)
  }
  
  /**
   * Get selected objects
   */
  getSelectedObjects(): CanvasObject[] {
    return this.state.selectedObjectIds
      .map(id => this.state.objects.find(obj => obj.id === id))
      .filter(Boolean)
  }
  
  /**
   * Get active layer - DEPRECATED: Use getSelectedObjects() in object-based architecture
   */
  getActiveLayer(): null {
    // Objects are managed directly now, no active layer concept
    console.warn('getActiveLayer() is deprecated. Use getSelectedObjects() in object-based architecture.')
    return null
  }
  
  /**
   * Check if an object is selected
   */
  isObjectSelected(objectId: string): boolean {
    return this.state.selectedObjectIds.includes(objectId)
  }
}

// React hook
import { useEffect, useState } from 'react'

export function useCanvasStore(store: TypedCanvasStore): TypedCanvasState {
  const [state, setState] = useState(() => store.getState())
  
  useEffect(() => {
    const unsubscribe = store.subscribe(setState)
    return unsubscribe
  }, [store])
  
  return state
} 