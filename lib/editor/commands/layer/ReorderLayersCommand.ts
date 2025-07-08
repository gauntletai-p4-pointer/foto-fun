import { Command } from '../base/Command'
import { useLayerStore } from '@/store/layerStore'

/**
 * Command to reorder layers
 */
export class ReorderLayersCommand extends Command {
  private fromIndex: number
  private toIndex: number
  
  constructor(fromIndex: number, toIndex: number) {
    super(`Reorder layers`)
    this.fromIndex = fromIndex
    this.toIndex = toIndex
  }
  
  async execute(): Promise<void> {
    const layerStore = useLayerStore.getState()
    layerStore.reorderLayers(this.fromIndex, this.toIndex)
  }
  
  async undo(): Promise<void> {
    const layerStore = useLayerStore.getState()
    // Reverse the reorder operation
    layerStore.reorderLayers(this.toIndex, this.fromIndex)
  }
  
  async redo(): Promise<void> {
    await this.execute()
  }
  
  canExecute(): boolean {
    const layerStore = useLayerStore.getState()
    const layerCount = layerStore.layers.length
    return (
      this.fromIndex >= 0 &&
      this.fromIndex < layerCount &&
      this.toIndex >= 0 &&
      this.toIndex < layerCount &&
      this.fromIndex !== this.toIndex
    )
  }
} 