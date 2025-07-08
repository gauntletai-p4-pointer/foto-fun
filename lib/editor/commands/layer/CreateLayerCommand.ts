import { Command } from '../base/Command'
import type { Layer } from '@/types'
import { useLayerStore } from '@/store/layerStore'

/**
 * Command to create a new layer
 */
export class CreateLayerCommand extends Command {
  private layerData: Partial<Layer>
  private createdLayerId: string | null = null
  
  constructor(layerData: Partial<Layer>) {
    super(`Create ${layerData.type || 'image'} layer`)
    // Store layer data without ID to ensure fresh creation
    const { id, ...dataWithoutId } = layerData
    this.layerData = dataWithoutId
    // If this is a redo operation, store the ID
    if (id) {
      this.createdLayerId = id
    }
  }
  
  async execute(): Promise<void> {
    const layerStore = useLayerStore.getState()
    const createdLayer = layerStore.addLayer(this.layerData)
    this.createdLayerId = createdLayer.id
  }
  
  async undo(): Promise<void> {
    if (this.createdLayerId) {
      const layerStore = useLayerStore.getState()
      layerStore.removeLayer(this.createdLayerId)
    }
  }
  
  async redo(): Promise<void> {
    // For redo, we need to create a new layer since IDs must be unique
    await this.execute()
  }
} 