import type { CanvasManager } from '@/lib/editor/canvas/types'
import { Command } from '../base'
import type { TypedEventBus } from '@/lib/events/core/TypedEventBus'

interface CropArea {
  x: number
  y: number
  width: number
  height: number
}

export class CropCommand extends Command {
  private canvasManager: CanvasManager
  private cropArea: CropArea
  private originalDimensions: { width: number; height: number } | null = null
  
  constructor(
    canvasManager: CanvasManager,
    cropArea: CropArea,
    eventBus: TypedEventBus
  ) {
    super('Crop canvas', eventBus)
    this.canvasManager = canvasManager
    this.cropArea = cropArea
  }
  
  protected async doExecute(): Promise<void> {
    // Store original dimensions for undo
    this.originalDimensions = {
      width: this.canvasManager.stage.width(),
      height: this.canvasManager.stage.height()
    }
    
    // Apply crop by updating stage size
    this.canvasManager.stage.width(this.cropArea.width)
    this.canvasManager.stage.height(this.cropArea.height)
    
    // Emit event using inherited eventBus
    this.eventBus.emit('canvas.resized', {
      width: this.cropArea.width,
      height: this.cropArea.height,
      previousWidth: this.originalDimensions.width,
      previousHeight: this.originalDimensions.height
    })
  }
  
  async undo(): Promise<void> {
    if (!this.originalDimensions) return
    
    // Restore original dimensions
    this.canvasManager.stage.width(this.originalDimensions.width)
    this.canvasManager.stage.height(this.originalDimensions.height)
    
    // Emit event using inherited eventBus
    this.eventBus.emit('canvas.resized', {
      width: this.originalDimensions.width,
      height: this.originalDimensions.height,
      previousWidth: this.cropArea.width,
      previousHeight: this.cropArea.height
    })
  }
} 