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
    super(description || 'Crop canvas')
    this.canvasManager = canvasManager
    this.cropRect = cropRect
    this.typedEventBus = ServiceContainer.getInstance().getSync<TypedEventBus>('TypedEventBus')
    
    // Store previous state
    this.previousState = {
      width: (canvasManager.state.documentBounds?.width || 0),
      height: (canvasManager.state.documentBounds?.height || 0)
    }
  }
  
  protected async doExecute(): Promise<void> {
    // Store the current canvas content before cropping
    this.previousState.imageData = this.canvasManager.getImageData()
    
    // Perform the crop
    await this.canvasManager.crop(this.cropRect)
    
    // Emit resize event
    this.typedEventBus.emit('canvas.resized', {
      width: this.cropRect.width,
      height: this.cropRect.height,
      previousWidth: this.previousState.width,
      previousHeight: this.previousState.height
    })
  }
  
  async undo(): Promise<void> {
    if (!this.previousState.imageData) {
      throw new Error('Cannot undo crop - no previous state saved')
    }
    
    // Resize canvas back to original size
    await this.canvasManager.resize(
      this.previousState.width,
      this.previousState.height
    )
    
    // Restore the original image data
    this.canvasManager.putImageData(this.previousState.imageData, { x: 0, y: 0 })
    
    // Emit resize event
    this.typedEventBus.emit('canvas.resized', {
      width: this.previousState.width,
      height: this.previousState.height,
      previousWidth: this.cropRect.width,
      previousHeight: this.cropRect.height
    })
  }
  
  canExecute(): boolean {
    // Validate crop rectangle
    return this.cropRect.width > 0 && 
           this.cropRect.height > 0 &&
           this.cropRect.x >= 0 &&
           this.cropRect.y >= 0 &&
           this.cropRect.x + this.cropRect.width <= (this.canvasManager.state.documentBounds?.width || 0) &&
           this.cropRect.y + this.cropRect.height <= (this.canvasManager.state.documentBounds?.height || 0)
  }
} 