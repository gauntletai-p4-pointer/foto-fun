import { Command } from '../base'
import type { CanvasManager, CanvasObject, Transform } from '@/lib/editor/canvas/types'
import { ServiceContainer } from '@/lib/core/ServiceContainer'
import type { TypedEventBus } from '@/lib/events/core/TypedEventBus'

export type TransformationType = 'rotate' | 'scale' | 'skew' | 'flip'

/**
 * Command to transform objects (rotate, scale, skew, flip)
 * Uses the event-driven architecture for state changes
 */
export class TransformCommand extends Command {
  private canvasManager: CanvasManager
  private objectIds: string[]
  private transformType: TransformationType
  private value: number | { x: number; y: number } | 'horizontal' | 'vertical'
  private previousTransforms: Map<string, Transform>
  private typedEventBus: TypedEventBus
  
  constructor(
    canvasManager: CanvasManager,
    objects: CanvasObject[],
    transformType: TransformationType,
    value: number | { x: number; y: number } | 'horizontal' | 'vertical',
    description?: string
  ) {
    super(description || `${transformType} objects`)
    this.canvasManager = canvasManager
    this.objectIds = objects.map(obj => obj.id)
    this.transformType = transformType
    this.value = value
    this.previousTransforms = new Map()
    this.typedEventBus = ServiceContainer.getInstance().getSync<TypedEventBus>('TypedEventBus')
    
    // Store previous transforms
    objects.forEach(obj => {
      this.previousTransforms.set(obj.id, { ...obj.transform })
    })
  }
  
  async execute(): Promise<void> {
    const objects = this.getObjects()
    if (objects.length === 0) return
    
    const modifications = objects.map(obj => {
      const previousTransform = this.previousTransforms.get(obj.id)!
      const newTransform = this.applyTransform({ ...previousTransform })
      
      return {
        object: obj,
        previousState: { transform: previousTransform },
        newState: { transform: newTransform }
      }
    })
    
    // Emit batch modification event
    this.typedEventBus.emit('canvas.objects.batch.modified', {
      canvasId: 'main', // TODO: Get actual canvas ID
      modifications
    })
    
    // Apply transformations through canvas manager
    for (const { object, newState } of modifications) {
      await this.canvasManager.updateObject(object.id, newState)
    }
  }
  
  async undo(): Promise<void> {
    const objects = this.getObjects()
    if (objects.length === 0) return
    
    const modifications = objects.map(obj => {
      const currentTransform = obj.transform
      const previousTransform = this.previousTransforms.get(obj.id)!
      
      return {
        object: obj,
        previousState: { transform: currentTransform },
        newState: { transform: previousTransform }
      }
    })
    
    // Emit batch modification event
    this.typedEventBus.emit('canvas.objects.batch.modified', {
      canvasId: 'main', // TODO: Get actual canvas ID
      modifications
    })
    
    // Restore original transforms
    for (const { object, newState } of modifications) {
      await this.canvasManager.updateObject(object.id, newState)
    }
  }
  
  private applyTransform(transform: Transform): Transform {
    const newTransform = { ...transform }
    
    switch (this.transformType) {
      case 'rotate':
        if (typeof this.value === 'number') {
          newTransform.rotation += this.value
        }
        break
        
      case 'scale':
        if (typeof this.value === 'object' && 'x' in this.value && 'y' in this.value) {
          newTransform.scaleX *= this.value.x
          newTransform.scaleY *= this.value.y
        } else if (typeof this.value === 'number') {
          newTransform.scaleX *= this.value
          newTransform.scaleY *= this.value
        }
        break
        
      case 'skew':
        if (typeof this.value === 'object' && 'x' in this.value && 'y' in this.value) {
          newTransform.skewX += this.value.x
          newTransform.skewY += this.value.y
        }
        break
        
      case 'flip':
        if (this.value === 'horizontal') {
          newTransform.scaleX *= -1
        } else if (this.value === 'vertical') {
          newTransform.scaleY *= -1
        }
        break
    }
    
    return newTransform
  }
  
  private getObjects(): CanvasObject[] {
    const objects: CanvasObject[] = []
    
    for (const id of this.objectIds) {
      for (const layer of this.canvasManager.state.layers) {
        const obj = layer.objects.find(o => o.id === id)
        if (obj) {
          objects.push(obj)
          break
        }
      }
    }
    
    return objects
  }
} 