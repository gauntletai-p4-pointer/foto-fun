import type { Canvas, IText, Textbox } from 'fabric'
import { Command } from '../base/Command'
import type { CustomFabricObjectProps } from '@/types'

/**
 * Command to add text to the canvas
 */
export class AddTextCommand extends Command {
  constructor(
    private canvas: Canvas,
    private textObject: IText | Textbox,
    private layerId?: string
  ) {
    super('Add text')
  }
  
  async execute(): Promise<void> {
    // Add to specific layer if provided
    if (this.layerId) {
      const objWithProps = this.textObject as (IText | Textbox) & CustomFabricObjectProps
      objWithProps.layerId = this.layerId
    }
    
    // Add to canvas
    this.canvas.add(this.textObject)
    
    // Set as active object
    this.canvas.setActiveObject(this.textObject)
    
    this.canvas.renderAll()
  }
  
  async undo(): Promise<void> {
    this.canvas.remove(this.textObject)
    this.canvas.renderAll()
  }
  
  async redo(): Promise<void> {
    await this.execute()
  }
} 