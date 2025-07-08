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