import { CanvasToolBridge, type CanvasContext } from '../tools/canvas-bridge'
import { adapterRegistry } from '../adapters/registry'
import { useEventHistoryStore } from '@/lib/events/history/EventBasedHistoryStore'

/**
 * Tool chain for executing multiple AI tools in sequence
 * Handles context preservation and error recovery
 */
export class ToolChain {
  private steps: Array<{
    toolName: string
    params: unknown
    description?: string
  }> = []
  
  private context: CanvasContext | null = null
  private historyStore = useEventHistoryStore
  
  constructor() {
    // Initialize context
    this.updateContext()
  }
  
  private updateContext(): void {
    this.context = CanvasToolBridge.getCanvasContext()
  }
  
  /**
   * Add a tool execution step
   */
  addStep(toolName: string, params: unknown, description?: string): this {
    this.steps.push({ toolName, params, description })
    return this
  }
  
  /**
   * Execute all steps in the chain
   */
  async execute(): Promise<unknown[]> {
    if (this.steps.length === 0) {
      throw new Error('No steps to execute')
    }
    
    // Update context before execution
    this.updateContext()
    
    if (!this.context) {
      throw new Error('Canvas context not available')
    }
    
    const results: unknown[] = []
    
    // Start history tracking
    const canvas = this.context.canvas
    const historyContext = await this.historyStore.getState().startExecution(
      canvas,
      'ai',
      `tool-chain-${Date.now()}`
    )
    
    try {
      for (let i = 0; i < this.steps.length; i++) {
        const step = this.steps[i]
        console.log(`[ToolChain] Executing step ${i + 1}/${this.steps.length}: ${step.toolName}`)
        
        // Get the adapter
        const adapter = adapterRegistry.get(step.toolName)
        if (!adapter) {
          throw new Error(`Tool adapter not found: ${step.toolName}`)
        }
        
        // Execute the step
        const result = await adapter.execute(step.params, this.context)
        results.push(result)
        
        // Update context for next step
        this.updateContext()
      }
      
      // Commit all changes
      await this.historyStore.getState().commitExecution(historyContext)
      
      return results
    } catch (error) {
      // Rollback on error
      this.historyStore.getState().rollbackExecution(historyContext)
      throw error
    }
  }
  
  /**
   * Clear all steps
   */
  clear(): this {
    this.steps = []
    return this
  }
  
  /**
   * Get the current steps
   */
  getSteps(): Array<{ toolName: string; params: unknown; description?: string }> {
    return [...this.steps]
  }
} 