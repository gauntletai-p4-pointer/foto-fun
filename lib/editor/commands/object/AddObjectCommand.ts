import type { CanvasObject } from '@/lib/editor/objects/types'
import { Command, type CommandContext } from '../base/Command'
import { success, failure, ExecutionError, type CommandResult } from '../base/CommandResult'

export interface AddObjectOptions {
  object: Partial<CanvasObject>
  selectAfterAdd?: boolean
}

export class AddObjectCommand extends Command {
  private readonly options: AddObjectOptions
  private objectId: string | null = null

  constructor(
    description: string,
    context: CommandContext,
    options: AddObjectOptions
  ) {
    super(description, context, {
      source: 'user',
      canMerge: false,
      affectsSelection: options.selectAfterAdd !== false
    })
    this.options = options
  }

  async doExecute(): Promise<void> {
    // Add object to canvas
    this.objectId = await this.context.canvasManager.addObject(this.options.object)

    // Select the new object if requested
    if (this.options.selectAfterAdd !== false) {
      this.context.canvasManager.selectObject(this.objectId)
    }
  }

  async undo(): Promise<CommandResult<void>> {
    try {
      if (this.objectId) {
        await this.context.canvasManager.removeObject(this.objectId)
        this.objectId = null
        return success(undefined, [], {
          executionTime: 0,
          affectedObjects: [this.objectId!]
        })
      }
      return success(undefined)
    } catch (error) {
      return failure(
        new ExecutionError(
          `Failed to undo add object: ${error instanceof Error ? error.message : 'Unknown error'}`,
          { commandId: this.id, objectId: this.objectId }
        )
      )
    }
  }

  protected getAffectedObjects(): string[] {
    return this.objectId ? [this.objectId] : []
  }

  canExecute(): boolean {
    return this.options.object.type !== undefined
  }

  canUndo(): boolean {
    return this.objectId !== null
  }

  getObjectId(): string | null {
    return this.objectId
  }
} 