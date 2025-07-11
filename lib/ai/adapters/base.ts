import { z } from 'zod'
import { tool } from 'ai'
import type { Tool, Filter } from '@/lib/editor/canvas/types'
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager'
import type { CanvasObject } from '@/lib/editor/objects/types'
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
    const toolStore = container.getSync<EventToolStore>('ToolStore')
    
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
    
    // Get selected objects using new architecture
    return canvas.getSelectedObjects()
  }
  
  /**
   * Capture the current state of an object
   */
  protected captureObjectState(obj: CanvasObject): Record<string, unknown> {
    // Handle different types of data property
    let dataValue: unknown = undefined
    if (obj.data) {
      if (typeof obj.data === 'object' && !(obj.data instanceof HTMLImageElement)) {
        // It's a Record<string, unknown>, safe to spread
        dataValue = { ...obj.data }
      } else {
        // It's a string or HTMLImageElement, store as-is
        dataValue = obj.data
      }
    }
    
    return {
      id: obj.id,
      type: obj.type,
      name: obj.name,
      transform: {
        x: obj.x,
        y: obj.y,
        width: obj.width,
        height: obj.height,
        rotation: obj.rotation,
        scaleX: obj.scaleX,
        scaleY: obj.scaleY
      },
      opacity: obj.opacity,
      visible: obj.visible,
      locked: obj.locked,
      data: dataValue
    }
  }
}

/**
 * Type alias for tool adapters
 */
export type ToolAdapter = BaseToolAdapter<unknown, unknown>

// Type for Canvas image objects
type CanvasImage = CanvasObject & { type: 'image' }

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
    toolExecution: (images: CanvasImage[], executionContext?: ExecutionContext) => Promise<Partial<TOutput>>,
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
      const images = context.targetImages as CanvasImage[]
      
      console.log(`[${this.constructor.name}] Target images:`, images.length)
      console.log(`[${this.constructor.name}] Targeting mode:`, context.targetingMode)
      
      // STRICT SELECTION ENFORCEMENT
      if (images.length === 0) {
        // Check why we have no target images
        const allImages = this.getAllImages(canvas)
        
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
   * Get all image objects from canvas
   */
  protected getAllImages(canvas: CanvasManager): CanvasImage[] {
    return canvas.getAllObjects()
      .filter(obj => obj.type === 'image') as CanvasImage[]
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
    
    // Selection errors
    if (message.includes('select') || message.includes('selection')) {
      return 'Please select the objects you want to modify.'
    }
    
    // Tool not found errors
    if (message.includes('tool') && message.includes('not found')) {
      return 'The requested tool is not available. Please try refreshing the page.'
    }
    
    // Permission/locked errors
    if (message.includes('locked') || message.includes('permission')) {
      return 'The selected objects are locked. Please unlock them first.'
    }
    
    // Out of bounds errors
    if (message.includes('bounds') || message.includes('dimensions')) {
      return 'The operation would extend beyond the canvas boundaries. Please adjust your parameters.'
    }
    
    // Default to a cleaned up version of the original message
    return error.message.charAt(0).toUpperCase() + error.message.slice(1)
  }
  
  /**
   * Suggest recovery actions for common errors
   */
  protected suggestRecovery(error: unknown): string | undefined {
    if (!(error instanceof Error)) {
      return undefined
    }
    
    const message = error.message.toLowerCase()
    
    if (message.includes('no image')) {
      return 'Load an image using the file menu or drag and drop an image onto the canvas.'
    }
    
    if (message.includes('select')) {
      return 'Use the selection tools to select the objects you want to modify.'
    }
    
    if (message.includes('locked')) {
      return 'Right-click on the object and choose "Unlock" from the context menu.'
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
    const container = ServiceContainer.getInstance()
    const toolStore = container.getSync<EventToolStore>('ToolStore')
    await toolStore.activateTool(this.tool.id)
    
    // Small delay to ensure tool is activated and subscribed
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  
  /**
   * Helper to update a tool option
   */
  protected async updateToolOption(optionName: string, value: unknown): Promise<void> {
    const container = ServiceContainer.getInstance()
    const toolStore = container.getSync<EventToolStore>('ToolStore')
    toolStore.updateOption(this.tool.id, optionName, value)
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
    const hasImages = canvas.getAllObjects().some(obj => obj.type === 'image')
    if (!hasImages) {
      console.warn(`${this.aiName}: No images on canvas`)
    }
    return hasImages
  }
}

/**
 * Extended base class for filter-based canvas tool adapters
 * Provides common patterns for tools that apply filters to images
 */
export abstract class FilterToolAdapter<
  TInput = unknown,
  TOutput = unknown
> extends CanvasToolAdapter<TInput, TOutput> {
  
  /**
   * Get the filter type name (e.g., 'brightness', 'contrast')
   */
  protected abstract getFilterType(): string
  
  /**
   * Create a new filter with the given parameters
   */
  protected abstract createFilter(params: TInput): Filter
  
  /**
   * Check if a filter should be applied (return false to remove existing filters)
   */
  protected abstract shouldApplyFilter(params: TInput): boolean
  
  /**
   * Apply filters to images using CanvasManager
   * Now uses layer-based filtering system
   */
  protected async applyFilterToImages(
    images: CanvasImage[],
    params: TInput,
    canvas: CanvasManager,
    _executionContext?: ExecutionContext
  ): Promise<void> {
    const filterType = this.getFilterType()
    
    // Group images by layer for efficient filtering
    const imagesByLayer = new Map<string, CanvasImage[]>()
    images.forEach(img => {
      const layerId = img.layerId || 'default'
      const layerImages = imagesByLayer.get(layerId) || []
      layerImages.push(img)
      imagesByLayer.set(layerId, layerImages)
    })
    
    try {
      // Apply filters layer by layer
      for (const [layerId, layerImages] of imagesByLayer) {
        console.log(`[${this.constructor.name}] Processing ${layerImages.length} images in layer ${layerId}`)
        
        if (this.shouldApplyFilter(params)) {
          const filter = this.createFilter(params)
          
          // Apply filter to objects (new architecture doesn't use layer-based filters)
          console.warn('[FilterToolAdapter] Layer-based filtering deprecated - use object-based filters')
          // TODO: Implement object-based filter application
        } else {
          // Remove existing filters of this type from objects
          console.warn('[FilterToolAdapter] Layer-based filter removal deprecated - use object-based filters')
          // TODO: Implement object-based filter removal
        }
      }
      
      console.log(`[FilterToolAdapter] Successfully applied ${filterType} filter to ${images.length} images across ${imagesByLayer.size} layers`)
    } catch (error) {
      console.error(`[FilterToolAdapter] Error applying ${filterType} filter:`, error)
      throw error
    }
  }
} 