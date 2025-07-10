import { z } from 'zod'
import { tool } from 'ai'
import type { Tool } from '@/lib/editor/canvas/types'
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager'
import type { CanvasObject } from '@/lib/editor/canvas/types'
import type { CanvasContext } from '../tools/canvas-bridge'
import type { SelectionSnapshot } from '../execution/SelectionSnapshot'
import type { ExecutionContext } from '@/lib/events/execution/ExecutionContext'
import { KonvaObjectsBatchModifiedEvent } from '@/lib/events/canvas/CanvasEvents'
import { ServiceContainer } from '@/lib/core/ServiceContainer'
import type { EventToolStore } from '@/lib/store/tools/EventToolStore'

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
  abstract execute(params: TInput, context: CanvasContext, executionContext?: ExecutionContext): Promise<TOutput>
  
  /**
   * Optional: Check if the tool can be executed in the current state
   */
  canExecute?(canvas: CanvasManager): boolean
  
  /**
   * Optional: Generate a preview of the tool's effect
   */
  generatePreview?(params: TInput, canvas: CanvasManager): Promise<{ before: string; after: string }>
  
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
  
  /**
   * Apply tool operation without changing the active tool
   * This is used during AI execution to prevent UI changes
   * Now emits events when an ExecutionContext is provided
   */
  protected async applyToolOperation(
    toolId: string,
    optionId: string,
    value: unknown,
    canvas: CanvasManager,
    selectionSnapshot?: SelectionSnapshot,
    executionContext?: ExecutionContext
  ): Promise<void> {
    // Get the tool store from DI container
    const container = ServiceContainer.getInstance()
    const toolStore = container.get<EventToolStore>('ToolStore')
    
    const tool = toolStore.getTool(toolId)
    
    if (!tool) {
      throw new Error(`Tool ${toolId} not found`)
    }
    
    // Check if tool is already activated
    const currentTool = toolStore.getActiveTool()
    const needsActivation = currentTool?.id !== toolId
    
    console.log(`[BaseToolAdapter] applyToolOperation - Tool: ${toolId}, Option: ${optionId}, Value: ${value}`)
    console.log(`[BaseToolAdapter] Current tool: ${currentTool?.id}, Needs activation: ${needsActivation}`)
    console.log(`[BaseToolAdapter] Has execution context: ${!!executionContext}`)
    
    // If tool needs activation, activate it properly
    if (needsActivation) {
      console.log(`[BaseToolAdapter] Activating tool ${toolId} for operation`)
      await toolStore.activateTool(toolId)
      
      // Wait for activation to complete
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    try {
      // Capture state before modification if we have an execution context
      let previousStates: Map<string, Record<string, unknown>> | null = null
      
      if (executionContext && selectionSnapshot) {
        previousStates = new Map()
        const targetObjects = this.getTargetObjects(canvas, selectionSnapshot)
        
        // Capture current state of all target objects
        targetObjects.forEach(obj => {
          previousStates!.set(obj.id, this.captureObjectState(obj))
        })
      }
      
      // Update the tool option - this should trigger the tool's logic
      console.log(`[BaseToolAdapter] Updating option ${optionId} to ${value}`)
      toolStore.updateOption(toolId, optionId, value)
      
      // Wait for the operation to complete
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Emit events if we have an execution context
      if (executionContext && previousStates && selectionSnapshot) {
        const targetObjects = this.getTargetObjects(canvas, selectionSnapshot)
        const modifications: Array<{
          objectId: string
          previousState: Record<string, unknown>
          newState: Record<string, unknown>
        }> = []
        
        // Capture new state and build modifications
        targetObjects.forEach(obj => {
          const prevState = previousStates!.get(obj.id)
          if (prevState) {
            const newState = this.captureObjectState(obj)
            
            // Check if object actually changed
            if (JSON.stringify(prevState) !== JSON.stringify(newState)) {
              modifications.push({
                objectId: obj.id,
                previousState: prevState,
                newState: newState
              })
            }
          }
        })
        
        // Emit batch modification event if objects changed
        if (modifications.length > 0) {
          const event = new KonvaObjectsBatchModifiedEvent(
            canvas.id,
            modifications,
            executionContext.getMetadata()
          )
          
          await executionContext.emit(event)
          console.log(`[BaseToolAdapter] Emitted batch modification event for ${modifications.length} objects`)
        }
      }
      
      console.log(`[BaseToolAdapter] Operation completed`)
    } finally {
      // Restore the original tool if we changed it
      if (needsActivation && currentTool) {
        console.log(`[BaseToolAdapter] Restoring original tool ${currentTool.id}`)
        await toolStore.activateTool(currentTool.id)
      }
    }
  }
  
  /**
   * Get target objects from canvas based on selection snapshot
   */
  protected getTargetObjects(canvas: CanvasManager, selectionSnapshot?: SelectionSnapshot): CanvasObject[] {
    if (!selectionSnapshot) {
      return []
    }
    
    // TODO: Implement selection snapshot logic for new canvas
    // For now, return selected objects
    const selection = canvas.state.selection
    if (selection?.type === 'objects') {
      return selection.objectIds
        .map(id => canvas.findObject(id))
        .filter((obj): obj is CanvasObject => obj !== null)
    }
    
    return []
  }
  
  /**
   * Capture the current state of an object
   */
  protected captureObjectState(obj: CanvasObject): Record<string, unknown> {
    return {
      id: obj.id,
      type: obj.type,
      name: obj.name,
      transform: { ...obj.transform },
      style: obj.style ? { ...obj.style } : undefined,
      opacity: obj.opacity,
      visible: obj.visible,
      locked: obj.locked,
      data: obj.data ? { ...obj.data } : undefined
    }
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
   * Now also accepts ExecutionContext for event emission
   */
  protected async executeWithCommonPatterns(
    params: TInput,
    context: CanvasContext,
    toolExecution: (images: FabricImage[], executionContext?: ExecutionContext) => Promise<Partial<TOutput>>,
    executionContext?: ExecutionContext
  ): Promise<TOutput> {
    try {
      console.log(`[${this.constructor.name}] Execute called with params:`, params)
      console.log(`[${this.constructor.name}] Targeting mode:`, context.targetingMode)
      console.log(`[${this.constructor.name}] Has execution context:`, !!executionContext)
      
      const canvas = context.canvas
      
      if (!canvas) {
        throw new Error('Canvas is required but not provided in context')
      }
      
      // Use pre-filtered target images from enhanced context
      const images = context.targetImages
      
      console.log(`[${this.constructor.name}] Target images:`, images.length)
      console.log(`[${this.constructor.name}] Targeting mode:`, context.targetingMode)
      
      // STRICT SELECTION ENFORCEMENT
      if (images.length === 0) {
        // Check why we have no target images
        const allImages = context.canvas.getObjects().filter(obj => obj.type === 'image')
        
        if (allImages.length === 0) {
          throw new Error(`No images found on canvas. Please load an image first.`)
        } else if (allImages.length > 1) {
          // Multiple images but no selection
          throw new Error(`Multiple images found but none selected. Please select the images you want to ${this.getActionVerb()}.`)
        } else {
          // This shouldn't happen with our logic, but just in case
          throw new Error(`No images available to ${this.getActionVerb()}.`)
        }
      }
      
      // Log targeting info for debugging
      if (context.targetingMode === 'auto-single') {
        console.log(`[${this.constructor.name}] Auto-targeting single image on canvas`)
      } else if (context.targetingMode === 'selection') {
        console.log(`[${this.constructor.name}] Operating on user's selection of ${images.length} images`)
      }
      
      // Execute tool-specific logic with execution context
      const result = await toolExecution(images, executionContext)
      
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
   * Enhanced error handling wrapper with user-friendly messages
   * Maps technical errors to helpful user messages
   */
  protected async executeWithErrorHandling<T>(
    operation: () => Promise<T>,
    userContext: string
  ): Promise<T> {
    try {
      return await operation()
    } catch (error) {
      // Map technical errors to user-friendly messages
      const userMessage = this.mapErrorToUserMessage(error, userContext)
      
      // Log technical details for debugging
      console.error(`[${this.aiName}] Error in ${userContext}:`, error)
      
      // Check if we should return an error object or throw
      if (this.shouldReturnErrorObject()) {
        return {
          success: false,
          message: userMessage,
          error: error instanceof Error ? error.message : 'Unknown error',
          recovery: this.suggestRecovery(error)
        } as T
      }
      
      // Otherwise, throw a user-friendly error
      throw new Error(userMessage)
    }
  }
  
  /**
   * Map technical errors to user-friendly messages
   */
  protected mapErrorToUserMessage(error: unknown, context: string): string {
    if (!(error instanceof Error)) {
      return `The ${context} operation failed. Please try again.`
    }
    
    const message = error.message.toLowerCase()
    
    // Canvas not ready errors
    if (message.includes('canvas') && (message.includes('null') || message.includes('undefined'))) {
      return 'Please wait for the canvas to load before using this tool.'
    }
    
    // No image errors
    if (message.includes('no image') || message.includes('no objects')) {
      return 'Please load an image before using this tool.'
    }
    
    // Network errors
    if (message.includes('network') || message.includes('fetch')) {
      return 'Network error. Please check your connection and try again.'
    }
    
    // Timeout errors
    if (message.includes('timeout')) {
      return 'The operation took too long. Please try again.'
    }
    
    // Rate limit errors
    if (message.includes('rate limit') || message.includes('quota')) {
      return 'You\'ve made too many requests. Please wait a moment and try again.'
    }
    
    // Permission errors
    if (message.includes('permission') || message.includes('denied')) {
      return 'You don\'t have permission to perform this action.'
    }
    
    // Invalid parameter errors
    if (message.includes('invalid') || message.includes('parameter')) {
      return `Invalid settings for ${context}. Please check your inputs.`
    }
    
    // Default fallback
    return `The ${context} operation failed. Please try again.`
  }
  
  /**
   * Suggest recovery actions for errors
   */
  protected suggestRecovery(error: unknown): string | undefined {
    if (!(error instanceof Error)) return undefined
    
    const message = error.message.toLowerCase()
    
    if (message.includes('canvas') && (message.includes('null') || message.includes('undefined'))) {
      return 'Wait for canvas to load'
    }
    
    if (message.includes('no image')) {
      return 'Load an image first'
    }
    
    if (message.includes('network')) {
      return 'Check your internet connection'
    }
    
    if (message.includes('timeout')) {
      return 'Try again with a smaller image'
    }
    
    return 'Try again'
  }
  
  /**
   * Determine if we should return an error object or throw
   * Override in subclasses if needed
   */
  protected shouldReturnErrorObject(): boolean {
    // By default, return error objects for better handling
    return true
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
   * Get action verb for error messages
   * Override in subclasses for better error messages
   */
  protected abstract getActionVerb(): string
  
  /**
   * Common canExecute implementation - checks for images on canvas
   */
  canExecute?(canvas: CanvasManager): boolean {
    const hasImages = canvas.state.layers.some(layer => 
      layer.objects.some(obj => obj.type === 'image')
    )
    if (!hasImages) {
      console.warn(`${this.aiName}: No images on canvas`)
    }
    return hasImages
  }
}

// Type for Fabric.js image objects
type FabricImage = CanvasObject & { type: 'image' }

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
   * Now emits events when ExecutionContext is provided
   */
  protected async applyFilterToImages(
    images: FabricImage[],
    params: TInput,
    canvas: CanvasManager,
    executionContext?: ExecutionContext
  ): Promise<void> {
    const filterType = this.getFilterType()
    
    // Create a selection snapshot from the target images
    const { SelectionSnapshotFactory } = await import('../execution/SelectionSnapshot')
    const selectionSnapshot = SelectionSnapshotFactory.fromObjects(images)
    
    // Get the tool
    const { useToolStore } = await import('@/store/toolStore')
    const tool = useToolStore.getState().getTool(this.tool.id)
    
    // Set selection snapshot on the tool if it supports it
    if (tool && 'setSelectionSnapshot' in tool && typeof tool.setSelectionSnapshot === 'function') {
      console.log(`[FilterToolAdapter] Setting selection snapshot on tool ${this.tool.id}`)
      tool.setSelectionSnapshot(selectionSnapshot)
    }
    
    // Capture state before modification if we have an execution context
    let previousStates: Map<FabricImage, Record<string, unknown>> | null = null
    
    if (executionContext) {
      previousStates = new Map()
      images.forEach(img => {
        previousStates!.set(img, img.toObject(['filters']))
      })
    }
    
    try {
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
      
      // Emit events if we have an execution context
      if (executionContext && previousStates) {
        const modifications: Array<{
          object: FabricObject
          previousState: Record<string, unknown>
          newState: Record<string, unknown>
        }> = []
        
        // Build modifications
        images.forEach(img => {
          const prevState = previousStates!.get(img)
          if (prevState) {
            const newState = img.toObject(['filters'])
            
            // Check if filters actually changed
            if (JSON.stringify(prevState) !== JSON.stringify(newState)) {
              modifications.push({
                object: img,
                previousState: prevState,
                newState: newState
              })
            }
          }
        })
        
        // Emit batch modification event if objects changed
        if (modifications.length > 0) {
          const event = new KonvaObjectsBatchModifiedEvent(
            canvas.id,
            modifications,
            executionContext.getMetadata()
          )
          
          await executionContext.emit(event)
          console.log(`[FilterToolAdapter] Emitted batch modification event for ${modifications.length} images`)
        }
      }
    } finally {
      // Clear selection snapshot
      if (tool && 'setSelectionSnapshot' in tool && typeof tool.setSelectionSnapshot === 'function') {
        tool.setSelectionSnapshot(null)
      }
    }
  }
} 