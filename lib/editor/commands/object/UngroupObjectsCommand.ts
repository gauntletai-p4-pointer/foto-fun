import type { CanvasObject } from '@/lib/editor/objects/types'
import { Command, type CommandContext } from '../base/Command'

export interface UngroupObjectsOptions {
  groupId: string
}

export class UngroupObjectsCommand extends Command {
  private readonly options: UngroupObjectsOptions
  private groupObject: CanvasObject | null = null
  private childObjectIds: string[] = []

  constructor(
    description: string,
    context: CommandContext,
    options: UngroupObjectsOptions
  ) {
    super(description, context, {
      source: 'user',
      canMerge: false,
      affectsSelection: true
    })
    this.options = options
  }

  async doExecute(): Promise<void> {
    // Get the group object
    this.groupObject = this.context.canvasManager.getObject(this.options.groupId)
    
    if (!this.groupObject || this.groupObject.type !== 'group') {
      throw new Error(`Group with ID ${this.options.groupId} not found`)
    }

    // Get the child object IDs
    this.childObjectIds = this.groupObject.children || []

    // Remove the group object
    await this.context.canvasManager.removeObject(this.options.groupId)

    // Select the child objects
    if (this.childObjectIds.length > 0) {
      this.context.canvasManager.selectMultiple(this.childObjectIds)
    }
  }

  async undo(): Promise<void> {
    if (this.groupObject) {
      // Re-create the group
      await this.context.canvasManager.addObject(this.groupObject)
      
      // Select the group
      this.context.canvasManager.selectObject(this.groupObject.id)
    }
  }

  canExecute(): boolean {
    const group = this.context.canvasManager.getObject(this.options.groupId)
    return group !== null && group.type === 'group'
  }

  canUndo(): boolean {
    return this.groupObject !== null
  }
} 