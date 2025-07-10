import { Event, SelectionEvent } from '../core/Event'
import type { Selection } from '@/lib/editor/canvas/types'

/**
 * Event emitted when selection changes
 */
export class SelectionChangedEvent extends Event {
  constructor(
    public readonly canvasId: string,
    public readonly selection: Selection | null,
    public readonly previousSelection: Selection | null,
    metadata: Event['metadata']
  ) {
    super('SelectionChangedEvent', canvasId, 'canvas', metadata)
  }
  
  apply(currentState: unknown): unknown {
    // In a real implementation, this would update the selection
    return currentState
  }
  
  reverse(): Event | null {
    return new SelectionChangedEvent(
      this.canvasId,
      this.previousSelection,
      this.selection,
      this.metadata
    )
  }
  
  canApply(_: unknown): boolean {
    return true
  }
  
  getDescription(): string {
    if (this.selection) {
      switch (this.selection.type) {
        case 'objects':
          return `Selected ${this.selection.objectIds.length} objects`
        case 'pixel':
          return `Selected pixels in ${this.selection.bounds.width}x${this.selection.bounds.height} area`
        case 'rectangle':
        case 'ellipse':
          return `Created ${this.selection.type} selection`
        default:
          return 'Changed selection'
      }
    }
    return 'Cleared selection'
  }
  
  protected getEventData(): Record<string, unknown> {
    return {
      canvasId: this.canvasId,
      selection: this.selection,
      previousSelection: this.previousSelection
    }
  }
}

/**
 * Event emitted when selection is cleared
 */
export class SelectionClearedEvent extends Event {
  constructor(
    public readonly canvasId: string,
    public readonly previousSelection: Selection,
    metadata: Event['metadata']
  ) {
    super('SelectionClearedEvent', canvasId, 'canvas', metadata)
  }
  
  apply(currentState: unknown): unknown {
    // In a real implementation, this would clear the selection
    return currentState
  }
  
  reverse(): Event | null {
    return new SelectionChangedEvent(
      this.canvasId,
      this.previousSelection,
      null,
      this.metadata
    )
  }
  
  canApply(_: unknown): boolean {
    return true
  }
  
  getDescription(): string {
    return 'Cleared selection'
  }
  
  protected getEventData(): Record<string, unknown> {
    return {
      canvasId: this.canvasId,
      previousSelection: this.previousSelection
    }
  }
}

/**
 * Event emitted when selection is transformed
 */
export class SelectionTransformedEvent extends SelectionEvent {
  constructor(
    public readonly canvasId: string,
    public readonly selectionId: string,
    public readonly selectionSnapshotId: string,
    public readonly transform: {
      translate?: { x: number; y: number }
      scale?: { x: number; y: number }
      rotate?: number
    },
    public readonly previousTransform: {
      translate?: { x: number; y: number }
      scale?: { x: number; y: number }
      rotate?: number
    },
    metadata: Event['metadata']
  ) {
    super('SelectionTransformedEvent', selectionId, selectionSnapshotId, metadata)
  }
  
  apply(currentState: unknown): unknown {
    // In a real implementation, this would transform the selection
    return currentState
  }
  
  reverse(): Event | null {
    return new SelectionTransformedEvent(
      this.canvasId,
      this.selectionId,
      this.selectionSnapshotId,
      this.previousTransform,
      this.transform,
      this.metadata
    )
  }
  
  canApply(_: unknown): boolean {
    return true
  }
  
  getDescription(): string {
    const parts: string[] = []
    if (this.transform.translate) {
      parts.push(`moved by (${this.transform.translate.x}, ${this.transform.translate.y})`)
    }
    if (this.transform.scale) {
      parts.push(`scaled by (${this.transform.scale.x}, ${this.transform.scale.y})`)
    }
    if (this.transform.rotate) {
      parts.push(`rotated by ${this.transform.rotate}°`)
    }
    return `Selection ${parts.join(', ')}`
  }
  
  protected getEventData(): Record<string, unknown> {
    return {
      canvasId: this.canvasId,
      selectionId: this.selectionId,
      selectionSnapshotId: this.selectionSnapshotId,
      transform: this.transform,
      previousTransform: this.previousTransform
    }
  }
}

/**
 * Event emitted when selection is inverted
 */
export class SelectionInvertedEvent extends Event {
  constructor(
    public readonly canvasId: string,
    public readonly newSelection: Selection,
    public readonly previousSelection: Selection | null,
    metadata: Event['metadata']
  ) {
    super('SelectionInvertedEvent', canvasId, 'canvas', metadata)
  }
  
  apply(currentState: unknown): unknown {
    // In a real implementation, this would invert the selection
    return currentState
  }
  
  reverse(): Event | null {
    return new SelectionChangedEvent(
      this.canvasId,
      this.previousSelection,
      this.newSelection,
      this.metadata
    )
  }
  
  canApply(_: unknown): boolean {
    return true
  }
  
  getDescription(): string {
    return 'Inverted selection'
  }
  
  protected getEventData(): Record<string, unknown> {
    return {
      canvasId: this.canvasId,
      newSelection: this.newSelection,
      previousSelection: this.previousSelection
    }
  }
}

/**
 * Event emitted when selection is expanded or contracted
 */
export class SelectionExpandedEvent extends Event {
  constructor(
    public readonly canvasId: string,
    public readonly pixels: number,
    public readonly newSelection: Selection,
    public readonly previousSelection: Selection,
    metadata: Event['metadata']
  ) {
    super('SelectionExpandedEvent', canvasId, 'canvas', metadata)
  }
  
  apply(currentState: unknown): unknown {
    // In a real implementation, this would expand/contract the selection
    return currentState
  }
  
  reverse(): Event | null {
    return new SelectionExpandedEvent(
      this.canvasId,
      -this.pixels,
      this.previousSelection,
      this.newSelection,
      this.metadata
    )
  }
  
  canApply(_: unknown): boolean {
    return true
  }
  
  getDescription(): string {
    if (this.pixels > 0) {
      return `Expanded selection by ${this.pixels} pixels`
    } else {
      return `Contracted selection by ${Math.abs(this.pixels)} pixels`
    }
  }
  
  protected getEventData(): Record<string, unknown> {
    return {
      canvasId: this.canvasId,
      pixels: this.pixels,
      newSelection: this.newSelection,
      previousSelection: this.previousSelection
    }
  }
}

/**
 * Event emitted when selection feathering changes
 */
export class SelectionFeatheredEvent extends Event {
  constructor(
    public readonly canvasId: string,
    public readonly feather: number,
    public readonly previousFeather: number,
    public readonly selection: Selection,
    metadata: Event['metadata']
  ) {
    super('SelectionFeatheredEvent', canvasId, 'canvas', metadata)
  }
  
  apply(currentState: unknown): unknown {
    // In a real implementation, this would change selection feathering
    return currentState
  }
  
  reverse(): Event | null {
    return new SelectionFeatheredEvent(
      this.canvasId,
      this.previousFeather,
      this.feather,
      this.selection,
      this.metadata
    )
  }
  
  canApply(_: unknown): boolean {
    return true
  }
  
  getDescription(): string {
    return `Set selection feather to ${this.feather} pixels`
  }
  
  protected getEventData(): Record<string, unknown> {
    return {
      canvasId: this.canvasId,
      feather: this.feather,
      previousFeather: this.previousFeather,
      selection: this.selection
    }
  }
} 