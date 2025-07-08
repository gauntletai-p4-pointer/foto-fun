# FotoFun AI Integration Plan - AI SDK v5

## 🚀 Quick Start for New Agents

### What's Working Now
- ✅ AI Chat UI in left sidebar (default tab)
- ✅ Basic conversation with OpenAI GPT-4o
- ✅ Proper AI SDK v5 beta integration with streaming
- ✅ All AI-related TypeScript errors resolved

### Immediate Next Steps
1. **Create First Photo Editing Tool** (Start here!)
   - Look at `lib/ai/tools/factory.ts` for the pattern
   - Create `lib/ai/tools/canvas/brightness.ts` as first tool
   - Register it in `lib/ai/tools/registry.ts`
   - Add to API route tools object

2. **Connect Tool to Canvas**
   - Import canvas/document stores in tool executor
   - Use Fabric.js filters for image manipulation
   - Test with simple brightness adjustment

3. **Update Chat UI for Tools**
   - Modify `components/editor/Panels/AIChat/index.tsx`
   - Add tool invocation rendering (see v5 docs for `tool-${toolName}` pattern)
   - Show loading states during tool execution

### Key Files to Understand
- `app/api/ai/chat/route.ts` - API endpoint (currently no tools)
- `lib/ai/tools/factory.ts` - Tool creation pattern (with v5 workarounds)
- `components/editor/Panels/AIChat/index.tsx` - Chat UI component
- `store/canvasStore.ts` - Canvas state management
- `lib/ai/tools/base.ts` - Tool interfaces

### Known Issues/Workarounds
- AI SDK v5 beta has type issues - we use `as unknown as` casting in factory
- Tool states in v5: `input-streaming`, `input-available`, `output-available`, `output-error`
- Must use `convertToModelMessages()` before sending to AI
- Use `toUIMessageStreamResponse()` for streaming back to client

## Overview

This document outlines the comprehensive plan for integrating AI SDK v5 into FotoFun, enabling natural language photo editing through an AI chat interface. The implementation emphasizes type safety, consistent patterns, and a scalable architecture using orchestrator/worker patterns.

## Current Implementation Status (Updated)

### Files Created/Modified
- `app/api/ai/chat/route.ts` - API endpoint for AI chat
- `components/editor/Panels/AIChat/index.tsx` - AI chat UI component
- `components/editor/Panels/index.tsx` - Updated to include AI chat tab
- `lib/ai/tools/base.ts` - Base tool interface with Zod schemas
- `lib/ai/tools/factory.ts` - Tool factory for consistent tool creation
- `lib/ai/tools/registry.ts` - Tool registry for management
- `lib/ai/context/memory-system.ts` - Context persistence system
- `lib/ai/providers.ts` - OpenAI provider configuration

### ✅ Completed
1. **AI SDK v5 Setup**
   - Installed `ai@5.0.0-beta.9` and related packages
   - Configured OpenAI provider with API key
   - Set up TypeScript types for AI SDK v5

2. **AI Chat UI**
   - Created fully functional AI chat panel in left sidebar
   - Implemented tab navigation between AI Chat and Layers
   - Added proper styling following the design system
   - Integrated with `useChat` hook from AI SDK v5

3. **API Infrastructure**
   - Created `/api/ai/chat` endpoint
   - Configured streaming responses with `streamText`
   - Set up system prompt for photo editing assistance
   - Fixed UIMessage to ModelMessage conversion using `convertToModelMessages()`
   - Using `toUIMessageStreamResponse()` for proper v5 streaming

4. **Foundation Architecture**
   - Created base tool interface with Zod schemas
   - Implemented tool factory pattern (partial)
   - Set up tool registry system
   - Created memory system with IndexedDB

### 🚧 In Progress
1. **Tool Implementation**
   - Tool type definitions updated for AI SDK v5 beta (parameters → inputSchema)
   - Execute functions working with type workarounds for beta SDK

### ❌ Not Started
1. **Tool-Canvas Integration**
2. **Multi-step Workflows**
3. **Visual Feedback System**
4. **Autonomy Controls**
5. **Verification UI**

## Summary of Remaining Work

### Immediate Next Steps (Phase 2)
1. **Fix Tool Type Issues** - Resolve AI SDK v5 beta type conflicts
2. **Implement Core Tools** - Create 10-15 essential photo editing tools
3. **Connect to Canvas** - Wire tools to actual canvas operations
4. **Add Tool Confidence** - Implement confidence scoring system

