import { z } from 'zod'
import { tool } from 'ai'
import type { Tool } from '@/types'
import type { Canvas, FabricObject } from 'fabric'
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

/**
 * Extended base class for canvas tool adapters with common patterns
 * Provides DRY implementations for common operations
 */
export abstract class CanvasToolAdapter<
  TInput = unknown,
  TOutput = unknown
> extends BaseToolAdapter<TInput, TOutput> {
  
  /**
   * Common execute wrapper that handles:
   * 1. Canvas validation
   * 2. Target image retrieval and validation
   * 3. Tool activation
   * 4. Error handling with consistent output format
   */
  protected async executeWithCommonPatterns(
    params: TInput,
    context: CanvasContext,
    toolExecution: (images: FabricImage[]) => Promise<Partial<TOutput>>
  ): Promise<TOutput> {
    try {
      console.log(`[${this.constructor.name}] Execute called with params:`, params)
      console.log(`[${this.constructor.name}] Targeting mode:`, context.targetingMode)
      
      const canvas = context.canvas
      
      if (!canvas) {
        throw new Error('Canvas is required but not provided in context')
      }
      
      // Use pre-filtered target images from enhanced context
      const images = context.targetImages
      
      console.log(`[${this.constructor.name}] Target images:`, images.length)
      console.log(`[${this.constructor.name}] Targeting mode:`, context.targetingMode)
      
      if (images.length === 0) {
        throw new Error(`No images found to ${this.getActionVerb()}. Please load an image or select images first.`)
      }
      
      // Execute tool-specific logic
      const result = await toolExecution(images)
      
      // Return with common properties
      return {
        success: true,
        targetingMode: context.targetingMode,
        ...result
      } as TOutput
      
    } catch (error) {
      // Return error with common format
      return {
        success: false,
        message: error instanceof Error ? error.message : `Failed to ${this.getActionVerb()}`,
        targetingMode: context.targetingMode
      } as TOutput
    }
  }
  
  /**
   * Helper to activate a tool and wait for it to be ready
   */
  protected async activateTool(): Promise<void> {
    const { useToolStore } = await import('@/store/toolStore')
    useToolStore.getState().setActiveTool(this.tool.id)
    
    // Small delay to ensure tool is activated and subscribed
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  
  /**
   * Helper to update a tool option
   */
  protected async updateToolOption(optionName: string, value: unknown): Promise<void> {
    const { useToolOptionsStore } = await import('@/store/toolOptionsStore')
    useToolOptionsStore.getState().updateOption(this.tool.id, optionName, value)
  }
  
  /**
   * Get the action verb for error messages (e.g., "adjust brightness", "apply sepia")
   * Override this to provide tool-specific action descriptions
   */
  protected abstract getActionVerb(): string
  
  /**
   * Common canExecute implementation - checks for images on canvas
   */
  canExecute?(canvas: Canvas): boolean {
    const hasImages = canvas.getObjects().some(obj => obj.type === 'image')
    if (!hasImages) {
      console.warn(`${this.aiName}: No images on canvas`)
    }
    return hasImages
  }
}

// Type for Fabric.js image objects
type FabricImage = FabricObject & { type: 'image' }

// Extended type for FabricImage with filters
type FabricImageWithFilters = FabricImage & {
  filters?: unknown[]
  applyFilters(): void
}

// Define filter type
interface ImageFilter {
  type?: string
  [key: string]: unknown
}

/**
 * Extended base class for filter-based canvas tool adapters
 * Provides common patterns for tools that apply Fabric.js filters
 */
export abstract class FilterToolAdapter<
  TInput = unknown,
  TOutput = unknown
> extends CanvasToolAdapter<TInput, TOutput> {
  
  /**
   * Get the filter type name (e.g., 'Brightness', 'Contrast')
   */
  protected abstract getFilterType(): string
  
  /**
   * Create a new filter instance with the given parameters
   */
  protected abstract createFilter(params: TInput): unknown
  
  /**
   * Check if a filter should be applied (return false to remove existing filters)
   */
  protected abstract shouldApplyFilter(params: TInput): boolean
  
  /**
   * Apply filters to images using common pattern
   */
  protected async applyFilterToImages(
    images: FabricImage[],
    params: TInput,
    canvas: Canvas
  ): Promise<void> {
    const filterType = this.getFilterType()
    
    images.forEach((img, index) => {
      console.log(`[${this.constructor.name}] Processing image ${index + 1}/${images.length}`)
      
      const imageWithFilters = img as FabricImageWithFilters
      
      // Initialize filters array if needed
      if (!imageWithFilters.filters) {
        imageWithFilters.filters = []
      } else {
        // Remove existing filters of this type
        imageWithFilters.filters = imageWithFilters.filters.filter(
          (f: unknown) => (f as unknown as ImageFilter).type !== filterType
        )
      }
      
      // Add new filter if needed
      if (this.shouldApplyFilter(params)) {
        const filter = this.createFilter(params)
        imageWithFilters.filters.push(filter)
      }
      
      // Apply filters
      imageWithFilters.applyFilters()
    })
    
    // Render the canvas to show changes
    canvas.renderAll()
  }
} 