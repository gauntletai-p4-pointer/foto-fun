import { SelectionSnapshot } from '@/lib/ai/execution/SelectionSnapshot'
import { nanoid } from 'nanoid'

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
 * Manages selection context for AI workflows
 * Ensures consistent targeting across multiple tool executions
 */
export class SelectionContextManager {
  private static instance: SelectionContextManager
  private workflowSelections: Map<string, WorkflowSelectionContext> = new Map()
  private cleanupInterval: NodeJS.Timeout | null = null
  
  // Context expires after 5 minutes
  private static readonly CONTEXT_TTL = 5 * 60 * 1000
  
  /**
   * Get the singleton instance
   */
  static getInstance(): SelectionContextManager {
    if (!SelectionContextManager.instance) {
      SelectionContextManager.instance = new SelectionContextManager()
    }
    return SelectionContextManager.instance
  }
  
  private constructor() {
    // Start cleanup interval
    this.startCleanupInterval()
  }
  
  /**
   * Create a workflow-scoped selection context
   */
  createWorkflowContext(
    workflowId: string,
    snapshot: SelectionSnapshot
  ): WorkflowSelectionContext {
    const context: WorkflowSelectionContext = {
      workflowId,
      originalSnapshot: snapshot,
      currentSnapshot: snapshot,
      objectMapping: new Map(),
      createdAt: Date.now(),
      expiresAt: Date.now() + SelectionContextManager.CONTEXT_TTL
    }
    
    this.workflowSelections.set(workflowId, context)
    return context
  }
  
  /**
   * Get workflow context
   */
  getWorkflowContext(workflowId: string): WorkflowSelectionContext | null {
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
    const context = this.getWorkflowContext(workflowId)
    if (!context) return
    
    // Update the mapping
    context.objectMapping.set(oldId, newId)
    
    // Extend expiration
    context.expiresAt = Date.now() + SelectionContextManager.CONTEXT_TTL
  }
  
  /**
   * Resolve an object ID through the mapping
   */
  resolveObjectId(workflowId: string, objectId: string): string {
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
    const context = this.getWorkflowContext(workflowId)
    if (!context) return
    
    context.currentSnapshot = snapshot
    context.expiresAt = Date.now() + SelectionContextManager.CONTEXT_TTL
  }
  
  /**
   * Clear a workflow context
   */
  clearWorkflowContext(workflowId: string): void {
    this.workflowSelections.delete(workflowId)
  }
  
  /**
   * Start cleanup interval to remove expired contexts
   */
  private startCleanupInterval(): void {
    // Run cleanup every minute
    this.cleanupInterval = setInterval(() => {
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
    }, 60 * 1000)
  }
  
  /**
   * Stop the cleanup interval (for testing)
   */
  stopCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }
  
  /**
   * Get all active workflow contexts (for debugging)
   */
  getActiveContexts(): Map<string, WorkflowSelectionContext> {
    return new Map(this.workflowSelections)
  }
  
  /**
   * Generate a new workflow ID
   */
  static generateWorkflowId(): string {
    return `workflow_${nanoid()}`
  }
} 