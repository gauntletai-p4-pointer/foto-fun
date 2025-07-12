import type { CanvasObject } from '@/lib/editor/objects/types'
import { Command, type CommandContext } from '../base/Command'

export interface UpdateObjectOptions {
  objectId: string
  updates: Partial<CanvasObject>
}

export class UpdateObjectCommand extends Command {
  private readonly options: UpdateObjectOptions
  private previousState: Partial<CanvasObject> | null = null

  constructor(
    description: string,
    context: CommandContext,
    options: UpdateObjectOptions
  ) {
    super(description, context, {
      source: 'user',
      canMerge: true, // Update commands can potentially be merged
      affectsSelection: false
    })
    this.options = options
  }

  async doExecute(): Promise<void> {
    // Get the current object state for undo
    const currentObject = this.context.canvasManager.getObject(this.options.objectId)
    if (!currentObject) {
      throw new Error(`Object with ID ${this.options.objectId} not found`)
    }

    // Store the previous state (only the properties being updated)
    this.previousState = {}
    for (const key in this.options.updates) {
      if (key in currentObject) {
        (this.previousState as any)[key] = (currentObject as any)[key]
      }
    }

    // Apply the updates
    await this.context.canvasManager.updateObject(this.options.objectId, this.options.updates)
  }

  async undo(): Promise<void> {
    if (this.previousState) {
      await this.context.canvasManager.updateObject(this.options.objectId, this.previousState)
    }
  }

  canExecute(): boolean {
    return this.options.objectId !== '' && Object.keys(this.options.updates).length > 0
  }

  canUndo(): boolean {
    return this.previousState !== null
  }

  canMergeWith(other: Command): boolean {
    if (!(other instanceof UpdateObjectCommand)) {
      return false
    }
    
    // Can merge if updating the same object
    return this.options.objectId === other.options.objectId
  }

  mergeWith(other: Command): void {
    if (!(other instanceof UpdateObjectCommand)) {
      return
    }

    // Merge the updates
    Object.assign(this.options.updates, other.options.updates)
  }
} 