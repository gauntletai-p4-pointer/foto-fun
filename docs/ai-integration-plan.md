# FotoFun AI Integration Plan - AI SDK v5

## Overview

This document outlines the comprehensive plan for integrating AI SDK v5 into FotoFun, enabling natural language photo editing through an AI chat interface. The implementation emphasizes type safety, consistent patterns, and a scalable architecture using orchestrator/worker patterns.

## Key Principles

1. **Type Safety First**: All tools use Zod schemas for input/output validation
2. **Consistent Interfaces**: Factory pattern for tool creation ensures uniformity
3. **Separation of Concerns**: Clear distinction between server and client tools
4. **Composability**: Tools can be combined for complex workflows
5. **Error Resilience**: Comprehensive error handling at every level

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                      FotoFun AI Architecture                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Client Layer                    Server Layer                   │
│  ┌─────────────┐               ┌──────────────────┐           │
│  │   AI Chat   │               │  AI Orchestrator │           │
│  │    Panel    │<─────────────>│   (AI SDK v5)    │           │
│  │  (useChat)  │   WebSocket   │                  │           │
│  └──────┬──────┘               └────────┬─────────┘           │
│         │                                │                     │
│         v                                v                     │
│  ┌─────────────┐               ┌──────────────────┐           │
│  │Tool Executor│               │  Tool Registry   │           │
│  │  (Client)   │               │  (Type-safe)     │           │
│  └──────┬──────┘               └────────┬─────────┘           │
│         │                                │                     │
│         v                                v                     │
│  ┌─────────────┐               ┌──────────────────┐           │
│  │   Canvas    │               │  Tool Factories  │           │
│  │    State    │               │  (Consistent)    │           │
│  └─────────────┘               └──────────────────┘           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Tool Interface Design

### Base Tool Interface

```typescript
// lib/ai/tools/base.ts
import { z } from 'zod'
import type { LanguageModelV2FunctionTool } from '@ai-sdk/provider'

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
  
  // The actual tool implementation
  tool: LanguageModelV2FunctionTool<TName, z.infer<TInput>, z.infer<TOutput>>
  
  // Client-side executor (if applicable)
  clientExecutor?: (
    input: z.infer<TInput>,
    context: ToolExecutionContext
  ) => Promise<z.infer<TOutput>>
  
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
  canvasStore?: any // Zustand store types
  documentStore?: any
  toolStore?: any
  selection?: fabric.Object[]
}
```

### Tool Factory Pattern

```typescript
// lib/ai/tools/factory.ts
import { z } from 'zod'
import type { FotoFunTool } from './base'

export class ToolFactory {
  static createTool<
    TName extends string,
    TInput extends z.ZodType,
    TOutput extends z.ZodType
  >(config: {
    name: TName
    category: ToolCategory
    description: string
    inputSchema: TInput
    outputSchema: TOutput
    executionSide: 'client' | 'server' | 'both'
    requiresCanvas?: boolean
    requiresSelection?: boolean
    serverExecutor?: (input: z.infer<TInput>) => Promise<z.infer<TOutput>>
    clientExecutor?: (
      input: z.infer<TInput>,
      context: ToolExecutionContext
    ) => Promise<z.infer<TOutput>>
  }): FotoFunTool<TName, TInput, TOutput> {
    // Merge with base schemas
    const fullInputSchema = BaseToolInputSchema.merge(config.inputSchema)
    const fullOutputSchema = BaseToolOutputSchema.merge(config.outputSchema)
    
    return {
      name: config.name,
      category: config.category,
      description: config.description,
      inputSchema: fullInputSchema as TInput,
      outputSchema: fullOutputSchema as TOutput,
      executionSide: config.executionSide,
      requiresCanvas: config.requiresCanvas ?? false,
      requiresSelection: config.requiresSelection ?? false,
      
      tool: {
        type: 'function',
        function: {
          name: config.name,
          description: config.description,
          parameters: fullInputSchema,
          execute: config.serverExecutor
        }
      },
      
      clientExecutor: config.clientExecutor,
      
      validateInput: (input: unknown) => fullInputSchema.parse(input),
      validateOutput: (output: unknown) => fullOutputSchema.parse(output)
    }
  }
}
```

## Tool Implementation Examples

### Canvas Tools

