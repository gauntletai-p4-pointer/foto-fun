import type { CanvasContext } from './CanvasContext'
import type { WorkflowSelectionContext } from '@/lib/editor/selection/SelectionContextManager'
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager'
import { SelectionContextManager } from '@/lib/editor/selection/SelectionContextManager'
import type { ServiceContainer } from '@/lib/core/ServiceContainer'
import { CanvasContextProvider } from './CanvasContext'
import { SelectionSnapshotFactory } from '@/lib/ai/execution/SelectionSnapshot'

/**
 * Tracks objects created/modified/deleted during a workflow
 */
export interface WorkflowObjectTracking {
  created: Set<string>
  modified: Set<string>
  deleted: Set<string>
}

/**
 * Describes the targeting intent for operations
 */
export interface TargetingIntent {
  mode: 'user-selection' | 'all-images' | 'workflow-created' | 'specific-ids'
  description: string // "the images the user selected" | "all images on canvas" etc.
}

/**
 * Enhanced canvas context for AI workflows
 * Maintains selection and object tracking across tool executions
 */
export interface EnhancedCanvasContext extends CanvasContext {
  // Required dependencies for AI tools
  canvasManager: CanvasManager
  selectionManager: SelectionContextManager
  
  // Workflow-scoped selection that persists across tool calls
  workflowSelection?: WorkflowSelectionContext
  
  // Track what objects were created/modified in this workflow
  workflowObjects: WorkflowObjectTracking
  
  // Maintain targeting intent across operations
  targetingIntent: TargetingIntent
}

/**
 * Enhanced Canvas Context utility for AI tools
 * Now uses dependency injection instead of singleton pattern
 */
export class EnhancedCanvasContextUtil {
  public canvasManager: CanvasManager
  public selectionManager: SelectionContextManager
  
  constructor(
    canvasManager: CanvasManager,
    serviceContainer: ServiceContainer
  ) {
    this.canvasManager = canvasManager
    this.selectionManager = serviceContainer.getSync<SelectionContextManager>('SelectionContextManager')
  }

  /**
   * Create enhanced context from canvas with workflow tracking
   */
  static fromCanvas(
    canvas: CanvasManager,
    serviceContainer: ServiceContainer,
    workflowId?: string
  ): EnhancedCanvasContext {
    const baseContext = CanvasContextProvider.fromClient(canvas)
    const selectionManager = serviceContainer.getSync<SelectionContextManager>('SelectionContextManager')
    
    // Get or create workflow context
    let workflowSelection: WorkflowSelectionContext | undefined
    if (workflowId) {
      workflowSelection = selectionManager.getWorkflowContext(workflowId) || undefined
      
      // Create new context if needed
      if (!workflowSelection) {
        const snapshot = SelectionSnapshotFactory.fromCanvas(canvas)
        if (!snapshot.isEmpty) {
          workflowSelection = selectionManager.createWorkflowContext(workflowId, snapshot)
        }
      }
    }
    
    // Determine targeting intent
    const targetingIntent = this.determineTargetingIntent(canvas, workflowSelection)
    
    // Create enhanced context with all required properties
    const enhancedContext: EnhancedCanvasContext = {
      ...baseContext,
      canvasManager: canvas,
      selectionManager: selectionManager,
      workflowSelection,
      workflowObjects: {
        created: new Set(),
        modified: new Set(),
        deleted: new Set()
      },
      targetingIntent
    }
    
    return enhancedContext
  }
  
  /**
   * Determine the targeting intent based on current selection
   */
  private static determineTargetingIntent(
    canvas: CanvasManager,
    workflowSelection?: WorkflowSelectionContext
  ): TargetingIntent {
    const selectedObjects = canvas.getSelectedObjects()
    
    if (workflowSelection?.currentSnapshot && !workflowSelection.currentSnapshot.isEmpty) {
      return {
        mode: 'user-selection',
        description: `the ${workflowSelection.currentSnapshot.count} selected object(s)`
      }
    }
    
    if (selectedObjects.length > 0) {
      return {
        mode: 'user-selection',
        description: `the ${selectedObjects.length} selected object(s)`
      }
    }
    
    // No selection - determine default behavior
    const imageCount = canvas.getAllObjects()
      .filter(obj => obj.type === 'image')
      .length
    
    if (imageCount > 0) {
      return {
        mode: 'all-images',
        description: `all ${imageCount} image(s) on the canvas`
      }
    }
    
    return {
      mode: 'specific-ids',
      description: 'specific objects'
    }
  }
  
  /**
   * Update object tracking when an object is created
   */
  static trackObjectCreated(
    context: EnhancedCanvasContext,
    objectId: string,
    serviceContainer: ServiceContainer,
    workflowId?: string
  ): void {
    context.workflowObjects.created.add(objectId)
    
    // Update selection context if in a workflow
    if (workflowId && context.workflowSelection) {
      const selectionManager = serviceContainer.getSync<SelectionContextManager>('SelectionContextManager')
      // Object was created in this workflow, so it maps to itself
      selectionManager.updateObjectMapping(workflowId, objectId, objectId)
    }
  }
  
  /**
   * Update object tracking when an object is modified
   */
  static trackObjectModified(
    context: EnhancedCanvasContext,
    oldId: string,
    newId: string,
    serviceContainer: ServiceContainer,
    workflowId?: string
  ): void {
    context.workflowObjects.modified.add(newId)
    
    // Update selection context mapping
    if (workflowId && context.workflowSelection) {
      const selectionManager = serviceContainer.getSync<SelectionContextManager>('SelectionContextManager')
      selectionManager.updateObjectMapping(workflowId, oldId, newId)
    }
  }
  
  /**
   * Update object tracking when an object is deleted
   */
  static trackObjectDeleted(
    context: EnhancedCanvasContext,
    objectId: string
  ): void {
    context.workflowObjects.deleted.add(objectId)
    // Remove from created/modified if it was tracked there
    context.workflowObjects.created.delete(objectId)
    context.workflowObjects.modified.delete(objectId)
  }
  
  /**
   * Get the current target objects based on targeting intent
   */
  static getTargetObjects(
    context: EnhancedCanvasContext,
    canvas: CanvasManager,
    serviceContainer: ServiceContainer
  ): string[] {
    const selectionManager = serviceContainer.getSync<SelectionContextManager>('SelectionContextManager')
    
    switch (context.targetingIntent.mode) {
      case 'user-selection':
        if (context.workflowSelection) {
          // Use workflow selection with ID resolution
          const objectIds: string[] = []
          context.workflowSelection.currentSnapshot.objectIds.forEach(id => {
            const resolvedId = selectionManager.resolveObjectId(
              context.workflowSelection!.workflowId,
              id
            )
            if (canvas.findObject(resolvedId)) {
              objectIds.push(resolvedId)
            }
          })
          return objectIds
        }
        // Fall back to current selection
        const selectedObjects = canvas.getSelectedObjects()
        return selectedObjects.map(obj => obj.id)
        
      case 'all-images':
        return canvas.getAllObjects()
          .filter(obj => obj.type === 'image')
          .map(obj => obj.id)
        
      case 'workflow-created':
        return Array.from(context.workflowObjects.created)
        
      case 'specific-ids':
      default:
        return []
    }
  }
} 