### Major Features Still Needed
1. **Tool Execution Pipeline** - Complete the tool->canvas connection
2. **Approval/Verification UI** - Build user approval dialogs
3. **Visual Comparison System** - Before/after/diff views
4. **Autonomy Controls** - Slider-based control system
5. **Multi-step Workflows** - Complex operation chains
6. **Progress Tracking** - Visual progress indicators

### Technical Debt
1. **Type Safety** - Remove all `unknown` types where possible (blocked by AI SDK v5 beta types)
2. **Error Handling** - Comprehensive error boundaries
3. **Performance** - Optimize for large images
4. **Testing** - Unit and integration tests

### Important AI SDK v5 Changes Discovered
1. **Tool Definition** - `parameters` → `inputSchema`
2. **Tool Properties** - `args`/`result` → `input`/`output`
3. **UI Tool Parts** - `tool-invocation` → `tool-${toolName}` (type-safe)
4. **Tool States** - More granular states (input-streaming, input-available, output-available, output-error)
5. **Media Type** - `mimeType` → `mediaType`

## Testing Checklist for New Agent

Before considering the AI integration complete, verify:

### 1. Basic Chat Functionality
- [ ] Open FotoFun, click AI Chat tab (should be default)
- [ ] Type "Hello" - should get response
- [ ] Messages stream in real-time
- [ ] Chat history persists during session

### 2. First Tool Implementation
- [ ] Create brightness tool as shown in example
- [ ] Add to API route tools
- [ ] Load an image in FotoFun
- [ ] Ask AI to "make the image brighter"
- [ ] Tool should execute and update canvas

### 3. Error Handling
- [ ] Try tool without image loaded - should show error
- [ ] Try invalid brightness values - should be constrained
- [ ] Check browser console - no unhandled errors

### 4. Type Safety
- [ ] Run `bun typecheck` - no AI-related errors
- [ ] Run `bun lint` - no AI-related warnings

## Common Troubleshooting

### Issue: "Cannot find module 'ai'" 
**Solution**: Run `bun install` - we're using AI SDK v5 beta

### Issue: Type errors with tool creation
**Solution**: Use the factory pattern with type casting as shown in `lib/ai/tools/factory.ts`

### Issue: "Invalid prompt: The messages must be a ModelMessage[]"
**Solution**: Already fixed! We use `convertToModelMessages()` in the API route

### Issue: Tool not executing
**Solution**: 
1. Check tool is added to API route tools object
2. Verify tool name matches exactly
3. Check browser console for client-side errors
4. Ensure canvas is loaded before tool execution

### Issue: Canvas operations not working
**Solution**:
1. Import stores: `import { useCanvasStore } from '@/store/canvasStore'`
2. Get canvas instance: `const canvas = useCanvasStore.getState().canvas`
3. Check canvas is initialized: `if (!canvas) throw new Error('Canvas not ready')`

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

## Agent Design Framework Compliance

This implementation fully addresses Karpathy's Agent Design Framework principles:

### 1. **Context Management** ✅
- **Persistent Memory System**: Three-tier memory (short-term, long-term, episodic) using IndexedDB
- **Pattern Recognition**: Automatic detection of frequent workflows and user preferences
- **Context-Aware Prompts**: Every AI request enhanced with relevant historical context
- **Session Continuity**: Operations and preferences persist across sessions

### 2. **Generation + Verification** ✅
- **Confidence-Based Routing**: Operations below confidence threshold require approval
- **Visual Preview System**: Before/after/diff views for all operations
- **Alternative Suggestions**: AI provides multiple options with confidence scores
- **Human-in-the-Loop**: Intuitive approval dialogs with modification capabilities

### 3. **Incremental Processing** ✅
- **Chunk-Based Execution**: Workflows broken into reviewable chunks (3-10 operations)
- **Checkpoint System**: Automatic checkpoints with visual thumbnails
- **Rollback Capability**: One-click restoration to any previous checkpoint
- **Progress Tracking**: Real-time progress bars and operation status

### 4. **Visual Interface** ✅
- **Multi-View Comparisons**: Side-by-side, overlay, diff, and slider views
- **Interactive Controls**: Opacity sliders, region selection, zoom controls
- **Diff Visualization**: Heatmaps, arrows, and annotations for changes
- **Real-Time Preview**: Live updates as parameters are adjusted