```typescript
// lib/ai/tools/canvas/zoom.ts
import { z } from 'zod'
import { ToolFactory } from '../factory'

// Structured input schema
const ZoomInputSchema = z.object({
  level: z.number()
    .min(1)
    .max(3200)
    .optional()
    .describe('Zoom percentage (1-3200)'),
  mode: z.enum(['in', 'out', 'fit', 'actual'])
    .optional()
    .describe('Zoom mode instead of specific level'),
  animate: z.boolean()
    .default(true)
    .describe('Whether to animate the zoom transition')
})

// Structured output schema
const ZoomOutputSchema = z.object({
  previousZoom: z.number(),
  newZoom: z.number(),
  mode: z.string().optional()
})

export const zoomTool = ToolFactory.createTool({
  name: 'zoom',
  category: 'canvas',
  description: 'Adjust canvas zoom level with various modes',
  inputSchema: ZoomInputSchema,
  outputSchema: ZoomOutputSchema,
  executionSide: 'client',
  requiresCanvas: true,
  
  clientExecutor: async (input, context) => {
    const { canvas, canvasStore } = context
    if (!canvas || !canvasStore) {
      throw new Error('Canvas context required for zoom operation')
    }
    
    const previousZoom = canvasStore.zoom
    let newZoom = previousZoom
    
    if (input.level) {
      newZoom = input.level / 100
    } else if (input.mode) {
      switch (input.mode) {
        case 'in':
          newZoom = Math.min(previousZoom * 1.25, 32)
          break
        case 'out':
          newZoom = Math.max(previousZoom * 0.8, 0.01)
          break
        case 'fit':
          canvasStore.zoomToFit()
          newZoom = canvasStore.zoom
          break
        case 'actual':
          newZoom = 1
          break
      }
    }
    
    if (input.animate) {
      await canvasStore.animateZoom(newZoom)
    } else {
      canvasStore.setZoom(newZoom)
    }
    
    return {
      success: true,
      previousZoom: previousZoom * 100,
      newZoom: newZoom * 100,
      mode: input.mode,
      message: `Zoomed to ${Math.round(newZoom * 100)}%`
    }
  }
})
```

### Filter Tools

```typescript
// lib/ai/tools/filters/brightness-contrast.ts
import { z } from 'zod'
import { ToolFactory } from '../factory'
import { applyFilter } from '@/lib/filters'

const BrightnessContrastInputSchema = z.object({
  brightness: z.number()
    .min(-100)
    .max(100)
    .describe('Brightness adjustment (-100 to 100)'),
  contrast: z.number()
    .min(-100)
    .max(100)
    .describe('Contrast adjustment (-100 to 100)'),
  preview: z.boolean()
    .default(false)
    .describe('Whether to show preview only')
})

const BrightnessContrastOutputSchema = z.object({
  adjustments: z.object({
    brightness: z.number(),
    contrast: z.number()
  }),
  pixelsAffected: z.number().optional(),
  previewUrl: z.string().optional()
})

export const brightnessContrastTool = ToolFactory.createTool({
  name: 'adjustBrightnessContrast',
  category: 'filter',
  description: 'Adjust image brightness and contrast with live preview',
  inputSchema: BrightnessContrastInputSchema,
  outputSchema: BrightnessContrastOutputSchema,
  executionSide: 'both',
  requiresCanvas: true,
  
  serverExecutor: async (input) => {
    // Server-side preview generation
    const previewData = await generateFilterPreview({
      type: 'brightness-contrast',
      params: input
    })
    
    return {
      success: true,
      adjustments: {
        brightness: input.brightness,
        contrast: input.contrast
      },
      previewUrl: previewData.url,
      message: 'Preview generated'
    }
  },
  
  clientExecutor: async (input, context) => {
    const { canvas } = context
    if (!canvas) throw new Error('Canvas required')
    
    const activeObject = canvas.getActiveObject()
    const target = activeObject || canvas
    
    const result = await applyFilter(target, {
      type: 'brightness-contrast',
      brightness: input.brightness,
      contrast: input.contrast
    })
    
    if (!input.preview) {
      canvas.renderAll()
      // Add to history
      context.documentStore?.markAsModified()
    }
    
    return {
      success: true,
      adjustments: {
        brightness: input.brightness,
        contrast: input.contrast
      },
      pixelsAffected: result.pixelsProcessed,
      message: input.preview ? 'Preview applied' : 'Filter applied'
    }
  }
})
```

