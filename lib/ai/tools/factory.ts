import { z } from 'zod'
import { tool as createAITool } from 'ai'
import type { FotoFunTool, ToolCategory, ToolExecutionContext } from './base'

interface ToolFactoryConfig<
  TName extends string,
  TInput extends z.ZodType,
  TOutput extends z.ZodType
> {
  name: TName
  category: ToolCategory
  description: string
  inputSchema: TInput
  outputSchema: TOutput
  executionSide: 'client' | 'server' | 'both'
  requiresCanvas?: boolean
  requiresSelection?: boolean
  confidenceThreshold?: number
  serverExecutor?: (input: z.infer<TInput>) => Promise<z.infer<TOutput>>
  clientExecutor?: (
    input: z.infer<TInput>,
    context: ToolExecutionContext
  ) => Promise<z.infer<TOutput>>
  previewGenerator?: (
    input: z.infer<TInput>,
    context: ToolExecutionContext
  ) => Promise<{
    before: string
    after: string
    diff?: string
    confidence: number
          alternativeParams?: Array<{
        params: unknown
        preview: string
        confidence: number
      }>
  }>
}

export class ToolFactory {
  static createTool<
    TName extends string,
    TInput extends z.ZodType,
    TOutput extends z.ZodType
  >(config: ToolFactoryConfig<TName, TInput, TOutput>): FotoFunTool<TName, TInput, TOutput> {
    // For now, we'll use the schemas directly without merging
    // TODO: Implement proper schema merging that preserves types
    const fullInputSchema = config.inputSchema
    const fullOutputSchema = config.outputSchema
    
    // Create the AI SDK v5 tool using the new API
    let aiTool: unknown
    
    if (config.serverExecutor) {
      try {
        // AI SDK v5 uses inputSchema instead of parameters
        // Cast to unknown first to work around beta type issues
        aiTool = createAITool({
          description: config.description,
          inputSchema: fullInputSchema, // Changed from 'parameters' to 'inputSchema'
          execute: config.serverExecutor
        } as unknown as Parameters<typeof createAITool>[0])
      } catch (e) {
        console.warn('Failed to create AI SDK tool:', e)
        // Fallback structure
        aiTool = {
          description: config.description,
          inputSchema: fullInputSchema,
          execute: config.serverExecutor
        } as unknown
      }
    } else {
      // For client-only tools, create a placeholder
      aiTool = {} as unknown
    }
    
    return {
      name: config.name,
      category: config.category,
      description: config.description,
      inputSchema: fullInputSchema,
      outputSchema: fullOutputSchema,
      executionSide: config.executionSide,
      requiresCanvas: config.requiresCanvas ?? false,
      requiresSelection: config.requiresSelection ?? false,
      confidenceThreshold: config.confidenceThreshold ?? 0.7,
      isEnabled: true, // Default to enabled
      tool: aiTool as FotoFunTool<TName, TInput, TOutput>['tool'],
      clientExecutor: config.clientExecutor,
      previewGenerator: config.previewGenerator,
      
      validateInput: (input: unknown) => fullInputSchema.parse(input),
      validateOutput: (output: unknown) => fullOutputSchema.parse(output)
    }
  }
  
  /**
   * Helper to create a client-only tool
   */
  static createClientTool<
    TName extends string,
    TInput extends z.ZodType,
    TOutput extends z.ZodType
  >(config: Omit<ToolFactoryConfig<TName, TInput, TOutput>, 'executionSide' | 'serverExecutor'>) {
    return this.createTool({
      ...config,
      executionSide: 'client',
      serverExecutor: undefined
    })
  }
  
  /**
   * Helper to create a server-only tool
   */
  static createServerTool<
    TName extends string,
    TInput extends z.ZodType,
    TOutput extends z.ZodType
  >(config: Omit<ToolFactoryConfig<TName, TInput, TOutput>, 'executionSide' | 'clientExecutor'>) {
    return this.createTool({
      ...config,
      executionSide: 'server',
      clientExecutor: undefined
    })
  }
} 