import { Command, type CommandContext } from '../base/Command'
import { success, failure, ExecutionError, type CommandResult } from '../base/CommandResult'

interface Transform {
  x: number
  y: number
  scaleX: number
  scaleY: number
  rotation: number
  skewX: number
  skewY: number
}

export class TransformCommand extends Command {
  private objectId: string
  private newTransform: Transform
  private oldTransform: Transform | null = null
  
  constructor(
    objectId: string,
    newTransform: Transform,
    context: CommandContext
  ) {
    super('Transform object', context)
    this.objectId = objectId
    this.newTransform = newTransform
  }
  
  protected async doExecute(): Promise<void> {
    const object = this.context.canvasManager.getObject(this.objectId)
    if (!object) {
      throw new Error(`Object with id ${this.objectId} not found`)
    }
    
    // Store old transform for undo
    this.oldTransform = {
      x: object.x,
      y: object.y,
      scaleX: object.scaleX,
      scaleY: object.scaleY,
      rotation: object.rotation,
      skewX: 0, // CanvasObject doesn't have skew properties
      skewY: 0
    }
    
    // Apply new transform
    await this.context.canvasManager.updateObject(this.objectId, {
      x: this.newTransform.x,
      y: this.newTransform.y,
      scaleX: this.newTransform.scaleX,
      scaleY: this.newTransform.scaleY,
      rotation: this.newTransform.rotation
    })
    
    // Emit event through context
    this.context.eventBus.emit('canvas.object.modified', {
      canvasId: this.context.canvasManager.id,
      objectId: this.objectId,
      previousState: this.oldTransform as unknown as Record<string, unknown>,
      newState: this.newTransform as unknown as Record<string, unknown>
    })
  }
  
  async undo(): Promise<CommandResult<void>> {
    try {
      if (!this.oldTransform) {
        return failure(
          new ExecutionError('Cannot undo: transform data not available', { commandId: this.id })
        )
      }
      
      const object = this.context.canvasManager.getObject(this.objectId)
      if (!object) {
        return failure(
          new ExecutionError(`Object with id ${this.objectId} not found`, { commandId: this.id })
        )
      }
      
      // Restore old transform
      await this.context.canvasManager.updateObject(this.objectId, {
        x: this.oldTransform.x,
        y: this.oldTransform.y,
        scaleX: this.oldTransform.scaleX,
        scaleY: this.oldTransform.scaleY,
        rotation: this.oldTransform.rotation
      })
      
      // Emit event through context
      this.context.eventBus.emit('canvas.object.modified', {
        canvasId: this.context.canvasManager.id,
        objectId: this.objectId,
        previousState: this.newTransform as unknown as Record<string, unknown>,
        newState: this.oldTransform as unknown as Record<string, unknown>
      })
      
      return success(undefined, [], {
        executionTime: 0,
        affectedObjects: [this.objectId]
      })
    } catch (error) {
      return failure(
        new ExecutionError(
          `Failed to undo transform: ${error instanceof Error ? error.message : 'Unknown error'}`,
          { commandId: this.id, objectId: this.objectId }
        )
      )
    }
  }
} 