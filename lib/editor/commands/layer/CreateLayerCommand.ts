import { Command } from '../base/Command'
import { ServiceContainer } from '@/lib/core/ServiceContainer'
import type { TypedEventBus } from '@/lib/events/core/TypedEventBus'
import type { Layer } from '@/lib/editor/canvas/types'

export class CreateLayerCommand extends Command {
  private layer: Layer
  private typedEventBus: TypedEventBus
  
  constructor(layer: Layer) {
    super(`Create layer "${layer.name}"`)
    this.layer = layer
    this.typedEventBus = ServiceContainer.getInstance().get<TypedEventBus>('TypedEventBus')
  }
  
  async execute(): Promise<void> {
    this.typedEventBus.emit('layer.created', {
      layer: this.layer
    })
  }
  
  async undo(): Promise<void> {
    this.typedEventBus.emit('layer.removed', {
      layerId: this.layer.id
    })
  }
} 