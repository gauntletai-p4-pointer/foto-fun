import type { Canvas, IText, Textbox } from 'fabric'
import { Command } from '../base/Command'
import { useLayerStore } from '@/store/layerStore'
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
    
    // Add to active layer - this will also add to canvas
    const layerStore = useLayerStore.getState()
    layerStore.addObjectToActiveLayer(this.textObject)
    
    // Only set as active if not executing within a tool chain
    const { ToolChain } = await import('@/lib/ai/execution/ToolChain')
    if (!ToolChain.isExecutingChain) {
      this.canvas.setActiveObject(this.textObject)
    }
    
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