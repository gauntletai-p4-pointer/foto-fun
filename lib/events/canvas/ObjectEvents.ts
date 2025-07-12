import { Event } from '../core/Event'
import type { CanvasObject } from '@/lib/editor/objects/types'
import type { FilterStack, Filter } from '@/types'
// FilterInstance removed - using simplified Filter architecture

/**
 * Base class for object events
 */
export abstract class ObjectEvent extends Event {
  constructor(
    type: string,
    objectId: string,
    metadata: Event['metadata']
  ) {
    super(type, objectId, 'object', metadata)
  }
}

/**
 * Event emitted when an object is created
 */
export class ObjectCreatedEvent extends ObjectEvent {
  constructor(
    public readonly object: CanvasObject,
    metadata: Event['metadata']
  ) {
    super('ObjectCreatedEvent', object.id, metadata)
  }
  
  apply(currentState: unknown): unknown {
    // In a real implementation, this would add the object to the state
    return currentState
  }
  
  reverse(): Event | null {
    return new ObjectRemovedEvent(this.object.id, this.object, this.metadata)
  }
  
  canApply(): boolean {
    return true
  }
  
  getDescription(): string {
    return `Created object "${this.object.name || this.object.id}"`
  }
  
  protected getEventData(): Record<string, unknown> {
    return {
      object: this.object
    }
  }
}

/**
 * Event emitted when an object is removed
 */
export class ObjectRemovedEvent extends ObjectEvent {
  constructor(
    public readonly objectId: string,
    public readonly object: CanvasObject,
    metadata: Event['metadata']
  ) {
    super('ObjectRemovedEvent', objectId, metadata)
  }
  
  apply(currentState: unknown): unknown {
    // In a real implementation, this would remove the object from the state
    return currentState
  }
  
  reverse(): Event | null {
    return new ObjectCreatedEvent(this.object, this.metadata)
  }
  
  canApply(): boolean {
    return true
  }
  
  getDescription(): string {
    return `Removed object "${this.object.name || this.object.id}"`
  }
  
  protected getEventData(): Record<string, unknown> {
    return {
      objectId: this.objectId,
      object: this.object
    }
  }
}

/**
 * Event emitted when an object is modified
 */
export class ObjectModifiedEvent extends ObjectEvent {
  constructor(
    public readonly objectId: string,
    public readonly modifications: Partial<CanvasObject>,
    public readonly previousState: Partial<CanvasObject>,
    metadata: Event['metadata']
  ) {
    super('ObjectModifiedEvent', objectId, metadata)
  }
  
  apply(currentState: unknown): unknown {
    // In a real implementation, this would apply modifications to the object
    return currentState
  }
  
  reverse(): Event | null {
    return new ObjectModifiedEvent(
      this.objectId,
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
    return `Modified object properties: ${changes}`
  }
  
  protected getEventData(): Record<string, unknown> {
    return {
      objectId: this.objectId,
      modifications: this.modifications,
      previousState: this.previousState
    }
  }
}

/**
 * Event emitted when objects are reordered
 */
export class ObjectsReorderedEvent extends Event {
  constructor(
    public readonly canvasId: string,
    public readonly objectIds: string[],
    public readonly previousOrder: string[],
    metadata: Event['metadata']
  ) {
    super('ObjectsReorderedEvent', canvasId, 'canvas', metadata)
  }
  
  apply(currentState: unknown): unknown {
    // In a real implementation, this would reorder the objects
    return currentState
  }
  
  reverse(): Event | null {
    return new ObjectsReorderedEvent(
      this.canvasId,
      this.previousOrder,
      this.objectIds,
      this.metadata
    )
  }
  
  canApply(): boolean {
    return true
  }
  
  getDescription(): string {
    return `Reordered ${this.objectIds.length} objects`
  }
  
  protected getEventData(): Record<string, unknown> {
    return {
      canvasId: this.canvasId,
      objectIds: this.objectIds,
      previousOrder: this.previousOrder
    }
  }
}

/**
 * Event emitted when object visibility changes
 */
export class ObjectVisibilityChangedEvent extends ObjectEvent {
  constructor(
    public readonly objectId: string,
    public readonly visible: boolean,
    public readonly previousVisible: boolean,
    metadata: Event['metadata']
  ) {
    super('ObjectVisibilityChangedEvent', objectId, metadata)
  }
  
