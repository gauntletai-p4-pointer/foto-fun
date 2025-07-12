import type { Layer, Selection, Point } from '@/lib/editor/canvas/types'
import type { CanvasObject } from '@/lib/editor/objects/types'

/**
 * Event type registry for type-safe event handling
 */
export interface EventRegistry {
  // Canvas events
  'canvas.ready': {
    canvasId: string
  }
  'canvas.object.added': { 
    canvasId: string
    object: CanvasObject
    layerId?: string 
  }
  'canvas.object.modified': { 
    canvasId: string
    objectId: string
    previousState: Record<string, unknown>
    newState: Record<string, unknown>
  }
  'canvas.object.removed': { 
    canvasId: string
    objectId: string 
  }
  'canvas.objects.batch.modified': {
    canvasId: string
    modifications: Array<{
      object: CanvasObject
      previousState: Record<string, unknown>
      newState: Record<string, unknown>
    }>
  }
  'objectOrderChanged': {
    objectOrder: string[]
  }
  
  // Layer events
  'layer.created': { 
    layer: Layer 
  }
  'layer.removed': { 
    layerId: string 
  }
  'layer.modified': { 
    layerId: string
    modifications: Partial<Layer> 
  }
  'layer.reordered': {
    layerIds: string[]
    previousOrder: string[]
  }
  'layer.parent.changed': {
    layerId: string
    parentId: string | undefined
    previousParentId: string | undefined
  }
  'layer.group.expansion.changed': {
    groupId: string
    expanded: boolean
  }
  
  // Filter events
  'layer.filter.added': {
    layerId: string
    filter: unknown // Using unknown to avoid circular dependency
    position?: number
  }
  'layer.filter.removed': {
    layerId: string
    filterId: string
  }
  'layer.filter.stack.updated': {
    layerId: string
    filterStack: unknown // Using unknown to avoid circular dependency
  }
  'layer.filters.reordered': {
    layerId: string
    filterIds: string[]
  }
  
  // Selection events
  'selection.changed': { 
    selection: Selection | null
    previousSelection: Selection | null
  }
  'selection.cleared': {
    previousSelection: Selection
  }
  
  // Canvas state events
  'canvas.resized': { 
    width: number
    height: number
    previousWidth: number
    previousHeight: number
  }
  'canvas.background.changed': {
    backgroundColor: string
    previousColor: string
  }
  
  // Viewport events
  'viewport.changed': { 
    zoom?: number
    pan?: Point
    previousZoom?: number
    previousPan?: Point
  }
  
  // Document events
  'document.loaded': { 
    document: {
      id: string
      name: string
      width: number
      height: number
      backgroundColor: string
      createdAt: number
      lastModified: number
    }
  }
  'document.saved': { 
    documentId: string 
  }
  'document.created': {
    documentId: string
    name: string
    bounds: {
      width: number
      height: number
      x: number
      y: number
    }
    metadata: {
      id: string
      name: string
      created: Date
      modified: Date
      author?: string
      colorSpace: 'RGB' | 'CMYK' | 'LAB'
      resolution: number
      bitDepth: 8 | 16 | 32
      backgroundColor?: string
    }
  }
  'document.image.ready': {
    documentId: string
    imageElement: HTMLImageElement
    dataUrl: string
  }
  'document.autosaved': { 
    documentId: string
    location: 'local' | 'cloud' 
  }
  'document.recovered': { 
    documentId: string
    recoveredFrom: string 
  }
  'document.opened': { 
    document: { 
      id: string
      name: string
      path?: string
      size?: number 
    } 
  }
  'document.closed': { 
    documentId?: string 
  }
  'document.resized': {
    documentId: string
    previousBounds: {
      width: number
      height: number
      x: number
      y: number
    }
    newBounds: {
      width: number
      height: number
      x: number
      y: number
    }
  }
  'document.metadata.updated': {
    documentId: string
    updates: Record<string, unknown>
  }
  'document.ready': {
    documentId: string
  }
  
  // Recent files events
  'recentFiles.updated': { 
    files: Array<{ 
      id: string
      name: string
      path?: string
      lastOpened: Date
      thumbnail?: string
      size?: number 
    }> 
  }
  'recentFiles.cleared': Record<string, never>
  
