import type { CanvasManager } from '@/lib/editor/canvas/types'
import type { CanvasObject } from '@/lib/editor/objects/types'
import { Command } from '../base'
import type { TypedEventBus } from '@/lib/events/core/TypedEventBus'

export class RemoveObjectCommand extends Command {
  private canvasManager: CanvasManager
  private object: CanvasObject | null = null
  private objectId: string
  
  constructor(
    canvasManager: CanvasManager, 
    objectId: string,
    eventBus: TypedEventBus
  ) {
    super('Remove object', eventBus)
    this.canvasManager = canvasManager
    this.objectId = objectId
    this.object = null! // Will be set during execution
  }
  
  protected async doExecute(): Promise<void> {
    // Store object for undo
    this.object = this.canvasManager.getObject(this.objectId)
    if (!this.object) {
      throw new Error(`Object with id ${this.objectId} not found`)
    }
    
    await this.canvasManager.removeObject(this.objectId)
    
    // Emit event using inherited eventBus
    this.eventBus.emit('canvas.object.removed', {
      canvasId: this.canvasManager.stage.id() || 'main',
      objectId: this.objectId
    })
  }
  
  async undo(): Promise<void> {
    if (!this.object) return
    
    await this.canvasManager.addObject(this.object)
    
    // Emit event using inherited eventBus
    this.eventBus.emit('canvas.object.added', {
      canvasId: this.canvasManager.stage.id() || 'main',
      object: this.object
    })
  }
} 