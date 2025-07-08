# Epic 5: Core AI Tool Implementation & Canvas Integration

## Developer Workflow Instructions

### GitHub Branch Strategy
1. **Branch Naming**: Create a feature branch named `epic-5-core-ai-tools`
2. **Base Branch**: Branch off from `main` 
3. **Commits**: Use conventional commits (e.g., `feat: add brightness adjustment tool`, `fix: tool factory type issues`)
4. **Pull Request**: 
   - Title: "Epic 5: Core AI Tool Implementation & Canvas Integration"
   - Description: Reference this epic document and list completed items
   - Request review from at least one other developer
   - Ensure all CI checks pass before merging

### Development Guidelines
1. **Before Starting**: 
   - Pull latest `main` branch
   - Run `bun install` to ensure dependencies are up to date
   
2. **During Development**:
   - Only modify files related to your epic
   - Run `bun lint && bun typecheck` frequently
   - Fix all errors/warnings in YOUR files only (not other epics' files)
   - NO eslint-disable comments or @ts-ignore suppressions allowed
   
3. **Testing Requirements**:
   - Manually test ALL AI tools you implement
   - Test confidence scoring accuracy
   - Test preview generation performance
   - Test tool execution on actual images
   - Test error handling and edge cases
   - Document test scenarios in PR description

4. **Before Creating PR**:
   - Run `bun lint && bun typecheck` - must pass with 0 errors/warnings in your files
   - Test all functionality manually
   - Update this epic document marking completed items
   - Commit the updated epic document

### Coordination
- Check #dev-canvas channel in Slack/Discord for updates
- Don't modify files being worked on in other epics
- If you need changes in shared files (e.g., constants, types), coordinate with team

### Epic Start Process

Before implementing AI tools:

1. **Deep Dive Analysis** (Required)
   - Study existing AI chat implementation in `app/api/ai/chat/route.ts`
   - Analyze current tool factory and registry patterns
   - Understand AI SDK v5 beta type issues and solutions
   - Document canvas-to-AI integration points
   - NO ASSUMPTIONS - verify everything in actual code

2. **Research Phase**
   - Study how Photoshop's AI features work
   - Research confidence scoring algorithms
   - Investigate preview generation techniques
   - Compare server vs client-side tool execution

3. **Gap Identification**
   - Tool-canvas bridge implementation
   - Confidence scoring system design
   - Preview generation pipeline
   - Error handling for AI operations

### Epic End Process

1. **Quality Validation**
   - All 15 tools working with real images
   - Confidence scoring accurate (>0.7 threshold)
   - Preview generation <500ms
   - Proper AI SDK v5 integration

2. **Integration Testing**
   - Test tools with various image types
   - Test error scenarios and fallbacks
   - Test performance with multiple operations
   - Verify tool state management

3. **Documentation**
   - AI tool creation guide
   - Confidence scoring methodology
   - Tool factory patterns

---

## Current State Analysis & Implementation Plan

### What's Already Implemented ✅

1. **AI Chat UI** 
   - Functional chat panel in left sidebar
   - Message rendering with user/assistant distinction
   - Loading states and error handling
   - Quick action buttons
   - Tool state rendering (input-streaming, input-available, output-available, output-error)
   - Uses `@ai-sdk/react` with `useChat` hook

2. **Basic AI Integration**
   - OpenAI GPT-4o configured
   - Streaming responses working
   - System prompt for photo editing assistant
   - Proper message conversion (UIMessage → ModelMessage)

3. **Tool Infrastructure**
   - Tool factory pattern with AI SDK v5 workarounds
   - Tool registry with category filtering
   - Base tool interfaces with Zod schemas
   - Support for client/server/both execution modes

4. **Canvas Tools (Non-AI)**
   - 10 working canvas manipulation tools
   - Fabric.js integration established
   - Tool state management patterns
   - Selection system with visual feedback

### What's Missing ❌

1. **AI Tool Implementations**
   - Zero AI-callable tools created
   - No canvas-to-AI bridge
   - No tool execution handling in chat

2. **Core Systems**
   - Confidence scoring system
   - Preview generation system
   - Tool-canvas bridge
   - Client-side tool executor

3. **AI-Specific Features**
   - Parameter adjustment UI
   - Visual comparison/preview
   - Multi-step orchestration
   - Progress tracking

### Implementation Plan

#### NEW APPROACH: AI Uses Existing Tools
Rather than creating separate AI-specific tools, we're building infrastructure for AI to use the same tools that users interact with. This ensures DRY, maintainable code.

#### Phase 1: Foundation Infrastructure ✅ (Day 1)
1. **Canvas Bridge** ✅
   - `lib/ai/tools/canvas-bridge.ts`
   - Canvas context extraction
   - Image data handling
   - Snapshot/restore functionality
2. **Tool Adapter Pattern** ✅ (REFACTORED)
   - `lib/ai/adapters/base.ts` - Base adapter interface
   - `lib/ai/adapters/registry.ts` - Auto-registration system
   - `lib/ai/adapters/tools/crop.ts` - Example implementation
   - Each tool gets its own adapter file (scalable pattern)
3. **Client Tool Executor** ✅
   - `lib/ai/client/tool-executor.ts`
   - Simplified to use tool registry
   - Handles both AI tools and adapted tools

#### Phase 2: Tool Integration ✅ (Day 1)
1. **Crop Tool Adapter** ✅
   - First working example
   - Full implementation with preview
   - Integrated with AI chat
2. **API Route Integration** ✅
   - Auto-discovery of adapters
   - Dynamic system prompt
   - Tool execution wired up

#### Senior-Level Architecture Decisions ✅
1. **Scalable Adapter Pattern**
   - Each tool has its own adapter file
   - Base class provides common functionality
   - Type-safe with generics
2. **Auto-Registration System**
   - Adapters automatically register with tool registry
   - System prompt dynamically generated
   - No manual tool list maintenance
3. **Unified Tool Registry**
   - Single source of truth for all tools
   - Both AI tools and adapted canvas tools
   - Consistent execution interface

#### Phase 3: Additional Tool Adapters (Days 2-3)
When new tools that are AI-compatible are created:
1. Create adapter in `lib/ai/adapters/tools/[toolname].ts`
2. Extend `BaseToolAdapter`
3. Define input/output schemas
4. Implement execute method
5. Add to auto-discovery in registry

#### Phase 4: AI-Native Tools (Days 3-4)
For tools that don't exist in canvas yet:
1. **Brightness/Contrast** - When filter system exists
2. **Saturation/Exposure** - When filter system exists
3. **Blur/Sharpen** - When filter system exists

#### Phase 5: Testing & Integration (Days 6-7)
1. **Test Infrastructure**
   - Tool discovery
   - Execution flow
   - Error handling
2. **Create Demo Tools**
   - One or two simple adjustment tools
   - Show the pattern for future development

### Current Progress

✅ **Completed Today:**
- Canvas bridge for AI-canvas interaction
- Tool adapter pattern for using existing tools
- Client tool executor
- Identified that most current tools aren't AI-compatible (they're interactive drawing tools)

