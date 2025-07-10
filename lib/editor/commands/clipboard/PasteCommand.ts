import { Command } from '../base'
import type { CanvasManager, CanvasObject } from '@/lib/editor/canvas/types'
import { ClipboardManager } from '../../clipboard'
import { ServiceContainer } from '@/lib/core/ServiceContainer'
import type { TypedEventBus } from '@/lib/events/core/TypedEventBus'

/**
 * Command to paste objects from clipboard
 */
export class PasteCommand extends Command {
  private canvasManager: CanvasManager
  private clipboard: ClipboardManager
  private pastedObjects: CanvasObject[] = []
  private typedEventBus: TypedEventBus
  
  constructor(canvasManager: CanvasManager) {
    super('Paste')
    this.canvasManager = canvasManager
    this.clipboard = ClipboardManager.getInstance()
    this.typedEventBus = ServiceContainer.getInstance().getSync<TypedEventBus>('TypedEventBus')
  }
  
  async execute(): Promise<void> {
    // Paste objects from clipboard
    this.pastedObjects = await this.clipboard.paste(this.canvasManager)
    
    // Emit addition events
    for (const obj of this.pastedObjects) {
      this.typedEventBus.emit('canvas.object.added', {
        canvasId: 'main', // TODO: Get actual canvas ID
        object: obj,
        layerId: obj.layerId
      })
    }
    
    // Select the pasted objects
    if (this.pastedObjects.length > 0) {
      this.canvasManager.setSelection({
        type: 'objects',
        objectIds: this.pastedObjects.map(obj => obj.id)
      })
    }
  }
  
  async undo(): Promise<void> {
    // Remove pasted objects
    for (const obj of this.pastedObjects) {
      await this.canvasManager.removeObject(obj.id)
      
      // Emit removal event
      this.typedEventBus.emit('canvas.object.removed', {
        canvasId: 'main', // TODO: Get actual canvas ID
        objectId: obj.id
      })
    }
    
    // Clear selection
    this.canvasManager.deselectAll()
    
    // Clear pasted objects list
    this.pastedObjects = []
  }
  
  canExecute(): boolean {
    return this.clipboard.hasContent()
  }
} 