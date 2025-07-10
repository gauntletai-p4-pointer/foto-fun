import { Event } from '../core/Event'
import type { Layer } from '@/lib/editor/canvas/types'

/**
 * Base class for layer events
 */
export abstract class LayerEvent extends Event {
  constructor(
    type: string,
    layerId: string,
    metadata: Event['metadata']
  ) {
    super(type, layerId, 'layer', metadata)
  }
}

/**
 * Event emitted when a layer is created
 */
export class LayerCreatedEvent extends LayerEvent {
  constructor(
    public readonly layer: Layer,
    metadata: Event['metadata']
  ) {
    super('LayerCreatedEvent', layer.id, metadata)
  }
  
  apply(currentState: unknown): unknown {
    // In a real implementation, this would add the layer to the state
    return currentState
  }
  
  reverse(): Event | null {
    return new LayerRemovedEvent(this.layer.id, this.layer, this.metadata)
  }
  
  canApply(_: unknown): boolean {
    return true
  }
  
  getDescription(): string {
    return `Created layer "${this.layer.name}"`
  }
  
  protected getEventData(): Record<string, unknown> {
    return {
      layer: this.layer
    }
  }
}

/**
 * Event emitted when a layer is removed
 */
export class LayerRemovedEvent extends LayerEvent {
  constructor(
    public readonly layerId: string,
    public readonly layer: Layer,
    metadata: Event['metadata']
  ) {
    super('LayerRemovedEvent', layerId, metadata)
  }
  
  apply(currentState: unknown): unknown {
    // In a real implementation, this would remove the layer from the state
    return currentState
  }
  
  reverse(): Event | null {
    return new LayerCreatedEvent(this.layer, this.metadata)
  }
  
  canApply(_: unknown): boolean {
    return true
  }
  
  getDescription(): string {
    return `Removed layer "${this.layer.name}"`
  }
  
  protected getEventData(): Record<string, unknown> {
    return {
      layerId: this.layerId,
      layer: this.layer
    }
  }
}

/**
 * Event emitted when a layer is modified
 */
export class LayerModifiedEvent extends LayerEvent {
  constructor(
    public readonly layerId: string,
    public readonly modifications: Partial<Layer>,
    public readonly previousState: Partial<Layer>,
    metadata: Event['metadata']
  ) {
    super('LayerModifiedEvent', layerId, metadata)
  }
  
  apply(currentState: unknown): unknown {
    // In a real implementation, this would apply modifications to the layer
    return currentState
  }
  
  reverse(): Event | null {
    return new LayerModifiedEvent(
      this.layerId,
      this.previousState,
      this.modifications,
      this.metadata
    )
  }
  
  canApply(_: unknown): boolean {
    return true
  }
  
  getDescription(): string {
    const changes = Object.keys(this.modifications).join(', ')
    return `Modified layer properties: ${changes}`
  }
  
  protected getEventData(): Record<string, unknown> {
    return {
      layerId: this.layerId,
      modifications: this.modifications,
      previousState: this.previousState
    }
  }
}

/**
 * Event emitted when layers are reordered
 */
export class LayersReorderedEvent extends Event {
  constructor(
    public readonly canvasId: string,
    public readonly layerIds: string[],
    public readonly previousOrder: string[],
    metadata: Event['metadata']
  ) {
    super('LayersReorderedEvent', canvasId, 'canvas', metadata)
  }
  
  apply(currentState: unknown): unknown {
    // In a real implementation, this would reorder the layers
    return currentState
  }
  
  reverse(): Event | null {
    return new LayersReorderedEvent(
      this.canvasId,
      this.previousOrder,
      this.layerIds,
      this.metadata
    )
  }
  
  canApply(_: unknown): boolean {
    return true
  }
  
  getDescription(): string {
    return `Reordered ${this.layerIds.length} layers`
  }
  
  protected getEventData(): Record<string, unknown> {
    return {
      canvasId: this.canvasId,
      layerIds: this.layerIds,
      previousOrder: this.previousOrder
    }
  }
}

/**
 * Event emitted when active layer changes
 */
