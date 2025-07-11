import { Command } from '../base/Command'
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager'
import type { CanvasObject } from '@/lib/editor/objects/types'

export class GroupObjectsCommand extends Command {
  private groupId: string | null = null
  
  constructor(
    private canvas: CanvasManager,
    private objectIds: string[]
  ) {
    super(`Group ${objectIds.length} objects`)
  }
  
  protected async doExecute(): Promise<void> {
    if (this.objectIds.length < 2) {
      throw new Error('Need at least 2 objects to group')
    }
    
    // Calculate group bounds
    const objects = this.objectIds
      .map(id => this.canvas.getObject(id))
      .filter((obj): obj is CanvasObject => obj !== null)
    
    if (objects.length !== this.objectIds.length) {
      throw new Error('Some objects not found')
    }
    
    let minX = Infinity, minY = Infinity
    let maxX = -Infinity, maxY = -Infinity
    
    for (const obj of objects) {
      minX = Math.min(minX, obj.x)
      minY = Math.min(minY, obj.y)
      maxX = Math.max(maxX, obj.x + obj.width * obj.scaleX)
      maxY = Math.max(maxY, obj.y + obj.height * obj.scaleY)
    }
    
    // Create group
    this.groupId = await this.canvas.addObject({
      type: 'group',
      name: 'Group',
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      children: this.objectIds
    })
    
    // Move objects to group
    for (const id of this.objectIds) {
      await this.canvas.moveObjectToGroup(id, this.groupId)
    }
    
    // Select the group
    this.canvas.selectObject(this.groupId)
  }
  
  async undo(): Promise<void> {
    if (!this.groupId) return
    
    // Move objects out of group
    for (const id of this.objectIds) {
      await this.canvas.moveObjectToRoot(id)
    }
    
    // Remove the group
    await this.canvas.removeObject(this.groupId)
    
    // Restore selection to original objects
    this.canvas.selectMultiple(this.objectIds)
  }
} 