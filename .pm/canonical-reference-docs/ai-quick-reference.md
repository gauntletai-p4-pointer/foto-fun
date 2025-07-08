# FotoFun AI System - Quick Reference

## AI SDK v5 Tool Pattern (Epic 5 - CURRENT)

### Creating an AI-Compatible Tool Adapter

```typescript
// lib/ai/adapters/tools/brightness.ts
import { z } from 'zod'
import { BaseToolAdapter } from '../base'
import { brightnessTool } from '@/lib/tools/brightnessTool'

// 1. Define clear parameter schema with units
const brightnessParameters = z.object({
  adjustment: z.number()
    .min(-100)
    .max(100)
    .describe('Brightness adjustment from -100 to 100')
})

type BrightnessInput = z.infer<typeof brightnessParameters>

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
  description = 'Adjust image brightness by a percentage value from -100 (darkest) to 100 (brightest), where 0 is no change.'
  
  parameters = brightnessParameters
  
  async execute(params: BrightnessInput, context: { canvas: Canvas }): Promise<BrightnessOutput> {
    const canvas = context.canvas
    
    // Validate canvas has content
    if (canvas.getObjects().length === 0) {
      throw new Error('No image to adjust brightness')
    }
    
    // Apply brightness adjustment
    const filter = new fabric.Image.filters.Brightness({
      brightness: params.adjustment / 100 // Convert to 0-1 range
    })
    
    canvas.getObjects().forEach(obj => {
      if (obj.type === 'image') {
        obj.filters = obj.filters || []
        obj.filters.push(filter)
        obj.applyFilters()
      }
    })
    
    canvas.renderAll()
    
    return {
      success: true,
      previousValue: 0,
      newValue: params.adjustment
    }
  }
  
  // Optional: Validate tool can execute
  canExecute(canvas: Canvas): boolean {
    return canvas.getObjects().some(obj => obj.type === 'image')
  }
  
  // Optional: Generate preview
  async generatePreview(params: BrightnessInput, canvas: Canvas) {
    const before = canvas.toDataURL()
    
    // Clone canvas for preview
    const tempCanvas = new fabric.Canvas(null, {
      width: canvas.getWidth(),
      height: canvas.getHeight()
    })
    
    // Apply changes to temp canvas
    // ... apply brightness to tempCanvas
    
    const after = tempCanvas.toDataURL()
    tempCanvas.dispose()
    
    return { before, after }
  }
}
```

### Registering the Adapter

```typescript
// In lib/ai/adapters/registry.ts autoDiscoverAdapters()
const { BrightnessToolAdapter } = await import('./tools/brightness')
adapterRegistry.register(new BrightnessToolAdapter())
```

## Key Principles for AI Tools

### 1. Clear Parameter Schemas
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

// ✅ GOOD - Comprehensive
description = 'Crop the image to specified pixel coordinates. The x,y coordinates specify the top-left corner of the crop area, and width/height define the crop size in pixels.'
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
  parameters = z.object({
    amount: z.number()
      .min(-100)
      .max(100)
      .describe('Adjustment amount from -100 to 100')
  })
  
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
  parameters = z.object({
    width: z.number().min(1).describe('Width in pixels'),
    height: z.number().min(1).describe('Height in pixels'),
    maintainAspectRatio: z.boolean().optional()
  })
  
  async execute(params, context) {
    // 1. Calculate transform
    // 2. Apply to canvas
    // 3. Handle constraints
  }
}
```

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

## Common Gotchas & Solutions

### 1. Canvas Not Available Error
**Problem**: "Canvas is not available after initialization"
**Cause**: Race condition between canvas init and tool execution
**Solution**: 
```typescript
// Always wait for canvas and verify it exists
await useCanvasStore.getState().waitForReady()
const canvas = useCanvasStore.getState().fabricCanvas
if (!canvas) throw new Error('Canvas not ready')
```

### 2. Tool Not Found
**Problem**: "No AI adapter found for tool: X"
**Cause**: Tool not registered or wrong name used
**Solution**:
```typescript
// Check available tools
console.log(adapterRegistry.getAll().map(t => t.aiName))
// Ensure adapter is registered in autoDiscoverAdapters()
```

### 3. Natural Language Not Working
**Problem**: AI asks for exact parameters instead of calculating
**Cause**: Canvas context not passed or system prompt incomplete
**Solution**:
```typescript
// Pass canvas context with EVERY message
const canvasContext = {
  dimensions: { width: canvas.getWidth(), height: canvas.getHeight() },
  hasContent: canvas.getObjects().length > 0
}
sendMessage({ text }, { body: { canvasContext } })
```

### 4. TypeScript Errors with AI SDK v5
**Problem**: Type inference fails with `tool()` function
**Solution**:
```typescript
// Cast through unknown for complex types
return tool({...}) as unknown as Tool<unknown, unknown>
```

### 5. Tool Parameters Not Validating
**Problem**: Zod validation fails unexpectedly
**Solution**:
```typescript
// Be explicit with descriptions and constraints
z.number()
  .min(0)
  .max(100)
  .describe('Value from 0 to 100') // Clear description
```

## Debugging Checklist

When a tool isn't working:

1. **Check Canvas State**
   ```typescript
   const state = useCanvasStore.getState()
   console.log({
     isReady: state.isReady,
     hasCanvas: !!state.fabricCanvas,
     objects: state.fabricCanvas?.getObjects().length
   })
   ```

2. **Verify Tool Registration**
   ```typescript
   console.log('Registered tools:', adapterRegistry.getAll().map(t => t.aiName))
   ```

3. **Test Tool Directly**
   ```typescript
   const adapter = adapterRegistry.get('cropImage')
   const result = await adapter.execute(
     { x: 0, y: 0, width: 100, height: 100 },
     { canvas: fabricCanvas }
   )
   ```

4. **Check AI Messages**
   - Look for tool invocation parts in the message
   - Verify parameters are being passed correctly
   - Check for error messages in tool state

5. **Verify Canvas Context**
   ```typescript
   const context = CanvasToolBridge.getCanvasContext()
   console.log('Canvas context:', context)
   ```

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