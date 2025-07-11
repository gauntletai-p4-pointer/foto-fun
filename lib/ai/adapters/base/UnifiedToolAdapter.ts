import { z } from 'zod'
import { tool } from 'ai'
import type { CanvasManager } from '@/lib/editor/canvas/types'
import type { CanvasObject } from '@/lib/editor/objects/types'

/**
 * Context for object-based canvas operations
 */
export interface ObjectCanvasContext {
  canvas: CanvasManager
  targetObjects: CanvasObject[]
  targetingMode: 'selected' | 'all' | 'visible'
  pixelSelection?: {
    bounds: { x: number; y: number; width: number; height: number }
    mask?: ImageData
  }
}

/**
 * Base class for unified tool adapters
 * Provides consistent interface for both UI and AI tool execution
 */
export abstract class UnifiedToolAdapter<TInput = Record<string, unknown>, TOutput = Record<string, unknown>> {
  /**
   * ID of the actual tool this adapter wraps
   */
  abstract toolId: string
  
  /**
   * AI function name for this tool
   */
  abstract aiName: string
  
  /**
   * Human-readable description for AI understanding
   */
  abstract description: string
  
  /**
   * Zod schema for input validation
   */
  abstract inputSchema: z.ZodType<TInput, z.ZodTypeDef, unknown>
  
  /**
   * Execute the tool operation
   */
  abstract execute(
    params: TInput,
    context: ObjectCanvasContext
  ): Promise<TOutput>
  
  /**
   * Get target objects based on targeting mode
   */
  protected getTargets(context: ObjectCanvasContext): CanvasObject[] {
    switch (context.targetingMode) {
      case 'selected':
        return context.targetObjects
        
      case 'all':
        return context.canvas.getAllObjects()
        
      case 'visible':
        // @ts-expect-error - getViewportBounds exists on our implementation
        const viewport = context.canvas.getViewportBounds()
        return context.canvas.getObjectsInBounds(viewport)
        
      default:
        return context.targetObjects
    }
  }
  
  /**
   * Validate input parameters
   */
  protected validateInput(params: unknown): TInput {
    return this.inputSchema.parse(params)
  }
  
  /**
   * Get image objects only
   */
  protected getImageTargets(context: ObjectCanvasContext): CanvasObject[] {
    return this.getTargets(context).filter(obj => obj.type === 'image')
  }
  
  /**
   * Get text objects only
   */
  protected getTextTargets(context: ObjectCanvasContext): CanvasObject[] {
    return this.getTargets(context).filter(obj => obj.type === 'text')
  }
  
  /**
   * Format error message for user
   */
  protected formatError(error: unknown): string {
    if (error instanceof z.ZodError) {
      return `Invalid parameters: ${error.errors.map(e => e.message).join(', ')}`
    }
    if (error instanceof Error) {
      return error.message
    }
    return 'An unknown error occurred'
  }
  
  /**
   * Check if any targets are available
   */
  protected hasTargets(context: ObjectCanvasContext): boolean {
    return this.getTargets(context).length > 0
  }
  
  /**
   * Metadata for categorization and routing
   */
  metadata = {
    category: 'ai-native' as const,
    type: 'unified' as const,
    supportsPreview: true,
    requiresConfirmation: false
  }

  /**
   * Get tool metadata for AI
   */
  getMetadata() {
    return {
      toolId: this.toolId,
      aiName: this.aiName,
      description: this.description,
      schema: this.inputSchema,
      ...this.metadata
    }
  }
  
  /**
   * Convert to AI SDK v5 tool
   * Following the proper pattern with inputSchema
   */
  toAITool(): unknown {
    return tool({
      description: this.description,
      inputSchema: this.inputSchema as z.ZodSchema,
      execute: async (input: unknown) => {
        // Server-side execution placeholder
        // Actual execution happens client-side
        console.log(`[${this.aiName}] Server-side tool call with input:`, input)
        
        return {
          success: true,
          message: `Tool ${this.aiName} will be executed on the client`,
          clientExecutionRequired: true,
          input // Changed from params to input for AI SDK v5
        }
      }
    })
  }
} 