## Tool Registry

```typescript
// lib/ai/tools/registry.ts
import { z } from 'zod'
import type { FotoFunTool } from './base'

export class ToolRegistry {
  private tools = new Map<string, FotoFunTool>()
  private categories = new Map<ToolCategory, Set<string>>()
  
  register<T extends FotoFunTool>(tool: T): void {
    // Validate tool structure
    this.validateTool(tool)
    
    // Register in main registry
    this.tools.set(tool.name, tool)
    
    // Register by category
    if (!this.categories.has(tool.category)) {
      this.categories.set(tool.category, new Set())
    }
    this.categories.get(tool.category)!.add(tool.name)
  }
  
  private validateTool(tool: FotoFunTool): void {
    // Ensure tool has required fields
    if (!tool.name || !tool.category || !tool.description) {
      throw new Error('Tool missing required fields')
    }
    
    // Validate schemas are Zod types
    if (!tool.inputSchema || !tool.outputSchema) {
      throw new Error('Tool missing input/output schemas')
    }
    
    // Ensure appropriate executor exists
    if (tool.executionSide === 'server' && !tool.tool.function.execute) {
      throw new Error('Server tool missing execute function')
    }
    
    if (tool.executionSide === 'client' && !tool.clientExecutor) {
      throw new Error('Client tool missing clientExecutor')
    }
  }
  
  getServerTools() {
    return Array.from(this.tools.values())
      .filter(t => t.executionSide === 'server' || t.executionSide === 'both')
      .reduce((acc, t) => ({
        ...acc,
        [t.name]: t.tool
      }), {})
  }
  
  getClientTools() {
    return Array.from(this.tools.values())
      .filter(t => t.executionSide === 'client' || t.executionSide === 'both')
  }
  
  getToolsByCategory(category: ToolCategory) {
    const toolNames = this.categories.get(category) || new Set()
    return Array.from(toolNames).map(name => this.tools.get(name)!)
  }
  
  getTool(name: string) {
    return this.tools.get(name)
  }
}

// Singleton instance
export const toolRegistry = new ToolRegistry()
```

## Orchestration Patterns

### Orchestrator Agent

The orchestrator is responsible for understanding user intent, breaking down complex requests, and coordinating tool execution.

```typescript
// lib/ai/agents/orchestrator.ts
import { z } from 'zod'
import { openai } from '@ai-sdk/openai'
import { generateText, generateObject } from 'ai'
import { toolRegistry } from '../tools/registry'

// Structured task planning
const TaskPlanSchema = z.object({
  steps: z.array(z.object({
    id: z.string(),
    description: z.string(),
    toolName: z.string(),
    dependencies: z.array(z.string()),
    params: z.any(),
    optional: z.boolean().default(false)
  })),
  estimatedDuration: z.number().optional(),
  requiresUserInput: z.boolean().default(false)
})

export class FotoFunOrchestrator {
  private model = openai('gpt-4o')
  
  async planWorkflow(
    userRequest: string,
    context: CanvasContext
  ): Promise<z.infer<typeof TaskPlanSchema>> {
    const { object: plan } = await generateObject({
      model: this.model,
      schema: TaskPlanSchema,
      system: this.generateSystemPrompt(context),
      prompt: userRequest
    })
    
    // Validate all tools exist
    for (const step of plan.steps) {
      if (!toolRegistry.getTool(step.toolName)) {
        throw new Error(`Unknown tool in plan: ${step.toolName}`)
      }
    }
    
    return plan
  }
  
  private generateSystemPrompt(context: CanvasContext): string {
    const availableTools = Array.from(toolRegistry.getServerTools())
      .map(([name, tool]) => `- ${name}: ${tool.function.description}`)
      .join('\n')
    
    return `You are an expert photo editing assistant for FotoFun.

Current canvas state:
- Document: ${context.width}x${context.height}px
- Zoom: ${context.zoom}%
- Has selection: ${context.hasSelection}
- Active layers: ${context.layers.length}

Available tools:
${availableTools}

When planning workflows:
1. Break complex requests into atomic tool operations
2. Consider tool dependencies (e.g., selection before filter)
3. Optimize for performance (batch similar operations)
4. Provide clear step descriptions
5. Mark optional enhancement steps