❌ **Still Needed:**
- Wire tools to API route
- Create at least one example of an AI-compatible adjustment tool
- Update system prompt with available tools
- Test the full flow

### Key Realization
Most of our current tools (selection, drawing, navigation) require mouse interaction and aren't suitable for AI parameter-based execution. We need to focus on creating the infrastructure and patterns for future tools that ARE AI-compatible (filters, adjustments, transformations).

### Next Steps
1. Create one example adjustment tool (e.g., brightness) that works for both UI and AI
2. Wire everything to the API route
3. Test the complete flow
4. Document the pattern for future tool development

---

## Architecture: Scalable Tool Adapter Pattern

### Overview
We've implemented a scalable, maintainable pattern for making canvas tools AI-compatible. Instead of a monolithic adapter file, each tool gets its own adapter that follows a consistent interface.

### Key Components

#### 1. Base Adapter (`lib/ai/adapters/base.ts`)
```typescript
export abstract class BaseToolAdapter<TInput, TOutput> {
  abstract tool: Tool                          // The canvas tool being adapted
  abstract aiName: string                      // AI-friendly name
  abstract aiDescription: string               // Description for AI
  abstract inputSchema: z.ZodType<TInput>      // Input validation
  abstract outputSchema: z.ZodType<TOutput>    // Output validation
  
  abstract execute(params: TInput, canvas: any): Promise<TOutput>
  
  // Optional overrides
  canExecute?(canvas: any): boolean
  generatePreview?(params: TInput, canvas: any): Promise<{ before: string; after: string }>
  
  // Converts to AI SDK format automatically
  toAITool(): FotoFunTool
}
```

