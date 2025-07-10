import { Command } from '../base/Command'
import { getLayerStore } from '@/lib/store/layers'

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
    // TODO: Implement reorderLayers method on EventLayerStore
    console.warn('ReorderLayersCommand: reorderLayers method not yet implemented on EventLayerStore')
  }
  
  async undo(): Promise<void> {
    // TODO: Implement reorderLayers method on EventLayerStore
    console.warn('ReorderLayersCommand: reorderLayers method not yet implemented on EventLayerStore')
  }
  
  async redo(): Promise<void> {
    await this.execute()
  }
  
  canExecute(): boolean {
    const layerStore = getLayerStore()
    const layerCount = layerStore.getLayers().length
    return (
      this.fromIndex >= 0 &&
      this.fromIndex < layerCount &&
      this.toIndex >= 0 &&
      this.toIndex < layerCount &&
      this.fromIndex !== this.toIndex
    )
  }
} 