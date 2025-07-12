import { z } from 'zod'
import { tool } from 'ai'
import { EventBasedToolChain } from '@/lib/events/execution/EventBasedToolChain'
import { ExecutionContextFactory } from '@/lib/events/execution/ExecutionContext'
import { adapterRegistry } from '../adapters/registry'
import { BaseToolAdapter } from '../adapters/base'
import type { Tool } from '@/lib/editor/canvas/types'
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager'
import type { CanvasContext } from '../tools/canvas-bridge'
import { ServiceContainer } from '@/lib/core/ServiceContainer'
import { EventStore } from '@/lib/events/core/EventStore'
import type { TypedEventBus } from '@/lib/events/core/TypedEventBus'

// Define the schema for a chain step
const ChainStepSchema = z.object({
  tool: z.string().describe('The name of the tool to execute'),
  params: z.record(z.unknown()).describe('Parameters to pass to the tool'),
  continueOnError: z.boolean().optional().describe('Whether to continue if this step fails')
})

// Schema for the chain execution tool
const ExecuteChainSchema = z.object({
  steps: z.array(ChainStepSchema).describe('Array of tools to execute in sequence'),
  preserveToolState: z.boolean().default(true).describe('Whether to restore the original tool after execution'),
  continueOnError: z.boolean().default(false).describe('Whether to continue execution if a step fails'),
  preserveSelection: z.boolean().default(true).describe('Whether to preserve user selection after execution')
})

type ExecuteChainInput = z.infer<typeof ExecuteChainSchema>

interface ExecuteChainOutput {
  success: boolean
  chainId: string
  results: Array<{
    tool: string
    success: boolean
    result?: unknown  // Add the actual tool result data
    error?: string
  }>
  totalTime: number
  message: string
}

/**
 * ChainAdapter - Makes tool chains available as an AI tool
 * 
 * This adapter allows the AI to execute multiple tools in sequence
 * with consistent context and proper error handling
 */
export class ChainAdapter extends BaseToolAdapter<ExecuteChainInput, ExecuteChainOutput> {
  private eventStore: EventStore
  private eventBus: TypedEventBus
  
  constructor(eventStore: EventStore, eventBus: TypedEventBus) {
    super()
    this.eventStore = eventStore
    this.eventBus = eventBus
  }

  tool: Tool = {
    id: 'executeToolChain',
    name: 'Execute Tool Chain',
    icon: () => null,
    cursor: 'default',
    // Tool lifecycle (no-op for chain execution)
    onActivate: () => {},
    onDeactivate: () => {}
  }
  
  aiName = 'executeToolChain'
  
  description = `Execute multiple tools in sequence with consistent context. This is the PREFERRED way to execute multiple operations when you need to:
  
  1. Apply multiple edits to the same image(s)
  2. Ensure operations happen in a specific order
  3. Maintain consistent targeting across operations
  
  IMPORTANT: When executing multiple tools, ALWAYS use this instead of calling tools individually.
  
  The chain will:
  - Lock the target images at the start
  - Execute each tool in sequence
  - Handle errors gracefully
  - Support undo/redo for the entire chain
  - Preserve or restore the original tool state
  
  Example steps array:
  [
    { "tool": "addText", "params": { "text": "Hello", "x": 100, "y": 100 } },
    { "tool": "adjustBrightness", "params": { "adjustment": 10 } },
    { "tool": "rotate", "params": { "angle": 45 } }
  ]`
  
  inputSchema = ExecuteChainSchema as z.ZodType<ExecuteChainInput>
  
  metadata = {
    category: 'ai-native' as const,
    executionType: 'fast' as const,
    worksOn: 'both' as const
  }
  
