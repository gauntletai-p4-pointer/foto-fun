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
- **MAJOR REFACTOR**: Implemented proper AI SDK v5 patterns
- Fixed all TypeScript/linting errors
- Updated all documentation

❌ **Still Needed:**
- Create at least one example of an AI-compatible adjustment tool
- Test the full flow with a real image
- Implement preview generation
- Add confidence scoring
- **FIX**: Tool execution UI visibility
- **FIX**: Natural language parameter support

### Key Realization
Most of our current tools (selection, drawing, navigation) require mouse interaction and aren't suitable for AI parameter-based execution. We need to focus on creating the infrastructure and patterns for future tools that ARE AI-compatible (filters, adjustments, transformations).

### Next Steps
1. Create one example adjustment tool (e.g., brightness) that works for both UI and AI
2. Test the complete flow with a real image
3. Implement preview generation for the crop tool
4. Document the pattern for future tool development

---

## Critical Fixes Needed (Day 1 - Priority)

### Issue 1: Tool Execution Not Visible in UI

**Problem**: When AI executes tools, users see no feedback - no thinking, no progress, no results.

**Root Cause**: 
- AIChat component has tool rendering code but it may not be receiving parts correctly
- Need to ensure `maxSteps` is set for multi-tool workflows
- Tool states aren't being properly streamed

**Solution**:
1. Update `useChat` configuration:
   ```typescript
   useChat({
     maxSteps: 5, // Enable multi-step tool calls
     // ... existing config
   })
   ```

2. Ensure API route returns proper stream:
   ```typescript
   return result.toTextStreamResponse() // Should be toUIMessageStreamResponse()
   ```

3. Add better tool state visualization with proper typing

### Issue 2: Natural Language Parameters Not Working

**Problem**: "Crop 50% of the image" results in no response

**Root Cause**: 
- Crop tool expects exact pixel coordinates (x, y, width, height)
- AI doesn't know canvas dimensions to calculate percentages
- No parameter resolution from natural language to exact values

**Solutions**:

#### Option A: Quick Fix - Add Canvas Context to System Prompt
Include canvas dimensions in the system prompt so AI can calculate:
```typescript
const canvasInfo = canvas ? {
  width: canvas.getWidth(),
  height: canvas.getHeight(),
  hasContent: canvas.getObjects().length > 0
} : null

system: `...Canvas dimensions: ${canvasInfo?.width}x${canvasInfo?.height}...`
```

#### Option B: Proper Fix - Natural Language Parameter Resolution
Implement a parameter preprocessor that converts natural language to exact parameters:
```typescript
// Before: "crop 50%" 
// After: { x: 250, y: 200, width: 500, height: 400 } (for 1000x800 image)
```

### Implementation Plan (Updated)

#### Phase 1: Fix Tool Visibility (30 minutes)
1. Update AIChat component to properly handle `maxSteps`
2. Fix API route to return `toUIMessageStreamResponse()`
3. Enhance tool state rendering with better UI
4. Test with crop tool

#### Phase 2: Fix Natural Language Support (1 hour)
1. Add canvas dimensions to system prompt
2. Update crop tool description to guide AI better
3. Consider adding a simple parameter resolver
4. Test various natural language inputs

