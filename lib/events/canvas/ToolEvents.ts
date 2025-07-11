import { Event } from '../core/Event'
import type { Selection, Rect } from '@/lib/editor/canvas/types'
import type { CanvasObject } from '@/lib/editor/objects/types'

// Define state interfaces
interface SelectionState {
  selection: Selection | null
  version: number
}

interface CanvasObjectState {
  objects: CanvasObject[]
  version: number
}

/**
 * Selection Events
 */
export class SelectionCreatedEvent extends Event {
  constructor(
    private canvasId: string,
    private selection: Selection,
    metadata: Event['metadata']
  ) {
    super('selection.created', canvasId, 'selection', metadata)
  }

  apply(currentState: SelectionState): SelectionState {
    return {
      selection: this.selection,
      version: currentState.version + 1
    }
  }

  canApply(currentState: SelectionState): boolean {
    return currentState.selection === null
  }

  reverse(): SelectionClearedEvent | null {
    return new SelectionClearedEvent(this.canvasId, this.selection, this.metadata)
  }

  getDescription(): string {
    if (this.selection.type === 'objects') {
      return `Select ${this.selection.objectIds.length} objects`
    }
    return `Create ${this.selection.type} selection`
  }

  protected getEventData(): Record<string, unknown> {
    return {
      canvasId: this.canvasId,
      selection: this.selection
    }
  }
}

export class SelectionModifiedEvent extends Event {
  constructor(
    private canvasId: string,
    private previousSelection: Selection,
    private newSelection: Selection,
    metadata: Event['metadata']
  ) {
    super('selection.modified', canvasId, 'selection', metadata)
  }

  apply(currentState: SelectionState): SelectionState {
    return {
      selection: this.newSelection,
      version: currentState.version + 1
    }
  }

  canApply(currentState: SelectionState): boolean {
    return currentState.selection !== null
  }

  reverse(): SelectionModifiedEvent | null {
    return new SelectionModifiedEvent(
      this.canvasId,
      this.newSelection,
      this.previousSelection,
      this.metadata
    )
  }

  getDescription(): string {
    return `Modify selection`
  }

  protected getEventData(): Record<string, unknown> {
    return {
      canvasId: this.canvasId,
      previousSelection: this.previousSelection,
      newSelection: this.newSelection
    }
  }
}

export class SelectionClearedEvent extends Event {
  constructor(
    private canvasId: string,
    private previousSelection: Selection | null,
    metadata: Event['metadata']
  ) {
    super('selection.cleared', canvasId, 'selection', metadata)
  }

  apply(currentState: SelectionState): SelectionState {
    return {
      selection: null,
      version: currentState.version + 1
    }
  }

  canApply(currentState: SelectionState): boolean {
    return currentState.selection !== null
  }

  reverse(): SelectionCreatedEvent | null {
    if (!this.previousSelection) return null
    return new SelectionCreatedEvent(this.canvasId, this.previousSelection, this.metadata)
  }

  getDescription(): string {
    return 'Clear selection'
  }

  protected getEventData(): Record<string, unknown> {
    return {
      canvasId: this.canvasId,
      previousSelection: this.previousSelection
    }
  }
}

/**
 * Filter Events
 */
export class FilterAppliedEvent extends Event {
  constructor(
    private canvasId: string,
    private filterType: string,
    private filterParams: Record<string, unknown>,
    private targetObjectIds: string[],
    metadata: Event['metadata']
  ) {
    super('filter.applied', canvasId, 'canvas', metadata)
  }

  apply(currentState: CanvasObjectState): CanvasObjectState {
    // In a real implementation, this would apply the filter to the objects
    // For now, we just increment version
    return {
      ...currentState,
      version: currentState.version + 1
    }
  }

  canApply(currentState: CanvasObjectState): boolean {
    // Check if all target objects exist
    const objectIds = new Set(currentState.objects.map(obj => obj.id))
    return this.targetObjectIds.every(id => objectIds.has(id))
  }

  reverse(): FilterRemovedEvent | null {
    return new FilterRemovedEvent(
      this.canvasId,
      this.filterType,
      this.targetObjectIds,
      this.metadata
    )
  }

  getDescription(): string {
    return `Apply ${this.filterType} filter to ${this.targetObjectIds.length} objects`
  }

  protected getEventData(): Record<string, unknown> {
    return {
      canvasId: this.canvasId,
      filterType: this.filterType,
      filterParams: this.filterParams,
      targetObjectIds: this.targetObjectIds
    }
  }
}

