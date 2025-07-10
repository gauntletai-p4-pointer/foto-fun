import { z } from 'zod'
import { tool } from 'ai'
import React from 'react'
import { ToolChain, ChainStepSchema } from './ToolChain'
import { adapterRegistry } from '../adapters/registry'
import { BaseToolAdapter } from '../adapters/base'
import type { Tool } from '@/types'

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
    icon: (() => null) as React.ComponentType<{ className?: string }>,
    cursor: 'default',
    isImplemented: true
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
  async execute(params: ExecuteChainInput): Promise<ExecuteChainOutput> {
    try {
      console.log('[ChainAdapter] Executing chain with steps:', params.steps)
      
      // Create the chain with progress tracking
      const chain = ToolChain.fromSteps(
        params.steps.map(step => ({
          ...step,
          continueOnError: step.continueOnError ?? params.continueOnError ?? false
        })),
        {
          preserveToolState: params.preserveToolState,
          captureCheckpoints: true,
          preserveSelection: params.preserveSelection ?? true, // Default to true for AI operations
          progressCallback: (step, total, tool) => {
            console.log(`[ChainAdapter] Progress: ${step}/${total} - ${tool}`)
          }
        }
      )
      
      // Execute through history store for undo/redo support
      const { useHistoryStore } = await import('@/store/historyStore')
      await useHistoryStore.getState().executeCommand(chain)
      
      // Get results
      const results = chain.getResults()
      
      // Build summary message
      const successCount = results.results.filter(r => r.success).length
      const failureCount = results.results.filter(r => !r.success).length
      
      let message = `Executed ${results.results.length} tools in ${results.totalTime}ms`
      if (successCount === results.results.length) {
        message += ' - all succeeded'
      } else {
        message += ` - ${successCount} succeeded, ${failureCount} failed`
      }
      
      return {
        success: results.success,
        chainId: results.id,
        results: results.results.map(r => ({
          tool: r.tool,
          success: r.success,
          result: r.result,  // Include the actual result data
          error: r.error
        })),
        totalTime: results.totalTime,
        message
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