  // Export events
  'export.started': {
    exportId: string
    format: string
    options: Record<string, unknown>
  }
  'export.completed': {
    exportId: string
    blob: Blob
    size: number
  }
  'export.failed': {
    exportId: string
    error: string
  }
  
  // Text events
  'text.created': {
    textId: string
    style?: Record<string, unknown>
  }
  'text.selected': {
    textId: string
  }
  'text.deselected': {
    textId: string
  }
  'text.editing.started': {
    textId: string
  }
  'text.editing.ended': {
    textId: string
    finalText: string
  }
  'text.style.changed': {
    textId?: string
    style: Record<string, unknown>
    setAsDefault?: boolean
  }
  'text.effects.applied': {
    textId: string
    effects: Record<string, unknown>
  }
  'text.effects.removed': {
    textId: string
  }
  'text.font.used': {
    fontFamily: string
  }
  'text.preset.saved': {
    name: string
    style: Record<string, unknown>
    effects?: Record<string, unknown>
  }
  'text.warped': {
    textId: string
    warpStyle: string
    warpOptions: Record<string, unknown>
  }
  
  // Layer styles events
  'layer.styles.applied': {
    objectId: string
    styles: Record<string, unknown>
  }
  'layer.styles.updated': {
    groupId: string
    styleType: string
    newStyle: unknown
  }
  
  // Drawing events
  'drawing.started': {
    toolId: string
    point: { x: number; y: number; pressure?: number }
    options: Record<string, unknown>
  }
  'drawing.completed': {
    toolId: string
    pathId: string
    bounds: { x: number; y: number; width: number; height: number }
  }
  'drawing.options.changed': {
    toolId: string
    options: Record<string, unknown>
  }
  
    // Tool events
  'tool.activated': { 
    toolId: string
    previousToolId: string | null
  }
  'tool.deactivated': { 
    toolId: string 
  }
  'tool.options.changed': {
    toolId: string
    options: Record<string, unknown>
  }
  'tool.option.changed': {
    toolId: string
    optionId?: string
    optionKey?: string
    value: unknown
  }
  'tool.preset.saved': {
    toolId: string
    name: string
    values: Record<string, unknown>
  }
  'tool.preset.applied': {
    toolId: string
    presetId: string
  }
  'tool.locked': Record<string, never>
  'tool.unlocked': Record<string, never>
  
  // History events
  'history.snapshot.created': {
    snapshotId: string
    name: string
    description?: string
    eventId: string
    timestamp: number
  }
  'history.snapshot.loaded': {
    snapshotId: string
    eventId: string
  }
  'history.snapshot.deleted': {
    snapshotId: string
  }
  'history.branch.created': {
    branchId: string
    fromEventId: string
    name?: string
  }
  'history.navigated': {
    fromEventId: string | null
    toEventId: string
    method: 'undo' | 'redo' | 'jump' | 'snapshot'
  }
  'history.state.changed': {
    canUndo: boolean
    canRedo: boolean
    currentEventId: string | null
    totalEvents: number
  }
  
  // Workflow events
  'workflow.started': {
    workflowId: string
    name: string
  }
  'workflow.completed': {
    workflowId: string
    eventCount: number
  }
  'workflow.failed': {
    workflowId: string
    error: string
  }
  
  // Command events
  'command.started': {
    commandId: string
    description: string
    metadata: Record<string, unknown>
  }
  'command.completed': {
    commandId: string
    success: boolean
  }
  'command.failed': {
    commandId: string
    error: string
  }
  'command.undone': {
    commandId: string
  }
  'command.redone': {
    commandId: string
  }
  
  // Clipboard events
  'clipboard.cut': {
    objects: CanvasObject[]
  }
  'clipboard.paste': {
    objects: CanvasObject[]
  }
  
