import type { CanvasManager } from '@/lib/editor/canvas/types'
import type { CanvasObject } from '@/lib/editor/objects/types'
import { Command } from '../base'
import type { TypedEventBus } from '@/lib/events/core/TypedEventBus'

/**
 * Command to cut selected objects to clipboard
 */
export class CutCommand extends Command {
  private canvasManager: CanvasManager
  private cutObjects: CanvasObject[] = []
  
  constructor(
    canvasManager: CanvasManager,
    eventBus: TypedEventBus
  ) {
    super('Cut objects', eventBus)
    this.canvasManager = canvasManager
  }
  
  protected async doExecute(): Promise<void> {
    // Get selected objects
    const selectedObjects = this.canvasManager.getSelectedObjects()
    this.cutObjects = [...selectedObjects]
    
    if (this.cutObjects.length === 0) return
    
    // Copy to clipboard (implementation would go here)
    // For now, just store the objects
    
    // Remove from canvas
    for (const obj of this.cutObjects) {
      await this.canvasManager.removeObject(obj.id)
    }
    
    // Emit events using inherited eventBus
    this.eventBus.emit('clipboard.cut', {
      objects: this.cutObjects
    })
    
    for (const obj of this.cutObjects) {
      this.eventBus.emit('canvas.object.removed', {
        canvasId: this.canvasManager.stage.id() || 'main',
        objectId: obj.id
      })
    }
  }
  
  async undo(): Promise<void> {
    // Restore cut objects
    for (const obj of this.cutObjects) {
      await this.canvasManager.addObject(obj)
    }
    
    // Emit events using inherited eventBus
    for (const obj of this.cutObjects) {
      this.eventBus.emit('canvas.object.added', {
        canvasId: this.canvasManager.stage.id() || 'main',
        object: obj
      })
    }
  }
} 