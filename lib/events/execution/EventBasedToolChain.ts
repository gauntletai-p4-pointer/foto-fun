import type { TypedEventBus } from '../core/TypedEventBus'
import type { ExecutionContext } from './ExecutionContext'

export interface ToolChainStep {
  id: string
  toolId: string
  input: Record<string, unknown>
  dependencies: string[]
  status: 'pending' | 'running' | 'completed' | 'failed'
  result?: unknown
  error?: string
}

export interface ToolChainOptions {
  maxRetries?: number
  timeout?: number
  parallel?: boolean
}

/**
 * Event-driven tool execution chain
 * Uses dependency injection for event bus access
 */
export class EventBasedToolChain {
  private steps: Map<string, ToolChainStep> = new Map()
  private executionOrder: string[] = []
  private currentStep: string | null = null
  private context: ExecutionContext
  private typedEventBus: TypedEventBus
  private options: Required<ToolChainOptions>
  
  constructor(
    context: ExecutionContext, 
    eventBus: TypedEventBus,
    options: ToolChainOptions = {}
  ) {
    this.context = context
    this.typedEventBus = eventBus
    this.options = {
      maxRetries: options.maxRetries ?? 3,
      timeout: options.timeout ?? 30000,
      parallel: options.parallel ?? false
    }
  }
  
  /**
   * Add a step to the chain
   */
  addStep(step: Omit<ToolChainStep, 'status'>): void {
    const toolStep: ToolChainStep = {
      ...step,
      status: 'pending'
    }
    
    this.steps.set(step.id, toolStep)
    this.updateExecutionOrder()
  }
  
  /**
   * Execute the tool chain
   */
  async execute(): Promise<void> {
    if (this.options.parallel) {
      await this.executeParallel()
    } else {
      await this.executeSequential()
    }
  }
  
  /**
   * Execute steps sequentially
   */
  private async executeSequential(): Promise<void> {
    for (const stepId of this.executionOrder) {
      const step = this.steps.get(stepId)!
      await this.executeStep(step)
    }
  }
  
  /**
   * Execute steps in parallel where possible
   */
  private async executeParallel(): Promise<void> {
    const executed = new Set<string>()
    const executing = new Set<string>()
    
    while (executed.size < this.steps.size) {
      const readySteps = this.executionOrder.filter(stepId => {
        const step = this.steps.get(stepId)!
        return !executed.has(stepId) && 
               !executing.has(stepId) && 
               step.dependencies.every(dep => executed.has(dep))
      })
      
      if (readySteps.length === 0) {
        throw new Error('Circular dependency detected in tool chain')
      }
      
      // Execute ready steps in parallel
      const promises = readySteps.map(async (stepId) => {
        executing.add(stepId)
        const step = this.steps.get(stepId)!
        try {
          await this.executeStep(step)
          executed.add(stepId)
        } finally {
          executing.delete(stepId)
        }
      })
      
      await Promise.all(promises)
    }
  }
  
  /**
   * Execute a single step
   */
  private async executeStep(step: ToolChainStep): Promise<void> {
    this.currentStep = step.id
    step.status = 'running'
    
    try {
             // Log step started (events not in registry yet)
       console.log(`[EventBasedToolChain] Starting step ${step.id} with tool ${step.toolId}`)
      
      // Execute the tool (implementation would depend on tool registry)
      // For now, just simulate execution
      await new Promise(resolve => setTimeout(resolve, 100))
      
      step.status = 'completed'
      
             // Log step completed (events not in registry yet)
       console.log(`[EventBasedToolChain] Completed step ${step.id} with tool ${step.toolId}`)
      
    } catch (error) {
      step.status = 'failed'
      step.error = error instanceof Error ? error.message : String(error)
      
             // Log step failed (events not in registry yet)
       console.log(`[EventBasedToolChain] Failed step ${step.id} with tool ${step.toolId}: ${step.error}`)
      
      throw error
    } finally {
      this.currentStep = null
    }
  }
  
  /**
   * Update execution order based on dependencies
   */
  private updateExecutionOrder(): void {
    const visited = new Set<string>()
    const visiting = new Set<string>()
    const order: string[] = []
    
    const visit = (stepId: string) => {
      if (visiting.has(stepId)) {
        throw new Error(`Circular dependency detected: ${stepId}`)
      }
      if (visited.has(stepId)) return
      
      visiting.add(stepId)
      const step = this.steps.get(stepId)
      if (step) {
        for (const dep of step.dependencies) {
          visit(dep)
        }
      }
      visiting.delete(stepId)
      visited.add(stepId)
      order.push(stepId)
    }
    
    for (const stepId of this.steps.keys()) {
      visit(stepId)
    }
    
    this.executionOrder = order
  }
  
  /**
   * Get chain status
   */
  getStatus() {
    const steps = Array.from(this.steps.values())
    return {
      totalSteps: steps.length,
      completed: steps.filter(s => s.status === 'completed').length,
      failed: steps.filter(s => s.status === 'failed').length,
      running: steps.filter(s => s.status === 'running').length,
      currentStep: this.currentStep
    }
  }
} 