import { Command } from '../base/Command'
import { ServiceContainer } from '@/lib/core/ServiceContainer'
import type { TypedEventBus } from '@/lib/events/core/TypedEventBus'

export class RemoveLayerCommand extends Command {
  private layerId: string
  private typedEventBus: TypedEventBus
  
  constructor(layerId: string) {
    super(`Remove layer`)
    this.layerId = layerId
    this.typedEventBus = ServiceContainer.getInstance().getSync<TypedEventBus>('TypedEventBus')
  }
  
  async execute(): Promise<void> {
    this.typedEventBus.emit('layer.removed', {
      layerId: this.layerId
    })
  }
  
  async undo(): Promise<void> {
    // TODO: Implement layer restoration when undo system is fully migrated
    console.log('Layer restoration needs proper implementation')
  }
} 