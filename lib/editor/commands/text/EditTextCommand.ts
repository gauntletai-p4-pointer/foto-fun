import type { CanvasManager } from '@/lib/editor/canvas/types'
import type { CanvasObject } from '@/lib/editor/objects/types'
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
  
  protected async doExecute(): Promise<void> {
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
    const currentTextData = textObject.data as import('@/lib/editor/objects/types').TextData
    await canvas.updateObject(textObject.id, {
      data: {
        ...currentTextData,
        content: this.newText
      }
    })
    
    // Emit event for state tracking
    const eventBus = getTypedEventBus()
    const newTextData = textObject.data as import('@/lib/editor/objects/types').TextData
    eventBus.emit('canvas.object.modified', {
      canvasId: canvas.stage.id() || 'main',
      objectId: textObject.id,
      previousState: { data: { ...newTextData, content: this.oldText } },
      newState: { data: newTextData }
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
    const currentTextData = textObject.data as import('@/lib/editor/objects/types').TextData
    await canvas.updateObject(textObject.id, {
      data: {
        ...currentTextData,
        content: this.oldText
      }
    })
    
    // Emit event for state tracking
    const eventBus = getTypedEventBus()
    const oldTextData = textObject.data as import('@/lib/editor/objects/types').TextData
    eventBus.emit('canvas.object.modified', {
      canvasId: canvas.stage.id() || 'main',
      objectId: textObject.id,
      previousState: { data: { ...oldTextData, content: this.newText } },
      newState: { data: oldTextData }
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
    const obj = canvas.getObject(this.textObjectId)
    if (obj && obj.type === 'text') {
      return obj
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
      const manager = container.getSync<CanvasManager>('CanvasManager')
      return manager || null
    } catch (error) {
      console.warn('Failed to get CanvasManager from ServiceContainer:', error)
    }
    
    return null
  }
} 