Return a structured plan with specific tool calls.`
  }
  
  async executeWorkflow(
    plan: z.infer<typeof TaskPlanSchema>,
    onProgress?: (step: string, progress: number) => void
  ) {
    const results = new Map<string, any>()
    const completed = new Set<string>()
    
    // Execute steps respecting dependencies
    while (completed.size < plan.steps.length) {
      const readySteps = plan.steps.filter(step => 
        !completed.has(step.id) &&
        step.dependencies.every(dep => completed.has(dep))
      )
      
      if (readySteps.length === 0) {
        throw new Error('Circular dependency detected in workflow')
      }
      
      // Execute ready steps in parallel
      await Promise.all(readySteps.map(async (step) => {
        try {
          onProgress?.(step.description, (completed.size / plan.steps.length) * 100)
          
          const tool = toolRegistry.getTool(step.toolName)!
          const validatedInput = tool.validateInput(step.params)
          
          let result
          if (tool.executionSide === 'server' && tool.tool.function.execute) {
            result = await tool.tool.function.execute(validatedInput)
          } else {
            // Queue for client execution
            result = { pending: true, toolName: step.toolName, params: validatedInput }
          }
          
          results.set(step.id, result)
          completed.add(step.id)
        } catch (error) {
          if (!step.optional) {
            throw new Error(`Step ${step.id} failed: ${error.message}`)
          }
          // Log but continue for optional steps
          console.warn(`Optional step ${step.id} failed:`, error)
          completed.add(step.id)
        }
      }))
    }
    
    return results
  }
}
```

### Worker Pattern

Workers handle specialized tasks within the orchestration.

```typescript
// lib/ai/agents/workers/base.ts
export abstract class BaseWorker<TInput = any, TOutput = any> {
  abstract name: string
  abstract description: string
  
  protected inputSchema: z.ZodType<TInput>
  protected outputSchema: z.ZodType<TOutput>
  
  async execute(input: unknown): Promise<TOutput> {
    // Validate input
    const validatedInput = this.inputSchema.parse(input)
    
    // Execute work
    const result = await this.performWork(validatedInput)
    
    // Validate output
    return this.outputSchema.parse(result)
  }
  
  protected abstract performWork(input: TInput): Promise<TOutput>
}

// lib/ai/agents/workers/filter-chain-worker.ts
import { z } from 'zod'
import { BaseWorker } from './base'

const FilterChainInputSchema = z.object({
  filters: z.array(z.object({
    type: z.string(),
    params: z.any(),
    blendMode: z.string().optional(),
    opacity: z.number().min(0).max(100).optional()
  })),
  target: z.enum(['canvas', 'selection', 'layer']),
  preview: z.boolean().default(false)
})

const FilterChainOutputSchema = z.object({
  appliedFilters: z.array(z.string()),
  totalProcessingTime: z.number(),
  pixelsProcessed: z.number(),
  errors: z.array(z.object({
    filter: z.string(),
    error: z.string()
  })).optional()
})

export class FilterChainWorker extends BaseWorker<
  z.infer<typeof FilterChainInputSchema>,
  z.infer<typeof FilterChainOutputSchema>
> {
  name = 'FilterChainWorker'
  description = 'Applies multiple filters in sequence with optimizations'
  
  protected inputSchema = FilterChainInputSchema
  protected outputSchema = FilterChainOutputSchema
  
  protected async performWork(input: z.infer<typeof FilterChainInputSchema>) {
    const startTime = Date.now()
    const appliedFilters: string[] = []
    const errors: Array<{ filter: string; error: string }> = []
    let pixelsProcessed = 0
    
    // Get target canvas data
    const imageData = await this.getTargetImageData(input.target)
    
    // Apply filters in sequence
    let currentData = imageData
    for (const filter of input.filters) {
      try {
        const filterTool = toolRegistry.getTool(filter.type)
        if (!filterTool) {
          throw new Error(`Unknown filter: ${filter.type}`)
        }
        
        // Apply filter
        const result = await this.applyFilter(currentData, filter)
        currentData = result.data
        pixelsProcessed += result.pixelsProcessed
        appliedFilters.push(filter.type)
        
        // Apply blend mode if specified
        if (filter.blendMode || filter.opacity !== undefined) {
          currentData = await this.applyBlending(
            imageData,
            currentData,
            filter.blendMode || 'normal',
            filter.opacity ?? 100
          )
        }
      } catch (error) {
        errors.push({
          filter: filter.type,
          error: error.message
        })
        if (!input.preview) {
          throw error // Fail fast in non-preview mode
        }
      }
    }
    
    // Apply final result
    if (!input.preview) {
      await this.applyToCanvas(currentData, input.target)
    }
    
    return {
      success: true,
      appliedFilters,
      totalProcessingTime: Date.now() - startTime,
      pixelsProcessed,
      errors: errors.length > 0 ? errors : undefined,
      message: `Applied ${appliedFilters.length} filters`
    }
  }
  
  private async getTargetImageData(target: string): Promise<ImageData> {
    // Implementation to get image data based on target
    throw new Error('Not implemented')
  }
  
  private async applyFilter(
    data: ImageData,
    filter: any
  ): Promise<{ data: ImageData; pixelsProcessed: number }> {
    // Implementation to apply individual filter
    throw new Error('Not implemented')
  }
  
  private async applyBlending(
    base: ImageData,
    overlay: ImageData,
    mode: string,
    opacity: number
  ): Promise<ImageData> {
    // Implementation for blend modes
    throw new Error('Not implemented')
  }
  
  private async applyToCanvas(data: ImageData, target: string): Promise<void> {
    // Implementation to apply result to canvas
    throw new Error('Not implemented')
  }
}
```