export class ActiveLayerChangedEvent extends Event {
  constructor(
    public readonly canvasId: string,
    public readonly layerId: string | null,
    public readonly previousLayerId: string | null,
    metadata: Event['metadata']
  ) {
    super('ActiveLayerChangedEvent', canvasId, 'canvas', metadata)
  }
  
  apply(currentState: unknown): unknown {
    // In a real implementation, this would change the active layer
    return currentState
  }
  
  reverse(): Event | null {
    return new ActiveLayerChangedEvent(
      this.canvasId,
      this.previousLayerId,
      this.layerId,
      this.metadata
    )
  }
  
  canApply(_: unknown): boolean {
    return true
  }
  
  getDescription(): string {
    if (this.layerId) {
      return `Activated layer ${this.layerId}`
    }
    return 'Deactivated all layers'
  }
  
  protected getEventData(): Record<string, unknown> {
    return {
      canvasId: this.canvasId,
      layerId: this.layerId,
      previousLayerId: this.previousLayerId
    }
  }
}

/**
 * Event emitted when layer visibility changes
 */
export class LayerVisibilityChangedEvent extends LayerEvent {
  constructor(
    public readonly layerId: string,
    public readonly visible: boolean,
    public readonly previousVisible: boolean,
    metadata: Event['metadata']
  ) {
    super('LayerVisibilityChangedEvent', layerId, metadata)
  }
  
  apply(currentState: unknown): unknown {
    // In a real implementation, this would change layer visibility
    return currentState
  }
  
  reverse(): Event | null {
    return new LayerVisibilityChangedEvent(
      this.layerId,
      this.previousVisible,
      this.visible,
      this.metadata
    )
  }
  
  canApply(_: unknown): boolean {
    return true
  }
  
  getDescription(): string {
    return `${this.visible ? 'Showed' : 'Hid'} layer ${this.layerId}`
  }
  
  protected getEventData(): Record<string, unknown> {
    return {
      layerId: this.layerId,
      visible: this.visible,
      previousVisible: this.previousVisible
    }
  }
}

/**
 * Event emitted when layer opacity changes
 */
export class LayerOpacityChangedEvent extends LayerEvent {
  constructor(
    public readonly layerId: string,
    public readonly opacity: number,
    public readonly previousOpacity: number,
    metadata: Event['metadata']
  ) {
    super('LayerOpacityChangedEvent', layerId, metadata)
  }
  
  apply(currentState: unknown): unknown {
    // In a real implementation, this would change layer opacity
    return currentState
  }
  
  reverse(): Event | null {
    return new LayerOpacityChangedEvent(
      this.layerId,
      this.previousOpacity,
      this.opacity,
      this.metadata
    )
  }
  
  canApply(_: unknown): boolean {
    return true
  }
  
  getDescription(): string {
    return `Changed layer ${this.layerId} opacity to ${Math.round(this.opacity * 100)}%`
  }
  
  protected getEventData(): Record<string, unknown> {
    return {
      layerId: this.layerId,
      opacity: this.opacity,
      previousOpacity: this.previousOpacity
    }
  }
}

/**
 * Event emitted when layer blend mode changes
 */
export class LayerBlendModeChangedEvent extends LayerEvent {
  constructor(
    public readonly layerId: string,
    public readonly blendMode: string,
    public readonly previousBlendMode: string,
    metadata: Event['metadata']
  ) {
    super('LayerBlendModeChangedEvent', layerId, metadata)
  }
  
  apply(currentState: unknown): unknown {
    // In a real implementation, this would change layer blend mode
    return currentState
  }
  
  reverse(): Event | null {
    return new LayerBlendModeChangedEvent(
      this.layerId,
      this.previousBlendMode,
      this.blendMode,
      this.metadata
    )
  }
  
  canApply(_: unknown): boolean {
    return true
  }
  
  getDescription(): string {
    return `Changed layer ${this.layerId} blend mode to ${this.blendMode}`
  }
  
  protected getEventData(): Record<string, unknown> {
    return {
      layerId: this.layerId,
      blendMode: this.blendMode,
      previousBlendMode: this.previousBlendMode
    }
  }
} 