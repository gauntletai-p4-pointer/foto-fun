import { SelectionSnapshot } from '@/lib/ai/execution/SelectionSnapshot'
import { nanoid } from 'nanoid'
import type { EventStore } from '@/lib/events/core/EventStore'
import type { TypedEventBus } from '@/lib/events/core/TypedEventBus'

/**
 * Workflow-scoped selection context
 * Maintains selection state across multiple operations in an AI workflow
 */
export interface WorkflowSelectionContext {
  workflowId: string
  originalSnapshot: SelectionSnapshot
  currentSnapshot: SelectionSnapshot
  objectMapping: Map<string, string> // old ID -> new ID
  createdAt: number
  expiresAt: number
}

/**
 * Configuration for SelectionContextManager
 */
export interface SelectionContextManagerConfig {
  contextTTL?: number // Context time-to-live in milliseconds
  cleanupInterval?: number // Cleanup interval in milliseconds
  persistence?: boolean
  optimization?: boolean
}

/**
 * Manages selection context for AI workflows
 * Ensures consistent targeting across multiple tool executions
 */
export class SelectionContextManager {
  private workflowSelections: Map<string, WorkflowSelectionContext> = new Map()
  private cleanupInterval: NodeJS.Timeout | null = null
  private disposed = false
  
  // Default context expires after 5 minutes
  private readonly contextTTL: number
  private readonly cleanupIntervalMs: number
  
  constructor(
    private eventStore: EventStore,
    private typedEventBus: TypedEventBus,
    private config: SelectionContextManagerConfig = {}
  ) {
    this.contextTTL = config.contextTTL || 5 * 60 * 1000
    this.cleanupIntervalMs = config.cleanupInterval || 60 * 1000
    this.initialize()
  }
  
  private initialize(): void {
    this.setupEventHandlers()
    this.startCleanupInterval()
  }
  
  private setupEventHandlers(): void {
    // Listen for workflow events
    this.typedEventBus.on('workflow.started', (event) => {
      console.log(`[SelectionContextManager] Workflow started: ${event.workflowId}`)
    })
    
    this.typedEventBus.on('workflow.completed', (event) => {
      // Auto-cleanup completed workflows
      this.clearWorkflowContext(event.workflowId)
    })
    
    this.typedEventBus.on('workflow.failed', (event) => {
      // Auto-cleanup failed workflows
      this.clearWorkflowContext(event.workflowId)
    })
  }
  
  /**
   * Create a workflow-scoped selection context
   */
  createWorkflowContext(
    workflowId: string,
    snapshot: SelectionSnapshot
  ): WorkflowSelectionContext {
    if (this.disposed) {
      throw new Error('SelectionContextManager has been disposed')
    }
    
    const context: WorkflowSelectionContext = {
      workflowId,
      originalSnapshot: snapshot,
      currentSnapshot: snapshot,
      objectMapping: new Map(),
      createdAt: Date.now(),
      expiresAt: Date.now() + this.contextTTL
    }
    
    this.workflowSelections.set(workflowId, context)
    
    // Emit context created event
    this.typedEventBus.emit('workflow.started', {
      workflowId,
      name: `Selection Context ${workflowId.slice(0, 8)}`
    })
    
    return context
  }
  
  /**
   * Get workflow context
   */
  getWorkflowContext(workflowId: string): WorkflowSelectionContext | null {
    if (this.disposed) return null
    
    const context = this.workflowSelections.get(workflowId)
    
    if (!context) return null
    
    // Check if expired
    if (Date.now() > context.expiresAt) {
      this.workflowSelections.delete(workflowId)
      return null
    }
    
    return context
  }
  
  /**
   * Update object mapping when objects are replaced
   */
  updateObjectMapping(
    workflowId: string,
    oldId: string,
    newId: string
  ): void {
    if (this.disposed) return
    
    const context = this.getWorkflowContext(workflowId)
    if (!context) return
    
    // Update the mapping
    context.objectMapping.set(oldId, newId)
    
    // Extend expiration
    context.expiresAt = Date.now() + this.contextTTL
  }
  
  /**
   * Resolve an object ID through the mapping
   */
  resolveObjectId(workflowId: string, objectId: string): string {
    if (this.disposed) return objectId
    
    const context = this.getWorkflowContext(workflowId)
    if (!context) return objectId
    
    // Follow the mapping chain
    let currentId = objectId
    let iterations = 0
    const maxIterations = 10 // Prevent infinite loops
    
    while (context.objectMapping.has(currentId) && iterations < maxIterations) {
      currentId = context.objectMapping.get(currentId)!
      iterations++
    }
    
    return currentId
  }
  
  /**
   * Update the current snapshot for a workflow
   */
  updateSnapshot(workflowId: string, snapshot: SelectionSnapshot): void {
    if (this.disposed) return
    
    const context = this.getWorkflowContext(workflowId)
    if (!context) return
    
    context.currentSnapshot = snapshot
    context.expiresAt = Date.now() + this.contextTTL
  }
  
  /**
   * Clear a workflow context
   */
  clearWorkflowContext(workflowId: string): void {
    if (this.disposed) return
    
    const deleted = this.workflowSelections.delete(workflowId)
    
    if (deleted) {
      console.log(`[SelectionContextManager] Cleared workflow context: ${workflowId}`)
    }
  }
  
  /**
   * Start cleanup interval to remove expired contexts
   */
  private startCleanupInterval(): void {
    if (this.disposed) return
    
    // Run cleanup at configured interval
    this.cleanupInterval = setInterval(() => {
      if (this.disposed) return
      
      const now = Date.now()
      const toDelete: string[] = []
      
      this.workflowSelections.forEach((context, workflowId) => {
        if (now > context.expiresAt) {
          toDelete.push(workflowId)
        }
      })
      
      toDelete.forEach(id => this.workflowSelections.delete(id))
      
      if (toDelete.length > 0) {
        console.log(`[SelectionContextManager] Cleaned up ${toDelete.length} expired contexts`)
      }
    }, this.cleanupIntervalMs)
  }
  
  /**
   * Stop the cleanup interval
   */
  private stopCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }
  
  /**
   * Get all active workflow contexts (for debugging)
   */
  getActiveContexts(): Map<string, WorkflowSelectionContext> {
    if (this.disposed) return new Map()
    return new Map(this.workflowSelections)
  }
  
  /**
   * Generate a new workflow ID
   */
  static generateWorkflowId(): string {
    return `workflow_${nanoid()}`
  }
  
  /**
   * Dispose the SelectionContextManager and clean up resources
   */
  dispose(): void {
    if (this.disposed) return
    
    this.stopCleanupInterval()
    this.workflowSelections.clear()
    this.disposed = true
    
    // Remove event listeners
    this.typedEventBus.clear('workflow.started')
    this.typedEventBus.clear('workflow.completed')
    this.typedEventBus.clear('workflow.failed')
  }
  
  /**
   * Check if the manager has been disposed
   */
  isDisposed(): boolean {
    return this.disposed
  }
} 