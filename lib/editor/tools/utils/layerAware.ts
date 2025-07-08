import { useLayerStore } from '@/store/layerStore'
import type { FabricObject, Canvas } from 'fabric'
import type { Layer, CustomFabricObjectProps } from '@/types'

// Type for the 'this' context when mixin methods are called
interface LayerAwareContext {
  canvas?: Canvas
}

/**
 * LayerAwareMixin - Provides layer-aware functionality for tools
 * 
 * This mixin handles the integration between tools and the layer system,
 * ensuring that all objects are properly associated with layers and
 * respecting layer visibility and lock status.
 */
export const LayerAwareMixin = {
  /**
   * Add an object to the active layer
   * Creates a default layer if none exists
   * 
   * @param object - The Fabric object to add
   * @param canvas - The Fabric canvas instance
   * @throws Error if the active layer is locked
   */
  addObjectToLayer(this: LayerAwareContext, object: FabricObject): void {
    const layerStore = useLayerStore.getState()
    let activeLayer = layerStore.getActiveLayer()
    
    // Create default layer if none exists
    if (!activeLayer) {
      activeLayer = layerStore.addLayer({ 
        type: 'image', 
        name: 'Layer 1' 
      })
    }
    
    // Check if layer is locked
    if (activeLayer.locked) {
      throw new Error('Cannot add objects to a locked layer')
    }
    
    // Tag object with layer ID for tracking
    const objWithProps = object as FabricObject & CustomFabricObjectProps
    objWithProps.layerId = activeLayer.id
    
    // Add to canvas for rendering
    if (this.canvas) {
      this.canvas.add(object)
    }
    
    // Update layer's object list
    const currentObjects = activeLayer.objectIds || []
    layerStore.updateLayer(activeLayer.id, {
      objectIds: [...currentObjects, objWithProps.id || LayerAwareMixin.generateObjectId(object)]
    })
  },
  
  /**
   * Check if an object can be modified based on its layer status
   * 
   * @param object - The Fabric object to check
   * @returns true if the object can be modified, false otherwise
   */
  canModifyObject(object: FabricObject): boolean {
    const objWithProps = object as FabricObject & CustomFabricObjectProps
    const layerId = objWithProps.layerId
    
    // Legacy objects without layer association can be modified
    if (!layerId) return true
    
    const layer = useLayerStore.getState().getLayerById(layerId)
    
    // If layer doesn't exist, allow modification
    if (!layer) return true
    
    // Check layer status
    return !layer.locked && layer.visible
  },
  
  /**
   * Get the layer for a given object
   * 
   * @param object - The Fabric object
   * @returns The layer containing the object, or null
   */
  getObjectLayer(object: FabricObject): Layer | null {
    const objWithProps = object as FabricObject & CustomFabricObjectProps
    const layerId = objWithProps.layerId
    if (!layerId) return null
    
    return useLayerStore.getState().getLayerById(layerId) || null
  },
  
  /**
   * Remove an object from its layer
   * 
   * @param object - The Fabric object to remove
   */
  removeObjectFromLayer(object: FabricObject): void {
    const objWithProps = object as FabricObject & CustomFabricObjectProps
    const layerId = objWithProps.layerId
    if (!layerId) return
    
    const layer = useLayerStore.getState().getLayerById(layerId)
    if (!layer) return
    
    const objectId = objWithProps.id
    if (!objectId) return
    
    // Remove from layer's object list
    const updatedObjectIds = (layer.objectIds || []).filter((id: string) => id !== objectId)
    useLayerStore.getState().updateLayer(layerId, {
      objectIds: updatedObjectIds
    })
  },
  
  /**
   * Check if the active layer can be drawn on
   * 
   * @returns true if drawing is allowed, false otherwise
   */
  canDrawOnActiveLayer(): boolean {
    const activeLayer = useLayerStore.getState().getActiveLayer()
    
    // No active layer means we'll create one, so drawing is allowed
    if (!activeLayer) return true
    
    // Check layer status
    return !activeLayer.locked && activeLayer.visible
  },
  
  /**
   * Generate a unique ID for an object
   * 
   * @param object - The Fabric object
   * @returns A unique ID string
   */
  generateObjectId(object: FabricObject): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substr(2, 9)
    const type = object.type || 'object'
    const id = `${type}_${timestamp}_${random}`
    
    // Set the ID on the object for future reference
    const objWithProps = object as FabricObject & CustomFabricObjectProps
    objWithProps.id = id
    
    return id
  },
  
  /**
   * Get all objects in a specific layer
   * 
   * @param layerId - The layer ID
   * @param canvas - The Fabric canvas instance
   * @returns Array of objects in the layer
   */
  getLayerObjects(layerId: string, canvas: Canvas): FabricObject[] {
    const allObjects = canvas.getObjects() as FabricObject[]
    return allObjects.filter(obj => {
      const objWithProps = obj as FabricObject & CustomFabricObjectProps
      return objWithProps.layerId === layerId
    })
  },
  
  /**
   * Update layer visibility for all its objects
   * 
   * @param layerId - The layer ID
   * @param visible - Whether the layer should be visible
   * @param canvas - The Fabric canvas instance
   */
  updateLayerVisibility(layerId: string, visible: boolean, canvas: Canvas): void {
    const objects = this.getLayerObjects(layerId, canvas)
    objects.forEach(obj => {
      obj.set('visible', visible)
    })
    canvas.renderAll()
  }
}

/**
 * Type augmentation for tools using the mixin
 */
export interface LayerAwareToolMixin {
  addObjectToLayer: typeof LayerAwareMixin.addObjectToLayer
  canModifyObject: typeof LayerAwareMixin.canModifyObject
  getObjectLayer: typeof LayerAwareMixin.getObjectLayer
  removeObjectFromLayer: typeof LayerAwareMixin.removeObjectFromLayer
  canDrawOnActiveLayer: typeof LayerAwareMixin.canDrawOnActiveLayer
  generateObjectId: typeof LayerAwareMixin.generateObjectId
  getLayerObjects: typeof LayerAwareMixin.getLayerObjects
  updateLayerVisibility: typeof LayerAwareMixin.updateLayerVisibility
} 