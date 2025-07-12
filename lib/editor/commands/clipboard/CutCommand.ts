import { Command } from '../base'
import type { CanvasManager } from '@/lib/editor/canvas/types'
import type { CanvasObject } from '@/lib/editor/objects/types'
import { ClipboardManager } from '../../clipboard'
import { ServiceContainer } from '@/lib/core/ServiceContainer'
import type { TypedEventBus } from '@/lib/events/core/TypedEventBus'

/**
 * Command to cut objects (copy to clipboard and remove from canvas)
 */
export class CutCommand extends Command {
  private canvasManager: CanvasManager
  private objects: CanvasObject[]
  private objectIds: string[]
  private clipboard: ClipboardManager
  private typedEventBus: TypedEventBus
  
  constructor(canvasManager: CanvasManager, objects: CanvasObject[]) {
    super(`Cut ${objects.length} object(s)`)
    this.canvasManager = canvasManager
    this.objects = objects
    this.objectIds = objects.map(obj => obj.id)
    this.clipboard = ClipboardManager.getInstance()
    this.typedEventBus = ServiceContainer.getInstance().getSync<TypedEventBus>('TypedEventBus')
  }
  
  protected async doExecute(): Promise<void> {
    // Copy objects to clipboard
    await this.clipboard.cut(this.objects)
    
    // Remove objects from canvas
    for (const objectId of this.objectIds) {
      await this.canvasManager.removeObject(objectId)
      
      // Emit removal event
      this.typedEventBus.emit('canvas.object.removed', {
        canvasId: this.canvasManager.stage.id() || 'main',
        objectId
      })
    }
  }
  
  async undo(): Promise<void> {
    // Re-add objects to canvas
    for (const obj of this.objects) {
      await this.canvasManager.addObject(obj)
      
      // Emit addition event
      this.typedEventBus.emit('canvas.object.added', {
        canvasId: this.canvasManager.stage.id() || 'main',
        object: obj
      })
    }
  }
  
  canExecute(): boolean {
    return this.objects.length > 0
  }
} 