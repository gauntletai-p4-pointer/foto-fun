import type { CanvasManager } from '@/lib/editor/canvas/types'
import type { CanvasObject } from '@/lib/editor/objects/types'
import { Command } from '../base'
import type { TypedEventBus } from '@/lib/events/core/TypedEventBus'

export class AddObjectCommand extends Command {
  private canvasManager: CanvasManager
  private object: CanvasObject
  
  constructor(
    canvasManager: CanvasManager, 
    object: CanvasObject,
    eventBus: TypedEventBus
  ) {
    super(`Add ${object.type}`, eventBus)
    this.canvasManager = canvasManager
    this.object = object
  }
  
  protected async doExecute(): Promise<void> {
    await this.canvasManager.addObject(this.object)
    
    // Emit event using inherited eventBus
    this.eventBus.emit('canvas.object.added', {
      canvasId: this.canvasManager.stage.id() || 'main',
      object: this.object
    })
  }
  
  async undo(): Promise<void> {
    await this.canvasManager.removeObject(this.object.id)
    
    // Emit event using inherited eventBus
    this.eventBus.emit('canvas.object.removed', {
      canvasId: this.canvasManager.stage.id() || 'main',
      objectId: this.object.id
    })
  }
} 