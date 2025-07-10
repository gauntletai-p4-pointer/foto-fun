import { Command } from '../base/Command'
import { ServiceContainer } from '@/lib/core/ServiceContainer'
import type { TypedEventBus } from '@/lib/events/core/TypedEventBus'
import type { Layer } from '@/lib/editor/canvas/types'

export class DuplicateLayerCommand extends Command {
  private originalLayerId: string
  private duplicatedLayer: Layer | null = null
  private typedEventBus: TypedEventBus
  
  constructor(originalLayerId: string) {
    super(`Duplicate layer`)
    this.originalLayerId = originalLayerId
    this.typedEventBus = ServiceContainer.getInstance().get<TypedEventBus>('TypedEventBus')
  }
  
  async execute(): Promise<void> {
    // TODO: Implement layer duplication logic
    // For now, just emit a placeholder layer creation
    const duplicatedLayer: Layer = {
      id: `${this.originalLayerId}_copy_${Date.now()}`,
      name: `Layer Copy`,
      type: 'raster',
      visible: true,
      opacity: 1,
      objects: [],
      locked: false,
      blendMode: 'normal',
      konvaLayer: new (await import('konva')).default.Layer() // Create a new Konva layer
    }
    
    this.duplicatedLayer = duplicatedLayer
    
    this.typedEventBus.emit('layer.created', {
      layer: duplicatedLayer
    })
  }
  
  async undo(): Promise<void> {
    if (this.duplicatedLayer) {
      this.typedEventBus.emit('layer.removed', {
        layerId: this.duplicatedLayer.id
      })
    }
  }
} 