#### 2. Adapter Registry (`lib/ai/adapters/registry.ts`)
- **Auto-registration**: When an adapter is registered, it automatically creates an AI tool
- **Dynamic discovery**: System prompt is generated from registered adapters
- **Single source of truth**: All tools (AI-native and adapted) go through the same registry

#### 3. Individual Adapters (`lib/ai/adapters/tools/*.ts`)
Each tool adapter:
- Extends `BaseToolAdapter`
- Defines clear input/output schemas with Zod
- Implements the actual tool logic
- Can provide preview generation
- Self-contained and maintainable

### Example: Crop Tool Adapter

```typescript
export class CropToolAdapter extends BaseToolAdapter<CropInput, CropOutput> {
  tool = cropTool
  aiName = 'cropImage'
  aiDescription = 'Crop the image to specified boundaries...'
  
  inputSchema = z.object({
    x: z.number().min(0),
    y: z.number().min(0),
    width: z.number().min(1),
    height: z.number().min(1)
  })
  
  async execute(params: CropInput, canvas: any): Promise<CropOutput> {
    // Implementation that mirrors the actual crop tool logic
  }
}
```

### Adding New Tool Adapters

1. **Create adapter file**: `lib/ai/adapters/tools/[toolname].ts`
2. **Extend BaseToolAdapter**: Define input/output types
3. **Implement execute**: Core tool logic
4. **Register in auto-discovery**: Add to `autoDiscoverAdapters()` in registry
5. **Test**: The tool is automatically available to AI

### Benefits of This Architecture

1. **Scalability**: Each tool is independent, no giant files
2. **Type Safety**: Full TypeScript support with generics
3. **Maintainability**: Changes to one tool don't affect others
4. **DRY Principle**: Tools work for both UI and AI
5. **Auto-discovery**: No manual tool list maintenance
6. **Consistent Interface**: All tools follow the same pattern

### Current Status

✅ **Working Example**: Crop tool fully integrated
✅ **Infrastructure Complete**: All patterns established
✅ **AI Integration**: Tools automatically available in chat

### Next Steps

When creating new canvas tools:
1. Determine if tool is AI-compatible (parameter-based, not mouse-path based)
2. Create adapter following the pattern
3. AI can immediately use the tool

---

## Summary of Implementation

### What We Built

1. **Scalable Architecture**
   - Each tool adapter is independent
   - No monolithic files that grow unbounded
   - Clear separation of concerns

2. **Type-Safe System**
   - Full TypeScript support
   - Zod schemas for validation
   - Generic base class for flexibility

3. **Auto-Registration**
   - Tools automatically available to AI
   - Dynamic system prompt generation
   - Single source of truth

4. **DRY Principle**
   - Canvas tools work for both UI and AI
   - No duplicate implementations
   - Consistent behavior

### Key Files Created

- `lib/ai/adapters/base.ts` - Base adapter interface
- `lib/ai/adapters/registry.ts` - Auto-registration system
- `lib/ai/adapters/tools/crop.ts` - Example implementation
- Updated `app/api/ai/chat/route.ts` - Uses new system
- Updated `lib/ai/client/tool-executor.ts` - Simplified execution