### Evaluator-Optimizer Pattern

```typescript
// lib/ai/agents/evaluator.ts
import { z } from 'zod'
import { openai } from '@ai-sdk/openai'
import { generateObject } from 'ai'

const EditEvaluationSchema = z.object({
  qualityScore: z.number().min(1).max(10),
  technicalQuality: z.object({
    sharpness: z.number().min(1).max(10),
    noiseLevel: z.number().min(1).max(10),
    colorAccuracy: z.number().min(1).max(10),
    exposure: z.number().min(1).max(10)
  }),
  aestheticQuality: z.object({
    composition: z.number().min(1).max(10),
    colorHarmony: z.number().min(1).max(10),
    visualImpact: z.number().min(1).max(10)
  }),
  matchesIntent: z.boolean(),
  issues: z.array(z.string()),
  suggestions: z.array(z.object({
    description: z.string(),
    toolName: z.string(),
    params: z.any(),
    expectedImprovement: z.number().min(1).max(10)
  }))
})

export class EditEvaluator {
  private model = openai('gpt-4o-vision')
  
  async evaluateEdit(
    before: ImageData,
    after: ImageData,
    userIntent: string,
    appliedOperations: string[]
  ): Promise<z.infer<typeof EditEvaluationSchema>> {
    const { object: evaluation } = await generateObject({
      model: this.model,
      schema: EditEvaluationSchema,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Evaluate this photo edit:
            
User Intent: ${userIntent}
Applied Operations: ${appliedOperations.join(', ')}

Please analyze:
1. Technical quality (sharpness, noise, color, exposure)
2. Aesthetic quality (composition, harmony, impact)
3. Whether the edit matches user intent
4. Any issues or artifacts
5. Suggestions for improvement`
          },
          { type: 'image', image: before },
          { type: 'image', image: after }
        ]
      }]
    })
    
    return evaluation
  }
  
  async optimizeEdit(
    evaluation: z.infer<typeof EditEvaluationSchema>,
    currentParams: any
  ): Promise<any> {
    if (evaluation.qualityScore >= 8 && evaluation.matchesIntent) {
      return currentParams // No optimization needed
    }
    
    // Generate optimized parameters based on suggestions
    const { object: optimized } = await generateObject({
      model: openai('gpt-4o'),
      schema: z.object({
        adjustments: z.array(z.object({
          toolName: z.string(),
          params: z.any(),
          reasoning: z.string()
        }))
      }),
      prompt: `Based on this evaluation, generate optimized parameters:
      
Current Score: ${evaluation.qualityScore}/10
Issues: ${evaluation.issues.join(', ')}
Suggestions: ${JSON.stringify(evaluation.suggestions)}

Generate minimal adjustments to address the issues.`
    })
    
    return optimized.adjustments
  }
}
```

## UI Integration

### AI Chat Panel

The AI chat panel will be the primary interface for natural language photo editing.

```typescript
// components/editor/Panels/AIChat/index.tsx
'use client'

