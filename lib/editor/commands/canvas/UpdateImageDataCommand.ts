import type { CommandContext } from '../base/Command'
import type { CommandResult } from '../base/CommandResult'
import { Command } from '../base/Command'
import { ExecutionError, success, failure } from '../base/CommandResult'
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager'

export interface UpdateImageDataOptions {
  objectId: string
  imageData: ImageData
  preserveOriginal?: boolean
}

export class UpdateImageDataCommand extends Command {
  private originalImageData: ImageData | null = null
  private options: UpdateImageDataOptions
  private canvasManager: CanvasManager

  constructor(
    options: UpdateImageDataOptions,
    context: CommandContext
  ) {
    super(`Update image data for ${options.objectId}`, context)
    this.options = options
    this.canvasManager = context.canvasManager
  }

  protected async doExecute(): Promise<void> {
    const object = this.canvasManager.getObject(this.options.objectId)
    if (!object) {
      throw new Error(`Object ${this.options.objectId} not found`)
    }

    if (object.type !== 'image') {
      throw new Error(`Object ${this.options.objectId} is not an image`)
    }

    // Store original image data for undo if requested
    if (this.options.preserveOriginal) {
      // This would need to be implemented based on how image data is stored
      // For now, we'll store a placeholder
      this.originalImageData = this.options.imageData // Placeholder
    }

    // Update the image data
    // This would need to be implemented based on how Konva handles image data
    // For now, we'll emit an event to notify the system
    this.context.eventBus.emit('canvas.object.modified', {
      canvasId: 'main', // TODO: Get actual canvas ID from context
      objectId: this.options.objectId,
      previousState: {
        imageData: this.originalImageData
      },
      newState: {
        imageData: this.options.imageData
      }
    })
  }

  async undo(): Promise<CommandResult<void>> {
    if (!this.options.preserveOriginal || !this.originalImageData) {
      return failure(
        new ExecutionError('Cannot undo - original image data not preserved', { commandId: this.id })
      )
    }

    try {
      // Restore original image data
      this.context.eventBus.emit('canvas.object.modified', {
        canvasId: 'main', // TODO: Get actual canvas ID from context
        objectId: this.options.objectId,
        previousState: {
          imageData: this.options.imageData
        },
        newState: {
          imageData: this.originalImageData
        }
      })

      return success(undefined, [], {
        executionTime: 0,
        affectedObjects: [this.options.objectId]
      })
    } catch (error) {
      return failure(
        new ExecutionError('Failed to undo image data update', { commandId: this.id })
      )
    }
  }

  protected getAffectedObjects(): string[] {
    return [this.options.objectId]
  }
} 