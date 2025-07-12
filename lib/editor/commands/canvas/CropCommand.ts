import type { CommandContext } from '../base/Command'
import type { CommandResult } from '../base/CommandResult'
import { Command } from '../base/Command'
import { ExecutionError, success, failure } from '../base/CommandResult'
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager'

export interface CropOptions {
  x: number
  y: number
  width: number
  height: number
}

export class CropCommand extends Command {
  private originalSize: { width: number; height: number }
  private cropOptions: CropOptions
  private canvasManager: CanvasManager

  constructor(
    cropOptions: CropOptions,
    context: CommandContext
  ) {
    super('Crop canvas', context)
    this.cropOptions = cropOptions
    this.canvasManager = context.canvasManager
    this.originalSize = { width: 0, height: 0 } // Will be set in execute
  }

  protected async doExecute(): Promise<void> {
    // Store original size for undo
    const viewport = this.canvasManager.getViewport()
    this.originalSize = {
      width: viewport.width,
      height: viewport.height
    }

    // Apply crop by resizing the stage
    this.canvasManager.stage.width(this.cropOptions.width)
    this.canvasManager.stage.height(this.cropOptions.height)
    
    // Update viewport
    this.canvasManager.updateViewport()

    // Emit event through context
    this.context.eventBus.emit('canvas.resized', {
      width: this.cropOptions.width,
      height: this.cropOptions.height
    })
  }

  async undo(): Promise<CommandResult<void>> {
    try {
      // Restore original size
      this.canvasManager.stage.width(this.originalSize.width)
      this.canvasManager.stage.height(this.originalSize.height)
      
      // Update viewport
      this.canvasManager.updateViewport()

      // Emit event through context
      this.context.eventBus.emit('canvas.resized', {
        width: this.originalSize.width,
        height: this.originalSize.height
      })

      return success(undefined, [], {
        executionTime: 0,
        affectedObjects: []
      })
    } catch (_error) {
      return failure(
        new ExecutionError('Failed to undo crop', { commandId: this.id })
      )
    }
  }
} 