import type { CanvasManager, Layer } from '../types'

export interface LayerOptions {
  name?: string
  type?: 'raster' | 'vector' | 'adjustment' | 'text' | 'group'
  fallbackToActive?: boolean
  createIfMissing?: boolean
}

export interface LayerHint {
  preferredId?: string
  preferredType?: Layer['type']
  preferredName?: string
}

export interface LayerStackInfo {
  layers: Layer[]
  activeLayerId: string | null
  visibleLayers: Layer[]
  lockedLayers: Layer[]
  zIndexMap: Map<string, number>
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Manages canvas layers with guaranteed operations and smart selection
 */
export class LayerManager {
  private canvas: CanvasManager
  
  constructor(canvas: CanvasManager) {
    this.canvas = canvas
  }
  
  /**
   * Ensure a layer exists with the given options
   */
  ensureLayer(options: LayerOptions): Layer {
    // Try to find existing layer first
    if (options.name) {
      const existing = this.canvas.state.layers.find(l => l.name === options.name)
      if (existing) return existing
    }
    
    // Check if we should use active layer
    if (options.fallbackToActive && this.canvas.state.activeLayerId) {
      const activeLayer = this.canvas.getActiveLayer()
      if (activeLayer) return activeLayer
    }
    
    // Create new layer if allowed
    if (options.createIfMissing !== false) {
      return this.canvas.addLayer({
        name: options.name || `Layer ${this.canvas.state.layers.length + 1}`,
        type: options.type || 'raster'
      })
    }
    
    // Fallback to first available layer
    if (this.canvas.state.layers.length > 0) {
      return this.canvas.state.layers[0]
    }
    
    // Last resort: create a default layer
    return this.canvas.addLayer({
      name: 'Default Layer',
      type: 'raster'
    })
  }
  
  /**
   * Get target layer based on hints and preferences
   */
  getTargetLayer(hint?: LayerHint): Layer {
    // 1. Try specific ID
    if (hint?.preferredId) {
      const layer = this.canvas.state.layers.find(l => l.id === hint.preferredId)
      if (layer && !layer.locked) return layer
    }
    
    // 2. Try by name
    if (hint?.preferredName) {
      const layer = this.canvas.state.layers.find(l => l.name === hint.preferredName)
      if (layer && !layer.locked) return layer
    }
    
    // 3. Try by type
    if (hint?.preferredType) {
      const layer = this.canvas.state.layers.find(l => l.type === hint.preferredType && !l.locked)
      if (layer) return layer
    }
    
    // 4. Use active layer
    const activeLayer = this.canvas.getActiveLayer()
    if (activeLayer && !activeLayer.locked) {
      return activeLayer
    }
    
    // 5. Find first unlocked layer
    const unlockedLayer = this.canvas.state.layers.find(l => !l.locked)
    if (unlockedLayer) return unlockedLayer
    
    // 6. Create new layer as last resort
    return this.ensureLayer({
      name: 'Auto Layer',
      type: 'raster',
      createIfMissing: true
    })
  }
  
  /**
   * Get complete layer stack information
   */
  getLayerStack(): LayerStackInfo {
    const layers = this.canvas.state.layers
    const zIndexMap = new Map<string, number>()
    
    // Build z-index map (0 is bottom, higher is on top)
    layers.forEach((layer, index) => {
      zIndexMap.set(layer.id, index)
    })
    
    return {
      layers: [...layers],
      activeLayerId: this.canvas.state.activeLayerId,
      visibleLayers: layers.filter(l => l.visible),
      lockedLayers: layers.filter(l => l.locked),
      zIndexMap
    }
  }
  
  /**
   * Validate layer hierarchy
   */
  validateLayerHierarchy(): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    const layers = this.canvas.state.layers
    
    // Check for empty canvas
    if (layers.length === 0) {
      errors.push('No layers exist in canvas')
    }
    
    // Check active layer validity
    if (this.canvas.state.activeLayerId) {
      const activeExists = layers.some(l => l.id === this.canvas.state.activeLayerId)
      if (!activeExists) {
        errors.push('Active layer ID references non-existent layer')
      }
    }
    
    // Check for duplicate IDs
    const ids = new Set<string>()
    for (const layer of layers) {
      if (ids.has(layer.id)) {
        errors.push(`Duplicate layer ID found: ${layer.id}`)
      }
      ids.add(layer.id)
    }
    
    // Check layer objects
    for (const layer of layers) {
      // Validate object references
      for (const obj of layer.objects) {
        if (obj.layerId !== layer.id) {
          errors.push(`Object ${obj.id} has incorrect layer reference`)
        }
      }
      
      // Check for orphaned Konva nodes
      const konvaChildren = layer.konvaLayer.children.length
      const trackedObjects = layer.objects.length
      if (konvaChildren !== trackedObjects) {
        warnings.push(`Layer ${layer.id} has ${konvaChildren} Konva nodes but ${trackedObjects} tracked objects`)
      }
    }
    
