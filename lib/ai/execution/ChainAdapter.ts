import { z } from 'zod'
import { tool } from 'ai'
import React from 'react'
import { EventBasedToolChain } from '@/lib/events/execution/EventBasedToolChain'
import { adapterRegistry } from '../adapters/registry'
import { BaseToolAdapter } from '../adapters/base'
import type { Tool } from '@/lib/editor/canvas/types'
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager'
import type { CanvasContext } from '@/lib/ai/tools/canvas-bridge'
import { ServiceContainer } from '@/lib/core/ServiceContainer'
import { EventStore } from '@/lib/events/core/EventStore'

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
  // Create a synthetic tool for the chain execution
  tool: Tool = {
    id: 'execute-chain',
    name: 'Execute Tool Chain',
    icon: (() => null) as React.ComponentType,
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
    category: 'ai-native' as const, // Changed to valid category
    executionType: 'fast' as const, // Changed to valid type
    worksOn: 'both' as const // Changed to valid type
  }
  
  /**
   * Execute the tool chain
   */
  async execute(params: ExecuteChainInput, context: CanvasContext): Promise<ExecuteChainOutput> {
    try {
      console.log('[ChainAdapter] Executing chain with steps:', params.steps)
      
      // Get required services
      const container = ServiceContainer.getInstance()
      const eventStore = container.get<EventStore>('EventStore')
      const canvas = context.canvas
      
      if (!canvas) {
        throw new Error('Canvas is required for chain execution')
      }
      
      // Create event-based tool chain
      const chain = new EventBasedToolChain({
        canvasId: canvas.id,
        canvas: canvas as CanvasManager,
        eventStore,
        workflowId: `workflow_${Date.now()}`,
        metadata: {
          source: 'ai-chain-adapter',
          preserveSelection: params.preserveSelection
        }
      })
      
      const startTime = Date.now()
      const results: Array<{ tool: string; success: boolean; result?: unknown; error?: string }> = []
      
      try {
        // Prepare for AI operation
        await chain.prepareForAIOperation(true)
        
        // Execute each step
        const toolResults = await chain.executeSequence(
          params.steps.map(step => ({
            toolId: step.tool,
            params: step.params,
            executor: async (toolParams) => {
              const adapter = adapterRegistry.get(step.tool)
              if (!adapter) {
                throw new Error(`Tool adapter not found: ${step.tool}`)
              }
              
              try {
                const result = await adapter.execute(toolParams, context)
                return {
                  success: true,
                  data: result
                }
              } catch (error) {
                return {
                  success: false,
                  error: error instanceof Error ? error.message : 'Unknown error'
                }
              }
            }
          }))
        )
        
        // Process results
        toolResults.forEach((result, index) => {
          results.push({
            tool: params.steps[index].tool,
            success: result.success,
            result: result.data,
            error: result.error
          })
        })
        
        // Complete the AI operation
        await chain.completeAIOperation()
        
        // Complete the workflow
        chain.complete()
        
        const totalTime = Date.now() - startTime
        const successCount = results.filter(r => r.success).length
        const allSucceeded = successCount === params.steps.length
        
        const message = allSucceeded
          ? `Executed ${params.steps.length} tools in ${totalTime}ms - all succeeded`
          : `Executed ${params.steps.length} tools in ${totalTime}ms - ${successCount} succeeded, ${params.steps.length - successCount} failed`
        
        return {
          success: allSucceeded,
          chainId: `chain_${Date.now()}`,
          results,
          totalTime,
          message
        }
      } catch (error) {
        // Handle execution failure
        chain.fail(error instanceof Error ? error.message : 'Unknown error')
        
        const totalTime = Date.now() - startTime
        const successCount = results.filter(r => r.success).length
        const message = `Chain execution failed after ${successCount} successful steps: ${error instanceof Error ? error.message : 'Unknown error'}`
        
        return {
          success: false,
          chainId: `chain_${Date.now()}`,
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

// Register the chain adapter
export function registerChainAdapter(): void {
  const adapter = new ChainAdapter()
  adapterRegistry.register(adapter)
} 