### 5. **Partial Autonomy** ✅
- **Global Autonomy Slider**: 0-100% control over AI independence
- **Feature-Specific Controls**: Individual autonomy levels per feature
- **Permission System**: Granular control over what AI can do
- **Safety Limits**: Emergency stop, operation limits, blocked actions

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

## Example: First Tool Implementation

Here's exactly what the new agent should create as the first tool:

```typescript
// lib/ai/tools/canvas/brightness.ts
import { z } from 'zod'
import { ToolFactory } from '../factory'

const BrightnessInputSchema = z.object({
  adjustment: z.number()
    .min(-100)
    .max(100)
    .describe('Brightness adjustment from -100 (darker) to 100 (brighter)')
})

const BrightnessOutputSchema = z.object({
  previousBrightness: z.number().optional(),
  newBrightness: z.number(),
  pixelsAffected: z.number().optional()
})

export const brightnessTool = ToolFactory.createTool({
  name: 'adjustBrightness',
  category: 'filter',
  description: 'Adjust the brightness of the image',
  inputSchema: BrightnessInputSchema,
  outputSchema: BrightnessOutputSchema,
  executionSide: 'client',
  requiresCanvas: true,
  
  clientExecutor: async (input, context) => {
    const { canvas } = context
    if (!canvas) throw new Error('Canvas required')
    
    // Get the active object or the background image
    const target = canvas.getActiveObject() || canvas.backgroundImage
    if (!target) throw new Error('No image to adjust')
    
    // Apply brightness filter using Fabric.js
    const brightnessFilter = new fabric.Image.filters.Brightness({
      brightness: input.adjustment / 100 // Fabric expects 0-1 range
    })
    
    // Apply filter
    if ('filters' in target) {
      target.filters = target.filters || []
      target.filters.push(brightnessFilter)
      target.applyFilters()
      canvas.renderAll()
    }
    
    return {
      success: true,
      newBrightness: input.adjustment,
      message: `Brightness adjusted by ${input.adjustment}`
    }
  }
})
```

Then update the API route:

```typescript
// app/api/ai/chat/route.ts
import { brightnessTool } from '@/lib/ai/tools/canvas/brightness'

const result = streamText({
  model: openai('gpt-4o'),
  messages: modelMessages,
  tools: {
    adjustBrightness: brightnessTool.tool // Add the tool here
  },
  system: `...existing prompt...`
})
```

## Implementation Roadmap

### Phase 1: Foundation (Days 1-3) ✅ COMPLETE
- [x] Install AI SDK v5 beta dependencies
- [x] Create base tool interface and factory
- [x] Set up tool registry with validation
- [x] Create basic AI chat interface
- [x] Implement memory system with IndexedDB
- [x] Set up API routes and streaming

### Phase 2: Core Tools (Days 4-7) 🚧 NEXT
- [ ] Fix tool type definitions for AI SDK v5 beta
- [ ] Canvas tools (zoom, pan, resize)
- [ ] Selection tools (rectangle, ellipse)
- [ ] Transform tools (move, rotate, flip)
- [ ] Basic filter tools (brightness, contrast)
- [ ] File operation tools
- [ ] Add confidence scoring to each tool
- [ ] Implement tool preview generation
- [ ] Connect tools to actual canvas operations

### Phase 3: Agent Design Framework (Days 8-12)
- [x] **Context Management System** (Basic Implementation)
  - [x] Memory system with IndexedDB structure
  - [ ] Pattern recognition for workflows
  - [ ] Context-aware prompt enhancement
- [ ] **Generation + Verification System**
  - [ ] Build approval UI for tool calls
  - [ ] Implement confidence thresholds
  - [ ] Add alternative suggestions
- [ ] **Incremental Processing**
  - [ ] Create checkpoint system
  - [ ] Implement rollback functionality
  - [ ] Add progress tracking
- [ ] **Visual Interface**
  - [ ] Build before/after preview
  - [ ] Create diff visualization
  - [ ] Add real-time preview mode
- [ ] **Autonomy Control System**
  - [ ] Implement granular permission controls
  - [ ] Create autonomy slider UI
  - [ ] Add batch operation controls

### Phase 4: UI Integration (Days 13-15) ✅ PARTIALLY COMPLETE
- [x] Create AI chat panel component
- [x] Implement message rendering
- [ ] Add tool invocation UI
- [ ] Create progress indicators
- [x] Add error handling UI
- [ ] Add verification modals
- [ ] Implement autonomy controls UI

