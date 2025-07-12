import { Command } from '../base/Command'
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager'
import type { CanvasObject } from '@/lib/editor/objects/types'
import type { TypedEventBus } from '@/lib/events/core/TypedEventBus'

export class AddObjectCommand extends Command {
  private objectId: string | null = null
  
  constructor(
    eventBus: TypedEventBus,
    private canvas: CanvasManager,
    private objectData: Partial<CanvasObject>
  ) {
    super(`Add ${objectData.type || 'object'}`, eventBus)
  }
  
  protected async doExecute(): Promise<void> {
    // Add the object
    this.objectId = await this.canvas.addObject(this.objectData)
    
    // Select the new object
    this.canvas.selectObject(this.objectId)
  }
  
  async undo(): Promise<void> {
    if (!this.objectId) return
    
    // Remove the object
    await this.canvas.removeObject(this.objectId)
  }
} 