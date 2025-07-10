import { nanoid } from 'nanoid'
import type { Canvas, FabricObject } from 'fabric'
import { EventStore } from '../core/EventStore'
import { Event } from '../core/Event'
import { SelectionSnapshot } from '@/lib/ai/execution/SelectionSnapshot'
import type { CanvasContext } from '@/lib/ai/tools/canvas-bridge'

/**
 * Execution context provides an isolated environment for operations
 * This ensures that concurrent operations don't interfere with each other
 */
export class ExecutionContext {
  readonly id: string
  readonly createdAt: number
  readonly source: 'user' | 'ai' | 'system'
  
  // Selection state locked at context creation
  private readonly selectionSnapshot: SelectionSnapshot
  
  // Workflow tracking
  private readonly workflowId: string | undefined
  private readonly parentContextId: string | undefined
  
  // Event tracking
  private events: Event[] = []
  private committed = false
  
  // Canvas reference
  private canvas: Canvas
  
  constructor(options: {
    canvas: Canvas
    selectionSnapshot: SelectionSnapshot
    source: ExecutionContext['source']
    workflowId?: string
    parentContextId?: string
  }) {
    this.id = nanoid()
    this.createdAt = Date.now()
    this.canvas = options.canvas
    this.selectionSnapshot = options.selectionSnapshot
    this.source = options.source
    this.workflowId = options.workflowId
    this.parentContextId = options.parentContextId
  }
  
  /**
   * Get the locked selection for this context
   */
  getSelection(): SelectionSnapshot {
    return this.selectionSnapshot
  }
  
  /**
   * Get target objects based on the locked selection
   */
  getTargetObjects(): FabricObject[] {
    return this.selectionSnapshot.getValidObjects(this.canvas)
  }
  
  /**
   * Get images from the locked selection
   */
  getTargetImages(): FabricObject[] {
    return this.selectionSnapshot.getImages()
  }
  
  /**
   * Check if context has valid targets
   */
  hasTargets(): boolean {
    return !this.selectionSnapshot.isEmpty
  }
  
  /**
   * Emit an event within this context
   */
  async emit(event: Event): Promise<void> {
    if (this.committed) {
      throw new Error('Cannot emit events to a committed context')
    }
    
    // Add context metadata
    event.metadata.correlationId = this.id
    event.metadata.workflowId = this.workflowId
    event.metadata.selectionSnapshotId = this.selectionSnapshot.id
    
    if (this.parentContextId) {
      event.metadata.causationId = this.parentContextId
    }
    
    // Track the event
    this.events.push(event)
    
    // Don't append to store yet - wait for commit
  }
  
  /**
   * Commit all events from this context
   */
  async commit(): Promise<void> {
    if (this.committed) {
      throw new Error('Context already committed')
    }
    
    const eventStore = EventStore.getInstance()
    
    // Append all events in order
    for (const event of this.events) {
      await eventStore.append(event)
    }
    
    this.committed = true
  }
  
  /**
   * Rollback this context (discard events)
   */
  rollback(): void {
    if (this.committed) {
      throw new Error('Cannot rollback a committed context')
    }
    
    this.events = []
  }
  
  /**
   * Create a child context for nested operations
   */
  createChildContext(options: {
    source?: ExecutionContext['source']
    workflowId?: string
  } = {}): ExecutionContext {
    return new ExecutionContext({
      canvas: this.canvas,
      selectionSnapshot: this.selectionSnapshot, // Inherit selection
      source: options.source || this.source,
      workflowId: options.workflowId || this.workflowId,
      parentContextId: this.id
    })
  }
  
  /**
   * Get canvas context for tool execution
   */
  getCanvasContext(): CanvasContext {
    const targetImages = this.getTargetImages()
    
    return {
      canvas: this.canvas,
      targetImages: targetImages as FabricImage[], // Type cast for compatibility
      targetingMode: targetImages.length === 1 ? 'auto-single' : 'selection',
      dimensions: {
        width: this.canvas.getWidth(),
        height: this.canvas.getHeight()
      }
    }
  }
  
  /**
   * Get execution metadata
   */
  getMetadata(): Event['metadata'] {
    return {
      source: this.source,
      correlationId: this.id,
      workflowId: this.workflowId,
      selectionSnapshotId: this.selectionSnapshot.id,
      causationId: this.parentContextId
    }
  }
}

// Type for Fabric.js image objects
type FabricImage = FabricObject & { type: 'image' }

/**
 * Factory for creating execution contexts
 */
export class ExecutionContextFactory {
  /**
   * Create context from current canvas state
   */
  static async fromCanvas(
    canvas: Canvas,
    source: ExecutionContext['source'],
    options: {
      workflowId?: string
    } = {}
  ): Promise<ExecutionContext> {
    const { SelectionSnapshotFactory } = await import('@/lib/ai/execution/SelectionSnapshot')
    const selectionSnapshot = SelectionSnapshotFactory.fromCanvas(canvas)
    
    return new ExecutionContext({
      canvas,
      selectionSnapshot,
      source,
      workflowId: options.workflowId
    })
  }
  
  /**
   * Create context with specific selection
   */
  static async fromSelection(
    canvas: Canvas,
    objects: FabricObject[],
    source: ExecutionContext['source'],
    options: {
      workflowId?: string
    } = {}
  ): Promise<ExecutionContext> {
    const { SelectionSnapshotFactory } = await import('@/lib/ai/execution/SelectionSnapshot')
    const selectionSnapshot = SelectionSnapshotFactory.fromObjects(objects)
    
    return new ExecutionContext({
      canvas,
      selectionSnapshot,
      source,
      workflowId: options.workflowId
    })
  }
  
  /**
   * Create context from existing snapshot
   */
  static fromSnapshot(
    canvas: Canvas,
    selectionSnapshot: SelectionSnapshot,
    source: ExecutionContext['source'],
    options: {
      workflowId?: string
    } = {}
  ): ExecutionContext {
    return new ExecutionContext({
      canvas,
      selectionSnapshot,
      source,
      workflowId: options.workflowId
    })
  }
} 