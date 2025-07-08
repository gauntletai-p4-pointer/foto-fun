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

## Common Gotchas

1. **Canvas State**: Always check canvas has objects before operating
2. **Units**: Be explicit about pixels vs percentages vs degrees
3. **Bounds**: Validate parameters are within valid ranges
4. **Types**: Use Zod inference for type safety
5. **Errors**: Provide clear, actionable error messages
6. **Preview**: Clone canvas for preview, don't modify original

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

## Future Patterns (Coming in Later Epics)

### Semantic Understanding (Epic 9)
```typescript
// Future: Natural language parameters
"Make it 20% brighter" → { adjustment: 20 }
"Crop to the person" → { target: 'detected-person-bounds' }
```

### Multi-Step Operations (Epic 6)
```typescript
// Future: Complex workflows
"Remove background and add blur" → [
  { tool: 'removeBackground' },
  { tool: 'addBlur', params: { strength: 5 } }
]
```

### Quality Evaluation (Epic 8)
```typescript
// Future: AI evaluates results
const quality = await evaluateEdit(before, after, intent)
if (quality.score < 0.7) {
  // Suggest improvements
}
``` 