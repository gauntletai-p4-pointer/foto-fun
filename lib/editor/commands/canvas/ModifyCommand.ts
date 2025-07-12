import type { CommandContext } from '../base/Command'
import type { CommandResult } from '../base/CommandResult'
import { Command } from '../base/Command'
import { ExecutionError, success, failure } from '../base/CommandResult'
import type { CanvasObject } from '@/lib/editor/objects/types'

export interface ModifyOptions {
  object: CanvasObject
  updates: Partial<CanvasObject>
  description?: string
}

export class ModifyCommand extends Command {
  private object: CanvasObject
  private updates: Partial<CanvasObject>
  private previousState: Record<string, unknown>

  constructor(
    options: ModifyOptions,
    context: CommandContext
  ) {
    super(options.description || `Modify ${options.object.type || 'object'} properties`, context)
    this.object = options.object
    this.updates = options.updates
    this.previousState = {}
  }

  protected async doExecute(): Promise<void> {
    // Store previous state for undo
    this.previousState = {}
    for (const key in this.updates) {
      if (key in this.object) {
        this.previousState[key] = this.object[key as keyof CanvasObject]
      }
    }

    // Apply updates
    Object.assign(this.object, this.updates)

    // Update object through canvas manager
    await this.context.canvasManager.updateObject(this.object.id, this.updates)

    // Emit event through context
    this.context.eventBus.emit('canvas.object.modified', {
      canvasId: this.context.canvasManager.id,
      objectId: this.object.id,
      previousState: this.previousState as Record<string, unknown>,
      newState: this.updates as Record<string, unknown>
    })
  }

  async undo(): Promise<CommandResult<void>> {
    try {
      // Restore previous state
      Object.assign(this.object, this.previousState)
      
      // Update object through canvas manager
      await this.context.canvasManager.updateObject(this.object.id, this.previousState)

      // Emit event through context
      this.context.eventBus.emit('canvas.object.modified', {
        canvasId: this.context.canvasManager.id,
        objectId: this.object.id,
        previousState: this.updates as Record<string, unknown>,
        newState: this.previousState as Record<string, unknown>
      })

      return success(undefined, [], {
        executionTime: 0,
        affectedObjects: [this.object.id]
      })
    } catch (error) {
      return failure(
        new ExecutionError('Failed to undo object modification', { commandId: this.id })
      )
    }
  }

  async redo(): Promise<CommandResult<void>> {
    try {
      // Re-apply updates
      Object.assign(this.object, this.updates)
      
      // Update object through canvas manager
      await this.context.canvasManager.updateObject(this.object.id, this.updates)

      // Emit event through context
      this.context.eventBus.emit('canvas.object.modified', {
        canvasId: this.context.canvasManager.id,
        objectId: this.object.id,
        previousState: this.previousState as Record<string, unknown>,
        newState: this.updates as Record<string, unknown>
      })

      return success(undefined, [], {
        executionTime: 0,
        affectedObjects: [this.object.id]
      })
    } catch (error) {
      return failure(
        new ExecutionError('Failed to redo object modification', { commandId: this.id })
      )
    }
  }
} 