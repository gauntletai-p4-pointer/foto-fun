import { Event } from '../core/Event'

/**
 * Event emitted when a document is loaded
 */
export class DocumentLoadedEvent extends Event {
  constructor(
    public readonly document: {
      id: string
      name: string
      width: number
      height: number
      backgroundColor: string
      createdAt: number
      lastModified: number
      layers?: unknown[]
      metadata?: Record<string, unknown>
    },
    metadata: Event['metadata']
  ) {
    super('DocumentLoadedEvent', document.id, 'canvas', metadata)
  }
  
  apply(currentState: unknown): unknown {
    // In a real implementation, this would load the document state
    return currentState
  }
  
  reverse(): Event | null {
    // Loading a document is not reversible
    return null
  }
  
  canApply(_: unknown): boolean {
    return true
  }
  
  getDescription(): string {
    return `Loaded document "${this.document.name}"`
  }
  
  protected getEventData(): Record<string, unknown> {
    return {
      document: this.document
    }
  }
}

/**
 * Event emitted when a document is saved
 */
export class DocumentSavedEvent extends Event {
  constructor(
    public readonly documentId: string,
    public readonly documentName: string,
    metadata: Event['metadata'],
    public readonly saveLocation?: string
  ) {
    super('DocumentSavedEvent', documentId, 'canvas', metadata)
  }
  
  apply(currentState: unknown): unknown {
    // In a real implementation, this would mark the document as saved
    return currentState
  }
  
  reverse(): Event | null {
    // Saving is not reversible
    return null
  }
  
  canApply(_: unknown): boolean {
    return true
  }
  
  getDescription(): string {
    if (this.saveLocation) {
      return `Saved document "${this.documentName}" to ${this.saveLocation}`
    }
    return `Saved document "${this.documentName}"`
  }
  
  protected getEventData(): Record<string, unknown> {
    return {
      documentId: this.documentId,
      documentName: this.documentName,
      saveLocation: this.saveLocation
    }
  }
}

/**
 * Event emitted when a new document is created
 */
export class DocumentCreatedEvent extends Event {
  constructor(
    public readonly documentId: string,
    public readonly name: string,
    public readonly width: number,
    public readonly height: number,
    public readonly backgroundColor: string,
    metadata: Event['metadata']
  ) {
    super('DocumentCreatedEvent', documentId, 'canvas', metadata)
  }
  
  apply(currentState: unknown): unknown {
    // In a real implementation, this would create a new document
    return currentState
  }
  
  reverse(): Event | null {
    // Creating a document is not reversible
    return null
  }
  
  canApply(_: unknown): boolean {
    return true
  }
  
  getDescription(): string {
    return `Created new document "${this.name}" (${this.width}x${this.height})`
  }
  
  protected getEventData(): Record<string, unknown> {
    return {
      documentId: this.documentId,
      name: this.name,
      width: this.width,
      height: this.height,
      backgroundColor: this.backgroundColor
    }
  }
}

/**
 * Event emitted when canvas is resized
 */
export class CanvasResizedEvent extends Event {
  constructor(
    public readonly canvasId: string,
    public readonly width: number,
    public readonly height: number,
    public readonly previousWidth: number,
    public readonly previousHeight: number,
    metadata: Event['metadata']
  ) {
    super('CanvasResizedEvent', canvasId, 'canvas', metadata)
  }
  
  apply(currentState: unknown): unknown {
    // In a real implementation, this would resize the canvas
    return currentState
  }
  
  reverse(): Event | null {
    return new CanvasResizedEvent(
      this.canvasId,
      this.previousWidth,
      this.previousHeight,
      this.width,
      this.height,
      this.metadata
    )
  }
  
  canApply(_: unknown): boolean {
    return true
  }
  
  getDescription(): string {
    return `Resized canvas from ${this.previousWidth}x${this.previousHeight} to ${this.width}x${this.height}`
  }
  
  protected getEventData(): Record<string, unknown> {
    return {
      canvasId: this.canvasId,
      width: this.width,
      height: this.height,
      previousWidth: this.previousWidth,
      previousHeight: this.previousHeight
    }
  }
}

/**
 * Event emitted when canvas background changes
 */
export class CanvasBackgroundChangedEvent extends Event {
  constructor(
    public readonly canvasId: string,
    public readonly backgroundColor: string,
    public readonly previousColor: string,
    metadata: Event['metadata']
  ) {
    super('CanvasBackgroundChangedEvent', canvasId, 'canvas', metadata)
  }
  
  apply(currentState: unknown): unknown {
    // In a real implementation, this would change the background
    return currentState
  }
  
  reverse(): Event | null {
    return new CanvasBackgroundChangedEvent(
      this.canvasId,
      this.previousColor,
      this.backgroundColor,
      this.metadata
    )
  }
  
  canApply(_: unknown): boolean {
    return true
  }
  
  getDescription(): string {
    return `Changed background color from ${this.previousColor} to ${this.backgroundColor}`
  }
  
  protected getEventData(): Record<string, unknown> {
    return {
      canvasId: this.canvasId,
      backgroundColor: this.backgroundColor,
      previousColor: this.previousColor
    }
  }
}

/**
 * Event emitted when viewport changes (zoom/pan)
 */
export class ViewportChangedEvent extends Event {
  constructor(
    public readonly canvasId: string,
    metadata: Event['metadata'],
    public readonly zoom?: number,
    public readonly pan?: { x: number; y: number },
    public readonly previousZoom?: number,
    public readonly previousPan?: { x: number; y: number }
  ) {
    super('ViewportChangedEvent', canvasId, 'canvas', metadata)
  }
  
  apply(currentState: unknown): unknown {
    // In a real implementation, this would update the viewport
    return currentState
  }
  
  reverse(): Event | null {
    return new ViewportChangedEvent(
      this.canvasId,
      this.metadata,
      this.previousZoom,
      this.previousPan,
      this.zoom,
      this.pan
    )
  }
  
  canApply(_: unknown): boolean {
    return true
  }
  
  getDescription(): string {
    const parts: string[] = []
    if (this.zoom !== undefined && this.previousZoom !== undefined) {
      parts.push(`zoom from ${Math.round(this.previousZoom * 100)}% to ${Math.round(this.zoom * 100)}%`)
    }
    if (this.pan && this.previousPan) {
      parts.push(`pan from (${this.previousPan.x}, ${this.previousPan.y}) to (${this.pan.x}, ${this.pan.y})`)
    }
    return `Changed viewport: ${parts.join(', ')}`
  }
  
  protected getEventData(): Record<string, unknown> {
    return {
      canvasId: this.canvasId,
      zoom: this.zoom,
      pan: this.pan,
      previousZoom: this.previousZoom,
      previousPan: this.previousPan
    }
  }
} 