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