### Lessons Learned

1. **Start with scalable patterns** - Avoid monolithic approaches
2. **Use composition over inheritance** - Adapters wrap tools
3. **Auto-discovery is key** - Manual registration doesn't scale
4. **Type safety throughout** - Catch errors at compile time

### For Future Developers

When adding AI capabilities to a tool:
1. Check if it's parameter-based (not mouse-path based)
2. Create adapter in `lib/ai/adapters/tools/`
3. Follow the CropToolAdapter example
4. Add to auto-discovery
5. Test with AI chat

The infrastructure is ready - just follow the pattern!

---

## Proposed Enhancement: Semantic Preprocessing Layer

### The Problem
Current tool adapters expect exact parameters (e.g., crop needs x, y, width, height), but users speak naturally ("crop 10% from all sides"). Without semantic understanding, AI tools are nearly impossible to test effectively.

### The Solution: Parameter Resolvers

Instead of waiting for Epic 6's full orchestration system, we introduce a lightweight pattern where each tool adapter can have an optional **Parameter Resolver** that preprocesses natural language into exact parameters.

#### Architecture

```typescript
// lib/ai/adapters/resolvers/base.ts
export abstract class BaseParameterResolver<TInput> {
  abstract resolve(
    naturalInput: string,
    context: CanvasContext
  ): Promise<TInput>
}

// lib/ai/adapters/resolvers/crop.ts
export class CropParameterResolver extends BaseParameterResolver<CropInput> {
  async resolve(naturalInput: string, context: CanvasContext): Promise<CropInput> {
    const { canvas } = context
    const width = canvas.getWidth()
    const height = canvas.getHeight()
    
    // Use GPT-4 to understand the request
    const { object } = await generateObject({
      model: openai('gpt-4'),
      schema: z.object({
        mode: z.enum(['percentage', 'aspect-ratio', 'absolute', 'object-based']),
        // ... mode-specific parameters
      }),
      system: `Canvas dimensions: ${width}x${height}`,
      prompt: naturalInput
    })
    
    // Convert to absolute coordinates
    return this.convertToAbsolute(object, width, height)
  }
}
```

#### Enhanced Base Adapter

```typescript
export abstract class BaseToolAdapter<TInput, TOutput> {
  // ... existing properties
  
  // Optional parameter resolver
  parameterResolver?: BaseParameterResolver<TInput>
  
  // Enhanced toAITool method
  toAITool(): FotoFunTool {
    const baseTool = // ... existing implementation
    
    if (this.parameterResolver) {
      // Wrap the executor to use resolver
      const originalExecutor = baseTool.clientExecutor
      baseTool.clientExecutor = async (input: unknown, context: any) => {
        // If input is a string, use resolver
        if (typeof input === 'string') {
          input = await this.parameterResolver.resolve(input, context)
        }
        return originalExecutor(input, context)
      }
    }
    
    return baseTool
  }
}
```

### Benefits

1. **Natural Language Support**: "Crop 10% from edges" works immediately
2. **Progressive Enhancement**: Tools work with both exact params and natural language
3. **Testable AI**: Can actually test AI capabilities without manual calculations
4. **Reusable Pattern**: Each tool can have its own resolver
5. **No Epic Dependencies**: Don't need to wait for Epic 6

### Implementation Plan

#### Phase 6: Semantic Preprocessing (Days 3-4)
1. **Base Resolver Pattern**
   - Create `BaseParameterResolver` abstract class
   - Add resolver support to `BaseToolAdapter`
   - Handle both string and object inputs

2. **Crop Resolver Implementation**
   - Support percentage-based cropping
   - Support aspect ratio cropping
   - Support object-aware cropping ("crop to just the person")
   - Use canvas dimensions from context

