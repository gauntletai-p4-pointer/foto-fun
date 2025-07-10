import { Command } from '../base/Command'
import { ServiceContainer } from '@/lib/core/ServiceContainer'
import type { TypedEventBus } from '@/lib/events/core/TypedEventBus'

export class UpdateLayerCommand extends Command {
  private layerId: string
  private updates: Record<string, any>
  private typedEventBus: TypedEventBus
  
  constructor(layerId: string, updates: Record<string, any>) {
    super(`Update layer`)
    this.layerId = layerId
    this.updates = updates
    this.typedEventBus = ServiceContainer.getInstance().get<TypedEventBus>('TypedEventBus')
  }
  
  async execute(): Promise<void> {
    this.typedEventBus.emit('layer.modified', {
      layerId: this.layerId,
      modifications: this.updates
    })
  }
  
  async undo(): Promise<void> {
    // TODO: Implement layer update undo when undo system is fully migrated
    console.log('Layer update undo needs proper implementation')
  }
} 