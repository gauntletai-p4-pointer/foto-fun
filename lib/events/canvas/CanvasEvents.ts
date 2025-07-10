import { CanvasEvent } from '../core/Event'
import type { FabricObject } from 'fabric'

/**
 * Canvas state interface for event application
 */
export interface CanvasState {
  objects: FabricObject[]
  backgroundColor?: string
  width: number
  height: number
  version: number
}

/**
 * Object added to canvas
 */
export class ObjectAddedEvent extends CanvasEvent {
  constructor(
    private canvasId: string,
    private object: FabricObject,
    private layerId: string | undefined,
    metadata: CanvasEvent['metadata']
  ) {
    super('canvas.object.added', canvasId, metadata)
  }
  
  apply(currentState: CanvasState): CanvasState {
    // Add custom properties
    if (this.layerId) {
      (this.object as FabricObject & { layerId?: string }).layerId = this.layerId
    }
    
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
    const objectId = (this.object as FabricObject & { id?: string }).id
    if (objectId) {
      return !currentState.objects.some(obj => 
        (obj as FabricObject & { id?: string }).id === objectId
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
      objectId: (this.object as FabricObject & { id?: string }).id,
      layerId: this.layerId,
      objectData: this.object.toObject()
    }
  }
}

/**
 * Object removed from canvas
 */
export class ObjectRemovedEvent extends CanvasEvent {
  private objectIndex: number = -1
  
  constructor(
    private canvasId: string,
    private object: FabricObject,
    metadata: CanvasEvent['metadata']
  ) {
    super('canvas.object.removed', canvasId, metadata)
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
    const layerId = (this.object as FabricObject & { layerId?: string }).layerId
    return new ObjectAddedEvent(
      this.canvasId,
      this.object,
      layerId,
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
      objectId: (this.object as FabricObject & { id?: string }).id,
      objectIndex: this.objectIndex,
      objectData: this.object.toObject()
    }
  }
}

/**
 * Object modified on canvas
 */
export class ObjectModifiedEvent extends CanvasEvent {
  private previousState: Record<string, unknown>
  
  constructor(
    private canvasId: string,
    private object: FabricObject,
    previousState: Record<string, unknown>,
    private newState: Record<string, unknown>,
    metadata: CanvasEvent['metadata']
  ) {
    super('canvas.object.modified', canvasId, metadata)
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
      objectId: (this.object as FabricObject & { id?: string }).id,
      previousState: this.previousState,
      newState: this.newState
    }
  }
}

/**
 * Multiple objects modified (for efficiency)
 */
export class ObjectsBatchModifiedEvent extends CanvasEvent {
  constructor(
    private canvasId: string,
    private modifications: Array<{
      object: FabricObject
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
    // Reverse the modifications
    const reversedMods = this.modifications.map(({ object, previousState, newState }) => ({
      object,
      previousState: newState,
      newState: previousState
    }))
    
    return new ObjectsBatchModifiedEvent(
      this.canvasId,
      reversedMods,
      this.metadata
    )
  }
  
  canApply(currentState: CanvasState): boolean {
    return this.modifications.every(({ object }) => 
      currentState.objects.includes(object)
    )
  }
  
  getDescription(): string {
    return `Modify ${this.modifications.length} objects`
  }
  
  protected getEventData(): Record<string, unknown> {
    return {
      canvasId: this.canvasId,
      modifications: this.modifications.map(({ object, previousState, newState }) => ({
        objectType: object.type,
        objectId: (object as FabricObject & { id?: string }).id,
        previousState,
        newState
      }))
    }
  }
}

/**
 * Canvas background changed
 */
export class CanvasBackgroundChangedEvent extends CanvasEvent {
  constructor(
    private canvasId: string,
    private previousColor: string | undefined,
    private newColor: string,
    metadata: CanvasEvent['metadata']
  ) {
    super('canvas.background.changed', canvasId, metadata)
  }
  
  apply(currentState: CanvasState): CanvasState {
    return {
      ...currentState,
      backgroundColor: this.newColor,
      version: currentState.version + 1
    }
  }
  
  reverse(): CanvasBackgroundChangedEvent {
    return new CanvasBackgroundChangedEvent(
      this.canvasId,
      this.newColor,
      this.previousColor || 'white',
      this.metadata
    )
  }
  
  canApply(): boolean {
    return true
  }
  
  getDescription(): string {
    return `Change background color to ${this.newColor}`
  }
  
  protected getEventData(): Record<string, unknown> {
    return {
      canvasId: this.canvasId,
      previousColor: this.previousColor,
      newColor: this.newColor
    }
  }
}

/**
 * Canvas resized
 */
export class CanvasResizedEvent extends CanvasEvent {
  constructor(
    private canvasId: string,
    private previousSize: { width: number; height: number },
    private newSize: { width: number; height: number },
    metadata: CanvasEvent['metadata']
  ) {
    super('canvas.resized', canvasId, metadata)
  }
  
  apply(currentState: CanvasState): CanvasState {
    return {
      ...currentState,
      width: this.newSize.width,
      height: this.newSize.height,
      version: currentState.version + 1
    }
  }
  
  reverse(): CanvasResizedEvent {
    return new CanvasResizedEvent(
      this.canvasId,
      this.newSize,
      this.previousSize,
      this.metadata
    )
  }
  
  canApply(): boolean {
    return true
  }
  
  getDescription(): string {
    return `Resize canvas to ${this.newSize.width}x${this.newSize.height}`
  }
  
  protected getEventData(): Record<string, unknown> {
    return {
      canvasId: this.canvasId,
      previousSize: this.previousSize,
      newSize: this.newSize
    }
  }
} 