3. **Future Resolver Examples**
   - Brightness: "make it brighter" → adjustment: 20
   - Resize: "make it half size" → width: 50%, height: 50%
   - Rotate: "turn it sideways" → angle: 90

### Example Usage

```typescript
// User says: "Crop 10% from all sides"
// AI receives this and passes to cropImage tool
// CropParameterResolver converts to: { x: 100, y: 80, width: 800, height: 640 }
// Tool executes with exact parameters

// Also works with exact params:
// User says: "Crop to x:100, y:100, width:400, height:300"
// No resolver needed, passes through directly
```

### Context Enhancement

Update CanvasToolBridge to always provide dimensions:

```typescript
getCanvasContext(): CanvasContext | null {
  // ... existing code
  return {
    canvas,
    imageData,
    selection,
    dimensions: {
      width: canvas.getWidth(),
      height: canvas.getHeight()
    },
    metadata: {
      zoom: canvasStore.zoom,
      documentName: documentStore.currentDocument?.name
    }
  }
}
```

This gives AI and resolvers the context they need to make intelligent decisions.

---

## Overview
This epic focuses on creating 10-15 essential photo editing tools that integrate with the canvas and AI chat interface. We'll fix AI SDK v5 type issues, implement real image manipulation, and add confidence scoring and preview generation.

