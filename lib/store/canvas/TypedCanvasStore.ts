import { TypedEventBus } from '@/lib/events/core/TypedEventBus'
import type { Layer, Selection, Point } from '@/lib/editor/canvas/types'
import type { CanvasObject } from '@/lib/editor/objects/types'

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
 * Canvas Store using typed event bus
 * Simpler implementation without complex event sourcing
 */
export class TypedCanvasStore {
  private state: CanvasStoreState
  private eventBus: TypedEventBus
  private listeners = new Set<(state: CanvasStoreState) => void>()
  private subscriptions: Array<() => void> = []
  
  constructor(eventBus: TypedEventBus) {
    this.state = { ...initialState }
    this.eventBus = eventBus
    this.subscribeToEvents()
  }
  
  private subscribeToEvents(): void {
    // Canvas object events
    this.subscriptions.push(
      this.eventBus.on('canvas.object.added', (data) => {
        this.setState(state => ({
          ...state,
          objects: {
            ...state.objects,
            [(data.object as { id?: string }).id || data.object.toString()]: {
              // Spread the object first, then override specific properties if needed
              ...data.object,
              // Only override layerId if not present in the object
              layerId: (data.object as { layerId?: string }).layerId || data.layerId || state.activeLayerId || ''
            } as CanvasObject
          },
          isDirty: true,
          lastModified: data.timestamp
        }))
      })
    )
    
    this.subscriptions.push(
      this.eventBus.on('canvas.object.modified', (data) => {
        this.setState(state => {
          const object = state.objects[data.objectId]
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
            objects: {
              ...state.objects,
              [data.objectId]: updatedObject
            },
            isDirty: true,
            lastModified: data.timestamp
          }
        })
      })
    )
    
    this.subscriptions.push(
      this.eventBus.on('canvas.object.removed', (data) => {
        this.setState(state => {
          const newObjects = { ...state.objects }
          delete newObjects[data.objectId]
          
          return {
            ...state,
            objects: newObjects,
            isDirty: true,
            lastModified: data.timestamp
          }
        })
      })
    )
    
    this.subscriptions.push(
      this.eventBus.on('canvas.objects.batch.modified', (data) => {
        this.setState(state => {
          const updatedObjects = { ...state.objects }
          
          data.modifications.forEach(mod => {
            const objectId = (mod.object as { id?: string }).id || mod.object.toString()
            const object = updatedObjects[objectId]
            if (object) {
              // Safely merge the new state
              const updatedObject = { ...object }
              
              // If data property exists and is an object, merge it
              if (object.data && typeof object.data === 'object' && !(object.data instanceof HTMLImageElement)) {
                updatedObject.data = { ...object.data, ...mod.newState }
              } else {
                // Otherwise, replace properties with new state
                Object.assign(updatedObject, mod.newState)
              }
              
              updatedObjects[objectId] = updatedObject
            }
          })
          
          return {
            ...state,
            objects: updatedObjects,
            isDirty: true,
            lastModified: data.timestamp
          }
        })
      })
    )
    
    // Layer events
    this.subscriptions.push(
      this.eventBus.on('layer.created', (data) => {
        this.setState(state => ({
          ...state,
          layers: [...state.layers, data.layer],
          activeLayerId: state.activeLayerId || data.layer.id,
          isDirty: true,
          lastModified: data.timestamp
        }))
      })
    )
    
    this.subscriptions.push(
      this.eventBus.on('layer.removed', (data) => {
        this.setState(state => {
          const layers = state.layers.filter(l => l.id !== data.layerId)
          const activeLayerId = state.activeLayerId === data.layerId 
            ? layers[0]?.id || null 
            : state.activeLayerId
          
          return {
            ...state,
            layers,
            activeLayerId,
            isDirty: true,
            lastModified: data.timestamp
          }
        })
      })
    )
    
    this.subscriptions.push(
      this.eventBus.on('layer.modified', (data) => {
        this.setState(state => ({
          ...state,
          layers: state.layers.map(layer =>
            layer.id === data.layerId
              ? { ...layer, ...data.modifications }
              : layer
          ),
          isDirty: true,
          lastModified: data.timestamp
        }))
      })
    )
    
    // Selection events
    this.subscriptions.push(
      this.eventBus.on('selection.changed', (data) => {
        this.setState(state => ({
          ...state,
          selection: data.selection
        }))
      })
    )
    
    // Canvas state events
    this.subscriptions.push(
      this.eventBus.on('canvas.resized', (data) => {
        this.setState(state => ({
          ...state,
          width: data.width,
          height: data.height,
          isDirty: true,
          lastModified: data.timestamp
        }))
      })
    )
    
    this.subscriptions.push(
      this.eventBus.on('viewport.changed', (data) => {
        this.setState(state => ({
          ...state,
          zoom: data.zoom ?? state.zoom,
          pan: data.pan ?? state.pan
        }))
      })
    )
    
    // Document events
    this.subscriptions.push(
      this.eventBus.on('document.loaded', (data) => {
        this.setState(() => ({
          ...initialState,
          documentId: data.document.id,
          documentName: data.document.name,
          width: data.document.width,
          height: data.document.height,
          backgroundColor: data.document.backgroundColor,
          createdAt: data.document.createdAt,
          lastModified: data.document.lastModified,
          isDirty: false
        }))
      })
    )
    
    this.subscriptions.push(
      this.eventBus.on('document.saved', (data) => {
        this.setState(state => ({
          ...state,
          documentId: data.documentId,
          isDirty: false,
          isSaving: false
        }))
      })
    )
  }
  
  private setState(updater: (state: CanvasStoreState) => CanvasStoreState): void {
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
  subscribe(listener: (state: CanvasStoreState) => void): () => void {
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
  getState(): CanvasStoreState {
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
    return Object.values(this.state.objects).filter(obj => obj.layerId === layerId)
  }
  
  /**
   * Get selected objects
   */
  getSelectedObjects(): CanvasObject[] {
    if (!this.state.selection || this.state.selection.type !== 'objects') {
      return []
    }
    
    return this.state.selection.objectIds
      .map(id => this.state.objects[id])
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
    if (!this.state.selection || this.state.selection.type !== 'objects') {
      return false
    }
    
    return this.state.selection.objectIds.includes(objectId)
  }
}

// React hook
import { useEffect, useState } from 'react'

export function useCanvasStore(store: TypedCanvasStore): CanvasStoreState {
  const [state, setState] = useState(() => store.getState())
  
  useEffect(() => {
    const unsubscribe = store.subscribe(setState)
    return unsubscribe
  }, [store])
  
  return state
} 