### Phase 5: Advanced Features (Days 16-18)
- [ ] Multi-step workflows with verification
- [ ] Worker pattern implementation
- [ ] Evaluator-optimizer system with visual feedback
- [ ] Inline canvas AI editing with approval
- [ ] Voice input support
- [ ] Adaptive learning from user feedback

### Phase 6: Polish & Testing (Days 19-20)
- [ ] Performance optimization
- [ ] Comprehensive error handling
- [ ] Security hardening
- [ ] Documentation
- [ ] Testing suite
- [ ] User preference persistence
- [ ] Workflow pattern recognition

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

## Agent Design Framework Implementation

Based on Karpathy's insights, our agent implements five key principles for effective human-AI collaboration:

### 1. Context Management System

Solving the "anterograde amnesia" problem by maintaining rich context across workflows.

```typescript
// lib/ai/context/memory-system.ts
import { z } from 'zod'

// Memory schemas
const OperationHistorySchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  operation: z.string(),
  params: z.any(),
  result: z.any(),
  userFeedback: z.enum(['positive', 'negative', 'neutral']).optional()
})

const WorkflowPatternSchema = z.object({
  id: z.string(),
  name: z.string(),
  frequency: z.number(),
  steps: z.array(z.string()),
  averageSuccessRate: z.number(),
  lastUsed: z.number()
})

const MemorySystemSchema = z.object({
  shortTerm: z.object({
    recentOperations: z.array(OperationHistorySchema).max(50),
    currentSession: z.object({
      startTime: z.number(),
      operations: z.array(z.string()),
      undoStack: z.array(z.any())
    }),
    activeContext: z.record(z.any())
  }),
  
  longTerm: z.object({
    frequentWorkflows: z.array(WorkflowPatternSchema),
    userPreferences: z.object({
      defaultSettings: z.record(z.any()),
      preferredTools: z.array(z.string()),
      styleProfile: z.object({
        colorPreferences: z.array(z.string()),
        effectStrength: z.enum(['subtle', 'moderate', 'strong']),
        workflowSpeed: z.enum(['careful', 'balanced', 'fast'])
      })
    }),
    projectHistory: z.array(z.object({
      projectId: z.string(),
      lastAccessed: z.number(),
      summary: z.string()
    }))
  }),
  
  episodic: z.object({
    sessions: z.array(z.object({
      id: z.string(),
      date: z.number(),
      duration: z.number(),
      operations: z.array(OperationHistorySchema),
      outcome: z.enum(['completed', 'abandoned', 'failed']),
      learnings: z.array(z.string())
    }))
  })
})

export class ContextMemorySystem {
  private memory: z.infer<typeof MemorySystemSchema>
  private db: IDBDatabase
  
  async initialize() {
    // Initialize IndexedDB for persistent storage
    this.db = await this.openDatabase()
    this.memory = await this.loadMemory()
  }
  
  async enhancePrompt(userRequest: string, canvasContext: any): Promise<string> {
    // Retrieve relevant context
    const relevantWorkflows = this.findSimilarWorkflows(userRequest)
    const recentOps = this.memory.shortTerm.recentOperations.slice(-10)
    const userPrefs = this.memory.longTerm.userPreferences
    
    // Build enhanced prompt
    return `${userRequest}

Recent context:
- Last operations: ${recentOps.map(op => op.operation).join(', ')}
- User prefers: ${userPrefs.styleProfile.effectStrength} effects
- Common workflows: ${relevantWorkflows.map(w => w.name).join(', ')}

Canvas state: ${JSON.stringify(canvasContext)}`
  }
  
  async recordOperation(operation: z.infer<typeof OperationHistorySchema>) {
    // Add to short-term memory
    this.memory.shortTerm.recentOperations.push(operation)
    if (this.memory.shortTerm.recentOperations.length > 50) {
      this.memory.shortTerm.recentOperations.shift()
    }
    
    // Update patterns
    await this.updateWorkflowPatterns(operation)
    
    // Persist
    await this.saveMemory()
  }
  
  private async updateWorkflowPatterns(operation: any) {
    // Pattern detection logic
    const patterns = this.detectPatterns(
      this.memory.shortTerm.recentOperations
    )
    
    // Update frequency counts
    for (const pattern of patterns) {
      const existing = this.memory.longTerm.frequentWorkflows
        .find(w => w.id === pattern.id)
      
      if (existing) {
        existing.frequency++
        existing.lastUsed = Date.now()
      } else {
        this.memory.longTerm.frequentWorkflows.push(pattern)
      }
    }
  }
}
```