## References
- [AI SDK v5 Tools Documentation](https://v5.ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling)
- [Tool Calling](https://v5.ai-sdk.dev/docs/foundations/tools)
- [Streaming Tool Results](https://v5.ai-sdk.dev/docs/ai-sdk-core/streaming)

## Key Implementation Details

### 1. Fix Tool Factory for AI SDK v5 Beta

**File to Modify**: `lib/ai/tools/factory.ts`
```typescript
// Update to properly handle AI SDK v5 beta types
// Key changes:
// - Use 'inputSchema' instead of 'parameters'
// - Handle tool states: input-streaming, input-available, output-available, output-error
// - Proper type casting for beta SDK
```

**File to Modify**: `lib/ai/tools/base.ts`
```typescript
// Update AISDKTool type to match v5 beta
// Add proper generic constraints
// Update tool states enum
```

### 2. Core Image Adjustment Tools

**Files to Create**:
- `lib/ai/tools/canvas/brightness.ts`
- `lib/ai/tools/canvas/contrast.ts`
- `lib/ai/tools/canvas/saturation.ts`
- `lib/ai/tools/canvas/exposure.ts`
- `lib/ai/tools/canvas/highlights-shadows.ts`

**Example Structure** (brightness.ts):
```typescript
import { z } from 'zod'
import { ToolFactory } from '../factory'
import type { ToolExecutionContext } from '../base'

const BrightnessInputSchema = z.object({
  adjustment: z.number()
    .min(-100)
    .max(100)
    .describe('Brightness adjustment from -100 to 100'),
  targetArea: z.enum(['whole-image', 'selection', 'layer']).optional()
})

const BrightnessOutputSchema = z.object({
  previousValue: z.number().optional(),
  newValue: z.number(),
  pixelsAffected: z.number(),
  processingTime: z.number()
})

export const brightnessTool = ToolFactory.createTool({
  name: 'adjustBrightness',
  category: 'filter',
  description: 'Adjust image brightness',
  inputSchema: BrightnessInputSchema,
  outputSchema: BrightnessOutputSchema,
  executionSide: 'client',
  requiresCanvas: true,
  confidenceThreshold: 0.8,
  
  clientExecutor: async (input, context) => {
    // Implementation using Fabric.js filters
  },
  
  previewGenerator: async (input, context) => {
    // Generate before/after previews
  }
})
```

### 3. Filter Effect Tools

**Files to Create**:
- `lib/ai/tools/filters/blur.ts`
- `lib/ai/tools/filters/sharpen.ts`
- `lib/ai/tools/filters/noise-reduction.ts`
- `lib/ai/tools/filters/black-white.ts`
- `lib/ai/tools/filters/vintage.ts`

### 4. Transform Tools

**Files to Create**:
- `lib/ai/tools/transform/ai-crop.ts` (AI-guided cropping)
- `lib/ai/tools/transform/ai-resize.ts`
- `lib/ai/tools/transform/ai-rotate.ts`
- `lib/ai/tools/transform/ai-flip.ts`

### 5. Tool-Canvas Bridge

**File to Create**: `lib/ai/tools/canvas-bridge.ts`
```typescript
// Bridge between AI tools and canvas operations
export class CanvasToolBridge {
  static async executeToolOnCanvas(
    tool: FotoFunTool,
    input: unknown,
    context: ToolExecutionContext
  ): Promise<unknown> {
    // Validate canvas state
    // Execute tool
    // Handle errors
    // Return result
  }
}
```

### 6. Confidence Scoring System

**File to Create**: `lib/ai/confidence/scorer.ts`
```typescript
export class ConfidenceScorer {
  static calculateConfidence(
    userIntent: string,
    toolName: string,
    params: unknown
  ): number {
    // Implement confidence calculation
  }
}
```

### 7. Preview Generation System

**File to Create**: `lib/ai/preview/generator.ts`
```typescript
export class PreviewGenerator {
  static async generatePreview(
    canvas: fabric.Canvas,
    tool: FotoFunTool,
    params: unknown
  ): Promise<{
    before: string, // base64
    after: string,  // base64
    diff?: string   // base64
  }> {
    // Clone canvas
    // Apply operation
    // Generate previews
  }
}
```

### 8. Update Tool Registry

**File to Modify**: `lib/ai/tools/registry.ts`
```typescript
// Add methods for:
// - Getting tools by confidence threshold
// - Filtering tools by canvas state
// - Tool recommendation based on context
```

### 9. Wire Tools to API Route

**File to Modify**: `app/api/ai/chat/route.ts`
```typescript
import { toolRegistry } from '@/lib/ai/tools/registry'
// Import all new tools
import { brightnessTool } from '@/lib/ai/tools/canvas/brightness'
// ... other imports

// Register tools
toolRegistry.registerMany([
  brightnessTool,
  contrastTool,
  // ... etc
])

// Update streamText call
const result = streamText({
  model: openai('gpt-4o'),
  messages: modelMessages,
  tools: toolRegistry.toAISDKTools(), // Convert to AI SDK format
  maxSteps: 5, // Enable multi-step for complex edits
  system: enhancedSystemPrompt,
})
```

### 10. Client-Side Tool Execution

**File to Create**: `lib/ai/client/tool-executor.ts`
```typescript
export class ClientToolExecutor {
  static async execute(
    toolName: string,
    params: unknown,
    context: ToolExecutionContext
  ): Promise<unknown> {
    const tool = toolRegistry.get(toolName)
    if (!tool) throw new Error(`Unknown tool: ${toolName}`)
    
    // Validate requirements
    // Execute with error handling
    // Update UI state
  }
}
```

**File to Modify**: `components/editor/Panels/AIChat/index.tsx`
```typescript
// Add tool execution handling
// Update to handle tool states properly
// Add visual feedback during execution
```

## Testing Requirements

**Files to Create**:
- `__tests__/ai/tools/brightness.test.ts`
- `__tests__/ai/tools/canvas-bridge.test.ts`
- `__tests__/ai/preview/generator.test.ts`

## Success Criteria
1. All 15 tools implemented and working with real images
2. Confidence scoring returns accurate values (>0.7 for clear intents)
3. Preview generation completes in <500ms
4. Tools properly integrated with AI chat
5. No TypeScript errors or suppressions
6. All tools have unit tests

## Dependencies
- Fabric.js filters API
- Canvas API for image manipulation
- AI SDK v5 beta (currently installed)

## Estimated Effort
- 1 developer × 5-7 days
- Requires deep knowledge of:
  - Fabric.js filter system
  - Canvas API
  - AI SDK v5 tool patterns
  - Image processing algorithms 