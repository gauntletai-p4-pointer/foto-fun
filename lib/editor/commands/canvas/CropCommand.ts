import { Command } from '../base'
import type { CanvasManager, Rect } from '@/lib/editor/canvas/types'
import { ServiceContainer } from '@/lib/core/ServiceContainer'
import type { TypedEventBus } from '@/lib/events/core/TypedEventBus'

/**
 * Command to crop the canvas or selected image
 */
export class CropCommand extends Command {
  private canvasManager: CanvasManager
  private cropRect: Rect
  private previousState: {
    width: number
    height: number
    imageData?: ImageData
  }
  private typedEventBus: TypedEventBus
  
  constructor(
    canvasManager: CanvasManager,
    cropRect: Rect,
    description?: string
  ) {
    super(description || 'Crop objects')
    this.canvasManager = canvasManager
    this.cropRect = cropRect
    this.typedEventBus = ServiceContainer.getInstance().getSync<TypedEventBus>('TypedEventBus')
    
    // Store previous viewport state (not canvas dimensions - canvas is infinite)
    const viewport = canvasManager.getViewport()
    this.previousState = {
      width: viewport.width,
      height: viewport.height
    }
  }
  
  protected async doExecute(): Promise<void> {
    // In infinite canvas model, we crop selected objects, not the canvas
    const selectedObjects = this.canvasManager.getSelectedObjects()
    
    if (selectedObjects.length === 0) {
      throw new Error('No objects selected to crop')
    }
    
    // Store the current object states before cropping
    this.previousState.imageData = this.canvasManager.getImageData()
    
    // Crop each selected object
    for (const obj of selectedObjects) {
      if (obj.type === 'image') {
        // Update object with crop data
        await this.canvasManager.updateObject(obj.id, {
          metadata: {
            ...obj.metadata,
            crop: {
              cropX: this.cropRect.x,
              cropY: this.cropRect.y,
              cropWidth: this.cropRect.width,
              cropHeight: this.cropRect.height
            }
          },
          width: this.cropRect.width,
          height: this.cropRect.height
        })
      }
    }
  }
  
  async undo(): Promise<void> {
    if (!this.previousState.imageData) {
      throw new Error('Cannot undo crop - no previous state saved')
    }
    
    // Restore the original image data for cropped objects
    this.canvasManager.putImageData(this.previousState.imageData, { x: 0, y: 0 })
  }
  
  canExecute(): boolean {
    // Validate crop rectangle and check if objects are selected
    const selectedObjects = this.canvasManager.getSelectedObjects()
    const hasImageObjects = selectedObjects.some(obj => obj.type === 'image')
    
    return this.cropRect.width > 0 && 
           this.cropRect.height > 0 &&
           this.cropRect.x >= 0 &&
           this.cropRect.y >= 0 &&
           hasImageObjects
  }
} 