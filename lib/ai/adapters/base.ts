import { z } from 'zod'
import type { Tool } from '@/types'
import type { FotoFunTool, ToolExecutionContext } from '../tools/base'
import type { BaseParameterResolver } from './resolvers/base'

// Using fabric.Canvas type from the context
type CanvasType = NonNullable<ToolExecutionContext['canvas']>

/**
 * Base interface for tool adapters
 * Each canvas tool that wants AI compatibility must implement an adapter
 */
export interface ToolAdapter<TInput = unknown, TOutput = unknown> {
  /**
   * The canvas tool being adapted
   */
  tool: Tool
  
  /**
   * AI-friendly name for the tool
   */
  aiName: string
  
  /**
   * Description for AI to understand when to use this tool
   */
  aiDescription: string
  
  /**
   * Zod schema for input validation
   */
  inputSchema: z.ZodType<TInput>
  
  /**
   * Zod schema for output validation
   */
  outputSchema: z.ZodType<TOutput>
  
  /**
   * Convert canvas tool to AI-compatible format
   */
  toAITool(): FotoFunTool
  
  /**
   * Execute the tool with AI parameters
   */
  execute(params: TInput, canvas: CanvasType): Promise<TOutput>
  
  /**
   * Optional: Generate preview before execution
   */
  generatePreview?(params: TInput, canvas: CanvasType): Promise<{
    before: string
    after: string
  }>
  
  /**
   * Optional: Validate if tool can be used in current state
   */
  canExecute?(canvas: CanvasType): boolean
}

/**
 * Abstract base class for tool adapters
 */
export abstract class BaseToolAdapter<TInput = unknown, TOutput = unknown> 
  implements ToolAdapter<TInput, TOutput> {
  
  abstract tool: Tool
  abstract aiName: string
  abstract aiDescription: string
  abstract inputSchema: z.ZodType<TInput>
  abstract outputSchema: z.ZodType<TOutput>
  
  abstract execute(params: TInput, canvas: CanvasType): Promise<TOutput>
  
  /**
   * Optional methods that can be overridden
   */
  canExecute?(canvas: CanvasType): boolean
  generatePreview?(params: TInput, canvas: CanvasType): Promise<{ before: string; after: string }>
  
  /**
   * Optional parameter resolver for natural language input
   */
  parameterResolver?: BaseParameterResolver<TInput>
  
  /**
   * Convert to AI SDK compatible tool format
   * This will be called by the registry which has access to ToolFactory
   */
  toAITool(): FotoFunTool {
    throw new Error('toAITool should be called through the registry')
  }
  
  /**
   * Get the tool configuration for creating an AI tool
   */
  getToolConfig() {
    const baseConfig = {
      name: this.aiName,
      category: 'edit' as const,
      description: this.aiDescription,
      inputSchema: this.inputSchema,
      outputSchema: this.outputSchema,
      executionSide: 'client' as const,
      requiresCanvas: true,
      clientExecutor: async (input: unknown, context: ToolExecutionContext) => {
        if (!context.canvas) {
          throw new Error('Canvas is required for this operation')
        }
        
        if (this.canExecute && !this.canExecute(context.canvas)) {
          throw new Error('Tool cannot be executed in current state')
        }
        
        // Handle parameter resolution if resolver is available
        let resolvedInput = input as TInput
        if (this.parameterResolver && typeof input === 'string') {
          // Get canvas context for resolver
          const { CanvasToolBridge } = await import('../tools/canvas-bridge')
          const canvasContext = CanvasToolBridge.getCanvasContext()
          if (!canvasContext) {
            throw new Error('Canvas context not available for parameter resolution')
          }
          resolvedInput = await this.parameterResolver.resolve(input, canvasContext)
        }
        
        return this.execute(resolvedInput, context.canvas)
      },
      previewGenerator: this.generatePreview ? 
        async (input: unknown, context: ToolExecutionContext) => {
          if (!context.canvas) {
            throw new Error('Canvas is required for preview generation')
          }
          
          // Handle parameter resolution for preview
          let resolvedInput = input as TInput
          if (this.parameterResolver && typeof input === 'string') {
            const { CanvasToolBridge } = await import('../tools/canvas-bridge')
            const canvasContext = CanvasToolBridge.getCanvasContext()
            if (!canvasContext) {
              throw new Error('Canvas context not available for parameter resolution')
            }
            resolvedInput = await this.parameterResolver.resolve(input, canvasContext)
          }
          
          const preview = await this.generatePreview!(resolvedInput, context.canvas)
          return {
            ...preview,
            confidence: 1,
            diff: undefined,
            alternativeParams: undefined
          }
        } : undefined
    }
    
    return baseConfig
  }
} 