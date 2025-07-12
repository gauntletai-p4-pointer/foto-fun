import type { CanvasObject } from '@/lib/editor/objects/types'
import { Command, type CommandContext } from '../base/Command'
import { success, failure, ExecutionError, type CommandResult } from '../base/CommandResult'

export class RemoveObjectCommand extends Command {
  private object: CanvasObject | null = null
  private objectId: string
  
  constructor(
    objectId: string,
    context: CommandContext
  ) {
    super('Remove object', context)
    this.objectId = objectId
    this.object = null! // Will be set during execution
  }
  
  protected async doExecute(): Promise<void> {
    // Store object for undo
    this.object = this.context.canvasManager.getObject(this.objectId)
    if (!this.object) {
      throw new Error(`Object with id ${this.objectId} not found`)
    }
    
    await this.context.canvasManager.removeObject(this.objectId)
    
    // Emit event through context
    this.context.eventBus.emit('canvas.object.removed', {
      canvasId: this.context.canvasManager.id,
      objectId: this.objectId
    })
  }
  
  async undo(): Promise<CommandResult<void>> {
    try {
      if (!this.object) {
        return failure(
          new ExecutionError('Cannot undo: object data not available', { commandId: this.id })
        )
      }
      
      await this.context.canvasManager.addObject(this.object)
      
      // Emit event through context
      this.context.eventBus.emit('canvas.object.added', {
        canvasId: this.context.canvasManager.id,
        object: this.object
      })
      
      return success(undefined, [], {
        executionTime: 0,
        affectedObjects: [this.objectId]
      })
    } catch (error) {
      return failure(
        new ExecutionError(
          `Failed to undo remove object: ${error instanceof Error ? error.message : 'Unknown error'}`,
          { commandId: this.id, objectId: this.objectId }
        )
      )
    }
  }
} 