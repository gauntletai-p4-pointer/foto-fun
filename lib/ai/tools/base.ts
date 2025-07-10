import { z } from 'zod'
import type { tool as createTool } from 'ai'

// Type for the tool function from AI SDK v5
export type AISDKTool<TInput = unknown, TOutput = unknown> = ReturnType<typeof createTool<TInput, TOutput>>

// Base schemas that all tools extend
export const BaseToolInputSchema = z.object({
  // Common fields all tools should have
  _metadata: z.object({
    timestamp: z.number().optional(),
    source: z.enum(['user', 'ai', 'system']).optional(),
  }).optional()
})

export const BaseToolOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  _metadata: z.object({
    executionTime: z.number().optional(),
    toolVersion: z.string().optional(),
  }).optional()
})

// Generic tool interface with strong typing
export interface FotoFunTool<
  TName extends string = string,
  TInput extends z.ZodType = z.ZodType,
  TOutput extends z.ZodType = z.ZodType
> {
  // Tool definition
  name: TName
  category: ToolCategory
  description: string
  
  // Schemas for validation
  inputSchema: TInput
  outputSchema: TOutput
  
  // Execution context
  executionSide: 'client' | 'server' | 'both'
  requiresCanvas: boolean
  requiresSelection: boolean
  
  // Confidence scoring for approval system
  confidenceThreshold: number
  
  // Whether the tool is enabled (can be dynamic based on context)
  isEnabled: boolean | ((context: unknown, agent: unknown) => boolean | Promise<boolean>)
  
  // The actual tool implementation for AI SDK v5
  tool: AISDKTool<z.infer<TInput>, z.infer<TOutput>>
  
  // Client-side executor (if applicable)
  clientExecutor?: (
    input: z.infer<TInput>,
    context: ToolExecutionContext
  ) => Promise<z.infer<TOutput>>
  
  // Preview generator for approval system
  previewGenerator?: (
    input: z.infer<TInput>,
    context: ToolExecutionContext
  ) => Promise<ToolPreview>
  
  // Validation functions
  validateInput: (input: unknown) => z.infer<TInput>
  validateOutput: (output: unknown) => z.infer<TOutput>
}

export type ToolCategory = 
  | 'canvas'
  | 'selection'
  | 'transform'
  | 'filter'
  | 'drawing'
  | 'file'
  | 'edit'
  | 'analysis'

export interface ToolExecutionContext {
  canvas?: fabric.Canvas
  canvasStore?: unknown // Will be typed with actual store
  documentStore?: unknown
  toolStore?: unknown
  selection?: fabric.Object[]
}

export interface ToolPreview {
  before: string // base64 image
  after: string // base64 image
  diff?: string // optional diff visualization
  confidence: number
  alternativeParams?: Array<{
    params: unknown
    preview: string
    confidence: number
  }>
}

// Error types for better error handling
export class ToolExecutionError extends Error {
  constructor(
    message: string,
    public readonly toolName: string,
    public readonly phase: 'validation' | 'execution' | 'output',
    public readonly originalError?: Error
  ) {
    super(message)
    this.name = 'ToolExecutionError'
  }
}

export class ToolValidationError extends ToolExecutionError {
  constructor(
    message: string,
    toolName: string,
    public readonly validationErrors: z.ZodError
  ) {
    super(message, toolName, 'validation')
    this.name = 'ToolValidationError'
  }
} 

/**
 * Base interface for AI-Native Tools
 * These tools call external AI services (Replicate, OpenAI, etc.)
 * and need Tool Adapters to integrate with the canvas
 */
export interface BaseAITool<TInput = unknown, TOutput = unknown> {
  /**
   * Tool name for identification
   */
  name: string
  
  /**
   * Human-readable description of what the tool does
   */
  description: string
  
  // UI Support (optional) - for tools that can be activated from tool palette
  supportsUIActivation?: boolean
  uiActivationType?: 'dialog' | 'panel' | 'immediate'
  getUIComponent?: () => React.ComponentType<AIToolUIProps>
  
  /**
   * Execute the AI service call
   * This method calls the external API and returns the result
   * Canvas integration happens in the adapter layer
   */
  execute(params: TInput): Promise<TOutput>
  
  /**
   * Optional: Check if the tool is available (API keys configured, etc.)
   */
  isAvailable?(): Promise<boolean>
  
  /**
   * Optional: Get estimated cost for the operation
   */
  estimateCost?(params: TInput): Promise<{ credits?: number; dollars?: number }>
}

// UI Props interface for AI tools
export interface AIToolUIProps {
  tool: BaseAITool
  onComplete: (result: unknown) => void
  onCancel: () => void
}

/**
 * Common input/output types for AI-Native tools
 */

export interface ImageInput {
  image: string  // base64 or URL
  format?: 'base64' | 'url'
}

export interface ImageOutput {
  image: string  // base64 or URL
  format: 'base64' | 'url'
  metadata?: {
    width: number
    height: number
    model?: string
    processingTime?: number
  }
}

export interface InpaintingInput extends ImageInput {
  mask: string     // base64 mask image
  prompt: string   // what to generate
  negativePrompt?: string
  strength?: number
}

export interface GenerationInput {
  prompt: string
  negativePrompt?: string
  width?: number
  height?: number
  model?: string
  steps?: number
  seed?: number
}

export interface BackgroundRemovalInput extends ImageInput {
  model?: 'general' | 'portrait' | 'product'
  returnMask?: boolean
}

/**
 * Error types specific to AI services
 */
export class AIServiceError extends Error {
  constructor(
    message: string,
    public service: string,
    public code?: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'AIServiceError'
  }
}

export class AIQuotaExceededError extends AIServiceError {
  constructor(service: string, details?: unknown) {
    super('AI service quota exceeded', service, 'QUOTA_EXCEEDED', details)
    this.name = 'AIQuotaExceededError'
  }
}

export class AIServiceUnavailableError extends AIServiceError {
  constructor(service: string, details?: unknown) {
    super('AI service temporarily unavailable', service, 'SERVICE_UNAVAILABLE', details)
    this.name = 'AIServiceUnavailableError'
  }
} 