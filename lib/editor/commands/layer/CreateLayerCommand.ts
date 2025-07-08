import { Command } from '../base/Command'
import type { Layer } from '@/types'
import { useLayerStore } from '@/store/layerStore'

/**
 * Command to create a new layer
 */
export class CreateLayerCommand extends Command {
  private layerData: Partial<Layer>
  private createdLayer: Layer | null = null
  
  constructor(layerData: Partial<Layer>) {
    super(`Create ${layerData.type || 'image'} layer`)
    this.layerData = layerData
  }
  
  async execute(): Promise<void> {
    const layerStore = useLayerStore.getState()
    this.createdLayer = layerStore.addLayer(this.layerData)
  }
  
  async undo(): Promise<void> {
    if (this.createdLayer) {
      const layerStore = useLayerStore.getState()
      layerStore.removeLayer(this.createdLayer.id)
    }
  }
  
  async redo(): Promise<void> {
    if (this.createdLayer) {
      const layerStore = useLayerStore.getState()
      // Re-add the layer with the same ID
      layerStore.addLayer(this.createdLayer)
    }
  }
} 