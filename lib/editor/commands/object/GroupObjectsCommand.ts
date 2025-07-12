import type { CanvasObject } from '@/lib/editor/objects/types'
import { Command, type CommandContext } from '../base/Command'
import { success, failure, ExecutionError, type CommandResult } from '../base/CommandResult'

export interface GroupObjectsOptions {
  objectIds: string[]
  groupName?: string
}

export class GroupObjectsCommand extends Command {
  private readonly options: GroupObjectsOptions
  private groupId: string | null = null
  private originalObjects: CanvasObject[] = []

  constructor(
    description: string,
    context: CommandContext,
    options: GroupObjectsOptions
  ) {
    super(description, context, {
      source: 'user',
      canMerge: false,
      affectsSelection: true
    })
    this.options = options
  }

  async doExecute(): Promise<void> {
    const { objectIds, groupName } = this.options

    if (objectIds.length < 2) {
      throw new Error('At least 2 objects are required to create a group')
    }

    // Get all objects to group
    this.originalObjects = objectIds
      .map(id => this.context.canvasManager.getObject(id))
      .filter(Boolean) as CanvasObject[]

    if (this.originalObjects.length < 2) {
      throw new Error('Some objects could not be found')
    }

    // Calculate group bounds
    const bounds = this.calculateGroupBounds(this.originalObjects)

    // Create group object
    const groupObject = {
      type: 'group' as const,
      name: groupName || `Group of ${this.originalObjects.length} objects`,
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      zIndex: Math.max(...this.originalObjects.map(obj => obj.zIndex)),
      opacity: 1,
      blendMode: 'normal' as const,
      visible: true,
      locked: false,
      filters: [],
      adjustments: [],
      children: objectIds,
      data: {
        type: 'group' as const,
        children: objectIds
      }
    }

    // Add group to canvas
    this.groupId = await this.context.canvasManager.addObject(groupObject)

    // Select the group
    this.context.canvasManager.selectObject(this.groupId)
  }

  async undo(): Promise<CommandResult<void>> {
    try {
      if (!this.groupId) {
        return failure(
          new ExecutionError('Cannot undo: group ID not available', { commandId: this.id })
        )
      }

      // Remove the group
      await this.context.canvasManager.removeObject(this.groupId)

      // Select the original objects
      this.context.canvasManager.selectMultiple(this.options.objectIds)

      this.groupId = null
      
      return success(undefined, [], {
        executionTime: 0,
        affectedObjects: this.options.objectIds
      })
    } catch (error) {
      return failure(
        new ExecutionError(
          `Failed to undo group objects: ${error instanceof Error ? error.message : 'Unknown error'}`,
          { commandId: this.id }
        )
      )
    }
  }

  canExecute(): boolean {
    return this.options.objectIds.length >= 2
  }

  canUndo(): boolean {
    return this.groupId !== null
  }

  private calculateGroupBounds(objects: CanvasObject[]): {
    x: number
    y: number
    width: number
    height: number
  } {
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    for (const obj of objects) {
      minX = Math.min(minX, obj.x)
      minY = Math.min(minY, obj.y)
      maxX = Math.max(maxX, obj.x + obj.width)
      maxY = Math.max(maxY, obj.y + obj.height)
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    }
  }
} 