  // AI events
  'ai.processing.started': {
    taskId: string
    toolId: string
    description: string
    targetObjectIds?: string[]
  }
  'ai.processing.completed': {
    taskId: string
    toolId: string
    success: boolean
    result?: Record<string, unknown>
    affectedObjectIds?: string[]
  }
  'ai.processing.failed': {
    taskId: string
    toolId: string
    error: string
    details?: Record<string, unknown>
  }
  'tool.message': {
    toolId: string
    message: string
    type: 'info' | 'warning' | 'error' | 'success'
    data?: Record<string, unknown>
  }
  
  // Tool-specific completion events
  'ai.inpainting.completed': {
    taskId: string
    toolId: string
    objectId: string
    prompt: string
    success: boolean
    maskArea?: { x: number; y: number; width: number; height: number }
  }
  'ai.outpainting.completed': {
    taskId: string
    toolId: string
    objectId: string
    direction: 'left' | 'right' | 'top' | 'bottom' | 'all'
    expandSize: number
    success: boolean
  }
  'ai.semantic.selection': {
    taskId: string
    toolId: string
    query: string
    matchedCount: number
    objectIds: string[]
    confidence: number
  }
  'ai.face.enhanced': {
    taskId: string
    toolId: string
    objectId: string
    enhancementScale: number
    success: boolean
  }
  'ai.face.error': {
    taskId: string
    toolId: string
    objectId: string
    error: string
    enhancementScale?: number
  }
  
  // Selection enforcement events
  'ai.tool.selection.required': {
    toolId: string
    objectCount: number
    message: string
    requiresSelection: boolean
  }
  
  // Approval system events
  'ai.tool.preview.generated': {
    toolId: string
    previewData: string
    confidence: number
    requiresApproval: boolean
  }
  
  // Agent workflow events
  'ai.workflow.step.completed': {
    workflowId: string
    stepId: string
    toolId: string
    success: boolean
    result?: unknown
    executionTime?: number
  }
}

/**
 * Type-safe event bus for application-wide event handling
 */
export class TypedEventBus {
  private handlers = new Map<keyof EventRegistry, Set<(data: unknown) => void>>()
  
  /**
   * Subscribe to an event type
   */
  on<K extends keyof EventRegistry>(
    event: K,
    handler: (data: EventRegistry[K] & { timestamp: number }) => void
  ): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set())
    }
    
    this.handlers.get(event)!.add(handler as (data: unknown) => void)
    
    // Return unsubscribe function
    return () => {
      this.handlers.get(event)?.delete(handler as (data: unknown) => void)
    }
  }
  
  /**
   * Subscribe to an event type (one time only)
   */
  once<K extends keyof EventRegistry>(
    event: K,
    handler: (data: EventRegistry[K] & { timestamp: number }) => void
  ): () => void {
    const wrappedHandler = (data: EventRegistry[K] & { timestamp: number }) => {
      handler(data)
      this.off(event, wrappedHandler as (data: EventRegistry[K] & { timestamp: number }) => void)
    }
    
    return this.on(event, wrappedHandler)
  }
  
  /**
   * Unsubscribe from an event type
   */
  off<K extends keyof EventRegistry>(
    event: K,
    handler: (data: EventRegistry[K] & { timestamp: number }) => void
  ): void {
    this.handlers.get(event)?.delete(handler as (data: unknown) => void)
  }
  
  /**
   * Emit an event
   */
  emit<K extends keyof EventRegistry>(
    event: K,
    data: EventRegistry[K]
  ): void {
    const handlers = this.handlers.get(event)
    if (!handlers) return
    
    const eventData = {
      ...data,
      timestamp: Date.now()
    }
    
    handlers.forEach(handler => {
      try {
        handler(eventData)
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error)
      }
    })
  }
  
  /**
   * Clear all handlers for a specific event type
   */
  clear(event?: keyof EventRegistry): void {
    if (event) {
      this.handlers.delete(event)
    } else {
      this.handlers.clear()
    }
  }
  
  /**
   * Get the number of handlers for an event type
   */
  listenerCount(event: keyof EventRegistry): number {
    return this.handlers.get(event)?.size || 0
  }
}

// Singleton instance
let instance: TypedEventBus | null = null

export function getTypedEventBus(): TypedEventBus {
  if (!instance) {
    instance = new TypedEventBus()
  }
  return instance
} 