import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager'
import type { CanvasObject } from '@/lib/editor/canvas/types'
import { CanvasToolBridge } from '@/lib/ai/tools/canvas-bridge'
import type { CanvasContext } from '@/lib/ai/tools/canvas-bridge'

/**
 * Canvas Context Manager for AI Agents
 * Manages selection and targeting between workflow steps
 */
export class CanvasContextManager {
  private canvasManager: CanvasManager
  private lastAddedObjects: CanvasObject[] = []
  
  constructor(canvasManager: CanvasManager) {
    this.canvasManager = canvasManager
  }
  
  /**
   * Get fresh canvas context with updated targeting
   * This should be called before each step in a workflow
   */
  getFreshContext(): CanvasContext | null {
    const context = CanvasToolBridge.getCanvasContext()
    if (!context) return null
    
    // Update with current canvas state
    context.targetImages = this.getCurrentTargetImages()
    context.targetingMode = 'selection' // Always 'selection' - no more 'all-images'
    
    return context
  }
  
  /**
   * Get current target images based on selection state
   */
  private getCurrentTargetImages(): CanvasObject[] {
    const selection = this.canvasManager.state.selection
    const allImages: CanvasObject[] = []
    
    // Collect all image objects from all layers
    this.canvasManager.state.layers.forEach(layer => {
      layer.objects.forEach(obj => {
        if (obj.type === 'image') {
          allImages.push(obj)
        }
      })
    })
    
    // If there's an object-based selection, only target selected images
    if (selection?.type === 'objects' && selection.objectIds.length > 0) {
      const selectedImages: CanvasObject[] = []
      selection.objectIds.forEach(id => {
        const obj = this.canvasManager.findObject(id)
        if (obj && obj.type === 'image') {
          selectedImages.push(obj)
        }
      })
      return selectedImages
    }
    
    // Otherwise target all images
    return allImages
  }
  
  /**
   * Track objects added in the last operation
   * This helps us manage selection for subsequent operations
   */
  trackAddedObjects(objects: CanvasObject[]) {
    this.lastAddedObjects = objects
  }
  
  /**
   * Select specific objects for the next operation
   * Used to ensure operations target the right objects
   */
  async selectObjects(objects: CanvasObject[]) {
    if (objects.length === 0) {
      await this.canvasManager.clearSelection()
      return
    }
    
    const objectIds = objects.map(obj => obj.id)
    await this.canvasManager.selectObjects(objectIds)
  }
  
  /**
   * Smart selection based on operation type
   * Helps AI decide what to operate on
   */
  async prepareForOperation(operationType: 'image' | 'text' | 'all') {
    // Check if there's already a selection
    const currentSelection = this.canvasManager.state.selection
    if (currentSelection?.type === 'objects' && currentSelection.objectIds.length > 0) {
      return // Keep existing selection
    }
    
    const allObjects: CanvasObject[] = []
    this.canvasManager.state.layers.forEach(layer => {
      allObjects.push(...layer.objects)
    })
    
    switch (operationType) {
      case 'image':
        const images = allObjects.filter(obj => obj.type === 'image')
        await this.selectObjects(images)
        break
        
      case 'text':
        const textObjects = allObjects.filter(obj => 
          obj.type === 'text' || obj.type === 'verticalText'
        )
        await this.selectObjects(textObjects)
        break
        
      case 'all':
        await this.selectObjects(allObjects)
        break
    }
  }
  
  /**
   * Clear selection after an operation if needed
   */
  async clearSelection() {
    await this.canvasManager.clearSelection()
  }
  
  /**
   * Get objects by type
   */
  getObjectsByType(type: 'image' | 'text'): CanvasObject[] {
    const allObjects: CanvasObject[] = []
    this.canvasManager.state.layers.forEach(layer => {
      allObjects.push(...layer.objects)
    })
    
    if (type === 'image') {
      return allObjects.filter(obj => obj.type === 'image')
    } else if (type === 'text') {
      return allObjects.filter(obj => 
        obj.type === 'text' || obj.type === 'verticalText'
      )
    }
    
    return []
  }
  
  /**
   * Intelligently determine what objects an operation should target
   * based on the operation description
   */
  inferTargetsFromDescription(description: string): {
    targetType: 'image' | 'text' | 'all'
    shouldSelect: boolean
  } {
    const lowerDesc = description.toLowerCase()
    
    // Check for explicit mentions
    if (lowerDesc.includes('text') || lowerDesc.includes('label') || lowerDesc.includes('caption')) {
      return { targetType: 'text', shouldSelect: true }
    }
    
    if (lowerDesc.includes('image') || lowerDesc.includes('photo') || lowerDesc.includes('picture')) {
      return { targetType: 'image', shouldSelect: true }
    }
    
    // Check for operations that typically apply to images
    const imageOperations = [
      'rotate', 'flip', 'brightness', 'contrast', 'saturation',
      'hue', 'exposure', 'blur', 'sharpen', 'grayscale', 'sepia', 'invert'
    ]
    
    if (imageOperations.some(op => lowerDesc.includes(op))) {
      return { targetType: 'image', shouldSelect: true }
    }
    
    // Default to all objects
    return { targetType: 'all', shouldSelect: false }
  }
}

/**
 * Create a context manager for a canvas
 */
export function createCanvasContextManager(canvasManager: CanvasManager): CanvasContextManager {
  return new CanvasContextManager(canvasManager)
}