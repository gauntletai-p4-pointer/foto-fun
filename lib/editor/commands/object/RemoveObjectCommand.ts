import type { CanvasObject } from '@/lib/editor/objects/types'
import { Command, type CommandContext } from '../base/Command'

export interface RemoveObjectOptions {
  objectId: string
}

export class RemoveObjectCommand extends Command {
  private readonly options: RemoveObjectOptions
  private removedObject: CanvasObject | null = null

  constructor(
    description: string,
    context: CommandContext,
    options: RemoveObjectOptions
  ) {
    super(description, context, {
      source: 'user',
      canMerge: false,
      affectsSelection: true
    })
    this.options = options
  }

  async doExecute(): Promise<void> {
    // Get the object before removing it
    this.removedObject = this.context.canvasManager.getObject(this.options.objectId)
    
    if (!this.removedObject) {
      throw new Error(`Object with ID ${this.options.objectId} not found`)
    }

    // Remove the object from canvas
    await this.context.canvasManager.removeObject(this.options.objectId)
  }

  async undo(): Promise<void> {
    if (this.removedObject) {
      // Add the object back to canvas
      await this.context.canvasManager.addObject(this.removedObject)
      
      // Select the restored object
      this.context.canvasManager.selectObject(this.removedObject.id)
    }
  }

  canExecute(): boolean {
    return this.options.objectId !== '' && 
           this.context.canvasManager.getObject(this.options.objectId) !== null
  }

  canUndo(): boolean {
    return this.removedObject !== null
  }
} 