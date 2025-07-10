import { nanoid } from 'nanoid'
import type { Canvas, FabricObject } from 'fabric'
import { ExecutionContext, ExecutionContextFactory } from './ExecutionContext'
import { EventStore } from '../core/EventStore'
import { WorkflowEvent } from '../core/Event'
import { SelectionSnapshot } from '@/lib/ai/execution/SelectionSnapshot'
import type { StepResult } from '@/lib/ai/agents/types'

/**
 * Chain step definition
 */
export interface EventChainStep {
  tool: string
  params: Record<string, unknown>
  continueOnError?: boolean
  delayAfter?: number
}

/**
 * Workflow started event
 */
export class WorkflowStartedEvent extends WorkflowEvent {
  constructor(
    private workflowId: string,
    private steps: EventChainStep[],
    private description: string,
    metadata: WorkflowEvent['metadata']
  ) {
    super('workflow.started', workflowId, metadata)
  }
  
  apply(currentState: unknown): unknown {
    return currentState // No state change, just tracking
  }
  
  reverse(): null {
    return null // Cannot undo workflow start
  }
  
  canApply(): boolean {
    return true
  }
  
  getDescription(): string {
    return `Start workflow: ${this.description}`
  }
  
  protected getEventData(): Record<string, unknown> {
    return {
      workflowId: this.workflowId,
      steps: this.steps,
      description: this.description
    }
  }
}

/**
 * Workflow completed event
 */
export class WorkflowCompletedEvent extends WorkflowEvent {
  constructor(
    private workflowId: string,
    private success: boolean,
    private results: StepResult[],
    metadata: WorkflowEvent['metadata']
  ) {
    super('workflow.completed', workflowId, metadata)
  }
  
  apply(currentState: unknown): unknown {
    return currentState // No state change, just tracking
  }
  
  reverse(): null {
    return null // Cannot undo workflow completion
  }
  
  canApply(): boolean {
    return true
  }
  
  getDescription(): string {
    return `Complete workflow: ${this.success ? 'Success' : 'Failed'}`
  }
  
  protected getEventData(): Record<string, unknown> {
    return {
      workflowId: this.workflowId,
      success: this.success,
      resultCount: this.results.length
    }
  }
}

/**
 * Event-based tool chain for executing multiple tools with proper isolation
 */
export class EventBasedToolChain {
  readonly id: string
  readonly timestamp: number
  private description: string
  
  private steps: EventChainStep[] = []
  private context: ExecutionContext
  private results: StepResult[] = []
  private completed = false
  
  // Selection preservation
  private originalSelection: FabricObject[] | null = null
  
  constructor(
    canvas: Canvas,
    selectionSnapshot: SelectionSnapshot,
    options: {
      description?: string
      preserveSelection?: boolean
    } = {}
  ) {
    this.id = nanoid()
    this.timestamp = Date.now()
    this.description = options.description || 'Tool Chain Execution'
    
    // Create execution context with locked selection
    this.context = ExecutionContextFactory.fromSnapshot(
      canvas,
      selectionSnapshot,
      'ai',
      { workflowId: this.id }
    )
    
    // Store original selection if preservation is enabled
    if (options.preserveSelection) {
      this.originalSelection = [...canvas.getActiveObjects()]
    }
    
    // Emit workflow started event
    this.context.emit(new WorkflowStartedEvent(
      this.id,
      this.steps,
      this.description,
      this.context.getMetadata()
    ))
  }
  
  /**
   * Add a step to the chain
   */
  addStep(step: EventChainStep): void {
    if (this.completed) {
      throw new Error('Cannot add steps to a completed chain')
    }
    
    this.steps.push(step)
  }
  
