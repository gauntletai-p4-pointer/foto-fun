import type { Canvas, FabricObject } from 'fabric'
import { Command } from '../base/Command'
import { useLayerStore } from '@/store/layerStore'
import type { CustomFabricObjectProps } from '@/types'

export class AddObjectCommand extends Command {
  constructor(
    private canvas: Canvas,
    private object: FabricObject,
    private layerId?: string
  ) {
    super('Add object')
  }
  
  async execute(): Promise<void> {
    // Add to specific layer if provided
    if (this.layerId) {
      const objWithProps = this.object as FabricObject & CustomFabricObjectProps
      objWithProps.layerId = this.layerId
    }
    
    // Add to active layer - this will also add to canvas
    const layerStore = useLayerStore.getState()
    layerStore.addObjectToActiveLayer(this.object)
    
    // Only set as active if not executing within a tool chain
    const { ToolChain } = await import('@/lib/ai/execution/ToolChain')
    if (!ToolChain.isExecutingChain) {
      this.canvas.setActiveObject(this.object)
    }
    
    this.canvas.renderAll()
  }
  
  async undo(): Promise<void> {
    this.canvas.remove(this.object)
    this.canvas.discardActiveObject()
    this.canvas.renderAll()
  }
  
  async redo(): Promise<void> {
    this.canvas.add(this.object)
    
    // Only set as active if not executing within a tool chain
    const { ToolChain } = await import('@/lib/ai/execution/ToolChain')
    if (!ToolChain.isExecutingChain) {
      this.canvas.setActiveObject(this.object)
    }
    
    this.canvas.renderAll()
  }
} 