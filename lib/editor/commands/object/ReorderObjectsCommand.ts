import type { CanvasObject } from '@/lib/editor/objects/types'
import { Command, type CommandContext } from '../base/Command'

export type ReorderDirection = 'forward' | 'backward' | 'front' | 'back'

export interface ReorderObjectsOptions {
  objectIds: string[]
  direction: ReorderDirection
}

export class ReorderObjectsCommand extends Command {
  private readonly options: ReorderObjectsOptions
  private previousOrder: string[] = []

  constructor(
    description: string,
    context: CommandContext,
    options: ReorderObjectsOptions
  ) {
    super(description, context, {
      source: 'user',
      canMerge: false,
      affectsSelection: false
    })
    this.options = options
  }

  async doExecute(): Promise<void> {
    // Store the current order for undo
    this.previousOrder = [...this.context.canvasManager.getObjectOrder()]

    // Apply the reordering based on direction
    const { objectIds, direction } = this.options
    
    for (const objectId of objectIds) {
      switch (direction) {
        case 'forward':
          this.context.canvasManager.bringObjectForward(objectId)
          break
        case 'backward':
          this.context.canvasManager.sendObjectBackward(objectId)
          break
        case 'front':
          this.context.canvasManager.bringObjectToFront(objectId)
          break
        case 'back':
          this.context.canvasManager.sendObjectToBack(objectId)
          break
      }
    }
  }

  async undo(): Promise<void> {
    if (this.previousOrder.length > 0) {
      // Restore the previous order
      this.context.canvasManager.setObjectOrder(this.previousOrder)
    }
  }

  canExecute(): boolean {
    return this.options.objectIds.length > 0 &&
           this.options.objectIds.every(id => 
             this.context.canvasManager.getObject(id) !== null
           )
  }

  canUndo(): boolean {
    return this.previousOrder.length > 0
  }
} 