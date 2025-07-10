import type { CanvasObject, CanvasManager } from '@/lib/editor/canvas/types'
import { Command } from '../base/Command'
import { getTypedEventBus } from '@/lib/events/core/TypedEventBus'
import { ServiceContainer } from '@/lib/core/ServiceContainer'

/**
 * Command to edit existing text content
 * Uses event-driven architecture for state changes
 */
export class EditTextCommand extends Command {
  private canvasManager: CanvasManager | null = null
  
  constructor(
    private textObjectId: string,
    private oldText: string,
    private newText: string
  ) {
    super('Edit text')
  }
  
  async execute(): Promise<void> {
    const canvas = this.getCanvasManager()
    if (!canvas) {
      throw new Error('Canvas manager not available')
    }
    
    // Find the text object
    const textObject = this.findTextObject(canvas)
    if (!textObject) {
      throw new Error('Text object not found')
    }
    
    // Update the text object
    await canvas.updateObject(textObject.id, {
      data: this.newText
    })
    
    // Emit event for state tracking
    const eventBus = getTypedEventBus()
    eventBus.emit('canvas.object.modified', {
      canvasId: (canvas as any).id || 'main',
      objectId: textObject.id,
      previousState: { data: this.oldText },
      newState: { data: this.newText }
    })
  }
  
  async undo(): Promise<void> {
    const canvas = this.getCanvasManager()
    if (!canvas) {
      throw new Error('Canvas manager not available')
    }
    
    // Find the text object
    const textObject = this.findTextObject(canvas)
    if (!textObject) {
      throw new Error('Text object not found')
    }
    
    // Restore the old text
    await canvas.updateObject(textObject.id, {
      data: this.oldText
    })
    
    // Emit event for state tracking
    const eventBus = getTypedEventBus()
    eventBus.emit('canvas.object.modified', {
      canvasId: (canvas as any).id || 'main',
      objectId: textObject.id,
      previousState: { data: this.newText },
      newState: { data: this.oldText }
    })
  }
  
  async redo(): Promise<void> {
    await this.execute()
  }
  
  /**
   * Allow merging of consecutive text edits within 1 second
   */
  canMergeWith(other: Command): boolean {
    return other instanceof EditTextCommand && 
           other.textObjectId === this.textObjectId &&
           Math.abs(other.timestamp - this.timestamp) < 1000
  }
  
  /**
   * Find the text object in the canvas
   */
  private findTextObject(canvas: CanvasManager): CanvasObject | null {
    for (const layer of canvas.state.layers) {
      const obj = layer.objects.find(o => o.id === this.textObjectId && (o.type === 'text' || o.type === 'verticalText'))
      if (obj) return obj
    }
    return null
  }
  
  /**
   * Get canvas manager instance
   */
  private getCanvasManager(): CanvasManager | null {
    if (this.canvasManager) return this.canvasManager
    
    try {
      const container = ServiceContainer.getInstance()
      const manager = container.get<CanvasManager>('CanvasManager')
      return manager || null
    } catch (error) {
      console.warn('Failed to get CanvasManager from ServiceContainer:', error)
    }
    
    return null
  }
} 