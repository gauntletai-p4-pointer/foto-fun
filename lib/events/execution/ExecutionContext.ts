import { nanoid } from 'nanoid'
import type { CanvasObject } from '@/lib/editor/objects/types'
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager'
import { EventStore } from '../core/EventStore'
import { Event } from '../core/Event'
import { SelectionSnapshot, SelectionSnapshotFactory } from '@/lib/ai/execution/SelectionSnapshot'
import type { CanvasContext } from '@/lib/ai/tools/canvas-bridge'

/**
 * Tool execution tracking
 */
interface ToolExecution {
  toolId: string
  startTime: number
  endTime?: number
  params: Record<string, unknown>
  result?: unknown
  error?: string
  status: 'running' | 'completed' | 'failed'
}

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
  private eventStore: EventStore
  private canvasId: string
  
  // Tool execution tracking
  private toolExecutions = new Map<string, ToolExecution>()
  private workflowStatus: 'running' | 'completed' | 'failed' = 'running'
  
  constructor(
    eventStore: EventStore,
    canvasId: string,
    workflowId?: string,
    metadata?: Record<string, unknown>
  ) {
    this.id = nanoid()
    this.createdAt = Date.now()
    this.eventStore = eventStore
    this.canvasId = canvasId
    this.workflowId = workflowId
    this.source = (metadata?.source as ExecutionContext['source']) || 'system'
    this.parentContextId = metadata?.parentContextId as string
    
    // Create empty selection snapshot for now
    this.selectionSnapshot = new SelectionSnapshot([])
  }
  
  /**
   * Set selection snapshot
   */
  setSelectionSnapshot(snapshot: SelectionSnapshot): void {
    Object.assign(this, { selectionSnapshot: snapshot })
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
  getTargetObjects(canvas: CanvasManager): CanvasObject[] {
    return this.selectionSnapshot.getValidObjects(canvas)
  }
  
  /**
   * Get images from the locked selection
   */
  getTargetImages(): CanvasObject[] {
    return this.selectionSnapshot.getImages()
  }
  
  /**
   * Check if context has valid targets
   */
  hasTargets(): boolean {
    return !this.selectionSnapshot.isEmpty
  }
  
  /**
   * Start tool execution tracking
   */
  startTool(toolId: string, params: Record<string, unknown>): void {
    this.toolExecutions.set(toolId, {
      toolId,
      startTime: Date.now(),
      params,
      status: 'running'
    })
  }
  
  /**
   * Complete tool execution
   */
  completeTool(toolId: string, success: boolean, result?: unknown): void {
    const execution = this.toolExecutions.get(toolId)
    if (execution) {
      execution.endTime = Date.now()
      execution.status = success ? 'completed' : 'failed'
      execution.result = result
    }
  }
  
  /**
   * Fail tool execution
   */
  failTool(toolId: string, error: string): void {
    const execution = this.toolExecutions.get(toolId)
    if (execution) {
      execution.endTime = Date.now()
      execution.status = 'failed'
      execution.error = error
    }
  }
  
  /**
   * Complete the workflow
   */
  completeWorkflow(): void {
    this.workflowStatus = 'completed'
  }
  
  /**
   * Fail the workflow
   */
  failWorkflow(_error: string): void {
    this.workflowStatus = 'failed'
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
    
    // Append all events in order
    for (const event of this.events) {
      await this.eventStore.append(event)
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
    const childContext = new ExecutionContext(
      this.eventStore,
      this.canvasId,
      options.workflowId || this.workflowId,
      {
        source: options.source || this.source,
        parentContextId: this.id
      }
    )
    
    // Inherit selection snapshot
    childContext.setSelectionSnapshot(this.selectionSnapshot)
    
    return childContext
  }
  
  /**
   * Get canvas context for tool execution
   */
  getCanvasContext(canvas: CanvasManager): CanvasContext {
    const targetImages = this.getTargetImages()
    const selectedIds = Array.from(canvas.state.selectedObjectIds)
    
    // Determine targeting mode based on selection and image count
    let targetingMode: CanvasContext['targetingMode'] = 'none'
    if (targetImages.length > 0) {
      if (selectedIds.length > 0 && this.selectionSnapshot.objectIds.size > 0) {
        targetingMode = 'selection'
      } else if (targetImages.length === 1) {
        targetingMode = 'auto-single'
      } else {
        targetingMode = 'all'
      }
    }
    
    return {
      canvas,
      targetImages,
      targetingMode,
      dimensions: {
        width: canvas.state.canvasWidth,
        height: canvas.state.canvasHeight
      },
      selectedObjectIds: selectedIds
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
  
  /**
   * Get tool execution summary
   */
  getToolExecutions(): ToolExecution[] {
    return Array.from(this.toolExecutions.values())
  }
  
  /**
   * Get workflow status
   */
  getWorkflowStatus(): typeof this.workflowStatus {
    return this.workflowStatus
  }
}

/**
 * Factory for creating execution contexts
 */
export class ExecutionContextFactory {
  /**
   * Create context from current canvas state
   */
  static fromCanvas(
    canvas: CanvasManager,
    eventStore: EventStore,
    source: ExecutionContext['source'],
    options: {
      workflowId?: string
    } = {}
  ): ExecutionContext {
    const selectionSnapshot = SelectionSnapshotFactory.fromCanvas(canvas)
    
    const context = new ExecutionContext(
      eventStore,
      'main', // TODO: Get canvas ID from somewhere
      options.workflowId,
      { source }
    )
    
    context.setSelectionSnapshot(selectionSnapshot)
    return context
  }
  
  /**
   * Create context with specific selection
   */
  static fromSelection(
    canvas: CanvasManager,
    objects: CanvasObject[],
    eventStore: EventStore,
    source: ExecutionContext['source'],
    options: {
      workflowId?: string
    } = {}
  ): ExecutionContext {
    const selectionSnapshot = SelectionSnapshotFactory.fromObjects(objects)
    
    const context = new ExecutionContext(
      eventStore,
      'main', // TODO: Get canvas ID from somewhere
      options.workflowId,
      { source }
    )
    
    context.setSelectionSnapshot(selectionSnapshot)
    return context
  }
  
  /**
   * Create context from existing snapshot
   */
  static fromSnapshot(
    canvas: CanvasManager,
    selectionSnapshot: SelectionSnapshot,
    eventStore: EventStore,
    source: ExecutionContext['source'],
    options: {
      workflowId?: string
    } = {}
  ): ExecutionContext {
    const context = new ExecutionContext(
      eventStore,
      'main', // TODO: Get canvas ID from somewhere
      options.workflowId,
      { source }
    )
    
    context.setSelectionSnapshot(selectionSnapshot)
    return context
  }
} 