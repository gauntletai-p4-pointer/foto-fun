# FotoFun AI System - Quick Reference

## Terminology Overview

### Component Hierarchy
1. **Canvas Tools** (`lib/editor/tools/`) - Core tools that manipulate Fabric.js canvas
   - Examples: `cropTool`, `brightnessTool` (camelCase singletons)
   
2. **Tool Adapters** (`lib/ai/adapters/tools/`) - Make any tool AI-compatible
   - Examples: `CropToolAdapter`, `InpaintingToolAdapter` (PascalCase classes)
   - Works for both Canvas Tools and AI-Native Tools
   
3. **AI-Native Tools** (`lib/ai/tools/`) - Tools that call external AI services
   - Examples: `InpaintingTool`, `ImageGenerationTool` (PascalCase classes)
   - Also use Tool Adapters for AI integration
   
4. **Agent Steps** (`lib/ai/agents/steps/`) - Workflow building blocks
   - Types: `ToolStep`, `EvaluationStep`, `PlanningStep` (PascalCase)
   
5. **Agents** (`lib/ai/agents/`) - Workflow orchestrators
   - Examples: `SequentialEditingAgent`, `MasterRoutingAgent` (PascalCase)

### Key Pattern: Unified Adapter System
```typescript
// Both Canvas and AI-Native tools use same adapter pattern
const cropAdapter = new CropToolAdapter()         // Wraps canvas tool
const inpaintAdapter = new InpaintingToolAdapter() // Wraps AI API tool

// Both register identically
adapterRegistry.register(cropAdapter)
adapterRegistry.register(inpaintAdapter)
```

## AI SDK v5 Tool Pattern (Epic 5 - CURRENT)

### Creating an AI-Compatible Tool Adapter

```typescript
// lib/ai/adapters/tools/brightness.ts
import { z } from 'zod'
import { BaseToolAdapter } from '../base'
import { brightnessTool } from '@/lib/tools/brightnessTool'

// 1. Define clear parameter schema with units
const brightnessInputSchema = z.object({
  adjustment: z.number()
    .min(-100)
    .max(100)
    .describe('Brightness adjustment from -100 to 100')
})

type BrightnessInput = z.infer<typeof brightnessInputSchema>

// 2. Define output type
interface BrightnessOutput {
  success: boolean
  previousValue: number
  newValue: number
}

// 3. Create adapter class
export class BrightnessToolAdapter extends BaseToolAdapter<
  BrightnessInput,
  BrightnessOutput
> {
  tool = brightnessTool
  aiName = 'adjustBrightness'
  description = `Adjust image brightness. You MUST calculate the adjustment value based on user intent.
Common patterns: 'brighter' → +20%, 'much brighter' → +40%, 'slightly darker' → -10%
NEVER ask for exact values - interpret the user's intent.`
  
  inputSchema = brightnessInputSchema // AI SDK v5 uses 'inputSchema'
  
  async execute(params: BrightnessInput, context: { canvas: Canvas }): Promise<BrightnessOutput> {
    // Implementation
    const previousValue = context.canvas.getBrightness()
    await this.tool.execute(params.adjustment)
    
    return {
      success: true,
      previousValue,
      newValue: previousValue + params.adjustment
    }
  }
}
```

## AI SDK v5 Key Patterns

### 1. Tool Definition
```typescript
// ✅ CORRECT - AI SDK v5
import { tool } from 'ai'

const myTool = tool({
  description: 'Tool description',
  inputSchema: z.object({  // NOT 'parameters'
    field: z.string()
  }),
  execute: async (params) => {
    // Implementation
  }
})
```

### 2. BaseToolAdapter Implementation
Our adapter pattern correctly implements AI SDK v5:
```typescript
export abstract class BaseToolAdapter<TInput, TOutput> {
  abstract tool: Tool
  abstract aiName: string
  abstract description: string
  abstract inputSchema: z.ZodType<TInput>  // Correct for AI SDK v5
  
  abstract execute(params: TInput, context: { canvas: Canvas }): Promise<TOutput>
  
  toAITool() {
    return tool({
      description: this.description,
      inputSchema: this.inputSchema,  // Passed correctly to AI SDK
      execute: async (args) => {
        // Server-side placeholder
        return { success: true, clientExecutionRequired: true, params: args }
      }
    })
  }
}
```

## Schema Best Practices

### 1. Clear Types
```typescript
// ❌ BAD - Ambiguous
z.number().describe('Width')

// ✅ GOOD - Explicit
z.number()
  .min(1)
  .describe('Width in pixels (must be at least 1)')
