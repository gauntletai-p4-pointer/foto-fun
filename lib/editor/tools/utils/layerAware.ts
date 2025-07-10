import type { CanvasManager, CanvasObject, Layer } from '@/lib/editor/canvas/types'

/**
 * Layer-aware utilities for tools
 * Ensures tools respect layer visibility and locking
 */
export class LayerAwareUtils {
  /**
   * Filter objects by layer visibility
   */
  static filterByLayerVisibility(
    objects: CanvasObject[],
    layers: Layer[]
  ): CanvasObject[] {
    const visibleLayerIds = new Set(
      layers.filter(layer => layer.visible).map(layer => layer.id)
    )
    
    return objects.filter(obj => visibleLayerIds.has(obj.layerId))
  }
  
  /**
   * Check if object's layer is locked
   */
  static isObjectLayerLocked(
    object: CanvasObject,
    layers: Layer[]
  ): boolean {
    const layer = layers.find(l => l.id === object.layerId)
    return layer?.locked || false
  }
  
  /**
   * Get objects from visible and unlocked layers
   */
  static getEditableObjects(
    canvas: CanvasManager
  ): CanvasObject[] {
    const objects: CanvasObject[] = []
    
    canvas.state.layers.forEach(layer => {
      if (layer.visible && !layer.locked) {
        objects.push(...layer.objects)
      }
    })
    
    return objects
  }
  
  /**
   * Set object's layer
   */
  static async setObjectLayer(
    canvas: CanvasManager,
    objectId: string,
    layerId: string
  ): Promise<void> {
    const object = this.findObject(canvas, objectId)
    if (!object) return
    
    const targetLayer = canvas.state.layers.find(l => l.id === layerId)
    if (!targetLayer) return
    
    // Update object's layer
    await canvas.updateObject(objectId, { layerId })
  }
  
  /**
   * Get active layer
   */
  static getActiveLayer(canvas: CanvasManager): Layer | null {
    if (!canvas.state.activeLayerId) {
      return canvas.state.layers[0] || null
    }
    
    return canvas.state.layers.find(l => l.id === canvas.state.activeLayerId) || null
  }
  
  /**
   * Check if we can add objects to the active layer
   */
  static canAddToActiveLayer(canvas: CanvasManager): boolean {
    const activeLayer = this.getActiveLayer(canvas)
    return activeLayer ? !activeLayer.locked : false
  }
  
  /**
   * Find object by ID helper
   */
  private static findObject(canvas: CanvasManager, id: string): CanvasObject | null {
    for (const layer of canvas.state.layers) {
      const obj = layer.objects.find(o => o.id === id)
      if (obj) return obj
    }
    return null
  }
} 