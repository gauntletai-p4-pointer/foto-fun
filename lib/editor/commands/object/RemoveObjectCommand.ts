import { Command } from '../base/Command'
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager'
import type { CanvasObject } from '@/lib/editor/objects/types'
import type { TypedEventBus } from '@/lib/events/core/TypedEventBus'

export class RemoveObjectCommand extends Command {
  private removedObject: CanvasObject | null = null
  
  constructor(
    eventBus: TypedEventBus,
    private canvas: CanvasManager,
    private objectId: string
  ) {
    super(`Remove object`, eventBus)
  }
  
  protected async doExecute(): Promise<void> {
    // Store the object before removing
    this.removedObject = this.canvas.getObject(this.objectId)
    
    if (!this.removedObject) {
      throw new Error(`Object ${this.objectId} not found`)
    }
    
    // Remove the object
    await this.canvas.removeObject(this.objectId)
  }
  
  async undo(): Promise<void> {
    if (!this.removedObject) return
    
    // Re-add the object
    await this.canvas.addObject(this.removedObject)
    
    // Restore selection
    this.canvas.selectObject(this.removedObject.id)
  }
} 