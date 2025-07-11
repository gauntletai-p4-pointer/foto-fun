import { BaseStore } from '../base/BaseStore'
import { Event } from '@/lib/events/core/Event'
import { EventStore } from '@/lib/events/core/EventStore'
import { Layer, FilterStack, FilterInstance } from '@/lib/editor/canvas/types'
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
  
  // Filter state
  layerFilters: Map<string, FilterStack>
  activeFilterId: string | null
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
        layerOrder: [],
        layerFilters: new Map(),
        activeFilterId: null
      },
      eventStore
    )
    this.typedEventBus = typedEventBus
  }
  
  /**
   * Apply an event to update state
   */
  protected applyEvent(event: Event): void {
    // Handle layer events
    // This is called by BaseStore when events are replayed
  }
  
  /**
   * Get event handlers for BaseStore
   */
  protected getEventHandlers(): Map<string, (event: Event) => void> {
    // We use TypedEventBus for handling events, so return empty map
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
        
        // Clean up filter state
        const layerFilters = new Map(state.layerFilters)
        layerFilters.delete(data.layerId)
        
        return {
          ...state,
          layers,
          activeLayerId,
          layerOrder,
          selectedLayerIds,
          layerFilters
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
    
    // Subscribe to filter events
    this.typedEventBus.on('layer.filter.added', (data: { layerId: string; filter: FilterInstance; position?: number }) => {
      this.setState(state => {
        const layer = state.layers.find(l => l.id === data.layerId)
        if (!layer) return state
        
        // Update layer with new filter
        const updatedLayer = { ...layer }
        if (!updatedLayer.filterStack) {
          updatedLayer.filterStack = {
            filters: [],
            enabled: true,
            opacity: 1,
            blendMode: 'normal',
            cachedResult: undefined,
            isDirty: true
          }
        }
        
        // Add filter at position
        if (data.position !== undefined) {
          updatedLayer.filterStack.filters.splice(data.position, 0, data.filter)
        } else {
          updatedLayer.filterStack.filters.push(data.filter)
        }
        updatedLayer.filterStack.isDirty = true
        
        // Update layers array
        const layers = state.layers.map(l => l.id === data.layerId ? updatedLayer : l)
        
        // Update filter map
        const layerFilters = new Map(state.layerFilters)
        layerFilters.set(data.layerId, updatedLayer.filterStack)
        
        return {
          ...state,
          layers,
          layerFilters,
          activeFilterId: data.filter.id
        }
      })
    })
    
    this.typedEventBus.on('layer.filter.removed', (data: { layerId: string; filterId: string }) => {
      this.setState(state => {
        const layer = state.layers.find(l => l.id === data.layerId)
        if (!layer || !layer.filterStack) return state
        
        // Update layer by removing filter
        const updatedLayer = { ...layer }
        if (updatedLayer.filterStack) {
          updatedLayer.filterStack = {
            ...updatedLayer.filterStack,
            filters: updatedLayer.filterStack.filters.filter(f => f.id !== data.filterId),
            isDirty: true,
            enabled: updatedLayer.filterStack.enabled,
            opacity: updatedLayer.filterStack.opacity,
            blendMode: updatedLayer.filterStack.blendMode,
            cachedResult: updatedLayer.filterStack.cachedResult
          }
        }
        
        // Update layers array
        const layers = state.layers.map(l => l.id === data.layerId ? updatedLayer : l)
        
        // Update filter map
        const layerFilters = new Map(state.layerFilters)
        if (updatedLayer.filterStack) {
          layerFilters.set(data.layerId, updatedLayer.filterStack)
        }
        
        return {
          ...state,
          layers,
          layerFilters,
          activeFilterId: state.activeFilterId === data.filterId ? null : state.activeFilterId
        }
      })
    })
    
    this.typedEventBus.on('layer.filter.stack.updated', (data: { layerId: string; filterStack: FilterStack }) => {
      this.setState(state => {
        const layer = state.layers.find(l => l.id === data.layerId)
        if (!layer) return state
        
        // Update layer with new filter stack
        const updatedLayer = { ...layer, filterStack: data.filterStack }
        const layers = state.layers.map(l => l.id === data.layerId ? updatedLayer : l)
        
        // Update filter map
        const layerFilters = new Map(state.layerFilters)
        layerFilters.set(data.layerId, data.filterStack)
        
        return {
          ...state,
          layers,
          layerFilters
        }
      })
    })
    
    this.typedEventBus.on('layer.filters.reordered', (data: { layerId: string; filterIds: string[] }) => {
      this.setState(state => {
        const layer = state.layers.find(l => l.id === data.layerId)
        if (!layer || !layer.filterStack) return state
        
        // Reorder filters based on new order
        const updatedLayer = { ...layer }
        const orderedFilters: FilterInstance[] = []
        
        if (updatedLayer.filterStack) {
          data.filterIds.forEach(filterId => {
            const filter = updatedLayer.filterStack!.filters.find(f => f.id === filterId)
            if (filter) {
              orderedFilters.push(filter)
            }
          })
          
          updatedLayer.filterStack = {
            ...updatedLayer.filterStack,
            filters: orderedFilters,
            isDirty: true,
            enabled: updatedLayer.filterStack.enabled,
            opacity: updatedLayer.filterStack.opacity,
            blendMode: updatedLayer.filterStack.blendMode,
            cachedResult: updatedLayer.filterStack.cachedResult
          }
        }
        
        // Update layers array
        const layers = state.layers.map(l => l.id === data.layerId ? updatedLayer : l)
        
        // Update filter map
        const layerFilters = new Map(state.layerFilters)
        if (updatedLayer.filterStack) {
          layerFilters.set(data.layerId, updatedLayer.filterStack)
        }
        
        return {
          ...state,
          layers,
          layerFilters
        }
      })
    })
    
    // Subscribe to layer parent change events
    this.typedEventBus.on('layer.parent.changed', (data) => {
      this.setState(state => {
        const layers = state.layers.map(layer =>
          layer.id === data.layerId
            ? { ...layer, parentId: data.parentId }
            : layer
        )
        
        return {
          ...state,
          layers
        }
      })
    })
    
    // Subscribe to group expansion events
    this.typedEventBus.on('layer.group.expansion.changed', (data) => {
      this.setState(state => {
        const expandedGroups = new Set(state.expandedGroups)
        if (data.expanded) {
          expandedGroups.add(data.groupId)
        } else {
          expandedGroups.delete(data.groupId)
        }
        
        return {
          ...state,
          expandedGroups
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
  
  /**
   * Get filter stack for a layer
   */
  getLayerFilterStack(layerId: string): FilterStack | undefined {
    const state = this.getState()
    return state.layerFilters.get(layerId)
  }
  
  /**
   * Get all layers with filters
   */
  getLayersWithFilters(): Layer[] {
    const state = this.getState()
    return state.layers.filter(layer => layer.filterStack && layer.filterStack.filters.length > 0)
  }
  
  /**
   * Set active filter for editing
   */
  setActiveFilter(filterId: string | null): void {
    this.setState(state => ({
      ...state,
      activeFilterId: filterId
    }))
  }
  
  /**
   * Get active filter
   */
  getActiveFilter(): FilterInstance | null {
    const state = this.getState()
    if (!state.activeFilterId) return null
    
    for (const layer of state.layers) {
      if (layer.filterStack) {
        const filter = layer.filterStack.filters.find(f => f.id === state.activeFilterId)
        if (filter) return filter
      }
    }
    
    return null
  }
} 