```

### 2. Explicit Units
```typescript
// ❌ BAD - No units
rotation: z.number().describe('Rotation amount')

// ✅ GOOD - Clear units
rotation: z.number()
  .min(-360)
  .max(360)
  .describe('Rotation angle in degrees (positive = clockwise)')
```

### 3. Helpful Descriptions
```typescript
// ❌ BAD - Too brief
description = 'Crop image'

// ✅ GOOD - Comprehensive with calculation guidance
description = `Crop the image to a specific area. You MUST calculate exact pixel coordinates based on user intent.
Common patterns:
- "crop left/right half" → calculate x:0 or x:width/2
- "crop 50%" → keep center 50% (trim 25% from each edge)
NEVER ask for pixel values - calculate them from canvas dimensions.`
```

## AI Tool Categories

### Parameter-Based Tools (AI Compatible ✅)
These tools accept discrete parameters and can be controlled by AI:

- **Adjustments**: brightness, contrast, saturation, exposure
- **Transforms**: crop, resize, rotate, flip
- **Filters**: blur, sharpen, vintage, black & white
- **Colors**: hue, saturation, color balance
- **Text**: add text at position with style
- **Shapes**: rectangles, circles with dimensions

### Interactive Tools (Not AI Compatible ❌)
These require mouse/touch interaction:

- **Selection**: marquee, lasso, magic wand
- **Drawing**: brush, pencil, eraser
- **Navigation**: hand, zoom
- **Paths**: pen tool, bezier curves

## Common Patterns

### Basic Adjustment Tool
```typescript
export class AdjustmentToolAdapter extends BaseToolAdapter<Input, Output> {
  inputSchema = z.object({
    amount: z.number()
      .min(-100)
      .max(100)
      .describe('Adjustment amount from -100 to 100')
  })
  
  description = `Adjust the setting. Calculate values based on:
    - "more/increase" → positive values
    - "less/decrease" → negative values
    - "slightly" → ±10-20
    - "moderately" → ±30-50
    - "significantly" → ±60-100`
  
  async execute(params, context) {
    // 1. Validate canvas state
    // 2. Apply adjustment
    // 3. Return result
  }
}
```

### Transform Tool
```typescript
export class TransformToolAdapter extends BaseToolAdapter<Input, Output> {
  inputSchema = z.object({
    width: z.number().min(1).describe('Target width in pixels'),
    height: z.number().min(1).describe('Target height in pixels'),
    maintainAspectRatio: z.boolean().describe('Whether to maintain aspect ratio')
  })
  
  description = `Resize the image. Calculate dimensions from:
    - Percentages: "50% smaller" → multiply current by 0.5
    - Aspect ratios: "16:9" → calculate from current dimension
    - Fixed sizes: "1920x1080" → use exact values`
  
  async execute(params, context) {
    // Transform implementation
  }
}
```

## Common Gotchas & Solutions

### 1. Canvas Not Available Error
**Problem**: "Canvas is not available after initialization"
**Cause**: Race condition or stale closure
**Solution**: 
```typescript
// Always get fresh state from store
const currentState = useCanvasStore.getState()
if (!currentState.fabricCanvas) throw new Error('Canvas not ready')
```

### 2. Tool Not Found
**Problem**: "Tool not found: X"
**Cause**: Tool not registered on client side
**Solution**:
```typescript
// Ensure client-side registration
await autoDiscoverAdapters()
```

### 3. Natural Language Not Working
**Problem**: AI asks for exact parameters
**Solution**: Include calculation examples in description:
```typescript
description = `Crop image. Calculate coordinates from:
  - "left half" → x:0, width:canvas.width/2
  - "center square" → calculate largest centered square`
```

## Client-Server Architecture

### Server-Side (Planning)
- AI decides which tool to use
- Validates parameters against inputSchema
- Returns placeholder result

### Client-Side (Execution)
- Receives tool selection from server
- Executes actual canvas manipulation
- Has access to DOM and Fabric.js

## Migration Notes from AI SDK v4

### Key Changes in v5:
- `parameters` → `inputSchema`
- `maxTokens` → `maxOutputTokens`
- `providerMetadata` → `providerOptions` (input)
- `experimental_activeTools` → `activeTools`
- `StreamData` class removed

### Our Implementation Status:
- ✅ Using `inputSchema` correctly
- ✅ Client-server separation working
- ✅ Tool registration automated
- ✅ Natural language support via descriptions

## Canvas Bridge Usage

```typescript
// Get canvas context in your adapter
import { CanvasToolBridge } from '@/lib/ai/tools/canvas-bridge'

