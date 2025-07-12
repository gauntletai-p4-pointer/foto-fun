import type { Selection } from '@/lib/editor/canvas/types'
import type { CanvasObject } from '@/lib/editor/objects/types'
import { nanoid } from 'nanoid'

/**
 * Event type registry for type-safe event handling
 */
export interface EventRegistry {
  // Canvas events (INFINITE CANVAS - no size, no background)
  'canvas.ready': {
    canvasId: string
  }
  'canvas.resized': {
    width: number
    height: number
  }
  'canvas.loading.changed': {
    isLoading: boolean
  }
  'canvas.object.added': { 
    canvasId: string
    object: CanvasObject
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
  'canvas.object.reordered': {
    canvasId: string
    objectOrder: string[]
  }
  
  // Viewport events (for infinite canvas navigation)
  'viewport.changed': {
    zoom?: number
    pan?: { x: number; y: number }
  }
  'canvas.zoom.reset': Record<string, never>
  'canvas.zoom.in': Record<string, never>
  'canvas.zoom.out': Record<string, never>
  
  // Selection events
  'selection.changed': { 
    selection: Selection | null
    previousSelection?: Selection | null
  }
  'selection.created': {
    canvasId: string
    selection: Selection
  }
  'selection.modified': {
    canvasId: string
    oldSelection: Selection
    newSelection: Selection
  }
  'selection.cleared': {
    canvasId: string
    clearedSelection: Selection
    previousSelection?: Selection | null
  }
  'selection.mode.changed': {
    mode: 'select' | 'marquee' | 'lasso' | 'magic'
    previousMode?: string
  }
  'selection.creating': {
    canvasId: string
    startPoint: { x: number; y: number }
    currentPoint: { x: number; y: number }
  }
  'selection.completed': {
    canvasId: string
    selection: Selection
    method: 'marquee' | 'lasso' | 'magic' | 'click'
  }
  
  // Color events
  'color.primary.changed': {
    color: string
    previousColor?: string
  }
  'color.secondary.changed': {
    color: string
    previousColor?: string
  }
  'color.swapped': {
    primaryColor: string
    secondaryColor: string
  }
  'color.favorites.added': {
    color: string
    position: number
  }
  'color.favorites.removed': {
    color: string
    position: number
  }
  'color.palette.updated': {
    colors: string[]
  }
  
  // Tool events
  'tool.activated': { 
    toolId: string
    previousToolId?: string | null
  }
  'tool.deactivated': { 
    toolId: string 
  }
  'tool.locked': {
    toolId: string
  }
  'tool.unlocked': {
    toolId: string
  }
  'tool.option.changed': { 
    toolId: string
    optionId: string
    optionKey: string
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
  'tool.options.registered': {
    toolId: string
    optionCount: number
  }
  'tool.section.toggled': {
    toolId: string
    sectionId: string
    expanded: boolean
  }
  'tool.option.pinned': {
    toolId: string
    optionId: string
    pinned: boolean
  }
  'tool.message': {
    toolId: string
    message: string
    type?: 'info' | 'warning' | 'error' | 'success'
    metadata?: Record<string, unknown>
  }
  
  // Drawing events
  'drawing.started': {
    toolId: string
    canvasId: string
    position: { x: number; y: number }
    point?: { x: number; y: number; pressure?: number }
    options?: Record<string, unknown>
  }
  'drawing.updated': {
    toolId: string
    canvasId: string
    position: { x: number; y: number }
  }
  'drawing.completed': {
    toolId: string
    canvasId: string
    path?: any
    result?: any
    pathId?: string
  }
  'drawing.options.changed': {
    toolId: string
    options: Record<string, unknown>
  }
  
  // Text events
  'text.created': {
    textId: string
    canvasId: string
    properties: Record<string, unknown>
  }
  'text.updated': {
    textId: string
    property: string
    value: unknown
    style?: Record<string, unknown>
    setAsDefault?: boolean
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
    finalText?: string
  }
  'text.effects.applied': {
    textId: string
    effects: Record<string, unknown>
  }
  'text.preset.saved': {
    name: string
    style: Record<string, unknown>
    effects: Record<string, unknown>
  }
  'text.font.used': {
    fontFamily: string
    timestamp: number
  }
  'text.fonts.recent.updated': {
    recentFonts: string[]
  }
  'text.fonts.available.updated': {
    availableFonts: Array<{
      family: string
      variants: string[]
      category: string
    }>
  }
  'text.font.loading.changed': {
    fontFamily: string
    isLoading: boolean
  }
  'text.style.default.changed': {
    style: Record<string, unknown>
  }
  'text.warped': {
    textId: string
    warpType: string
    parameters: Record<string, unknown>
  }
  
  // Project events (INFINITE CANVAS - projects don't have canvas size/background)
  'project.created': {
    projectId: string
    name: string
    metadata?: {
      created: Date
      modified: Date
    }
  }
  'project.loaded': {
    project: {
      id: string
      name: string
      createdAt: number
      lastModified: number
    }
  }
  'project.saved': {
    projectId: string
    timestamp: number
  }
  'project.updated': {
    projectId: string
    name: string
  }
  'project.deleted': {
    projectId: string
  }
  'project.recent.updated': {
    recentProjects: Array<{
      id: string
      name: string
      path?: string
      lastOpened: Date
      thumbnail?: string
    }>
  }
  'project.recent.cleared': Record<string, never>
  
  // History events
  'history.navigated': {
    eventId: string
    timestamp: number
    direction: 'undo' | 'redo'
    fromEventId?: string | null
    toEventId?: string
  }
  'history.state.changed': {
    canUndo: boolean
    canRedo: boolean
    currentIndex: number
    totalEvents: number
    currentEventId?: string | null
  }
  'history.snapshot.created': {
    snapshotId: string
    timestamp: number
    eventCount: number
    name?: string
    description?: string
  }
  'history.snapshot.loaded': {
    snapshotId: string
    eventId: string
    timestamp: number
  }
  'history.snapshot.deleted': {
    snapshotId: string
  }
  
  // Workflow events
  'workflow.started': {
    workflowId: string
    type: string
    metadata?: Record<string, unknown>
  }
  'workflow.completed': {
    workflowId: string
    result?: Record<string, unknown>
  }
  'workflow.failed': {
    workflowId: string
    error: string
    metadata?: Record<string, unknown>
  }
  
  // File events
  'recentFiles.updated': {
    files: Array<{ id: string; name: string; path?: string; lastOpened: Date; thumbnail?: string; size?: number }>
  }
  'recentFiles.cleared': Record<string, never>
  
  // Command events
  'command.executed': {
    commandId: string
    commandType: string
    metadata?: Record<string, unknown>
  }
  'command.undone': {
    commandId: string
    commandType: string
  }
  'command.redone': {
    commandId: string
    commandType: string
  }
  'command.completed': {
    commandId: string
    commandType: string
    result?: Record<string, unknown>
    metadata?: Record<string, unknown>
  }
  'command.failed': {
    commandId: string
    commandType: string
    error: string
    metadata?: Record<string, unknown>
  }
  
  // Object filter events
  'object.filter.added': {
    objectId: string
    filter: any
    position: number
  }
  'object.filter.removed': {
    objectId: string
    filterId: string
    position: number
  }
  'object.filter.modified': {
    objectId: string
    filterId: string
    changes: Record<string, unknown>
  }
  
  // Object styles events (migrated from layer.styles)
  'object.styles.applied': {
    objectId: string
    styles: Record<string, unknown>
    effectType: string
    metadata?: Record<string, unknown>
  }
  'object.styles.updated': {
    objectId: string
    styles: Record<string, unknown>
    changes: Record<string, unknown>
  }
  
  // AI Processing events
  'ai.processing.started': {
    operationId: string
    type: string
    taskId?: string
    toolId?: string
    metadata?: Record<string, unknown>
  }
  'ai.processing.completed': {
    operationId: string
    taskId?: string
    toolId?: string
    result?: Record<string, unknown>
    metadata?: Record<string, unknown>
  }
  'ai.processing.failed': {
    operationId: string
    taskId?: string
    toolId?: string
    error: string
    metadata?: Record<string, unknown>
  }
  
  // AI-specific operation events
  'ai.face.enhanced': {
    operationId: string
    imageId: string
    enhancementType: string
    result?: Record<string, unknown>
  }
  'ai.face.error': {
    operationId: string
    error: string
    metadata?: Record<string, unknown>
  }
  'ai.inpainting.completed': {
    operationId: string
    imageId: string
    result?: Record<string, unknown>
  }
  'ai.background.removed': {
    operationId: string
    imageId: string
    result?: Record<string, unknown>
  }
  'ai.image.generated': {
    operationId: string
    prompt: string
    result?: Record<string, unknown>
  }
  'ai.image.upscaled': {
    operationId: string
    imageId: string
    scaleFactor: number
    result?: Record<string, unknown>
  }
  'ai.style.transferred': {
    operationId: string
    sourceImageId: string
    styleImageId: string
    result?: Record<string, unknown>
  }
  'ai.object.removed': {
    operationId: string
    imageId: string
    objectType: string
    result?: Record<string, unknown>
  }
  'ai.variation.generated': {
    operationId: string
    sourceImageId: string
    variationType: string
    result?: Record<string, unknown>
  }
  'ai.relighting.applied': {
    operationId: string
    imageId: string
    lightingType: string
    result?: Record<string, unknown>
  }
  'ai.outpainting.completed': {
    operationId: string
    imageId: string
    result?: Record<string, unknown>
  }
  'ai.semantic.selection': {
    operationId: string
    imageId: string
    selectionData?: Record<string, unknown>
    result?: Record<string, unknown>
  }
  
  // Autosave events
  'autosave.completed': {
    projectId: string
    timestamp: number
    size?: number
  }
  'autosave.failed': {
    projectId: string
    error: string
    timestamp: number
  }
  
  // Clipboard events
  'clipboard.cut': {
    canvasId: string
    objects: CanvasObject[]
    timestamp: number
  }
  'clipboard.paste': {
    canvasId: string
    objects: CanvasObject[]
    position?: { x: number; y: number }
    timestamp: number
  }
  
  // Export events
  'export.started': {
    format: string
    filename: string
    options?: Record<string, unknown>
  }
  'export.completed': {
    format: string
    filename: string
    filepath: string
    size?: number
  }
  'export.failed': {
    format: string
    filename: string
    error: string
  }
  
  // Project export/import events
  'project.exported': {
    projectId: string
    format: string
    filepath: string
    size?: number
  }
  'project.imported': {
    projectId: string
    format: string
    filepath: string
    project: Record<string, unknown>
  }
  
  // Document events (for backward compatibility)
  'document.opened': {
    document: {
      id: string
      name: string
      path?: string
      size?: number
    }
  }
  'document.saved': {
    documentId: string
    timestamp: number
  }
}

export interface EventBusConfig {
  maxListeners?: number
  errorHandling?: 'log' | 'throw' | 'ignore'
  metrics?: boolean
  debugging?: boolean
}

/**
 * Type-safe event bus for application-wide event handling
 * 
 * Now uses dependency injection instead of singleton pattern.
 */
export class TypedEventBus {
  private handlers = new Map<keyof EventRegistry, Set<(data: unknown) => void>>()
  private config: EventBusConfig
  private disposed = false
  private metrics: Map<keyof EventRegistry, { count: number; lastEmitted: number }> = new Map()
  
  constructor(config: EventBusConfig = {}) {
    this.config = {
      maxListeners: 1000,
      errorHandling: 'log',
      metrics: true,
      debugging: false,
      ...config
    }
    this.initialize()
  }
  
  private initialize(): void {
    this.setupSubscriptions()
    this.setupErrorHandling()
    this.setupMetrics()
    
    if (this.config.debugging) {
      console.log('[TypedEventBus] Initialized with config:', this.config)
    }
  }
  
  private setupSubscriptions(): void {
    // Setup subscription management
    if (this.config.debugging) {
      console.log('[TypedEventBus] Subscription management initialized')
    }
  }
  
  private setupErrorHandling(): void {
    // Setup error handling based on config
    if (this.config.debugging) {
      console.log('[TypedEventBus] Error handling setup:', this.config.errorHandling)
    }
  }
  
  private setupMetrics(): void {
    if (this.config.metrics) {
      // Setup metrics collection
      if (this.config.debugging) {
        console.log('[TypedEventBus] Metrics collection enabled')
      }
    }
  }
  
  /**
   * Dispose of the TypedEventBus and clean up resources
   */
  dispose(): void {
    if (this.disposed) return
    
    this.disposed = true
    this.cleanup()
    this.unsubscribeAll()
    
    console.log('[TypedEventBus] Disposed')
  }
  
  private cleanup(): void {
    // Clear all handlers
    this.handlers.clear()
    this.metrics.clear()
  }
  
  private unsubscribeAll(): void {
    // Unsubscribe all handlers
    this.handlers.clear()
  }
  
  /**
   * Subscribe to an event type
   */
  on<K extends keyof EventRegistry>(
    event: K,
    handler: (data: EventRegistry[K] & { timestamp: number }) => void
  ): () => void {
    if (this.disposed) {
      throw new Error('TypedEventBus has been disposed')
    }
    
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set())
    }
    
    const handlers = this.handlers.get(event)!
    
    // Check max listeners limit
    if (this.config.maxListeners && handlers.size >= this.config.maxListeners) {
      const message = `Maximum listeners (${this.config.maxListeners}) exceeded for event: ${event}`
      this.handleError(new Error(message))
      return () => {} // Return no-op function
    }
    
    handlers.add(handler as (data: unknown) => void)
    
    if (this.config.debugging) {
      console.log(`[TypedEventBus] Subscribed to ${event}, total listeners: ${handlers.size}`)
    }
    
    // Return unsubscribe function
    return () => {
      handlers.delete(handler as (data: unknown) => void)
      if (this.config.debugging) {
        console.log(`[TypedEventBus] Unsubscribed from ${event}, remaining listeners: ${handlers.size}`)
      }
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
    if (this.disposed) return
    
    this.handlers.get(event)?.delete(handler as (data: unknown) => void)
  }
  
  /**
   * Emit an event
   */
  emit<K extends keyof EventRegistry>(
    event: K,
    data: EventRegistry[K]
  ): void {
    if (this.disposed) {
      if (this.config.debugging) {
        console.warn(`[TypedEventBus] Attempted to emit ${event} on disposed event bus`)
      }
      return
    }
    
    const handlers = this.handlers.get(event)
    if (!handlers || handlers.size === 0) {
      if (this.config.debugging) {
        console.log(`[TypedEventBus] No handlers for event: ${event}`)
      }
      return
    }
    
    const eventData = {
      ...data,
      timestamp: Date.now()
    }
    
    // Update metrics
    if (this.config.metrics) {
      const metric = this.metrics.get(event) || { count: 0, lastEmitted: 0 }
      metric.count++
      metric.lastEmitted = eventData.timestamp
      this.metrics.set(event, metric)
    }
    
    if (this.config.debugging) {
      console.log(`[TypedEventBus] Emitting ${event} to ${handlers.size} handlers`)
    }
    
    handlers.forEach(handler => {
      try {
        handler(eventData)
      } catch (error) {
        this.handleError(new Error(`Error in event handler for ${event}: ${error}`))
      }
    })
  }
  
  /**
   * Clear all handlers for a specific event type
   */
  clear(event?: keyof EventRegistry): void {
    if (this.disposed) return
    
    if (event) {
      this.handlers.delete(event)
      if (this.config.debugging) {
        console.log(`[TypedEventBus] Cleared all handlers for ${event}`)
      }
    } else {
      this.handlers.clear()
      if (this.config.debugging) {
        console.log('[TypedEventBus] Cleared all handlers')
      }
    }
  }
  
  /**
   * Get the number of handlers for an event type
   */
  listenerCount(event: keyof EventRegistry): number {
    return this.handlers.get(event)?.size || 0
  }
  
  /**
   * Get all registered event types
   */
  getEventTypes(): (keyof EventRegistry)[] {
    return Array.from(this.handlers.keys())
  }
  
  /**
   * Get metrics for event usage
   */
  getMetrics(): Map<keyof EventRegistry, { count: number; lastEmitted: number }> {
    return new Map(this.metrics)
  }
  
  /**
   * Check if the event bus is disposed
   */
  isDisposed(): boolean {
    return this.disposed
  }
  
  private handleError(error: Error): void {
    switch (this.config.errorHandling) {
      case 'throw':
        throw error
      case 'log':
        console.error('[TypedEventBus]', error.message)
        break
      case 'ignore':
        // Do nothing
        break
    }
  }
} 