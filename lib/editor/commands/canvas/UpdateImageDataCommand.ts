import type { CommandContext } from '../base/Command'
import type { CommandResult } from '../base/CommandResult'
import { Command } from '../base/Command'
import { ExecutionError, success, failure } from '../base/CommandResult'
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager'
import { isImageObject } from '@/lib/editor/objects/types'

export interface UpdateImageDataOptions {
  objectId: string
  imageData: ImageData
  preserveOriginal?: boolean
}

/**
 * Command to update image data for an image object
 * Used by adjustment and filter tools to modify pixel data
 */
export class UpdateImageDataCommand extends Command {
  private originalImageData: ImageData | null = null
  private originalElement: HTMLImageElement | HTMLCanvasElement | null = null
  private options: UpdateImageDataOptions
  private canvasManager: CanvasManager

  constructor(
    options: UpdateImageDataOptions,
    context: CommandContext
  ) {
    super(`Update image data for ${options.objectId}`, context, {
      source: 'user',
      canMerge: false,
      affectsSelection: false
    })
    this.options = options
    this.canvasManager = context.canvasManager
  }

  protected async doExecute(): Promise<void> {
    const object = this.canvasManager.getObject(this.options.objectId)
    if (!object) {
      throw new Error(`Object ${this.options.objectId} not found`)
    }

    if (!isImageObject(object)) {
      throw new Error(`Object ${this.options.objectId} is not an image`)
    }

    // Store original data for undo if requested
    if (this.options.preserveOriginal) {
      const imageData = object.data;
      
      // Store original element
      this.originalElement = imageData.element;
      
      // Create ImageData from original element for undo
      const canvas = document.createElement('canvas');
      canvas.width = imageData.naturalWidth;
      canvas.height = imageData.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx && imageData.element) {
        ctx.drawImage(imageData.element, 0, 0);
        this.originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      }
    }

    // Create canvas from new image data
    const newCanvas = document.createElement('canvas');
    newCanvas.width = this.options.imageData.width;
    newCanvas.height = this.options.imageData.height;
    const newCtx = newCanvas.getContext('2d');
    if (!newCtx) {
      throw new Error('Cannot create canvas context for image data update');
    }
    
    newCtx.putImageData(this.options.imageData, 0, 0);

    // Update the object with new image data
    const imageData = object.data as import('@/lib/editor/objects/types').ImageData;
    await this.canvasManager.updateObject(this.options.objectId, {
      data: {
        ...imageData,
        element: newCanvas,
        naturalWidth: this.options.imageData.width,
        naturalHeight: this.options.imageData.height
      }
    });
  }

  async undo(): Promise<CommandResult<void>> {
    if (!this.options.preserveOriginal || !this.originalImageData || !this.originalElement) {
      return failure(
        new ExecutionError('Cannot undo - original image data not preserved', { commandId: this.id })
      )
    }

    try {
      const object = this.canvasManager.getObject(this.options.objectId)
      if (!object || !isImageObject(object)) {
        return failure(
          new ExecutionError('Object not found or not an image', { commandId: this.id })
        )
      }

      // Restore original image data
      const imageData = object.data as import('@/lib/editor/objects/types').ImageData;
      await this.canvasManager.updateObject(this.options.objectId, {
        data: {
          ...imageData,
          element: this.originalElement,
          naturalWidth: this.originalImageData.width,
          naturalHeight: this.originalImageData.height
        }
      });

      return success(undefined, [], {
        executionTime: 0,
        affectedObjects: [this.options.objectId]
      })
    } catch (error) {
      return failure(
        new ExecutionError(
          `Failed to undo image data update: ${error instanceof Error ? error.message : 'Unknown error'}`,
          { commandId: this.id }
        )
      )
    }
  }

  canExecute(): boolean {
    const object = this.canvasManager.getObject(this.options.objectId)
    return object !== null && isImageObject(object)
  }

  canUndo(): boolean {
    return Boolean(this.options.preserveOriginal && 
                   this.originalImageData !== null && 
                   this.originalElement !== null)
  }

  protected getAffectedObjects(): string[] {
    return [this.options.objectId]
  }
} 