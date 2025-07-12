import { Command } from '../base'
import type { CanvasManager } from '@/lib/editor/canvas/types'
import type { TypedEventBus } from '@/lib/events/core/TypedEventBus'
import type { TextData } from '@/lib/editor/objects/types'

interface TextEdit {
  content?: string
  font?: string
  fontSize?: number
  color?: string
  align?: 'left' | 'center' | 'right'
}

export class EditTextCommand extends Command {
  private canvasManager: CanvasManager
  private objectId: string
  private newEdit: TextEdit
  private oldEdit: TextEdit | null = null
  
  constructor(
    eventBus: TypedEventBus,
    canvasManager: CanvasManager,
    objectId: string,
    newEdit: TextEdit
  ) {
    super('Edit text', eventBus)
    this.canvasManager = canvasManager
    this.objectId = objectId
    this.newEdit = newEdit
  }
  
  protected async doExecute(): Promise<void> {
    const object = this.canvasManager.getObject(this.objectId)
    if (!object || object.type !== 'text') {
      throw new Error(`Text object with id ${this.objectId} not found`)
    }
    
    // Store old text data for undo (cast to TextData since we checked type)
    const textData = object.data as TextData
    this.oldEdit = {
      content: textData?.content,
      font: textData?.font,
      fontSize: textData?.fontSize,
      color: textData?.color,
      align: textData?.align
    }
    
    // Apply new text data
    const updatedData = {
      ...object.data,
      ...this.newEdit
    }
    
    await this.canvasManager.updateObject(this.objectId, { data: updatedData })
    
    // Emit event using inherited eventBus
    this.eventBus.emit('canvas.object.modified', {
      canvasId: this.canvasManager.stage.id() || 'main',
      objectId: this.objectId,
      previousState: { data: this.oldEdit },
      newState: { data: this.newEdit }
    })
  }
  
  async undo(): Promise<void> {
    if (!this.oldEdit) return
    
    const object = this.canvasManager.getObject(this.objectId)
    if (!object) return
    
    // Restore old text data
    const restoredData = {
      ...object.data,
      ...this.oldEdit
    }
    
    await this.canvasManager.updateObject(this.objectId, { data: restoredData })
    
    // Emit event using inherited eventBus
    this.eventBus.emit('canvas.object.modified', {
      canvasId: this.canvasManager.stage.id() || 'main',
      objectId: this.objectId,
      previousState: { data: this.newEdit },
      newState: { data: this.oldEdit }
    })
  }
  
} 