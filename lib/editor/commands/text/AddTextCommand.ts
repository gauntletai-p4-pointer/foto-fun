import type { CanvasManager } from '@/lib/editor/canvas/types'
import type { CanvasObject } from '@/lib/editor/objects/types'
import { Command } from '../base'
import type { TypedEventBus } from '@/lib/events/core/TypedEventBus'
import { nanoid } from 'nanoid'

/**
 * Command to add text to the canvas
 * Uses event-driven architecture for state management
 */
export class AddTextCommand extends Command {
  private canvasManager: CanvasManager
  private textObject: CanvasObject | null = null
  private position: { x: number; y: number }
  private text: string
  private style: Record<string, string | number | boolean>
  
  constructor(
    canvasManager: CanvasManager,
    text: string,
    position: { x: number; y: number },
    style: Record<string, string | number | boolean> = {},
    eventBus: TypedEventBus
  ) {
    super('Add text', eventBus)
    this.canvasManager = canvasManager
    this.text = text
    this.position = position
    this.style = style
  }
  
  protected async doExecute(): Promise<void> {
    // Create text object
    this.textObject = {
      id: nanoid(),
      type: 'text',
      name: 'Text',
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal',
      transform: {
        x: this.position.x,
        y: this.position.y,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        skewX: 0,
        skewY: 0
      },
      node: undefined!, // Will be created by canvas manager
      // No layerId needed in object-based architecture
      data: {
        content: this.text,
        font: (this.style.fontFamily as string) || 'Arial',
        fontSize: (this.style.fontSize as number) || 24,
        color: (this.style.fill as string) || '#000000',
        align: 'left'
      },
      // Using proper CanvasObject structure
      x: this.position.x,
      y: this.position.y,
      width: 200,
      height: 50,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      zIndex: 0,
      filters: [],
      adjustments: []
    }
    
    // Add to canvas
    await this.canvasManager.addObject(this.textObject)
    
    // Emit event using inherited eventBus
    this.eventBus.emit('canvas.object.added', {
      canvasId: this.canvasManager.stage.id() || 'main',
      object: this.textObject
    })
  }
  
  async undo(): Promise<void> {
    if (!this.textObject) return
    
    await this.canvasManager.removeObject(this.textObject.id)
    
    // Emit event using inherited eventBus
    this.eventBus.emit('canvas.object.removed', {
      canvasId: this.canvasManager.stage.id() || 'main',
      objectId: this.textObject.id
    })
  }
  
  async redo(): Promise<void> {
    await this.execute()
  }
} 