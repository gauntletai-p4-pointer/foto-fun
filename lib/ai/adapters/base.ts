import { z } from 'zod'
import { tool } from 'ai'
import type { Tool } from '@/types'
import type { Canvas } from 'fabric'

/**
 * Base class for tool adapters following AI SDK v5 patterns
 * Adapters convert canvas tools to AI-compatible tools
 */
export abstract class BaseToolAdapter<
  TInput = unknown,
  TOutput = unknown
> {
  /**
   * The canvas tool being adapted
   */
  abstract tool: Tool
  
  /**
   * Name for the AI tool
   */
  abstract aiName: string
  
  /**
   * Description for AI to understand when to use this tool
   */
  abstract description: string
  
  /**
   * Zod schema for input validation (AI SDK v5 uses 'parameters')
   */
  abstract parameters: z.ZodType<TInput>
  
  /**
   * Execute the tool with the given parameters
   * This follows AI SDK v5's execute pattern
   */
  abstract execute(params: TInput, context: { canvas: Canvas }): Promise<TOutput>
  
  /**
   * Optional: Check if the tool can be executed in the current state
   */
  canExecute?(canvas: Canvas): boolean
  
  /**
   * Optional: Generate a preview of the tool's effect
   */
  generatePreview?(params: TInput, canvas: Canvas): Promise<{ before: string; after: string }>
  
    /**
   * Convert this adapter to an AI SDK v5 tool
   * This follows the proper pattern from the docs
   */
  toAITool() {
    // Using unknown to work around AI SDK v5 beta type issues
    return tool({
      description: this.description,
      parameters: this.parameters,
      execute: async (params: TInput) => {
        // Get canvas from our bridge
        const { CanvasToolBridge } = await import('../tools/canvas-bridge')
        const context = CanvasToolBridge.getCanvasContext()
        
        if (!context?.canvas) {
          throw new Error('Canvas not available')
        }
        
        // Check if tool can execute
        if (this.canExecute && !this.canExecute(context.canvas)) {
          throw new Error('Tool cannot be executed in current state')
        }
        
        // Execute the tool
        return this.execute(params, { canvas: context.canvas })
      }
    } as unknown as Parameters<typeof tool>[0]) as unknown as ReturnType<typeof tool>
  }
}

/**
 * Type alias for tool adapters
 */
export type ToolAdapter = BaseToolAdapter<any, any> 