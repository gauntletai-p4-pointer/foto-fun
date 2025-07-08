import { Command } from '../base/Command'
import type { Layer } from '@/types'
import { useLayerStore } from '@/store/layerStore'

/**
 * Command to remove a layer
 */
export class RemoveLayerCommand extends Command {
  private layerId: string
  private removedLayer: Layer | null = null
  private previousActiveLayerId: string | null = null
  private layerIndex: number = -1
  
  constructor(layerId: string) {
    const layer = useLayerStore.getState().getLayerById(layerId)
    super(`Remove layer "${layer?.name || 'Unknown'}"`)
    this.layerId = layerId
  }
  
  async execute(): Promise<void> {
    const layerStore = useLayerStore.getState()
    
    // Store the layer data before removal
    this.removedLayer = layerStore.getLayerById(this.layerId) || null
    if (!this.removedLayer) return
    
    // Store the index for restoration
    this.layerIndex = layerStore.getLayerIndex(this.layerId)
    this.previousActiveLayerId = layerStore.activeLayerId
    
    // Remove the layer
    layerStore.removeLayer(this.layerId)
  }
  
  async undo(): Promise<void> {
    if (this.removedLayer && this.layerIndex >= 0) {
      const layerStore = useLayerStore.getState()
      
      // Re-add the layer at its original position
      const layers = [...layerStore.layers]
      layers.splice(this.layerIndex, 0, this.removedLayer)
      
      // Update positions
      layers.forEach((layer, index) => {
        layer.position = index
      })
      
      // Restore the layer state
      layerStore.layers = layers
      
      // Restore active layer if it was the removed one
      if (this.previousActiveLayerId === this.layerId) {
        layerStore.setActiveLayer(this.layerId)
      }
      
      // Sync to canvas
      layerStore.syncLayersToCanvas()
    }
  }
  
  async redo(): Promise<void> {
    await this.execute()
  }
  
  canExecute(): boolean {
    const layer = useLayerStore.getState().getLayerById(this.layerId)
    return !!layer && !layer.locked
  }
} 