import { useChat } from '@ai-sdk/react'
import { useState, useCallback } from 'react'
import { z } from 'zod'
import { ChatMessage } from './ChatMessage'
import { ToolInvocation } from './ToolInvocation'
import { useCanvasContext } from '@/hooks/useCanvasContext'
import { clientToolExecutor } from '@/lib/ai/client-executor'

export function AIChat() {
  const canvasContext = useCanvasContext()
  const [isExecuting, setIsExecuting] = useState(false)
  
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    reload,
    stop
  } = useChat({
    api: '/api/ai/chat',
    maxSteps: 5,
    
    // Include canvas context in requests
    body: {
      canvasContext: {
        width: canvasContext.document?.width,
        height: canvasContext.document?.height,
        zoom: canvasContext.zoom,
        hasSelection: canvasContext.hasSelection,
        layers: canvasContext.layers.length
      }
    },
    
    // Handle client-side tool execution
    onToolCall: async ({ toolCall }) => {
      setIsExecuting(true)
      try {
        const result = await clientToolExecutor.execute(
          toolCall,
          canvasContext
        )
        return result
      } catch (error) {
        console.error('Tool execution failed:', error)
        return {
          toolCallId: toolCall.toolCallId,
          error: error.message
        }
      } finally {
        setIsExecuting(false)
      }
    },
    
    // Error handling
    onError: (error) => {
      console.error('Chat error:', error)
      // Show user-friendly error message
    }
  })
  
  const suggestions = [
    'Make the image brighter',
    'Add a vintage filter',
    'Crop to square format',
    'Remove the background',
    'Enhance the colors'
  ]
  
  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b border-border p-3">
        <h3 className="text-sm font-medium">AI Assistant</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Describe what you want to do
        </p>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Try one of these:
            </p>
            <div className="space-y-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => {
                    handleInputChange({
                      target: { value: suggestion }
                    } as any)
                    handleSubmit()
                  }}
                  className="w-full text-left px-3 py-2 text-sm rounded-lg
                           bg-secondary hover:bg-secondary/80 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        
        {isExecuting && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="animate-spin h-4 w-4 border-2 border-primary 
                          border-t-transparent rounded-full" />
            Executing tools...
          </div>
        )}
      </div>
      
      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-border p-4">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={handleInputChange}
            placeholder="Describe what you want to do..."
            className="flex-1 px-3 py-2 text-sm border rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={isLoading || isExecuting}
          />
          {isLoading ? (
            <button
              type="button"
              onClick={stop}
              className="px-4 py-2 text-sm bg-destructive text-destructive-foreground
                       rounded-lg hover:bg-destructive/90"
            >
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim() || isExecuting}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground
                       rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              Send
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
```

### Message Components

```typescript
// components/editor/Panels/AIChat/ChatMessage.tsx
import type { UIMessage } from '@ai-sdk/react'
import { ToolInvocation } from './ToolInvocation'
import { StepSeparator } from './StepSeparator'

export function ChatMessage({ message }: { message: UIMessage }) {
  return (
    <div className={`flex gap-3 ${
      message.role === 'user' ? 'justify-end' : 'justify-start'
    }`}>
      {message.role === 'assistant' && (
        <div className="w-8 h-8 rounded-full bg-primary/10 
                      flex items-center justify-center">
          <span className="text-xs">AI</span>
        </div>
      )}
      
      <div className={`max-w-[80%] space-y-2 ${
        message.role === 'user' 
          ? 'bg-primary text-primary-foreground' 
          : 'bg-secondary'
      } rounded-lg px-3 py-2`}>
        {message.content && (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        )}
        
        {message.parts?.map((part, index) => {
          switch (part.type) {
            case 'tool-invocation':
              return <ToolInvocation key={index} part={part} />
            case 'step-start':
              return <StepSeparator key={index} />
            default:
              return null
          }
        })}
      </div>
      
      {message.role === 'user' && (
        <div className="w-8 h-8 rounded-full bg-secondary 
                      flex items-center justify-center">
          <span className="text-xs">You</span>
        </div>
      )}
    </div>
  )
}
```

## API Implementation

### Main Chat Route

```typescript
// app/api/ai/chat/route.ts
import { streamText, convertToModelMessages } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import { toolRegistry } from '@/lib/ai/tools/registry'
import { FotoFunOrchestrator } from '@/lib/ai/agents/orchestrator'

const RequestSchema = z.object({
  messages: z.array(z.any()),
  canvasContext: z.object({
    width: z.number().optional(),
    height: z.number().optional(),
    zoom: z.number().optional(),
    hasSelection: z.boolean().optional(),
    layers: z.number().optional()
  }).optional()
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { messages, canvasContext } = RequestSchema.parse(body)
    
    // Convert UI messages to model messages
    const modelMessages = convertToModelMessages(messages)
    
    // Create orchestrator for complex workflows
    const orchestrator = new FotoFunOrchestrator()
    
    // Stream response
    const result = streamText({
      model: openai('gpt-4o'),
      system: generateSystemPrompt(canvasContext),
      messages: modelMessages,
      tools: toolRegistry.getServerTools(),
      toolChoice: 'auto',
      maxSteps: 5,
      
      // Tool execution hooks
      onStepFinish: async ({ text, toolCalls, toolResults, finishReason, usage }) => {
        // Log for debugging
        console.log('Step finished:', {
          toolCalls: toolCalls?.length,
          finishReason,
          usage
        })
      },
      
      // Experimental features
      experimental_continueSteps: true,
      experimental_telemetry: {
        isEnabled: true,
        functionId: 'fotofun-chat'
      }
    })
    
    return result.toDataStreamResponse()
  } catch (error) {
    console.error('Chat API error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to process request' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

function generateSystemPrompt(context?: any): string {
  const tools = Array.from(toolRegistry.getServerTools())
    .map(([name, tool]) => `- ${name}: ${tool.function.description}`)
    .join('\n')
  
  return `You are an expert photo editing assistant for FotoFun.

Your capabilities include:
${tools}

Current canvas context:
${context ? JSON.stringify(context, null, 2) : 'No canvas loaded'}

Guidelines:
1. Be helpful and explain what you're doing
2. Break complex requests into steps
3. Ask for clarification when needed
4. Suggest improvements when appropriate
5. Use appropriate tools for each task

When users ask about features not yet available, explain what's coming soon.`
}
```

### Client Tool Executor

```typescript
// lib/ai/client-executor.ts
import { z } from 'zod'
import type { ToolCall } from '@ai-sdk/react'
import { toolRegistry } from './tools/registry'
import type { ToolExecutionContext } from './tools/base'

export class ClientToolExecutor {
  async execute(
    toolCall: ToolCall,
    context: ToolExecutionContext
  ): Promise<{ toolCallId: string; result?: any; error?: string }> {
    try {
      // Get tool definition
      const tool = toolRegistry.getTool(toolCall.toolName)
      
      if (!tool) {
        throw new Error(`Unknown tool: ${toolCall.toolName}`)
      }
      
      // Check execution side
      if (tool.executionSide === 'server') {
        throw new Error(`Tool ${toolCall.toolName} must be executed on server`)
      }
      
      // Validate requirements
      if (tool.requiresCanvas && !context.canvas) {
        throw new Error('This tool requires an active canvas')
      }
      
      if (tool.requiresSelection && !context.selection?.length) {
        throw new Error('This tool requires a selection')
      }
      
      // Validate input
      const validatedInput = tool.validateInput(toolCall.args)
      
      // Execute
      if (!tool.clientExecutor) {
        throw new Error(`Tool ${toolCall.toolName} missing client executor`)
      }
      
      const result = await tool.clientExecutor(validatedInput, context)
      
      // Validate output
      const validatedOutput = tool.validateOutput(result)
      
      return {
        toolCallId: toolCall.toolCallId,
        result: validatedOutput
      }
    } catch (error) {
      console.error(`Tool execution error (${toolCall.toolName}):`, error)
      
      return {
        toolCallId: toolCall.toolCallId,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

export const clientToolExecutor = new ClientToolExecutor() 
```

## Implementation Roadmap

### Phase 1: Foundation (Days 1-3)
- [ ] Install AI SDK v5 beta dependencies
- [ ] Create base tool interface and factory
- [ ] Set up tool registry with validation
- [ ] Create basic orchestrator agent
- [ ] Implement client tool executor

### Phase 2: Core Tools (Days 4-7)
- [ ] Canvas tools (zoom, pan, resize)
- [ ] Selection tools (rectangle, ellipse)
- [ ] Transform tools (move, rotate, flip)
- [ ] Basic filter tools (brightness, contrast)
- [ ] File operation tools

### Phase 3: UI Integration (Days 8-10)
- [ ] Create AI chat panel component
- [ ] Implement message rendering
- [ ] Add tool invocation UI
- [ ] Create progress indicators
- [ ] Add error handling UI

### Phase 4: Advanced Features (Days 11-14)
- [ ] Multi-step workflows
- [ ] Worker pattern implementation
- [ ] Evaluator-optimizer system
- [ ] Inline canvas AI editing
- [ ] Voice input support

### Phase 5: Polish & Testing (Days 15-16)
- [ ] Performance optimization
- [ ] Comprehensive error handling
- [ ] Security hardening
- [ ] Documentation
- [ ] Testing suite

## Security Considerations

### Input Validation
- All tool inputs validated with Zod schemas
- Sanitize file paths and URLs
- Validate image dimensions and sizes
- Rate limiting on API endpoints

### Output Sanitization
- Sanitize tool results before display
- Validate AI responses
- Escape HTML in chat messages
- Limit response sizes

### Resource Protection
- Memory limits for image operations
- Timeout for long-running operations
- Queue management for concurrent requests
- Canvas state validation

### Authentication & Authorization
- API key management for AI services
- User session validation
- Tool permission checks
- Audit logging for operations

## Performance Optimization

### Client-Side
- Debounce tool executions
- Virtual scrolling for chat history
- Lazy load tool definitions
- Web Workers for heavy operations
- Canvas operation batching

### Server-Side
- Response streaming
- Tool result caching
- Parallel tool execution
- Connection pooling
- CDN for static assets

## Testing Strategy

### Unit Tests
```typescript
// Example tool test
describe('ZoomTool', () => {
  it('validates input correctly', () => {
    const input = { level: 150, animate: true }
    const validated = zoomTool.validateInput(input)
    expect(validated.level).toBe(150)
  })
  
  it('executes zoom operation', async () => {
    const context = createMockContext()
    const result = await zoomTool.clientExecutor!(
      { level: 200 },
      context
    )
    expect(result.success).toBe(true)
    expect(result.newZoom).toBe(200)
  })
})
```

### Integration Tests
- Test tool orchestration
- Test client-server communication
- Test error handling flows
- Test multi-step workflows

### E2E Tests
- Test complete user workflows
- Test AI chat interactions
- Test tool execution chains
- Test error recovery

## Monitoring & Analytics

### Metrics to Track
- Tool execution success rates
- Average response times
- Error rates by tool
- User engagement metrics
- AI token usage

### Logging
- Structured logging for all operations
- Tool execution traces
- Error stack traces
- Performance metrics
- User interaction logs

## Future Enhancements

### Additional Tools
- Advanced selection tools (magic wand, lasso)
- Drawing tools (brush, pencil, eraser)
- Text tools with AI suggestions
- Shape tools with AI generation
- Advanced filters (neural filters)

### AI Capabilities
- Multi-modal editing (voice + gesture)
- Predictive editing suggestions
- Style transfer capabilities
- Automated workflow learning
- Collaborative AI editing

### Platform Features
- Plugin system for custom tools
- Tool marketplace
- Shared workflows
- Version control integration
- Real-time collaboration

## Summary

This AI integration plan provides a comprehensive approach to adding natural language photo editing capabilities to FotoFun using AI SDK v5. The key principles are:

1. **Type Safety**: Zod schemas ensure all inputs/outputs are validated
2. **Consistency**: Factory pattern ensures uniform tool implementation
3. **Flexibility**: Clear separation between server and client tools
4. **Scalability**: Orchestrator/worker patterns for complex workflows
5. **User Experience**: Real-time feedback and clear error handling

The implementation emphasizes:
- Structured tool definitions with consistent interfaces
- Robust error handling at every level
- Performance optimization for smooth user experience
- Security-first approach to protect user data
- Extensible architecture for future enhancements

By following this plan, FotoFun will have a powerful AI assistant that can understand natural language requests and execute complex photo editing workflows while maintaining type safety, security, and performance.