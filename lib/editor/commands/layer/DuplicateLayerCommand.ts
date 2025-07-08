import { Command } from '../base/Command'
import { useLayerStore } from '@/store/layerStore'

/**
 * Command to duplicate a layer
 */
export class DuplicateLayerCommand extends Command {
  private sourceLayerId: string
  private duplicatedLayerId: string | null = null
  
  constructor(sourceLayerId: string) {
    super('Duplicate layer')
    this.sourceLayerId = sourceLayerId
  }
  
  async execute(): Promise<void> {
    const layerStore = useLayerStore.getState()
    const duplicated = layerStore.duplicateLayer(this.sourceLayerId)
    if (duplicated) {
      this.duplicatedLayerId = duplicated.id
    }
  }
  
  async undo(): Promise<void> {
    if (this.duplicatedLayerId) {
      const layerStore = useLayerStore.getState()
      layerStore.removeLayer(this.duplicatedLayerId)
    }
  }
  
  async redo(): Promise<void> {
    // Re-duplicate the layer (will get a new ID)
    await this.execute()
  }
} 