  apply(currentState: unknown): unknown {
    // In a real implementation, this would change object visibility
    return currentState
  }
  
  reverse(): Event | null {
    return new ObjectVisibilityChangedEvent(
      this.objectId,
      this.previousVisible,
      this.visible,
      this.metadata
    )
  }
  
  canApply(): boolean {
    return true
  }
  
  getDescription(): string {
    return `${this.visible ? 'Showed' : 'Hid'} object`
  }
  
  protected getEventData(): Record<string, unknown> {
    return {
      objectId: this.objectId,
      visible: this.visible,
      previousVisible: this.previousVisible
    }
  }
}

/**
 * Event emitted when object opacity changes
 */
export class ObjectOpacityChangedEvent extends ObjectEvent {
  constructor(
    public readonly objectId: string,
    public readonly opacity: number,
    public readonly previousOpacity: number,
    metadata: Event['metadata']
  ) {
    super('ObjectOpacityChangedEvent', objectId, metadata)
  }
  
  apply(currentState: unknown): unknown {
    // In a real implementation, this would change object opacity
    return currentState
  }
  
  reverse(): Event | null {
    return new ObjectOpacityChangedEvent(
      this.objectId,
      this.previousOpacity,
      this.opacity,
      this.metadata
    )
  }
  
  canApply(): boolean {
    return true
  }
  
  getDescription(): string {
    return `Changed object opacity to ${Math.round(this.opacity * 100)}%`
  }
  
  protected getEventData(): Record<string, unknown> {
    return {
      objectId: this.objectId,
      opacity: this.opacity,
      previousOpacity: this.previousOpacity
    }
  }
}

/**
 * Event emitted when object blend mode changes
 */
export class ObjectBlendModeChangedEvent extends ObjectEvent {
  constructor(
    public readonly objectId: string,
    public readonly blendMode: string,
    public readonly previousBlendMode: string,
    metadata: Event['metadata']
  ) {
    super('ObjectBlendModeChangedEvent', objectId, metadata)
  }
  
  apply(currentState: unknown): unknown {
    // In a real implementation, this would change object blend mode
    return currentState
  }
  
  reverse(): Event | null {
    return new ObjectBlendModeChangedEvent(
      this.objectId,
      this.previousBlendMode,
      this.blendMode,
      this.metadata
    )
  }
  
  canApply(): boolean {
    return true
  }
  
  getDescription(): string {
    return `Changed object blend mode to ${this.blendMode}`
  }
  
  protected getEventData(): Record<string, unknown> {
    return {
      objectId: this.objectId,
      blendMode: this.blendMode,
      previousBlendMode: this.previousBlendMode
    }
  }
}

/**
 * Event emitted when object filter stack is updated
 */
export class FilterStackUpdatedEvent extends ObjectEvent {
  constructor(
    public readonly objectId: string,
    public readonly filterStack: FilterStack,
    public readonly previousStack: FilterStack | undefined,
    metadata: Event['metadata']
  ) {
    super('FilterStackUpdatedEvent', objectId, metadata)
  }
  
  apply(currentState: unknown): unknown {
    // In a real implementation, this would update the filter stack
    return currentState
  }
  
  reverse(): Event | null {
    return new FilterStackUpdatedEvent(
      this.objectId,
      this.previousStack || { filters: [], enabled: true, opacity: 1, blendMode: 'normal', isDirty: false },
      this.filterStack,
      this.metadata
    )
  }
  
  canApply(): boolean {
    return true
  }
  
  getDescription(): string {
    return `Updated filter stack for object`
  }
  
  protected getEventData(): Record<string, unknown> {
    return {
      objectId: this.objectId,
      filterStack: this.filterStack,
      previousStack: this.previousStack
    }
  }
}

/**
 * Event emitted when a filter is added to an object
 */
export class FilterAddedToObjectEvent extends ObjectEvent {
  constructor(
    public readonly objectId: string,
    public readonly filter: Filter,
    public readonly position: number | undefined,
    metadata: Event['metadata']
  ) {
    super('FilterAddedToObjectEvent', objectId, metadata)
  }
  
  apply(currentState: unknown): unknown {
    // In a real implementation, this would add the filter to the object
    return currentState
  }
  
