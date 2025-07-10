import type { CanvasManager, CanvasObject } from '@/lib/editor/canvas/types'
import { Command } from '../base'
import { ServiceContainer } from '@/lib/core/ServiceContainer'
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
  private style: Record<string, any>
  private typedEventBus: TypedEventBus
  
  constructor(
    canvasManager: CanvasManager,
    text: string,
    position: { x: number; y: number },
    style: Record<string, any> = {}
  ) {
    super('Add text')
    this.canvasManager = canvasManager
    this.text = text
    this.position = position
    this.style = style
    this.typedEventBus = ServiceContainer.getInstance().get<TypedEventBus>('TypedEventBus')
  }
  
  async execute(): Promise<void> {
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
      node: null as any, // Will be created by canvas manager
      layerId: this.canvasManager.state.activeLayerId || this.canvasManager.state.layers[0].id,
      data: this.text,
      style: {
        fontSize: 24,
        fontFamily: 'Arial',
        fill: '#000000',
        ...this.style
      }
    }
    
    // Add to canvas
    await this.canvasManager.addObject(this.textObject)
    
    // Emit event
    this.typedEventBus.emit('canvas.object.added', {
      canvasId: (this.canvasManager as any).id || 'main',
      object: this.textObject,
      layerId: this.textObject.layerId
    })
  }
  
  async undo(): Promise<void> {
    if (!this.textObject) return
    
    await this.canvasManager.removeObject(this.textObject.id)
    
    // Emit event
    this.typedEventBus.emit('canvas.object.removed', {
      canvasId: (this.canvasManager as any).id || 'main',
      objectId: this.textObject.id
    })
  }
  
  async redo(): Promise<void> {
    await this.execute()
  }
} 