import { CanvasEvent } from '../core/Event'
import type { CanvasObject } from '@/lib/editor/objects/types'

/**
 * Canvas state interface for infinite canvas (no size/background)
 */
export interface CanvasState {
  objects: CanvasObject[]
  version: number
}

/**
 * Object added to infinite canvas
 */
export class ObjectAddedEvent extends CanvasEvent {
  constructor(
    private canvasId: string,
    private object: CanvasObject,
    metadata: CanvasEvent['metadata'],
    version?: number
  ) {
    super('canvas.object.added', canvasId, metadata, version)
  }
  
  apply(currentState: CanvasState): CanvasState {
    return {
      ...currentState,
      objects: [...currentState.objects, this.object],
      version: currentState.version + 1
    }
  }
  
  reverse(): ObjectRemovedEvent {
    return new ObjectRemovedEvent(
      this.canvasId,
      this.object,
      this.metadata
    )
  }
  
  canApply(currentState: CanvasState): boolean {
    // Check if object already exists
    const objectId = (this.object as CanvasObject & { id?: string }).id
    if (objectId) {
      return !currentState.objects.some(obj => 
        (obj as CanvasObject & { id?: string }).id === objectId
      )
    }
    return true
  }
  
  getDescription(): string {
    return `Add ${this.object.type || 'object'} to canvas`
  }
  
  protected getEventData(): Record<string, unknown> {
    return {
      canvasId: this.canvasId,
      objectType: this.object.type,
      objectId: (this.object as CanvasObject & { id?: string }).id,
      objectData: { ...this.object }
    }
  }
}

/**
 * Object removed from infinite canvas
 */
export class ObjectRemovedEvent extends CanvasEvent {
  private objectIndex: number = -1
  
  constructor(
    private canvasId: string,
    private object: CanvasObject,
    metadata: CanvasEvent['metadata'],
    version?: number
  ) {
    super('canvas.object.removed', canvasId, metadata, version)
  }
  
  apply(currentState: CanvasState): CanvasState {
    // Find and store the index for undo
    this.objectIndex = currentState.objects.indexOf(this.object)
    
    return {
      ...currentState,
      objects: currentState.objects.filter(obj => obj !== this.object),
      version: currentState.version + 1
    }
  }
  
  reverse(): ObjectAddedEvent {
    return new ObjectAddedEvent(
      this.canvasId,
      this.object,
      this.metadata
    )
  }
  
  canApply(currentState: CanvasState): boolean {
    return currentState.objects.includes(this.object)
  }
  
  getDescription(): string {
    return `Remove ${this.object.type || 'object'} from canvas`
  }
  
  protected getEventData(): Record<string, unknown> {
    return {
      canvasId: this.canvasId,
      objectType: this.object.type,
      objectId: (this.object as CanvasObject & { id?: string }).id,
      objectIndex: this.objectIndex,
      objectData: { ...this.object }
    }
  }
}

/**
 * Object modified on infinite canvas
 */
export class ObjectModifiedEvent extends CanvasEvent {
  private previousState: Record<string, unknown>
  
  constructor(
    private canvasId: string,
    private object: CanvasObject,
    previousState: Record<string, unknown>,
    private newState: Record<string, unknown>,
    metadata: CanvasEvent['metadata'],
    version?: number
  ) {
    super('canvas.object.modified', canvasId, metadata, version)
    this.previousState = previousState
  }
  
  apply(currentState: CanvasState): CanvasState {
    // Find the object and apply new state
    const objectIndex = currentState.objects.indexOf(this.object)
    if (objectIndex === -1) return currentState
    
    // Apply new state to object
    Object.assign(this.object, this.newState)
    
    return {
      ...currentState,
      version: currentState.version + 1
    }
  }
  
  reverse(): ObjectModifiedEvent {
    return new ObjectModifiedEvent(
      this.canvasId,
      this.object,
      this.newState,
      this.previousState,
      this.metadata
    )
  }
  
  canApply(currentState: CanvasState): boolean {
    return currentState.objects.includes(this.object)
  }
  
  getDescription(): string {
    const changes = Object.keys(this.newState).join(', ')
    return `Modify ${this.object.type || 'object'}: ${changes}`
  }
  
  protected getEventData(): Record<string, unknown> {
    return {
      canvasId: this.canvasId,
      objectType: this.object.type,
      objectId: (this.object as CanvasObject & { id?: string }).id,
      previousState: this.previousState,
      newState: this.newState
    }
  }
}

/**
 * Multiple objects modified in batch on infinite canvas
 */
export class ObjectsBatchModifiedEvent extends CanvasEvent {
  constructor(
    private canvasId: string,
    private modifications: Array<{
      object: CanvasObject
      previousState: Record<string, unknown>
      newState: Record<string, unknown>
    }>,
    metadata: CanvasEvent['metadata']
  ) {
    super('canvas.objects.batch.modified', canvasId, metadata)
  }
  
  apply(currentState: CanvasState): CanvasState {
    // Apply all modifications
    this.modifications.forEach(({ object, newState }) => {
      Object.assign(object, newState)
    })
    
    return {
      ...currentState,
      version: currentState.version + 1
    }
  }
  
  reverse(): ObjectsBatchModifiedEvent {
    // Reverse all modifications
    const reversedModifications = this.modifications.map(({ object, previousState, newState }) => ({
      object,
      previousState: newState,
      newState: previousState
    }))
    
    return new ObjectsBatchModifiedEvent(
      this.canvasId,
      reversedModifications,
      this.metadata
    )
  }
  
  canApply(currentState: CanvasState): boolean {
    return this.modifications.every(({ object }) => 
      currentState.objects.includes(object)
    )
  }
  
  getDescription(): string {
    return `Batch modify ${this.modifications.length} objects`
  }
  
  protected getEventData(): Record<string, unknown> {
    return {
      canvasId: this.canvasId,
      modificationsCount: this.modifications.length,
      modifications: this.modifications.map(({ object, previousState, newState }) => ({
        objectId: (object as CanvasObject & { id?: string }).id,
        objectType: object.type,
        previousState,
        newState
      }))
    }
  }
} 