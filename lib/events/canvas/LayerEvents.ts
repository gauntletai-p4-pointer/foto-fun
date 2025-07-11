import { Event } from '../core/Event'
import type { Layer, FilterStack, FilterInstance, AdjustmentLayerData } from '@/lib/editor/canvas/types'

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
  
  canApply(): boolean {
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
  
  canApply(): boolean {
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
  
  canApply(): boolean {
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
  
  canApply(): boolean {
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
  
  canApply(): boolean {
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
  
  canApply(): boolean {
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
  
  canApply(): boolean {
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
  
  canApply(): boolean {
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

/**
 * Event fired when a layer's filter stack is updated
 */
export class FilterStackUpdatedEvent extends LayerEvent {
  constructor(
    public readonly layerId: string,
    public readonly filterStack: FilterStack,
    public readonly previousStack: FilterStack | undefined,
    metadata: Event['metadata']
  ) {
    super('FilterStackUpdatedEvent', layerId, metadata)
  }
  
  apply(currentState: unknown): unknown {
    // In a real implementation, this would update the filter stack
    return currentState
  }
  
  reverse(): Event | null {
    if (this.previousStack) {
      return new FilterStackUpdatedEvent(
        this.layerId,
        this.previousStack,
        this.filterStack,
        this.metadata
      )
    }
    return null
  }
  
  canApply(): boolean {
    return true
  }
  
  getDescription(): string {
    return `Updated filter stack for layer ${this.layerId}`
  }
  
  protected getEventData(): Record<string, unknown> {
    return {
      layerId: this.layerId,
      filterStack: this.filterStack,
      previousStack: this.previousStack
    }
  }
}

/**
 * Event fired when a filter is added to a layer
 */
export class FilterAddedToLayerEvent extends LayerEvent {
  constructor(
    public readonly layerId: string,
    public readonly filter: FilterInstance,
    public readonly position: number | undefined,
    metadata: Event['metadata']
  ) {
    super('FilterAddedToLayerEvent', layerId, metadata)
  }
  
  apply(currentState: unknown): unknown {
    // In a real implementation, this would add the filter to the layer
    return currentState
  }
  
  reverse(): Event | null {
    return new FilterRemovedFromLayerEvent(
      this.layerId,
      this.filter.id,
      this.filter,
      this.metadata
    )
  }
  
  canApply(): boolean {
    return true
  }
  
  getDescription(): string {
    return `Added ${this.filter.filter.type} filter to layer ${this.layerId}`
  }
  
  protected getEventData(): Record<string, unknown> {
    return {
      layerId: this.layerId,
      filter: this.filter,
      position: this.position
    }
  }
}

/**
 * Event fired when a filter is removed from a layer
 */
export class FilterRemovedFromLayerEvent extends LayerEvent {
  constructor(
    public readonly layerId: string,
    public readonly filterId: string,
    public readonly removedFilter: FilterInstance,
    metadata: Event['metadata']
  ) {
    super('FilterRemovedFromLayerEvent', layerId, metadata)
  }
  
  apply(currentState: unknown): unknown {
    // In a real implementation, this would remove the filter from the layer
    return currentState
  }
  
  reverse(): Event | null {
    return new FilterAddedToLayerEvent(
      this.layerId,
      this.removedFilter,
      undefined,
      this.metadata
    )
  }
  
  canApply(): boolean {
    return true
  }
  
  getDescription(): string {
    return `Removed ${this.removedFilter.filter.type} filter from layer ${this.layerId}`
  }
  
  protected getEventData(): Record<string, unknown> {
    return {
      layerId: this.layerId,
      filterId: this.filterId,
      removedFilter: this.removedFilter
    }
  }
}

/**
 * Event fired when filters are reordered in a layer
 */
export class FiltersReorderedEvent extends LayerEvent {
  constructor(
    public readonly layerId: string,
    public readonly filterIds: string[],
    public readonly previousOrder: string[],
    metadata: Event['metadata']
  ) {
    super('FiltersReorderedEvent', layerId, metadata)
  }
  
  apply(currentState: unknown): unknown {
    // In a real implementation, this would reorder the filters
    return currentState
  }
  
  reverse(): Event | null {
    return new FiltersReorderedEvent(
      this.layerId,
      this.previousOrder,
      this.filterIds,
      this.metadata
    )
  }
  
  canApply(): boolean {
    return true
  }
  
  getDescription(): string {
    return `Reordered filters in layer ${this.layerId}`
  }
  
  protected getEventData(): Record<string, unknown> {
    return {
      layerId: this.layerId,
      filterIds: this.filterIds,
      previousOrder: this.previousOrder
    }
  }
}

/**
 * Event fired when an adjustment layer is created
 */
export class AdjustmentLayerCreatedEvent extends Event {
  constructor(
    public readonly canvasId: string,
    public readonly layer: Layer,
    public readonly adjustmentData: AdjustmentLayerData,
    metadata: Event['metadata']
  ) {
    super('AdjustmentLayerCreatedEvent', canvasId, 'canvas', metadata)
  }
  
  apply(currentState: unknown): unknown {
    // In a real implementation, this would create the adjustment layer
    return currentState
  }
  
  reverse(): Event | null {
    return new LayerRemovedEvent(this.layer.id, this.layer, this.metadata)
  }
  
  canApply(): boolean {
    return true
  }
  
  getDescription(): string {
    return `Created ${this.adjustmentData.adjustmentType} adjustment layer "${this.layer.name}"`
  }
  
  protected getEventData(): Record<string, unknown> {
    return {
      canvasId: this.canvasId,
      layer: {
        id: this.layer.id,
        name: this.layer.name,
        type: this.layer.type,
        visible: this.layer.visible,
        locked: this.layer.locked,
        opacity: this.layer.opacity,
        blendMode: this.layer.blendMode,
        parentId: this.layer.parentId
      },
      adjustmentData: this.adjustmentData
    }
  }
}

/**
 * Event fired when a layer mask is updated
 */
export class LayerMaskUpdatedEvent extends LayerEvent {
  constructor(
    public readonly layerId: string,
    public readonly mask: Layer['mask'],
    public readonly previousMask: Layer['mask'] | undefined,
    metadata: Event['metadata']
  ) {
    super('LayerMaskUpdatedEvent', layerId, metadata)
  }
  
  apply(currentState: unknown): unknown {
    // In a real implementation, this would update the layer mask
    return currentState
  }
  
  reverse(): Event | null {
    return new LayerMaskUpdatedEvent(
      this.layerId,
      this.previousMask,
      this.mask,
      this.metadata
    )
  }
  
  canApply(): boolean {
    return true
  }
  
  getDescription(): string {
    if (this.mask) {
      return `Updated ${this.mask.type} mask on layer ${this.layerId}`
    }
    return `Removed mask from layer ${this.layerId}`
  }
  
  protected getEventData(): Record<string, unknown> {
    return {
      layerId: this.layerId,
      mask: this.mask,
      previousMask: this.previousMask
    }
  }
} 

/**
 * Event emitted when a layer is moved into or out of a group
 */
export class LayerParentChangedEvent extends LayerEvent {
  constructor(
    public readonly layerId: string,
    public readonly parentId: string | undefined,
    public readonly previousParentId: string | undefined,
    metadata: Event['metadata']
  ) {
    super('LayerParentChangedEvent', layerId, metadata)
  }
  
  apply(currentState: unknown): unknown {
    // In a real implementation, this would update the layer's parent
    return currentState
  }
  
  reverse(): Event | null {
    return new LayerParentChangedEvent(
      this.layerId,
      this.previousParentId,
      this.parentId,
      this.metadata
    )
  }
  
  canApply(): boolean {
    return true
  }
  
  getDescription(): string {
    if (this.parentId && !this.previousParentId) {
      return `Moved layer ${this.layerId} into group ${this.parentId}`
    } else if (!this.parentId && this.previousParentId) {
      return `Moved layer ${this.layerId} out of group ${this.previousParentId}`
    } else if (this.parentId && this.previousParentId) {
      return `Moved layer ${this.layerId} from group ${this.previousParentId} to group ${this.parentId}`
    }
    return `Updated layer ${this.layerId} parent`
  }
  
  protected getEventData(): Record<string, unknown> {
    return {
      layerId: this.layerId,
      parentId: this.parentId,
      previousParentId: this.previousParentId
    }
  }
}

/**
 * Event emitted when a group is expanded or collapsed
 */
export class GroupExpansionChangedEvent extends LayerEvent {
  constructor(
    public readonly groupId: string,
    public readonly expanded: boolean,
    metadata: Event['metadata']
  ) {
    super('GroupExpansionChangedEvent', groupId, metadata)
  }
  
  apply(currentState: unknown): unknown {
    // In a real implementation, this would update the group's expansion state
    return currentState
  }
  
  reverse(): Event | null {
    return new GroupExpansionChangedEvent(
      this.groupId,
      !this.expanded,
      this.metadata
    )
  }
  
  canApply(): boolean {
    return true
  }
  
  getDescription(): string {
    return `${this.expanded ? 'Expanded' : 'Collapsed'} group ${this.groupId}`
  }
  
  protected getEventData(): Record<string, unknown> {
    return {
      groupId: this.groupId,
      expanded: this.expanded
    }
  }
} 