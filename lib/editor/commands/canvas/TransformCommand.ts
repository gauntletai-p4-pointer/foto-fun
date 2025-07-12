import { Command } from '../base/Command'
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager'
import type { TypedEventBus } from '@/lib/events/core/TypedEventBus'

interface Transform {
  x: number
  y: number
  scaleX: number
  scaleY: number
  rotation: number
  skewX: number
  skewY: number
}

export class TransformCommand extends Command {
  private canvasManager: CanvasManager
  private objectId: string
  private newTransform: Transform
  private oldTransform: Transform | null = null
  
  constructor(
    canvasManager: CanvasManager,
    objectId: string,
    newTransform: Transform,
    eventBus: TypedEventBus
  ) {
    super('Transform object', eventBus)
    this.canvasManager = canvasManager
    this.objectId = objectId
    this.newTransform = newTransform
  }
  
  protected async doExecute(): Promise<void> {
    const object = this.canvasManager.getObject(this.objectId)
    if (!object) {
      throw new Error(`Object with id ${this.objectId} not found`)
    }
    
    // Store old transform for undo
    this.oldTransform = {
      x: object.transform?.x ?? object.x,
      y: object.transform?.y ?? object.y,
      scaleX: object.transform?.scaleX ?? object.scaleX,
      scaleY: object.transform?.scaleY ?? object.scaleY,
      rotation: object.transform?.rotation ?? object.rotation,
      skewX: object.transform?.skewX ?? 0,
      skewY: object.transform?.skewY ?? 0
    }
    
    // Apply new transform
    object.transform = { ...this.newTransform }
    await this.canvasManager.updateObject(this.objectId, { transform: this.newTransform })
    
    // Emit event using inherited eventBus
    this.eventBus.emit('canvas.object.modified', {
      canvasId: this.canvasManager.stage.id() || 'main',
      objectId: this.objectId,
      previousState: { transform: this.oldTransform },
      newState: { transform: this.newTransform }
    })
  }
  
  async undo(): Promise<void> {
    if (!this.oldTransform) return
    
    const object = this.canvasManager.getObject(this.objectId)
    if (!object) return
    
    // Restore old transform
    object.transform = { ...this.oldTransform }
    await this.canvasManager.updateObject(this.objectId, { transform: this.oldTransform })
    
    // Emit event using inherited eventBus
    this.eventBus.emit('canvas.object.modified', {
      canvasId: this.canvasManager.stage.id() || 'main',
      objectId: this.objectId,
      previousState: { transform: this.newTransform },
      newState: { transform: this.oldTransform }
    })
  }
} 