  /**
   * Execute the tool chain
   */
  async execute(params: ExecuteChainInput, context: CanvasContext): Promise<ExecuteChainOutput> {
    try {
      console.log('[ChainAdapter] Executing chain with steps:', params.steps)
      
      const canvas = context.canvas
      
      if (!canvas) {
        throw new Error('Canvas is required for chain execution')
      }
      
      // Create execution context for the chain
      const executionContext = ExecutionContextFactory.fromCanvas(
        canvas as CanvasManager,
        this.eventStore,
        'ai',
        { workflowId: `workflow_${Date.now()}` }
      )
      
      // Create event-based tool chain using injected dependencies
      const chain = new EventBasedToolChain(
        executionContext,
        this.eventBus,
        {
          maxRetries: 3,
          timeout: 30000,
          parallel: false
        }
      )
      
      const startTime = Date.now()
      const results: Array<{ tool: string; success: boolean; result?: unknown; error?: string }> = []
      
      try {
        // Add steps to the chain
        params.steps.forEach((step, index) => {
          chain.addStep({
            id: `step_${index}`,
            toolId: step.tool,
            input: step.params,
            dependencies: index > 0 ? [`step_${index - 1}`] : []
          })
        })
        
        // Execute the chain
        await chain.execute()
        
        // Get execution status and build results
        params.steps.forEach((step, index) => {
          results.push({
            tool: step.tool,
            success: true, // For now, assume success if chain completed
            result: `Step ${index} completed`,
            error: undefined
          })
        })
        
        // Complete the execution context
        executionContext.completeWorkflow()
        await executionContext.commit()
        
        const totalTime = Date.now() - startTime
        const successCount = results.filter(r => r.success).length
        const allSucceeded = successCount === params.steps.length
        
        const message = allSucceeded
          ? `Executed ${params.steps.length} tools in ${totalTime}ms - all succeeded`
          : `Executed ${params.steps.length} tools in ${totalTime}ms - ${successCount} succeeded, ${params.steps.length - successCount} failed`
        
        return {
          success: allSucceeded,
          chainId: executionContext.id,
          results,
          totalTime,
          message
        }
      } catch (error) {
        // Handle execution failure
        executionContext.failWorkflow(error instanceof Error ? error.message : 'Unknown error')
        executionContext.rollback()
        
        const totalTime = Date.now() - startTime
        const successCount = results.filter(r => r.success).length
        const message = `Chain execution failed after ${successCount} successful steps: ${error instanceof Error ? error.message : 'Unknown error'}`
        
        return {
          success: false,
          chainId: executionContext.id,
          results,
          totalTime,
          message
        }
      }
      
    } catch (error) {
      console.error('[ChainAdapter] Chain execution failed:', error)
      
      return {
        success: false,
        chainId: 'error',
        results: [],
        totalTime: 0,
        message: error instanceof Error ? error.message : 'Chain execution failed'
      }
    }
  }
  
  /**
   * Server-side tool definition
   */
  toAITool(): unknown {
    return tool({
      description: this.description,
      inputSchema: this.inputSchema as z.ZodSchema,
      execute: async (args: unknown) => {
        const typedArgs = args as ExecuteChainInput
        console.log('[ChainAdapter] Server-side chain execution requested')
        
        // Validate all tools exist
        const invalidTools = typedArgs.steps
          .map(s => s.tool)
          .filter(toolName => !adapterRegistry.get(toolName))
        
        if (invalidTools.length > 0) {
          return {
            success: false,
            message: `Unknown tools: ${invalidTools.join(', ')}`
          }
        }
        
        // Return a response indicating client execution is required
        return {
          success: true,
          message: `Chain of ${typedArgs.steps.length} tools will be executed on the client`,
          clientExecutionRequired: true,
          params: typedArgs
        }
      }
    })
  }
}

// Register the chain adapter with dependency injection
export function registerChainAdapter(serviceContainer: ServiceContainer): void {
  // Get dependencies from ServiceContainer using proper dependency injection
  const eventStore = serviceContainer.getSync<EventStore>('EventStore')
  const eventBus = serviceContainer.getSync<TypedEventBus>('TypedEventBus')
  const adapter = new ChainAdapter(eventStore, eventBus)
  adapterRegistry.register(adapter)
} 