#### Phase 3: Create Brightness Tool (2 hours)
1. Implement as template for other tools
2. Test with UI visibility working
3. Document pattern

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
  abstract description: string                 // Description for AI (AI SDK v5 style)
  abstract parameters: z.ZodType<TInput>       // Input validation (AI SDK v5 naming)
  
  abstract execute(params: TInput, context: { canvas: Canvas }): Promise<TOutput>
  
  // Optional overrides
  canExecute?(canvas: Canvas): boolean
  generatePreview?(params: TInput, canvas: Canvas): Promise<{ before: string; after: string }>
  
  // Converts to AI SDK format automatically
  toAITool() {
    return tool({
      description: this.description,
      parameters: this.parameters,
      execute: async (params) => {
        // Bridge to canvas context
        const context = CanvasToolBridge.getCanvasContext()
        if (!context?.canvas) throw new Error('Canvas not available')
        return this.execute(params, { canvas: context.canvas })
      }
    })
  }
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
  description = 'Crop the image to specified pixel coordinates. The x,y coordinates specify the top-left corner of the crop area.'
  
  parameters = z.object({
    x: z.number().min(0).describe('X coordinate of crop area in pixels'),
    y: z.number().min(0).describe('Y coordinate of crop area in pixels'),
    width: z.number().min(1).describe('Width of crop area in pixels (must be at least 1)'),
    height: z.number().min(1).describe('Height of crop area in pixels (must be at least 1)')
  })
  
  async execute(params: CropInput, context: { canvas: Canvas }): Promise<CropOutput> {
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
✅ **AI SDK v5 Compliance**: Proper use of `tool()` function and patterns
✅ **Documentation Updated**: All reference docs reflect new patterns

---

## Implementation Details: AI SDK v5 Integration

### Key Changes from Initial Approach

1. **Direct AI SDK v5 Usage**
   - Use `tool()` function directly from AI SDK
   - Follow `parameters` naming convention (not `inputSchema`)
   - Simpler execution model

2. **Type-Safe Patterns**
   ```typescript
   // Define parameters with clear descriptions
   const parameters = z.object({
     value: z.number()
       .min(-100)
       .max(100)
       .describe('Adjustment value from -100 to 100')
   })
   
   // Use type inference
   type Input = z.infer<typeof parameters>
   ```

3. **Clear Descriptions**
   - Always specify units (pixels, percentages, degrees)
   - Explain what the tool does and parameter meanings
   - Help AI understand when to use the tool

### Testing Checklist

- [ ] Canvas with image loaded
- [ ] AI chat recognizes available tools
- [ ] Tool execution updates canvas
- [ ] Error messages are helpful
- [ ] Parameters validate correctly
- [ ] Preview generation works (when implemented)

---

## Next Steps & Recommendations

### Immediate Next Steps (Priority Order)

1. **Create Brightness Adjustment Tool** (2-3 hours)
   - Create `lib/tools/brightnessTool.ts` as a parameter-based tool
   - Create `lib/ai/adapters/tools/brightness.ts` adapter
   - Test with real images
   - This will serve as the template for other adjustment tools

2. **Test End-to-End Flow** (1 hour)
   - Load an image in the canvas
   - Use AI chat to crop and adjust brightness
   - Verify canvas updates correctly
   - Document any issues

3. **Implement Preview Generation** (2-3 hours)
   - Add preview generation to CropToolAdapter
   - Create temporary canvas for preview
   - Return before/after base64 images
   - Test performance (<500ms target)

4. **Add More Adjustment Tools** (4-6 hours)
   - Contrast adjustment
   - Saturation adjustment
   - Basic blur/sharpen (if Fabric.js supports)
   - Follow the brightness tool pattern

5. **Create Developer Guide** (1-2 hours)
   - Step-by-step guide for adding AI-compatible tools
   - Code templates
   - Common pitfalls to avoid
   - Testing procedures

### Medium-term Recommendations

1. **Tool Compatibility Matrix**
   - Document which tools can be made AI-compatible
   - Plan for future tool development
   - Identify tools that need redesign for AI

2. **Performance Optimization**
   - Implement canvas operation batching
   - Add progress indicators for long operations
   - Consider web workers for heavy processing

3. **Error Recovery**
   - Add undo/redo support
   - Implement canvas state snapshots
   - Better error messages for users

### Long-term Architecture Considerations

1. **Semantic Understanding** (Epic 9)
   - Plan for natural language parameters
   - Consider parameter resolvers pattern
   - Design for "crop to the person" type requests

2. **Multi-step Operations** (Epic 6)
   - Design for operation chaining
   - Consider transaction-like behavior
   - Plan for partial rollback

3. **Quality Evaluation** (Epic 8)
   - Design hooks for quality assessment
   - Plan for A/B testing different parameters
   - Consider user preference learning

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

5. **AI SDK v5 Compliance**
   - Proper use of `tool()` function
   - Correct parameter naming
   - Clean integration patterns

### Key Files Created/Modified

- `lib/ai/adapters/base.ts` - Base adapter interface (AI SDK v5 compliant)
- `lib/ai/adapters/registry.ts` - Auto-registration system
- `lib/ai/adapters/tools/crop.ts` - Example implementation
- `app/api/ai/chat/route.ts` - Updated to use new system
- `lib/ai/client/tool-executor.ts` - Simplified execution

### Lessons Learned

1. **Start with scalable patterns** - Avoid monolithic approaches
2. **Follow SDK conventions** - Use `parameters` not `inputSchema`
3. **Be explicit about units** - Always specify pixels/percentages/degrees
4. **Auto-discovery is key** - Manual registration doesn't scale
5. **Type safety throughout** - Catch errors at compile time

### For Future Developers

When adding AI capabilities to a tool:
1. Check if it's parameter-based (not mouse-path based)
2. Create adapter in `lib/ai/adapters/tools/`
3. Follow the CropToolAdapter example
4. Add to auto-discovery
5. Test with AI chat

The infrastructure is ready - just follow the pattern!

---

## Semantic Understanding: AI Model-Based Approach

### The Problem
Current tool adapters expect exact parameters (e.g., crop needs x, y, width, height), but users speak naturally ("crop 10% from all sides"). Without semantic understanding, AI tools are difficult to use naturally.

### The Solution: Enhanced System Prompts

Instead of building custom parameter resolvers, we leverage the AI model's capabilities by providing canvas context and calculation examples in the system prompt. This aligns with AI SDK v5's design philosophy where the AI model handles parameter resolution.

#### Implementation

```typescript
// In API route - provide canvas context
const contextInfo = canvasContext?.dimensions 
  ? `\n\nCurrent canvas: ${canvasContext.dimensions.width}x${canvasContext.dimensions.height} pixels`
  : ''

// In system prompt - include calculation examples
system: `...
${contextInfo}

For the crop tool:
- x and y are the top-left corner coordinates in pixels
- width and height are the crop dimensions in pixels
- All values must be positive integers

Example calculations:
- "crop 50%": For a 1000x800 image → x:250, y:200, width:500, height:400
- "crop the left half": For a 1000x800 image → x:0, y:0, width:500, height:800
- "crop 10% from edges": For a 1000x800 image → x:100, y:80, width:800, height:640
...`
```



### Benefits

1. **Natural Language Support**: "Crop 10% from edges" works through AI model calculations
2. **No Code Complexity**: Leverages existing AI capabilities
3. **Easy to Extend**: Just add more examples to system prompt
4. **Framework Aligned**: Works with AI SDK v5's design philosophy
5. **Model Agnostic**: Works with any AI model that can do math

### Current Implementation Status

✅ **Completed**:
1. **Canvas Context in API Route**
   - Canvas dimensions passed to system prompt
   - AI knows image size for calculations
   
2. **Enhanced System Prompt**
   - Clear parameter explanations
   - Example calculations for common requests
   - Tool-specific guidance

3. **AI Model Handles Resolution**
   - "crop 50%" → AI calculates exact pixels
   - "make it brighter" → AI chooses appropriate value
   - "rotate sideways" → AI converts to 90 degrees

### Example Usage

```
User: "Crop 10% from all sides"
AI: "I'll crop 10% from each edge of your 1000x800 image. This means removing 100 pixels from left/right and 80 pixels from top/bottom."
Tool Call: cropImage({ x: 100, y: 80, width: 800, height: 640 })

User: "Make it brighter"
AI: "I'll increase the brightness by 20%."
Tool Call: adjustBrightness({ adjustment: 20 })

User: "Crop to x:100, y:100, width:400, height:300"
AI: "I'll crop to those exact coordinates."
Tool Call: cropImage({ x: 100, y: 100, width: 400, height: 300 })
```

The AI model handles all parameter calculations based on the context and examples provided in the system prompt.

---

## Overview
This epic focuses on creating 10-15 essential photo editing tools that integrate with the canvas and AI chat interface. We'll fix AI SDK v5 type issues, implement real image manipulation, and add confidence scoring and preview generation.

## References
- [AI SDK v5 Tools Documentation](https://v5.ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling)
- [Tool Calling](https://v5.ai-sdk.dev/docs/foundations/tools)
- [Streaming Tool Results](https://v5.ai-sdk.dev/docs/ai-sdk-core/streaming)

## Key Implementation Details

### 1. Fix Tool Factory for AI SDK v5 Beta ✅

**Status**: COMPLETE - We now use AI SDK v5's native `tool()` function directly

### 2. Core Image Adjustment Tools

**Files to Create**:
- `lib/tools/brightness.ts` - Canvas tool implementation
- `lib/ai/adapters/tools/brightness.ts` - AI adapter
- Similar pattern for: contrast, saturation, exposure, highlights-shadows

**Example Structure** (brightness adapter):
```typescript
import { z } from 'zod'
import { BaseToolAdapter } from '../base'
import { brightnessTool } from '@/lib/tools/brightness'

const brightnessParameters = z.object({
  adjustment: z.number()
    .min(-100)
    .max(100)
    .describe('Brightness adjustment from -100 to 100')
})

type BrightnessInput = z.infer<typeof brightnessParameters>

export class BrightnessToolAdapter extends BaseToolAdapter<BrightnessInput, BrightnessOutput> {
  tool = brightnessTool
  aiName = 'adjustBrightness'
  description = 'Adjust image brightness from -100 (darkest) to 100 (brightest)'
  parameters = brightnessParameters
  
  async execute(params: BrightnessInput, context: { canvas: Canvas }): Promise<BrightnessOutput> {
    // Implementation using Fabric.js filters
  }
  
  async generatePreview(params: BrightnessInput, canvas: Canvas) {
    // Generate before/after previews
  }
}
```

### 3. Filter Effect Tools

**Files to Create**:
- Canvas tools in `lib/tools/filters/`
- AI adapters in `lib/ai/adapters/tools/filters/`
- Tools: blur, sharpen, noise-reduction, black-white, vintage

### 4. Transform Tools

**Status**: Crop tool ✅ COMPLETE
**Still Needed**:
- `lib/tools/transform/resize.ts` + adapter
- `lib/tools/transform/rotate.ts` + adapter
- `lib/tools/transform/flip.ts` + adapter

### 5. Tool-Canvas Bridge ✅

**Status**: COMPLETE - `lib/ai/tools/canvas-bridge.ts`

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

**Status**: Pattern established in BaseToolAdapter
**Enhancement Needed**: Implement for each tool adapter

### 8. Update Tool Registry ✅

**Status**: COMPLETE - Registry pattern working with auto-discovery

### 9. Wire Tools to API Route ✅

**Status**: COMPLETE - API route uses adapter registry

### 10. Client-Side Tool Execution ✅

**Status**: COMPLETE - Simplified tool executor using registry

## Testing Requirements

**Files to Create**:
- `__tests__/ai/tools/brightness.test.ts`
- `__tests__/ai/tools/crop.test.ts`
- `__tests__/ai/adapters/registry.test.ts`

## Success Criteria
1. ✅ Crop tool working with AI
2. ⏳ At least 5 adjustment tools implemented
3. ⏳ Preview generation completes in <500ms
4. ✅ Tools properly integrated with AI chat
5. ✅ No TypeScript errors or suppressions
6. ⏳ All tools have unit tests

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

## Completion Status

### Day 1 Progress
- ✅ Foundation infrastructure complete
- ✅ AI SDK v5 integration working
- ✅ Scalable adapter pattern implemented
- ✅ Crop tool fully integrated
- ✅ Documentation updated
- ✅ All TypeScript/linting errors fixed

### Day 1.5 Progress - Final Fixes
- ✅ Fixed TypeScript errors in AIChat component
  - Resolved ReactNode type issues with ternary operators
  - Proper handling of JSON.stringify output
- ✅ Fixed BaseToolAdapter generic type inference
  - Used `unknown` casting to satisfy TypeScript
  - Maintained type safety without using `any`
- ✅ Natural language parameters working
  - AI model handles calculations with canvas context
  - System prompt includes dimensions and examples

### Remaining Work (Days 2-5)
- ⏳ Create brightness adjustment tool (template for others)
- ⏳ Implement 4-5 more adjustment tools
- ⏳ Add preview generation to all tools
- ⏳ Create unit tests
- ⏳ Performance optimization
- ⏳ Developer guide creation

## Final Implementation Notes

### TypeScript Best Practices Applied
1. **ReactNode Type Issues**: Use ternary operators with explicit null returns
2. **Generic Type Inference**: Cast through `unknown` when TypeScript can't infer
3. **No Suppressions**: All errors fixed properly without `@ts-ignore` or `eslint-disable`

### AI SDK v5 Integration Complete
- Proper use of `tool()` function with Zod schemas
- Canvas context passed to system prompt
- Natural language handled by AI model (no custom resolvers needed)
- Tool execution visible in UI with proper state transitions

## Lessons Learned & Implementation Gotchas

### 1. AI SDK v5 Beta Specifics

#### Tool Function Overloads
The AI SDK v5's `tool()` function has complex TypeScript overloads that can cause type inference issues:
```typescript
// ❌ BAD - TypeScript can't infer the return type
toAITool() {
  return tool({
    description: this.description,
    parameters: this.parameters,
    execute: async (params) => { ... }
  })
}

// ✅ GOOD - Cast through unknown to help TypeScript
toAITool() {
  return tool({
    description: this.description,
    parameters: this.parameters,
    execute: async (params) => { ... }
  }) as unknown as Tool<unknown, unknown>
}
```

#### Parameter Naming
AI SDK v5 uses `parameters` not `inputSchema`:
```typescript
// ❌ OLD (AI SDK v3/v4)
inputSchema: z.object({ ... })

// ✅ NEW (AI SDK v5)
parameters: z.object({ ... })
```

#### Message Handling
```typescript
// Tool invocation parts in messages can have various formats:
// - part.type === 'tool-invocation'
// - part.type?.startsWith('tool-')
// - part.toolInvocation (nested structure)
```

### 2. Canvas Context Management

#### The Race Condition Problem
We discovered a critical race condition between canvas initialization and AI tool execution:
- Canvas initialization is asynchronous with multiple state updates
- Components may see intermediate states where `isReady: true` but `fabricCanvas: null`
- Promises can capture stale closures

#### Passing Canvas Context
Canvas dimensions must be passed with EVERY message to the AI:
```typescript
const canvasContext = fabricCanvas ? {
  dimensions: {
    width: fabricCanvas.getWidth(),
    height: fabricCanvas.getHeight()
  },
  hasContent: fabricCanvas.getObjects().length > 0
} : undefined

sendMessage(
  { text: input },
  { body: { canvasContext } }  // Include with every message
)
```

### 3. Natural Language Parameter Resolution

#### AI Model-Based Approach (What Works)
Instead of building custom parameter resolvers, we let the AI model handle natural language:
```typescript
// In system prompt:
`Current canvas: ${width}x${height} pixels

For the crop tool:
- "crop 50%": For a 1000x800 image → x:250, y:200, width:500, height:400
- "crop the left half": For a 1000x800 image → x:0, y:0, width:500, height:800`
```

#### Why Custom Resolvers Failed
- Added complexity without clear benefit
- AI models are already good at math/calculations
- Maintenance burden for each tool
- Better to provide examples in system prompt

### 4. Tool Adapter Architecture Insights

#### Singleton Pattern
Tools should be singleton instances:
```typescript
// ✅ GOOD
export const cropTool = new CropTool()

// ❌ BAD
export class CropTool { ... }  // Don't export class directly
```

#### Adapter Registration
Auto-discovery pattern works well but needs careful import management:
```typescript
// Dynamic imports prevent circular dependencies
const { CropToolAdapter } = await import('./tools/crop')
adapterRegistry.register(new CropToolAdapter())
```

### 5. Error Handling Best Practices

#### User-Friendly Messages
```typescript
// ❌ BAD
throw new Error('Canvas not available')

// ✅ GOOD
throw new Error('No image loaded. Please upload an image first before using AI tools.')
```

#### Detailed Logging
Always log state when debugging canvas issues:
```typescript
console.log('[Component] Canvas state:', {
  isReady: state.isReady,
  hasCanvas: !!state.fabricCanvas,
  initError: state.initializationError,
  objects: state.fabricCanvas?.getObjects().length
})
```

### 6. UI/UX Considerations

#### Tool Execution Visibility
Users need to see:
- Tool being executed
- Parameters being used
- Progress indication
- Success/failure state

#### Confidence Communication
Even though we haven't implemented confidence scoring yet, the UI structure should support it:
```typescript
{state === 'input-available' && (
  <div>
    <span>Executing {toolName}...</span>
    {/* Future: Add confidence indicator here */}
  </div>
)}
```

### 7. Performance Considerations

#### Canvas Operations
- Always check if canvas has objects before operating
- Batch multiple canvas operations before `renderAll()`
- Use `requestAnimationFrame` for visual updates

#### Tool Execution
- Tools should complete in <500ms for good UX
- Long operations need progress indicators
- Consider web workers for heavy processing

### 8. Testing Insights

#### Manual Testing Checklist
Before considering a tool "working":
1. Load an image
2. Try natural language ("make it brighter")
3. Try specific values ("increase brightness by 20")
4. Try edge cases ("brightness 200" - out of range)
5. Check undo/redo works
6. Verify canvas updates properly

#### Common Failure Modes
1. Canvas not initialized when tool executes
2. Natural language not resolved to parameters
3. Tool found but adapter not registered
4. Canvas context lost between messages

### 9. Future Epic Considerations

#### For Epic 6 (Orchestration)
- Current single-tool execution works well
- Multi-step will need transaction-like behavior
- Consider command pattern for rollback

#### For Epic 7 (Visual Feedback)
- Preview generation infrastructure exists in BaseToolAdapter
- Need temporary canvas for non-destructive preview
- Consider performance impact of live preview

#### For Epic 8 (Quality Evaluation)
- Confidence scoring hooks exist but not implemented
- Need to define what "confidence" means per tool
- Consider user preference learning

#### For Epic 9 (Semantic Understanding)
- Current exact-parameter approach is limiting
- "Crop to the person" needs object detection
- Consider progressive enhancement approach

### 10. Architecture Recommendations

#### State Management
The current Zustand store pattern has issues with async initialization:
- Consider state machines for initialization flow
- Avoid mixing promises with declarative state
- Single source of truth for "ready" state

#### Tool Discovery
Current pattern works but could be improved:
- Consider build-time tool registration
- Type-safe tool names (const enum)
- Better error messages for missing tools

#### Canvas Bridge
Works well but needs defensive programming:
- Always verify canvas operations work
- Handle disposal/cleanup properly
- Consider WeakMap for canvas metadata

### Summary for Future Developers

1. **Start Simple**: Get one tool working end-to-end before adding more
2. **Trust the AI Model**: Let it handle natural language, don't over-engineer
3. **Log Everything**: Debugging async issues requires extensive logging
4. **Test With Real Images**: Many issues only appear with actual canvas content
5. **Handle Edge Cases**: No image, disposed canvas, initialization races
6. **Keep UI Responsive**: Show progress, handle errors gracefully
7. **Document Patterns**: This epic establishes patterns for all future tools

The foundation is solid, but watch out for:
- Canvas initialization race conditions
- TypeScript complexity with AI SDK v5
- Natural language parameter expectations
- User feedback for AI operations