  /**
   * Execute all steps in the chain
   */
  async execute(): Promise<StepResult[]> {
    if (this.completed) {
      throw new Error('Chain already executed')
    }
    
    console.log(`[EventBasedToolChain ${this.id}] Starting execution with ${this.steps.length} steps`)
    
    try {
      // Execute each step
      for (let i = 0; i < this.steps.length; i++) {
        const step = this.steps[i]
        console.log(`[EventBasedToolChain ${this.id}] Executing step ${i + 1}/${this.steps.length}: ${step.tool}`)
        
        try {
          const result = await this.executeStep(step)
          this.results.push(result)
          
          if (!result.success && !step.continueOnError) {
            throw new Error(`Step ${i + 1} failed: ${result.data}`)
          }
          
          // Delay if specified
          if (step.delayAfter) {
            await new Promise(resolve => setTimeout(resolve, step.delayAfter))
          }
        } catch (error) {
          console.error(`[EventBasedToolChain ${this.id}] Step ${i + 1} failed:`, error)
          
          if (!step.continueOnError) {
            throw error
          }
          
          // Add failed result
          this.results.push({
            success: false,
            data: { error: error instanceof Error ? error.message : 'Unknown error' },
            confidence: 0
          })
        }
      }
      
      // Commit all events
      await this.context.commit()
      
      // Emit workflow completed event
      const eventStore = EventStore.getInstance()
      await eventStore.append(new WorkflowCompletedEvent(
        this.id,
        true,
        this.results,
        this.context.getMetadata()
      ))
      
      this.completed = true
      
      // Restore selection if needed
      if (this.originalSelection && this.originalSelection.length > 0) {
        this.restoreSelection()
      }
      
      console.log(`[EventBasedToolChain ${this.id}] Completed successfully`)
      
      return this.results
      
    } catch (error) {
      console.error(`[EventBasedToolChain ${this.id}] Failed:`, error)
      
      // Rollback context
      this.context.rollback()
      
      // Emit workflow failed event
      const eventStore = EventStore.getInstance()
      await eventStore.append(new WorkflowCompletedEvent(
        this.id,
        false,
        this.results,
        this.context.getMetadata()
      ))
      
      throw error
    }
  }
  
  /**
   * Execute a single step
   */
  private async executeStep(step: EventChainStep): Promise<StepResult> {
    // Get the tool adapter
    const { adapterRegistry } = await import('@/lib/ai/adapters/registry')
    const adapter = adapterRegistry.get(step.tool)
    
    if (!adapter) {
      throw new Error(`Tool not found: ${step.tool}`)
    }
    
    // Create a child context for this step
    const stepContext = this.context.createChildContext()
    
    // Execute through the adapter with our locked context and execution context
    const canvasContext = stepContext.getCanvasContext()
    
    // Pass the execution context to the adapter so it can emit events
    const result = await adapter.execute(step.params, canvasContext, stepContext)
    
    // The adapter should emit events through the context
    
    return {
      success: true,
      data: result,
      confidence: 1.0
    }
  }
  
  /**
   * Restore original selection
   */
  private restoreSelection(): void {
    const canvas = this.context['canvas']
    if (!canvas || !this.originalSelection) return
    
    // Validate objects still exist
    const canvasObjects = canvas.getObjects()
    const validObjects = this.originalSelection.filter(obj => 
      canvasObjects.includes(obj)
    )
    
    if (validObjects.length === 0) {
      console.warn(`[EventBasedToolChain ${this.id}] Original selection objects no longer exist`)
      canvas.discardActiveObject()
      canvas.requestRenderAll()
      return
    }
    
    // Clear current selection
    canvas.discardActiveObject()
    
    // Restore selection
    if (validObjects.length === 1) {
      canvas.setActiveObject(validObjects[0])
    } else {
      // Use dynamic import for ActiveSelection
      import('fabric').then(({ ActiveSelection }) => {
        const selection = new ActiveSelection(validObjects, { canvas })
        canvas.setActiveObject(selection)
      })
    }
    
    canvas.requestRenderAll()
    console.log(`[EventBasedToolChain ${this.id}] Selection restored with ${validObjects.length} objects`)
  }
  
  /**
   * Get execution results
   */
  getResults(): StepResult[] {
    return [...this.results]
  }
  
  /**
   * Check if chain completed successfully
   */
  isSuccessful(): boolean {
    return this.completed && this.results.every(r => r.success)
  }
}

/**
 * Factory for creating event-based tool chains
 */
export class EventBasedToolChainFactory {
  /**
   * Create a tool chain from current canvas state
   */
  static async fromCanvas(
    canvas: Canvas,
    options: {
      description?: string
      preserveSelection?: boolean
    } = {}
  ): Promise<EventBasedToolChain> {
    const { SelectionSnapshotFactory } = await import('@/lib/ai/execution/SelectionSnapshot')
    const snapshot = SelectionSnapshotFactory.fromCanvas(canvas)
    
    return new EventBasedToolChain(canvas, snapshot, options)
  }
  
  /**
   * Create a tool chain with specific selection
   */
  static async fromSelection(
    canvas: Canvas,
    objects: FabricObject[],
    options: {
      description?: string
      preserveSelection?: boolean
    } = {}
  ): Promise<EventBasedToolChain> {
    const { SelectionSnapshotFactory } = await import('@/lib/ai/execution/SelectionSnapshot')
    const snapshot = SelectionSnapshotFactory.fromObjects(objects)
    
    return new EventBasedToolChain(canvas, snapshot, options)
  }
} 