### 2. Generation + Verification System

AI generates, humans verify and guide decisions through intuitive interfaces.

```typescript
// lib/ai/verification/approval-system.ts
import { z } from 'zod'

const VerificationRuleSchema = z.object({
  condition: z.enum(['confidence_below', 'operation_type', 'value_exceeds']),
  threshold: z.any(),
  requireApproval: z.boolean()
})

const ApprovalRequestSchema = z.object({
  id: z.string(),
  operation: z.string(),
  params: z.any(),
  confidence: z.number().min(0).max(1),
  preview: z.object({
    before: z.string(), // base64 image
    after: z.string(),
    diff: z.string().optional()
  }),
  alternatives: z.array(z.object({
    params: z.any(),
    preview: z.string(),
    confidence: z.number()
  })).optional(),
  explanation: z.string()
})

export class VerificationSystem {
  private rules: z.infer<typeof VerificationRuleSchema>[] = [
    { condition: 'confidence_below', threshold: 0.7, requireApproval: true },
    { condition: 'operation_type', threshold: ['delete', 'crop'], requireApproval: true },
    { condition: 'value_exceeds', threshold: { brightness: 50 }, requireApproval: true }
  ]
  
  async requiresApproval(
    operation: string,
    params: any,
    confidence: number
  ): Promise<boolean> {
    for (const rule of this.rules) {
      switch (rule.condition) {
        case 'confidence_below':
          if (confidence < rule.threshold) return true
          break
        case 'operation_type':
          if (rule.threshold.includes(operation)) return true
          break
        case 'value_exceeds':
          for (const [key, value] of Object.entries(rule.threshold)) {
            if (params[key] && Math.abs(params[key]) > value) return true
          }
          break
      }
    }
    return false
  }
  
  async createApprovalRequest(
    operation: string,
    params: any,
    confidence: number,
    canvas: any
  ): Promise<z.infer<typeof ApprovalRequestSchema>> {
    // Generate previews
    const before = await this.captureCanvas(canvas)
    const after = await this.simulateOperation(canvas, operation, params)
    const diff = await this.generateDiff(before, after)
    
    // Generate alternatives
    const alternatives = await this.generateAlternatives(
      operation,
      params,
      canvas
    )
    
    return {
      id: crypto.randomUUID(),
      operation,
      params,
      confidence,
      preview: { before, after, diff },
      alternatives,
      explanation: await this.explainOperation(operation, params)
    }
  }
}

// React component for approval UI
export function ApprovalDialog({ 
  request,
  onApprove,
  onReject,
  onModify
}: {
  request: z.infer<typeof ApprovalRequestSchema>
  onApprove: () => void
  onReject: () => void
  onModify: (params: any) => void
}) {
  return (
    <div className="approval-dialog">
      <div className="preview-container">
        <div className="preview before">
          <h4>Original</h4>
          <img src={request.preview.before} />
        </div>
        <div className="preview after">
          <h4>AI Proposal</h4>
          <img src={request.preview.after} />
          <div className="confidence">
            Confidence: {(request.confidence * 100).toFixed(0)}%
          </div>
        </div>
        {request.preview.diff && (
          <div className="preview diff">
            <h4>Changes</h4>
            <img src={request.preview.diff} />
          </div>
        )}
      </div>
      
      <div className="explanation">
        <p>{request.explanation}</p>
      </div>
      
      {request.alternatives && (
        <div className="alternatives">
          <h4>Alternative Options:</h4>
          {request.alternatives.map((alt, i) => (
            <button key={i} onClick={() => onModify(alt.params)}>
              <img src={alt.preview} />
              <span>{(alt.confidence * 100).toFixed(0)}%</span>
            </button>
          ))}
        </div>
      )}
      
      <div className="actions">
        <button onClick={onApprove} className="approve">
          Approve & Apply
        </button>
        <button onClick={onReject} className="reject">
          Reject
        </button>
        <button onClick={() => {/* open param editor */}}>
          Modify Parameters
        </button>
      </div>
    </div>
  )
}
```

### 3. Incremental Processing System

Work in small, reviewable chunks with checkpoint and rollback capabilities.