export class FilterRemovedEvent extends Event {
  constructor(
    private canvasId: string,
    private filterType: string,
    private targetObjectIds: string[],
    metadata: Event['metadata']
  ) {
    super('filter.removed', canvasId, 'canvas', metadata)
  }

  apply(currentState: CanvasObjectState): CanvasObjectState {
    // In a real implementation, this would remove the filter from the objects
    return {
      ...currentState,
      version: currentState.version + 1
    }
  }

  canApply(currentState: CanvasObjectState): boolean {
    const objectIds = new Set(currentState.objects.map(obj => obj.id))
    return this.targetObjectIds.every(id => objectIds.has(id))
  }

  reverse(): null {
    // Cannot reverse filter removal without params
    return null
  }

  getDescription(): string {
    return `Remove ${this.filterType} filter from ${this.targetObjectIds.length} objects`
  }

  protected getEventData(): Record<string, unknown> {
    return {
      canvasId: this.canvasId,
      filterType: this.filterType,
      targetObjectIds: this.targetObjectIds
    }
  }
}

/**
 * Drawing Events
 */
export class StrokeAddedEvent extends Event {
  constructor(
    private canvasId: string,
    private strokeId: string,
    private strokeData: {
      points: number[]
      color: string
      width: number
      opacity: number
      layerId: string
    },
    metadata: Event['metadata']
  ) {
    super('stroke.added', canvasId, 'canvas', metadata)
  }

  apply(currentState: CanvasObjectState): CanvasObjectState {
    // In real implementation, would add stroke as object
    return {
      ...currentState,
      version: currentState.version + 1
    }
  }

  canApply(): boolean {
    return true
  }

  reverse(): StrokeRemovedEvent | null {
    return new StrokeRemovedEvent(this.canvasId, this.strokeId, this.metadata)
  }

  getDescription(): string {
    return 'Add brush stroke'
  }

  protected getEventData(): Record<string, unknown> {
    return {
      canvasId: this.canvasId,
      strokeId: this.strokeId,
      strokeData: this.strokeData
    }
  }
}

export class StrokeRemovedEvent extends Event {
  constructor(
    private canvasId: string,
    private strokeId: string,
    metadata: Event['metadata']
  ) {
    super('stroke.removed', canvasId, 'canvas', metadata)
  }

  apply(currentState: CanvasObjectState): CanvasObjectState {
    return {
      ...currentState,
      version: currentState.version + 1
    }
  }

  canApply(currentState: CanvasObjectState): boolean {
    return currentState.objects.some(obj => obj.id === this.strokeId)
  }

  reverse(): null {
    // Cannot reverse without stroke data
    return null
  }

  getDescription(): string {
    return 'Remove brush stroke'
  }

  protected getEventData(): Record<string, unknown> {
    return {
      canvasId: this.canvasId,
      strokeId: this.strokeId
    }
  }
}

export class StrokeModifiedEvent extends Event {
  constructor(
    private canvasId: string,
    private strokeId: string,
    private previousData: Record<string, unknown>,
    private newData: Record<string, unknown>,
    metadata: Event['metadata']
  ) {
    super('stroke.modified', canvasId, 'canvas', metadata)
  }

  apply(currentState: CanvasObjectState): CanvasObjectState {
    return {
      ...currentState,
      version: currentState.version + 1
    }
  }

  canApply(currentState: CanvasObjectState): boolean {
    return currentState.objects.some(obj => obj.id === this.strokeId)
  }

  reverse(): StrokeModifiedEvent | null {
    return new StrokeModifiedEvent(
      this.canvasId,
      this.strokeId,
      this.newData,
      this.previousData,
      this.metadata
    )
  }

  getDescription(): string {
    return 'Modify brush stroke'
  }

  protected getEventData(): Record<string, unknown> {
    return {
      canvasId: this.canvasId,
      strokeId: this.strokeId,
      previousData: this.previousData,
      newData: this.newData
    }
  }
}

/**
 * Generation Events
 */
export class ImageGeneratedEvent extends Event {
  constructor(
    private canvasId: string,
    private imageId: string,
    private prompt: string,
    private options: Record<string, unknown>,
    metadata: Event['metadata']
  ) {
    super('image.generated', canvasId, 'canvas', metadata)
  }

  apply(currentState: CanvasObjectState): CanvasObjectState {
    return {
      ...currentState,
      version: currentState.version + 1
    }
  }

  canApply(): boolean {
    return true
  }

  reverse(): null {
    // Generation cannot be reversed, only the added image can be removed
    return null
  }

  getDescription(): string {
    return `Generate image: "${this.prompt.slice(0, 50)}..."`
  }

  protected getEventData(): Record<string, unknown> {
    return {
      canvasId: this.canvasId,
      imageId: this.imageId,
      prompt: this.prompt,
      options: this.options
    }
  }
}

