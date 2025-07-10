import { BaseStore } from '../base/BaseStore'
import { Event } from '@/lib/events/core/Event'
import { EventStore } from '@/lib/events/core/EventStore'
import { Layer } from '@/lib/editor/canvas/types'
import { TypedEventBus } from '@/lib/events/core/TypedEventBus'

/**
 * Layer store state
 */
export interface LayerStoreState {
  // Layers
  layers: Layer[]
  activeLayerId: string | null
  
  // Layer state
  layerVisibility: Map<string, boolean>
  layerLocks: Map<string, boolean>
  layerOpacity: Map<string, number>
  
  // Layer groups
  layerGroups: Map<string, string[]>
  expandedGroups: Set<string>
  
  // UI state
  selectedLayerIds: Set<string>
  layerOrder: string[]
}

/**
 * Event-driven layer store
 */
export class EventLayerStore extends BaseStore<LayerStoreState> {
  private typedEventBus: TypedEventBus
  
  constructor(eventStore: EventStore, typedEventBus: TypedEventBus) {
    super(
      {
        layers: [],
        activeLayerId: null,
        layerVisibility: new Map(),
        layerLocks: new Map(),
        layerOpacity: new Map(),
        layerGroups: new Map(),
        expandedGroups: new Set(),
        selectedLayerIds: new Set(),
        layerOrder: []
      },
      eventStore
    )
    this.typedEventBus = typedEventBus
  }
  
  protected getEventHandlers(): Map<string, (event: Event) => void> {
    // We'll use TypedEventBus subscriptions instead of Event handlers
    // since layer events are already handled by TypedCanvasStore
    return new Map()
  }
  
  /**
   * Initialize subscriptions to typed events
   */
  initialize(): void {
    // Subscribe to layer events from TypedEventBus
    this.typedEventBus.on('layer.created', (data) => {
      this.setState(state => ({
        ...state,
        layers: [...state.layers, data.layer],
        activeLayerId: state.activeLayerId || data.layer.id,
        layerOrder: [...state.layerOrder, data.layer.id]
      }))
    })
    
    this.typedEventBus.on('layer.removed', (data) => {
      this.setState(state => {
        const layers = state.layers.filter(l => l.id !== data.layerId)
        const activeLayerId = state.activeLayerId === data.layerId 
          ? layers[0]?.id || null 
          : state.activeLayerId
        
        const layerOrder = state.layerOrder.filter(id => id !== data.layerId)
        const selectedLayerIds = new Set(state.selectedLayerIds)
        selectedLayerIds.delete(data.layerId)
        
        return {
          ...state,
          layers,
          activeLayerId,
          layerOrder,
          selectedLayerIds
        }
      })
    })
    
    this.typedEventBus.on('layer.reordered', (data) => {
      this.setState(state => {
        // For now, just update the layer order based on the new order
        return {
          ...state,
          layerOrder: data.layerIds
        }
      })
    })
    
    this.typedEventBus.on('layer.modified', (data) => {
      this.setState(state => {
        const layers = state.layers.map(layer =>
          layer.id === data.layerId
            ? { ...layer, ...data.modifications }
            : layer
        )
        
        // Update visibility and opacity maps if changed
        const layerVisibility = new Map(state.layerVisibility)
        const layerOpacity = new Map(state.layerOpacity)
        
        if (data.modifications.visible !== undefined) {
          layerVisibility.set(data.layerId, data.modifications.visible)
        }
        if (data.modifications.opacity !== undefined) {
          layerOpacity.set(data.layerId, data.modifications.opacity)
        }
        
        return {
          ...state,
          layers,
          layerVisibility,
          layerOpacity
        }
      })
    })
  }
  
  // Public methods
  
  /**
   * Get all layers
   */
  getLayers(): Layer[] {
    return this.getState().layers
  }
  
  /**
   * Get active layer
   */
  getActiveLayer(): Layer | null {
    const state = this.getState()
    return state.layers.find(l => l.id === state.activeLayerId) || null
  }
  
  /**
   * Get layer by ID
   */
  getLayer(layerId: string): Layer | null {
    return this.getState().layers.find(l => l.id === layerId) || null
  }
  
  /**
   * Set active layer
   */
  setActiveLayer(layerId: string): void {
    const layer = this.getLayer(layerId)
    if (layer) {
      this.setState(state => ({
        ...state,
        activeLayerId: layerId
      }))
    }
  }
  
  /**
   * Select layers
   */
  selectLayers(layerIds: string[]): void {
    this.setState(state => ({
      ...state,
      selectedLayerIds: new Set(layerIds)
    }))
  }
  
  /**
   * Toggle layer selection
   */
  toggleLayerSelection(layerId: string): void {
    this.setState(state => {
      const selectedLayerIds = new Set(state.selectedLayerIds)
      if (selectedLayerIds.has(layerId)) {
        selectedLayerIds.delete(layerId)
      } else {
        selectedLayerIds.add(layerId)
      }
      
      return {
        ...state,
        selectedLayerIds
      }
    })
  }
  
  /**
   * Get selected layers
   */
  getSelectedLayers(): Layer[] {
    const state = this.getState()
    return state.layers.filter(l => state.selectedLayerIds.has(l.id))
  }
  
  /**
   * Check if layer is selected
   */
  isLayerSelected(layerId: string): boolean {
    return this.getState().selectedLayerIds.has(layerId)
  }
  
  /**
   * Get layer children (for groups)
   */
  getLayerChildren(parentId: string): Layer[] {
    return this.getState().layers.filter(l => l.parentId === parentId)
  }
  
  /**
   * Check if group is expanded
   */
  isGroupExpanded(groupId: string): boolean {
    return this.getState().expandedGroups.has(groupId)
  }
  
  /**
   * Toggle group expansion
   */
  toggleGroupExpansion(groupId: string): void {
    this.setState(state => {
      const expandedGroups = new Set(state.expandedGroups)
      if (expandedGroups.has(groupId)) {
        expandedGroups.delete(groupId)
      } else {
        expandedGroups.add(groupId)
      }
      
      return {
        ...state,
        expandedGroups
      }
    })
  }
} 