const context = CanvasToolBridge.getCanvasContext()
if (!context?.canvas) {
  throw new Error('Canvas not available')
}

// Access canvas properties
const { canvas, dimensions, selection } = context
console.log(`Canvas size: ${dimensions.width}x${dimensions.height}`)
```

## Error Handling

```typescript
// In your adapter's execute method
async execute(params: Input, context: { canvas: Canvas }) {
  // Check prerequisites
  if (!context.canvas) {
    throw new Error('Canvas is required for this operation')
  }
  
  const objects = context.canvas.getObjects()
  if (objects.length === 0) {
    throw new Error('No objects on canvas to modify')
  }
  
  // Validate bounds
  if (params.x < 0 || params.y < 0) {
    throw new Error('Coordinates must be positive')
  }
  
  if (params.x + params.width > context.canvas.getWidth()) {
    throw new Error('Selection exceeds canvas bounds')
  }
  
  // ... rest of implementation
}
```

## Testing Your Adapter

```typescript
// Test the adapter directly
const adapter = new MyToolAdapter()
const mockCanvas = new fabric.Canvas(null)

// Add test image
const img = new fabric.Image(testImageElement)
mockCanvas.add(img)

// Test execution
const result = await adapter.execute(
  { value: 50 },
  { canvas: mockCanvas }
)

expect(result.success).toBe(true)
```

## AI Chat Integration

Once registered, your tool is automatically available in AI chat:

```
User: "Make the image brighter"
AI: I'll increase the brightness of your image.
[Executes adjustBrightness tool with adjustment: 20]
```

The AI will:
1. Parse the user's intent
2. Select the appropriate tool
3. Determine parameters from context
4. Execute through your adapter
5. Show results to user

## Quick Debugging

```typescript
// Log available tools
console.log(adapterRegistry.getAll().map(a => a.aiName))

// Test tool discovery
const tools = adapterRegistry.getAITools()
console.log(Object.keys(tools))

// Check tool parameters
const cropTool = tools.cropImage
console.log(cropTool.parameters.shape)
```

## Performance Tips

1. **Canvas Operations**: Batch multiple changes before `renderAll()`
2. **Preview Generation**: Use lower resolution for previews
3. **Validation**: Do cheap checks before expensive operations
4. **Memory**: Dispose temporary canvases after use

## Best Practices Summary

### DO:
- ✅ Pass canvas dimensions with every AI message
- ✅ Use descriptive error messages for users
- ✅ Log extensively during development
- ✅ Test with real images, not empty canvas
- ✅ Handle edge cases (no image, disposed canvas)
- ✅ Use singleton pattern for tools
- ✅ Let AI model handle natural language math

### DON'T:
- ❌ Build complex parameter resolvers
- ❌ Assume canvas is ready without checking
- ❌ Use `inputSchema` (use `parameters` instead)
- ❌ Export tool classes directly
- ❌ Mix promises with state management
- ❌ Suppress TypeScript errors
- ❌ Forget to batch canvas operations

## Testing Your AI Tool

```bash
# 1. Start dev server
bun dev

# 2. Load an image
# 3. Open browser console for logs
# 4. Try these test phrases:
- "crop 50% of the image"
- "crop to 500x500"
- "crop the top half"

# 5. Check for:
- Tool execution visible in UI
- Canvas updates after execution
- No console errors
- Proper error messages for edge cases
```

## Architecture Insights

### State Management Issues
The current Zustand store has async initialization challenges:
- State updates aren't atomic
- Promises can capture stale closures
- Multiple sources of truth (`isReady`, `fabricCanvas`, promises)

### Recommended Patterns
1. **Single State Update**: Update all related state atomically
2. **Polling Over Promises**: For checking ready state
3. **Defensive Programming**: Always verify canvas operations
4. **Explicit Context**: Pass context explicitly, don't rely on globals

### Tool Adapter Pattern Success
The adapter pattern works well because:
- Separates AI concerns from tool logic
- Allows progressive enhancement
- Maintains single implementation
- Scales to many tools

## Future Epic Guidance

### Epic 6 (Orchestration)
- Build on single-tool execution
- Add transaction/rollback support
- Consider command pattern

### Epic 7 (Visual Feedback)
- Preview infrastructure exists
- Need temporary canvas approach
- Consider performance impact

### Epic 8 (Quality)
- Define confidence metrics per tool
- Add quality assessment hooks
- Consider user preference learning

### Epic 9 (Semantic)
- Current approach limits semantic understanding
- Need object detection for "crop to person"
- Consider progressive enhancement 