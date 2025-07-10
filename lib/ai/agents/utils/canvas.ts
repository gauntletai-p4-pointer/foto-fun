import type { Canvas, FabricObject } from 'fabric'
import { ActiveSelection } from 'fabric'
import { CanvasToolBridge } from '@/lib/ai/tools/canvas-bridge'
import type { CanvasContext } from '@/lib/ai/tools/canvas-bridge'

// Type for Fabric.js image objects
type FabricImage = FabricObject & { type: 'image' }

/**
 * Canvas Context Manager for AI Agents
 * Manages selection and targeting between workflow steps
 */
export class CanvasContextManager {
  private canvas: Canvas
  private lastAddedObjects: FabricObject[] = []
  
  constructor(canvas: Canvas) {
    this.canvas = canvas
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
  private getCurrentTargetImages(): FabricImage[] {
    const activeObjects = this.canvas.getActiveObjects()
    const allObjects = this.canvas.getObjects()
    const allImages = allObjects.filter(obj => obj.type === 'image') as FabricImage[]
    
    // If there's a selection, only target selected images
    if (activeObjects.length > 0) {
      return activeObjects.filter(obj => obj.type === 'image') as FabricImage[]
    }
    
    // Otherwise target all images
    return allImages
  }
  
  /**
   * Track objects added in the last operation
   * This helps us manage selection for subsequent operations
   */
  trackAddedObjects(objects: FabricObject[]) {
    this.lastAddedObjects = objects
  }
  
  /**
   * Select specific objects for the next operation
   * Used to ensure operations target the right objects
   */
  selectObjects(objects: FabricObject[]) {
    this.canvas.discardActiveObject()
    
    if (objects.length === 0) return
    
    if (objects.length === 1) {
      this.canvas.setActiveObject(objects[0])
    } else {
      const activeSelection = new ActiveSelection(objects, {
        canvas: this.canvas
      })
      this.canvas.setActiveObject(activeSelection)
    }
    
    this.canvas.requestRenderAll()
  }
  
  /**
   * Smart selection based on operation type
   * Helps AI decide what to operate on
   */
  prepareForOperation(operationType: 'image' | 'text' | 'all') {
    const allObjects = this.canvas.getObjects()
    
    switch (operationType) {
      case 'image':
        // Select all images if no current selection
        if (this.canvas.getActiveObjects().length === 0) {
          const images = allObjects.filter(obj => obj.type === 'image')
          this.selectObjects(images)
        }
        break
        
      case 'text':
        // Select all text objects if no current selection
        if (this.canvas.getActiveObjects().length === 0) {
          const textObjects = allObjects.filter(obj => 
            obj.type === 'text' || obj.type === 'i-text' || obj.type === 'textbox'
          )
          this.selectObjects(textObjects)
        }
        break
        
      case 'all':
        // Select all objects
        this.selectObjects(allObjects)
        break
    }
  }
  
  /**
   * Clear selection after an operation if needed
   */
  clearSelection() {
    this.canvas.discardActiveObject()
    this.canvas.requestRenderAll()
  }
  
  /**
   * Get objects by type
   */
  getObjectsByType(type: 'image' | 'text'): FabricObject[] {
    const allObjects = this.canvas.getObjects()
    
    if (type === 'image') {
      return allObjects.filter(obj => obj.type === 'image')
    } else if (type === 'text') {
      return allObjects.filter(obj => 
        obj.type === 'text' || obj.type === 'i-text' || obj.type === 'textbox'
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
export function createCanvasContextManager(canvas: Canvas): CanvasContextManager {
  return new CanvasContextManager(canvas)
} 