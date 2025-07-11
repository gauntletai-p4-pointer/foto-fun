import { Command } from '../base/Command'
import { ServiceContainer } from '@/lib/core/ServiceContainer'
import type { TypedEventBus } from '@/lib/events/core/TypedEventBus'
import type { CanvasObject } from '@/lib/editor/objects/types'

export class RemoveObjectCommand extends Command {
  private object: CanvasObject
  private layerId: string
  private typedEventBus: TypedEventBus
  
  constructor(object: CanvasObject, layerId: string) {
    super(`Remove ${object.type}`)
    this.object = object
    this.layerId = layerId
    this.typedEventBus = ServiceContainer.getInstance().getSync<TypedEventBus>('TypedEventBus')
  }
  
  protected async doExecute(): Promise<void> {
    // Emit object removed event
    this.typedEventBus.emit('canvas.object.removed', {
      canvasId: 'main', // TODO: Get actual canvas ID
      objectId: this.object.id
    })
  }
  
  async undo(): Promise<void> {
    // Emit object added event to restore
    this.typedEventBus.emit('canvas.object.added', {
      canvasId: 'main', // TODO: Get actual canvas ID
      object: this.object,
      layerId: this.layerId
    })
  }
} 