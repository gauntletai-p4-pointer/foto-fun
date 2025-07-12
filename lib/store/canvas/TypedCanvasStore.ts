import { BaseStore } from '../base/BaseStore'
import type { EventStore } from '@/lib/events/core/EventStore'
import type { Event } from '@/lib/events/core/Event'
import { TypedEventBus } from '@/lib/events/core/TypedEventBus'
// Layer, Selection, Point imports removed - using object-based architecture
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
  
  // Canvas dimensions (viewport size)
  width: number
  height: number
  
  // Loading state
  isLoading: boolean
  
  // Selection state for backward compatibility
  selection: {
    count: number
    hasSelection: boolean
    types: string[]
  } | null
  
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
  width: 800,
  height: 600,
  isLoading: false,
  selection: null,
  version: 1,
  createdAt: Date.now(),
  lastModified: Date.now()
}

/**
 * Canvas Store using typed event bus
 * Now extends BaseStore for architectural consistency
 */
export class TypedCanvasStore extends BaseStore<TypedCanvasState> {
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
    // Viewport events (for infinite canvas navigation)
    this.typedSubscriptions.push(
      this.typedEventBus.on('viewport.changed', (data) => {
        this.setState(state => ({
          ...state,
          zoom: data.zoom ?? state.zoom,
          pan: data.pan ?? state.pan
        }))
      })
    )

    // Object events
    this.typedSubscriptions.push(
      this.typedEventBus.on('canvas.object.added', (data) => {
        this.setState(state => ({
          ...state,
          objects: [
            ...state.objects,
            {
              // Spread the object with all its properties
              ...data.object
            } as CanvasObject
          ],
          selectedObjectIds: [...state.selectedObjectIds, (data.object as { id?: string }).id || data.object.toString()],
          lastModified: data.timestamp
        }))
      })
    )
    
    this.typedSubscriptions.push(
      this.typedEventBus.on('canvas.object.modified', (data) => {
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
    
    this.typedSubscriptions.push(
      this.typedEventBus.on('canvas.object.removed', (data) => {
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
    
    this.typedSubscriptions.push(
      this.typedEventBus.on('canvas.objects.batch.modified', (data) => {
        this.setState(state => {
          const updatedObjects = state.objects.map(obj => {
            const mod = data.modifications.find(mod => mod.object.id === obj.id)
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
            selectedObjectIds: updatedObjects.map(obj => obj.id).filter(id => data.modifications.some(mod => mod.object.id === id)),
            lastModified: data.timestamp
          }
        })
      })
    )
    
    // Selection events
    this.typedSubscriptions.push(
      this.typedEventBus.on('selection.changed', (data) => {
        const selectedObjectIds = data.selection?.type === 'objects' ? data.selection.objectIds : []
        const selectedObjects = selectedObjectIds
          .map(id => this.getState().objects.find(obj => obj.id === id))
          .filter((obj): obj is CanvasObject => obj !== undefined)
        
        this.setState(state => ({
          ...state,
          selectedObjectIds,
          selection: {
            count: selectedObjects.length,
            hasSelection: selectedObjects.length > 0,
            types: [...new Set(selectedObjects.map(obj => obj.type))]
          }
        }))
      })
    )
    
    // Canvas dimension events
    this.typedSubscriptions.push(
      this.typedEventBus.on('canvas.resized', (data) => {
        this.setState(state => ({
          ...state,
          width: data.width,
          height: data.height
        }))
      })
    )
    
    // Loading state events
    this.typedSubscriptions.push(
      this.typedEventBus.on('canvas.loading.changed', (data) => {
        this.setState(state => ({
          ...state,
          isLoading: data.isLoading
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

  // Helper methods
  
  /**
   * Get selected objects
   */
  getSelectedObjects(): CanvasObject[] {
    const state = this.getState()
    return state.selectedObjectIds
      .map(id => state.objects.find(obj => obj.id === id))
      .filter((obj): obj is CanvasObject => obj !== undefined)
  }
  
  /**
   * Check if an object is selected
   */
  isObjectSelected(objectId: string): boolean {
    return this.getState().selectedObjectIds.includes(objectId)
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