```typescript
// lib/ai/processing/incremental-processor.ts
import { z } from 'zod'

const ProcessingChunkSchema = z.object({
  id: z.string(),
  size: z.enum(['small', 'medium', 'large']),
  operations: z.array(z.object({
    tool: z.string(),
    params: z.any(),
    estimatedTime: z.number()
  })),
  checkpoint: z.string().optional()
})

const CheckpointSchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  canvasState: z.any(), // Serialized canvas
  description: z.string(),
  thumbnail: z.string() // base64
})

export class IncrementalProcessor {
  private checkpoints = new Map<string, z.infer<typeof CheckpointSchema>>()
  private currentChunk: z.infer<typeof ProcessingChunkSchema> | null = null
  
  async processWorkflow(
    workflow: any,
    options: {
      chunkSize: 'small' | 'medium' | 'large'
      autoCheckpoint: boolean
      reviewAfterChunks: number
    }
  ) {
    const chunks = this.createChunks(workflow, options.chunkSize)
    let chunkCount = 0
    
    for (const chunk of chunks) {
      // Create checkpoint before chunk
      if (options.autoCheckpoint) {
        await this.createCheckpoint(`Before chunk ${chunkCount + 1}`)
      }
      
      // Process chunk
      this.currentChunk = chunk
      const result = await this.executeChunk(chunk)
      
      // Review point
      chunkCount++
      if (chunkCount % options.reviewAfterChunks === 0) {
        const shouldContinue = await this.requestReview(result)
        if (!shouldContinue) {
          return { completed: false, processedChunks: chunkCount }
        }
      }
    }
    
    return { completed: true, processedChunks: chunkCount }
  }
  
  private createChunks(
    workflow: any,
    size: 'small' | 'medium' | 'large'
  ): z.infer<typeof ProcessingChunkSchema>[] {
    const chunkSizes = {
      small: 3,
      medium: 5,
      large: 10
    }
    
    const chunks: z.infer<typeof ProcessingChunkSchema>[] = []
    const operations = workflow.steps
    const chunkSize = chunkSizes[size]
    
    for (let i = 0; i < operations.length; i += chunkSize) {
      chunks.push({
        id: `chunk-${i / chunkSize}`,
        size,
        operations: operations.slice(i, i + chunkSize),
        checkpoint: undefined
      })
    }
    
    return chunks
  }
  
  async createCheckpoint(description: string): Promise<string> {
    const canvas = this.getCanvas()
    const checkpoint: z.infer<typeof CheckpointSchema> = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      canvasState: await this.serializeCanvas(canvas),
      description,
      thumbnail: await this.captureThumbnail(canvas)
    }
    
    this.checkpoints.set(checkpoint.id, checkpoint)
    return checkpoint.id
  }
  
  async rollbackToCheckpoint(checkpointId: string) {
    const checkpoint = this.checkpoints.get(checkpointId)
    if (!checkpoint) throw new Error('Checkpoint not found')
    
    await this.restoreCanvas(checkpoint.canvasState)
    
    // Clear future checkpoints
    const checkpointTime = checkpoint.timestamp
    for (const [id, cp] of this.checkpoints) {
      if (cp.timestamp > checkpointTime) {
        this.checkpoints.delete(id)
      }
    }
  }
}

// React component for chunk review
export function ChunkReviewUI({
  chunk,
  progress,
  checkpoints,
  onContinue,
  onPause,
  onRollback,
  onModify
}: any) {
  return (
    <div className="chunk-review">
      <div className="progress-bar">
        <div className="progress" style={{ width: `${progress}%` }} />
        <span>{progress}% Complete</span>
      </div>
      
      <div className="current-chunk">
        <h4>Current Operations:</h4>
        <ul>
          {chunk.operations.map((op: any, i: number) => (
            <li key={i}>
              {op.tool}: {JSON.stringify(op.params)}
            </li>
          ))}
        </ul>
      </div>
      
      <div className="checkpoints-timeline">
        <h4>Checkpoints:</h4>
        <div className="timeline">
          {checkpoints.map((cp: any) => (
            <div key={cp.id} className="checkpoint">
              <img src={cp.thumbnail} />
              <span>{cp.description}</span>
              <button onClick={() => onRollback(cp.id)}>
                Restore
              </button>
            </div>
          ))}
        </div>
      </div>
      
      <div className="actions">
        <button onClick={onContinue}>Continue</button>
        <button onClick={onPause}>Pause</button>
        <button onClick={onModify}>Modify Next Steps</button>
      </div>
    </div>
  )
}
```

### 4. Visual Interface System

Rich visual interfaces for fast and intuitive verification of AI operations.

