import { Command } from '../base/Command'
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager'
import type { CanvasObject } from '@/lib/editor/objects/types'
import type { TypedEventBus } from '@/lib/events/core/TypedEventBus'

export class UngroupObjectsCommand extends Command {
  private groupData: CanvasObject | null = null
  private childIds: string[] = []
  
  constructor(
    eventBus: TypedEventBus,
    private canvas: CanvasManager,
    private groupId: string
  ) {
    super(`Ungroup`, eventBus)
  }
  
  protected async doExecute(): Promise<void> {
    const group = this.canvas.getObject(this.groupId)
    if (!group || group.type !== 'group') {
      throw new Error('Object is not a group')
    }
    
    // Store group data for undo
    this.groupData = { ...group }
    this.childIds = group.children || []
    
    // Move children out of group
    for (const childId of this.childIds) {
      await this.canvas.moveObjectToRoot(childId)
    }
    
    // Remove the group
    await this.canvas.removeObject(this.groupId)
    
    // Select the ungrouped objects
    if (this.childIds.length > 0) {
      this.canvas.selectMultiple(this.childIds)
    }
  }
  
  async undo(): Promise<void> {
    if (!this.groupData) return
    
    // Re-create the group
    const newGroupId = await this.canvas.addObject(this.groupData)
    
    // Move children back to group
    for (const childId of this.childIds) {
      await this.canvas.moveObjectToGroup(childId, newGroupId)
    }
    
    // Select the group
    this.canvas.selectObject(newGroupId)
  }
} 