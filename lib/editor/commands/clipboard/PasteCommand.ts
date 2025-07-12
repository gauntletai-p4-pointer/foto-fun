import type { CanvasManager } from '@/lib/editor/canvas/types'
import type { CanvasObject } from '@/lib/editor/objects/types'
import { Command } from '../base'
import type { TypedEventBus } from '@/lib/events/core/TypedEventBus'

/**
 * Command to paste objects from clipboard
 */
export class PasteCommand extends Command {
  private canvasManager: CanvasManager
  private pastedObjects: CanvasObject[] = []
  
  constructor(
    canvasManager: CanvasManager,
    eventBus: TypedEventBus
  ) {
    super('Paste objects', eventBus)
    this.canvasManager = canvasManager
  }
  
  protected async doExecute(): Promise<void> {
    // Get objects from clipboard (implementation would go here)
    // For now, assume we have objects to paste
    
    // Add objects to canvas
    for (const obj of this.pastedObjects) {
      await this.canvasManager.addObject(obj)
    }
    
    // Emit events using inherited eventBus
    this.eventBus.emit('clipboard.paste', {
      objects: this.pastedObjects
    })
    
    for (const obj of this.pastedObjects) {
      this.eventBus.emit('canvas.object.added', {
        canvasId: this.canvasManager.stage.id() || 'main',
        object: obj
      })
    }
  }
  
  async undo(): Promise<void> {
    // Remove pasted objects
    for (const obj of this.pastedObjects) {
      await this.canvasManager.removeObject(obj.id)
    }
    
    // Emit events using inherited eventBus
    for (const obj of this.pastedObjects) {
      this.eventBus.emit('canvas.object.removed', {
        canvasId: this.canvasManager.stage.id() || 'main',
        objectId: obj.id
      })
    }
  }
} 