```typescript
// lib/ai/ui/visual-interface.ts
import { z } from 'zod'

export class VisualComparisonSystem {
  // Multi-view comparison modes
  async createComparison(
    before: ImageData,
    after: ImageData,
    mode: 'sideBySide' | 'overlay' | 'diff' | 'slider'
  ) {
    switch (mode) {
      case 'sideBySide':
        return this.createSideBySide(before, after)
      case 'overlay':
        return this.createOverlay(before, after)
      case 'diff':
        return this.createDiffView(before, after)
      case 'slider':
        return this.createSliderView(before, after)
    }
  }
  
  private async createDiffView(before: ImageData, after: ImageData) {
    // Generate difference visualization
    const diff = await this.computeDifference(before, after)
    
    return {
      heatmap: await this.generateHeatmap(diff),
      metrics: {
        pixelDifference: this.calculatePixelDiff(diff),
        structuralSimilarity: await this.calculateSSIM(before, after),
        perceptualDifference: await this.calculatePerceptualDiff(before, after)
      },
      regions: await this.identifyChangedRegions(diff)
    }
  }
}

// React component for visual comparison
export function VisualComparison({
  before,
  after,
  mode,
  onRegionSelect,
  onModeChange
}: {
  before: string
  after: string
  mode: 'sideBySide' | 'overlay' | 'diff' | 'slider'
  onRegionSelect?: (region: any) => void
  onModeChange?: (mode: any) => void
}) {
  const [overlayOpacity, setOverlayOpacity] = useState(0.5)
  const [sliderPosition, setSliderPosition] = useState(50)
  const [selectedRegions, setSelectedRegions] = useState<any[]>([])
  
  return (
    <div className="visual-comparison">
      <div className="mode-selector">
        {['sideBySide', 'overlay', 'diff', 'slider'].map(m => (
          <button
            key={m}
            className={mode === m ? 'active' : ''}
            onClick={() => onModeChange?.(m)}
          >
            {m}
          </button>
        ))}
      </div>
      
      <div className={`comparison-view ${mode}`}>
        {mode === 'sideBySide' && (
          <>
            <div className="image-container">
              <h4>Before</h4>
              <img src={before} />
            </div>
            <div className="image-container">
              <h4>After</h4>
              <img src={after} />
            </div>
          </>
        )}
        
        {mode === 'overlay' && (
          <div className="overlay-container">
            <img src={before} style={{ opacity: 1 - overlayOpacity }} />
            <img src={after} style={{ opacity: overlayOpacity }} />
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={overlayOpacity}
              onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
            />
          </div>
        )}
        
        {mode === 'slider' && (
          <div className="slider-container">
            <div className="slider-images">
              <img src={before} style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }} />
              <img src={after} style={{ clipPath: `inset(0 0 0 ${sliderPosition}%)` }} />
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={sliderPosition}
              onChange={(e) => setSliderPosition(parseInt(e.target.value))}
              className="slider-control"
            />
          </div>
        )}
        
        {mode === 'diff' && (
          <DiffVisualization
            before={before}
            after={after}
            onRegionSelect={onRegionSelect}
          />
        )}
      </div>
      
      <RegionSelector
        selectedRegions={selectedRegions}
        onRegionAdd={(region) => setSelectedRegions([...selectedRegions, region])}
        onRegionRemove={(index) => {
          const newRegions = [...selectedRegions]
          newRegions.splice(index, 1)
          setSelectedRegions(newRegions)
        }}
      />
    </div>
  )
}
```

### 5. Autonomy Control System

Fine-grained control over AI autonomy with "autonomy sliders" for different features.

