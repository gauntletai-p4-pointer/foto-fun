import { z } from 'zod'
import { tool } from 'ai'
import type { Tool } from '@/types'
import type { Canvas } from 'fabric'
import type { CanvasContext } from '@/lib/ai/tools/canvas-bridge'

/**
 * Metadata for tool adapters to help with routing decisions
 */
export interface ToolMetadata {
  category: 'canvas-editing' | 'ai-native'
  executionType: 'fast' | 'slow' | 'expensive'
  worksOn: 'existing-image' | 'new-image' | 'both'
}

/**
 * Base class for tool adapters following AI SDK v5 patterns
 * Adapters convert canvas tools to AI-compatible tools
 * 
 * IMPORTANT: When creating new tool adapters:
 * 1. Write descriptions that explicitly tell AI to calculate values
 * 2. Include common usage patterns in the description
 * 3. Never imply the AI should ask users for exact measurements
 * 4. Provide calculation examples where applicable
 * 
 * Example description pattern:
 * "Adjust the image brightness. You MUST calculate the adjustment value based on user intent.
 *  Common patterns: 'brighter' → +20%, 'much brighter' → +40%, 'slightly darker' → -10%
 *  NEVER ask for exact values - interpret the user's intent."
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
   * Metadata for routing decisions
   */
  abstract metadata: ToolMetadata
  
  /**
   * Zod schema for input validation (AI SDK v5 beta.9 uses 'inputSchema')
   */
  abstract inputSchema: z.ZodType<TInput>
  
  /**
   * Execute the tool with the given parameters
   * This follows AI SDK v5's execute pattern with enhanced canvas context
   */
  abstract execute(params: TInput, context: CanvasContext): Promise<TOutput>
  
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
   * Returns unknown to avoid exposing internal AI SDK types
   */
  toAITool(): unknown {
    // Create the tool following AI SDK v5 beta.9 pattern
    // Build the configuration object explicitly to avoid type inference issues
    const toolConfig = {
      description: this.description,
      inputSchema: this.inputSchema as z.ZodSchema, // Cast to base Zod type
      execute: async (args: unknown) => {
        // Server-side execution just returns the parameters
        // The actual execution happens on the client side
        console.log(`[${this.aiName}] Server-side tool call with args:`, args)
        
        // Return a placeholder result that indicates client-side execution is needed
        return {
          success: true,
          message: `Tool ${this.aiName} will be executed on the client`,
          clientExecutionRequired: true,
          params: args
        }
      }
    }
    
    // Pass the configuration to the tool function
    // We need to cast to unknown first to bypass strict type checking
    // This is necessary because the AI SDK's tool function has complex overloads
    return tool(toolConfig as unknown as Parameters<typeof tool>[0])
  }
}

/**
 * Type alias for tool adapters
 */
export type ToolAdapter = BaseToolAdapter<unknown, unknown> 