  reverse(): Event | null {
    return new FilterRemovedFromObjectEvent(
      this.objectId,
      this.filter.id || 'unknown',
      this.filter,
      this.metadata
    )
  }
  
  canApply(): boolean {
    return true
  }
  
  getDescription(): string {
    return `Added ${this.filter.type} filter to object`
  }
  
  protected getEventData(): Record<string, unknown> {
    return {
      objectId: this.objectId,
      filter: this.filter,
      position: this.position
    }
  }
}

/**
 * Event emitted when a filter is removed from an object
 */
export class FilterRemovedFromObjectEvent extends ObjectEvent {
  constructor(
    public readonly objectId: string,
    public readonly filterId: string,
    public readonly removedFilter: Filter,
    metadata: Event['metadata']
  ) {
    super('FilterRemovedFromObjectEvent', objectId, metadata)
  }
  
  apply(currentState: unknown): unknown {
    // In a real implementation, this would remove the filter from the object
    return currentState
  }
  
  reverse(): Event | null {
    return new FilterAddedToObjectEvent(
      this.objectId,
      this.removedFilter,
      undefined,
      this.metadata
    )
  }
  
  canApply(): boolean {
    return true
  }
  
  getDescription(): string {
    return `Removed ${this.removedFilter.type} filter from object`
  }
  
  protected getEventData(): Record<string, unknown> {
    return {
      objectId: this.objectId,
      filterId: this.filterId,
      removedFilter: this.removedFilter
    }
  }
}

/**
 * Event emitted when filters are reordered on an object
 */
export class FiltersReorderedEvent extends ObjectEvent {
  constructor(
    public readonly objectId: string,
    public readonly filterIds: string[],
    public readonly previousOrder: string[],
    metadata: Event['metadata']
  ) {
    super('FiltersReorderedEvent', objectId, metadata)
  }
  
  apply(currentState: unknown): unknown {
    // In a real implementation, this would reorder the filters
    return currentState
  }
  
  reverse(): Event | null {
    return new FiltersReorderedEvent(
      this.objectId,
      this.previousOrder,
      this.filterIds,
      this.metadata
    )
  }
  
  canApply(): boolean {
    return true
  }
  
  getDescription(): string {
    return `Reordered ${this.filterIds.length} filters on object`
  }
  
  protected getEventData(): Record<string, unknown> {
    return {
      objectId: this.objectId,
      filterIds: this.filterIds,
      previousOrder: this.previousOrder
    }
  }
}

/**
 * Event emitted when an object's parent changes (for grouping)
 */
export class ObjectParentChangedEvent extends ObjectEvent {
  constructor(
    public readonly objectId: string,
    public readonly parentId: string | undefined,
    public readonly previousParentId: string | undefined,
    metadata: Event['metadata']
  ) {
    super('ObjectParentChangedEvent', objectId, metadata)
  }
  
  apply(currentState: unknown): unknown {
    // In a real implementation, this would change the object's parent
    return currentState
  }
  
  reverse(): Event | null {
    return new ObjectParentChangedEvent(
      this.objectId,
      this.previousParentId,
      this.parentId,
      this.metadata
    )
  }
  
  canApply(): boolean {
    return true
  }
  
  getDescription(): string {
    if (this.parentId) {
      return `Grouped object into parent ${this.parentId}`
    } else {
      return `Ungrouped object from parent`
    }
  }
  
  protected getEventData(): Record<string, unknown> {
    return {
      objectId: this.objectId,
      parentId: this.parentId,
      previousParentId: this.previousParentId
    }
  }
}

/**
 * Event emitted when a group's expansion state changes
 */
export class GroupExpansionChangedEvent extends ObjectEvent {
  constructor(
    public readonly groupId: string,
    public readonly expanded: boolean,
    metadata: Event['metadata']
  ) {
    super('GroupExpansionChangedEvent', groupId, metadata)
  }
  
  apply(currentState: unknown): unknown {
    // In a real implementation, this would change the group expansion
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
    return `${this.expanded ? 'Expanded' : 'Collapsed'} group`
  }
  
  protected getEventData(): Record<string, unknown> {
    return {
      groupId: this.groupId,
      expanded: this.expanded
    }
  }
} 