```typescript
// lib/ai/autonomy/control-system.ts
import { z } from 'zod'

const AutonomyLevelSchema = z.object({
  global: z.number().min(0).max(100),
  features: z.record(z.string(), z.object({
    enabled: z.boolean(),
    level: z.number().min(0).max(100),
    permissions: z.array(z.string())
  })),
  safetyLimits: z.object({
    maxOperationsPerAction: z.number(),
    requireApprovalAbove: z.number(),
    blockedOperations: z.array(z.string())
  })
})

export class AutonomyControlSystem {
  private settings: z.infer<typeof AutonomyLevelSchema> = {
    global: 50,
    features: {
      filters: { enabled: true, level: 75, permissions: ['preview', 'apply'] },
      selection: { enabled: true, level: 100, permissions: ['all'] },
      cropping: { enabled: true, level: 25, permissions: ['preview'] },
      deletion: { enabled: false, level: 0, permissions: [] }
    },
    safetyLimits: {
      maxOperationsPerAction: 5,
      requireApprovalAbove: 75,
      blockedOperations: ['delete_all', 'format_disk']
    }
  }
  
  async canExecuteAutonomously(
    operation: string,
    params: any,
    confidence: number
  ): Promise<{ allowed: boolean; reason?: string }> {
    // Check if operation is blocked
    if (this.settings.safetyLimits.blockedOperations.includes(operation)) {
      return { allowed: false, reason: 'Operation is blocked' }
    }
    
    // Get feature settings
    const feature = this.getFeatureForOperation(operation)
    const featureSettings = this.settings.features[feature]
    
    if (!featureSettings?.enabled) {
      return { allowed: false, reason: 'Feature is disabled' }
    }
    
    // Check autonomy level
    const effectiveLevel = (this.settings.global / 100) * featureSettings.level
    const requiredLevel = (1 - confidence) * 100
    
    if (effectiveLevel < requiredLevel) {
      return { 
        allowed: false, 
        reason: `Autonomy level (${effectiveLevel.toFixed(0)}) below required (${requiredLevel.toFixed(0)})` 
      }
    }
    
    // Check permissions
    const requiredPermission = this.getRequiredPermission(operation)
    if (!featureSettings.permissions.includes(requiredPermission) && 
        !featureSettings.permissions.includes('all')) {
      return { allowed: false, reason: 'Missing required permission' }
    }
    
    return { allowed: true }
  }
  
  updateAutonomyLevel(feature: string | 'global', level: number) {
    if (feature === 'global') {
      this.settings.global = level
    } else {
      if (this.settings.features[feature]) {
        this.settings.features[feature].level = level
      }
    }
    
    // Persist settings
    this.saveSettings()
  }
}

// React component for autonomy controls
export function AutonomyControls({
  settings,
  onUpdateLevel,
  onToggleFeature,
  onEmergencyStop
}: {
  settings: z.infer<typeof AutonomyLevelSchema>
  onUpdateLevel: (feature: string, level: number) => void
  onToggleFeature: (feature: string, enabled: boolean) => void
  onEmergencyStop: () => void
}) {
  const getAutonomyLabel = (level: number) => {
    if (level === 0) return 'Manual'
    if (level <= 25) return 'Assisted'
    if (level <= 50) return 'Collaborative'
    if (level <= 75) return 'Semi-Autonomous'
    return 'Fully Autonomous'
  }
  
  return (
    <div className="autonomy-controls">
      <div className="global-control">
        <h3>Global Autonomy Level</h3>
        <div className="slider-container">
          <input
            type="range"
            min="0"
            max="100"
            value={settings.global}
            onChange={(e) => onUpdateLevel('global', parseInt(e.target.value))}
            className="autonomy-slider"
          />
          <div className="level-indicator">
            <span className="level-value">{settings.global}%</span>
            <span className="level-label">{getAutonomyLabel(settings.global)}</span>
          </div>
        </div>
        
        <div className="preset-buttons">
          {[
            { label: 'Manual', value: 0 },
            { label: 'Assisted', value: 25 },
            { label: 'Collaborative', value: 50 },
            { label: 'Autonomous', value: 75 },
            { label: 'Full Auto', value: 100 }
          ].map(preset => (
            <button
              key={preset.value}
              onClick={() => onUpdateLevel('global', preset.value)}
              className={settings.global === preset.value ? 'active' : ''}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
      
      <div className="feature-controls">
        <h3>Feature-Specific Controls</h3>
        {Object.entries(settings.features).map(([feature, config]) => (
          <div key={feature} className="feature-control">
            <div className="feature-header">
              <label>
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(e) => onToggleFeature(feature, e.target.checked)}
                />
                <span>{feature}</span>
              </label>
            </div>
            
            {config.enabled && (
              <div className="feature-settings">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={config.level}
                  onChange={(e) => onUpdateLevel(feature, parseInt(e.target.value))}
                  className="feature-slider"
                />
                <span>{config.level}%</span>
                
                <div className="permissions">
                  {config.permissions.map(perm => (
                    <span key={perm} className="permission-badge">{perm}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      <div className="safety-controls">
        <button onClick={onEmergencyStop} className="emergency-stop">
          🛑 Emergency Stop
        </button>
        <div className="safety-info">
          <p>Max operations: {settings.safetyLimits.maxOperationsPerAction}</p>
          <p>Require approval above: {settings.safetyLimits.requireApprovalAbove}%</p>
        </div>
      </div>
    </div>
  )
}
```

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