    // Check z-index consistency
    const konvaLayers = this.canvas.konvaStage.children
    const expectedLayerCount = layers.length + 3 // +3 for background, selection, overlay
    
    if (konvaLayers.length !== expectedLayerCount) {
      warnings.push(`Stage has ${konvaLayers.length} layers but expected ${expectedLayerCount}`)
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }
  
  /**
   * Fix common layer issues
   */
  async repairLayers(): Promise<void> {
    const validation = this.validateLayerHierarchy()
    
    if (validation.valid && validation.warnings.length === 0) {
      return // Nothing to fix
    }
    
    console.log('[LayerManager] Repairing layers...', validation)
    
    // Fix missing layers
    if (this.canvas.state.layers.length === 0) {
      this.ensureLayer({
        name: 'Layer 1',
        type: 'raster',
        createIfMissing: true
      })
    }
    
    // Fix invalid active layer
    if (this.canvas.state.activeLayerId) {
      const exists = this.canvas.state.layers.some(l => l.id === this.canvas.state.activeLayerId)
      if (!exists && this.canvas.state.layers.length > 0) {
        this.canvas.setActiveLayer(this.canvas.state.layers[0].id)
      }
    }
    
    // Fix object layer references
    for (const layer of this.canvas.state.layers) {
      for (const obj of layer.objects) {
        if (obj.layerId !== layer.id) {
          obj.layerId = layer.id
        }
      }
    }
    
    // Force re-render
    this.canvas.konvaStage.batchDraw()
  }
  
  /**
   * Get layer by various criteria
   */
  findLayer(criteria: {
    id?: string
    name?: string
    type?: Layer['type']
    hasObject?: string
  }): Layer | null {
    return this.canvas.state.layers.find(layer => {
      if (criteria.id && layer.id !== criteria.id) return false
      if (criteria.name && layer.name !== criteria.name) return false
      if (criteria.type && layer.type !== criteria.type) return false
      if (criteria.hasObject && !layer.objects.some(obj => obj.id === criteria.hasObject)) return false
      return true
    }) || null
  }
  
  /**
   * Move layer to specific z-index
   */
  moveLayerToIndex(layerId: string, newIndex: number): void {
    const layers = this.canvas.state.layers
    const currentIndex = layers.findIndex(l => l.id === layerId)
    
    if (currentIndex === -1) {
      console.error(`Layer ${layerId} not found`)
      return
    }
    
    // Clamp index
    const targetIndex = Math.max(0, Math.min(layers.length - 1, newIndex))
    
    if (currentIndex !== targetIndex) {
      this.canvas.reorderLayers(currentIndex, targetIndex)
    }
  }
  
  /**
   * Create layer with auto-positioning
   */
  createSmartLayer(options: {
    basedOn?: 'selection' | 'activeLayer' | 'top'
    name?: string
    type?: Layer['type']
  }): Layer {
    const name = options.name || `Layer ${this.canvas.state.layers.length + 1}`
    const type = options.type || 'raster'
    
    // Create the layer
    const layer = this.canvas.addLayer({ name, type })
    
    // Position based on strategy
    switch (options.basedOn) {
      case 'selection':
        // Place above any layers containing selected objects
        const selection = this.canvas.state.selection
        if (selection?.type === 'objects' && selection.objectIds.length > 0) {
          const highestIndex = this.getHighestLayerIndexForObjects(selection.objectIds)
          if (highestIndex >= 0) {
            this.moveLayerToIndex(layer.id, highestIndex + 1)
          }
        }
        break
        
      case 'activeLayer':
        // Place above active layer
        if (this.canvas.state.activeLayerId) {
          const activeIndex = this.canvas.state.layers.findIndex(
            l => l.id === this.canvas.state.activeLayerId
          )
          if (activeIndex >= 0) {
            this.moveLayerToIndex(layer.id, activeIndex + 1)
          }
        }
        break
        
      case 'top':
      default:
        // Already at top (default behavior)
        break
    }
    
    return layer
  }
  
  /**
   * Get highest layer index containing any of the specified objects
   */
  private getHighestLayerIndexForObjects(objectIds: string[]): number {
    let highestIndex = -1
    
    this.canvas.state.layers.forEach((layer, index) => {
      if (layer.objects.some(obj => objectIds.includes(obj.id))) {
        highestIndex = Math.max(highestIndex, index)
      }
    })
    
    return highestIndex
  }
} 