export class GenerationFailedEvent extends Event {
  constructor(
    private canvasId: string,
    private prompt: string,
    private error: string,
    metadata: Event['metadata']
  ) {
    super('generation.failed', canvasId, 'canvas', metadata)
  }

  apply(currentState: CanvasObjectState): CanvasObjectState {
    // No state change for failed generation
    return currentState
  }

  canApply(): boolean {
    return true
  }

  reverse(): null {
    return null
  }

  getDescription(): string {
    return `Failed to generate image: ${this.error}`
  }

  protected getEventData(): Record<string, unknown> {
    return {
      canvasId: this.canvasId,
      prompt: this.prompt,
      error: this.error
    }
  }
}

/**
 * Transform Events
 */
export class ObjectsTransformedEvent extends Event {
  constructor(
    private canvasId: string,
    private transformations: Array<{
      objectId: string
      previousTransform: Record<string, unknown>
      newTransform: Record<string, unknown>
    }>,
    metadata: Event['metadata']
  ) {
    super('objects.transformed', canvasId, 'canvas', metadata)
  }

  apply(currentState: CanvasObjectState): CanvasObjectState {
    // In real implementation, would apply transforms to objects
    return {
      ...currentState,
      version: currentState.version + 1
    }
  }

  canApply(currentState: CanvasObjectState): boolean {
    const objectIds = new Set(currentState.objects.map(obj => obj.id))
    return this.transformations.every(t => objectIds.has(t.objectId))
  }

  reverse(): ObjectsTransformedEvent | null {
    const reversed = this.transformations.map(t => ({
      objectId: t.objectId,
      previousTransform: t.newTransform,
      newTransform: t.previousTransform
    }))
    return new ObjectsTransformedEvent(this.canvasId, reversed, this.metadata)
  }

  getDescription(): string {
    return `Transform ${this.transformations.length} objects`
  }

  protected getEventData(): Record<string, unknown> {
    return {
      canvasId: this.canvasId,
      transformations: this.transformations
    }
  }
}

export class CanvasCroppedEvent extends Event {
  constructor(
    private canvasId: string,
    private previousBounds: Rect,
    private newBounds: Rect,
    metadata: Event['metadata']
  ) {
    super('canvas.cropped', canvasId, 'canvas', metadata)
  }

  apply(currentState: CanvasObjectState): CanvasObjectState {
    return {
      ...currentState,
      version: currentState.version + 1
    }
  }

  canApply(): boolean {
    return true
  }

  reverse(): CanvasCroppedEvent | null {
    return new CanvasCroppedEvent(
      this.canvasId,
      this.newBounds,
      this.previousBounds,
      this.metadata
    )
  }

  getDescription(): string {
    return `Crop canvas to ${this.newBounds.width}x${this.newBounds.height}`
  }

  protected getEventData(): Record<string, unknown> {
    return {
      canvasId: this.canvasId,
      previousBounds: this.previousBounds,
      newBounds: this.newBounds
    }
  }
}

/**
 * Tool Events
 */
export class ToolActivatedEvent extends Event {
  constructor(
    public readonly toolId: string,
    public readonly toolName: string,
    metadata: Event['metadata']
  ) {
    super('tool.activated', toolId, 'tool', metadata)
  }

  apply(currentState: unknown): unknown {
    return currentState
  }

  canApply(): boolean {
    return true
  }

  reverse(): null {
    return null
  }

  getDescription(): string {
    return `Activate ${this.toolName} tool`
  }

  protected getEventData(): Record<string, unknown> {
    return {
      toolId: this.toolId,
      toolName: this.toolName
    }
  }
}

export class ToolOptionChangedEvent extends Event {
  constructor(
    public readonly toolId: string,
    public readonly optionId: string,
    public readonly value: unknown,
    public readonly previousValue: unknown,
    metadata: Event['metadata']
  ) {
    super('tool.option.changed', `${toolId}.${optionId}`, 'tool', metadata)
  }

  apply(currentState: unknown): unknown {
    return currentState
  }

  canApply(): boolean {
    return true
  }

  reverse(): ToolOptionChangedEvent {
    return new ToolOptionChangedEvent(
      this.toolId,
      this.optionId,
      this.previousValue,
      this.value,
      this.metadata
    )
  }

  getDescription(): string {
    return `Change ${this.optionId} to ${this.value}`
  }

  protected getEventData(): Record<string, unknown> {
    return {
      toolId: this.toolId,
      optionId: this.optionId,
      value: this.value,
      previousValue: this.previousValue
    }
  }
} 