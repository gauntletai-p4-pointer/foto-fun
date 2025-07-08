import { Command, type ICommand } from '../base/Command'
import type { Layer } from '@/types'
import { useLayerStore } from '@/store/layerStore'

/**
 * Command to update layer properties
 */
export class UpdateLayerCommand extends Command {
  private layerId: string
  private updates: Partial<Layer>
  private previousValues: Partial<Layer> = {}
  
  constructor(layerId: string, updates: Partial<Layer>) {
    const updateKeys = Object.keys(updates).join(', ')
    super(`Update layer properties: ${updateKeys}`)
    this.layerId = layerId
    this.updates = updates
  }
  
  async execute(): Promise<void> {
    const layerStore = useLayerStore.getState()
    const layer = layerStore.getLayerById(this.layerId)
    if (!layer) return
    
    // Store previous values
    this.previousValues = {}
    for (const key in this.updates) {
      if (key in layer) {
        (this.previousValues as any)[key] = (layer as any)[key]
      }
    }
    
    // Apply updates
    layerStore.updateLayer(this.layerId, this.updates)
  }
  
  async undo(): Promise<void> {
    const layerStore = useLayerStore.getState()
    layerStore.updateLayer(this.layerId, this.previousValues)
  }
  
  async redo(): Promise<void> {
    const layerStore = useLayerStore.getState()
    layerStore.updateLayer(this.layerId, this.updates)
  }
  
  canExecute(): boolean {
    const layer = useLayerStore.getState().getLayerById(this.layerId)
    return !!layer
  }
  
  /**
   * Can merge with another UpdateLayerCommand if it's for the same layer
   * and happened within 500ms (for smooth slider updates)
   */
  canMergeWith(other: ICommand): boolean {
    if (!(other instanceof UpdateLayerCommand)) return false
    return (
      other.layerId === this.layerId &&
      other.timestamp - this.timestamp < 500
    )
  }
  
  mergeWith(other: ICommand): void {
    if (!(other instanceof UpdateLayerCommand)) return
    
    // Merge the updates
    this.updates = { ...this.updates, ...other.updates }
    
    // Update description
    const updateKeys = Object.keys(this.updates).join(', ')
    ;(this as any).description = `Update layer properties: ${updateKeys}`
  }
} 