# FotoFun AI System - Quick Reference

## Tool Adapter Pattern (NEW - Epic 5)

### Creating a Tool Adapter
```typescript
// lib/ai/adapters/tools/brightness.ts
import { z } from 'zod'
import { BaseToolAdapter } from '../base'
import { brightnessTool } from '@/lib/tools/brightnessTool'

const BrightnessInputSchema = z.object({
  adjustment: z.number().min(-100).max(100)
    .describe('Brightness adjustment from -100 to 100')
})

const BrightnessOutputSchema = z.object({
  success: z.boolean(),
  previousValue: z.number(),
  newValue: z.number()
})

export class BrightnessToolAdapter extends BaseToolAdapter<
  z.infer<typeof BrightnessInputSchema>,
  z.infer<typeof BrightnessOutputSchema>
> {
  tool = brightnessTool
  aiName = 'adjustBrightness'
  aiDescription = 'Adjust image brightness by a percentage'
  
  inputSchema = BrightnessInputSchema
  outputSchema = BrightnessOutputSchema
  
  async execute(params, canvas) {
    // Your implementation here
    return { success: true, previousValue: 0, newValue: params.adjustment }
  }
  
  // Optional: Add preview generation
  async generatePreview(params, canvas) {
    const before = canvas.toDataURL()
    // Apply temporary change for preview
    const after = canvas.toDataURL()
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

### Key Points
- Each tool gets its own adapter file
- Extends BaseToolAdapter for consistency
- Auto-registers with the AI system
- Type-safe with Zod schemas
- Preview generation is optional but recommended

### Parameter Resolvers (For Natural Language)
```typescript
// lib/ai/adapters/resolvers/brightness.ts
export class BrightnessParameterResolver extends BaseParameterResolver<BrightnessInput> {
  async resolve(naturalInput: string, context: CanvasContext): Promise<BrightnessInput> {
    // Use AI to understand intent
    const { object } = await generateObject({
      model: openai('gpt-4'),
      schema: z.object({
        direction: z.enum(['brighter', 'darker', 'auto']),
        intensity: z.enum(['slight', 'moderate', 'significant']).optional(),
        amount: z.number().optional()
      }),
      prompt: naturalInput
    })
    
    // Convert to exact parameters
    if (object.amount) return { adjustment: object.amount }
    
    const amounts = {
      brighter: { slight: 10, moderate: 25, significant: 50 },
      darker: { slight: -10, moderate: -25, significant: -50 }
    }
    
    return { 
      adjustment: amounts[object.direction]?.[object.intensity || 'moderate'] || 20 
    }
  }
}

// In your adapter
export class BrightnessToolAdapter extends BaseToolAdapter<...> {
  parameterResolver = new BrightnessParameterResolver()
  // ... rest of implementation
}
```

Now your tool works with:
- "Make it brighter" → adjustment: 25
- "Significantly darker" → adjustment: -50
- "Increase brightness by 30" → adjustment: 30

## Tool Creation Cheat Sheet

### Basic Tool Template
```typescript
export const myTool = ToolFactory.createTool({
  name: 'toolName',
  category: 'filter', // or 'transform', 'edit', 'selection', 'text', 'generation'
  description: 'What this tool does',
  inputSchema: z.object({
    param1: z.number().min(0).max(100),
    param2: z.string().optional()
  }),
  outputSchema: z.object({
    success: z.boolean(),
    result: z.any()
  }),
  executionSide: 'client', // or 'server' or 'both'
  requiresCanvas: true,
  
  clientExecutor: async (input, context) => {
    const canvas = context.canvas!
    // Do something with canvas
    return { success: true, result: 'done' }
  }
})
```

### Semantic Tool Template
```typescript
export const semanticTool = ToolFactory.createTool({
  name: 'semanticAction',
  category: 'edit',
  description: 'Act on objects by description',
  inputSchema: z.object({
    target: z.string().describe('What to target (e.g., "the hat")'),
    action: z.string()
  }),
  
  clientExecutor: async (input, context) => {
    // Detect objects
    const objects = await ObjectDetector.detectObjects(
      context.canvas!.toDataURL(),
      input.target
    )
    
    if (objects.length === 0) {
      throw new Error(`Could not find "${input.target}"`)
    }
    
    // Act on detected objects
    for (const obj of objects) {
      // Use obj.bounds or obj.polygon
    }
  }
})
```

## Common AI SDK v5 Patterns

### Using generateObject for Structured Data
```typescript
import { generateObject } from 'ai'
import { openai } from '@/lib/ai/providers'
import { z } from 'zod'

const { object } = await generateObject({
  model: openai('gpt-4o'),
  schema: z.object({
    field1: z.string(),
    field2: z.number()
  }),
  prompt: 'Extract structured data from this request'
})
```

### Vision Analysis with GPT-4V
```typescript
const { object } = await generateObject({
  model: openai('gpt-4o-vision'),
  schema: MySchema,
  messages: [{
    role: 'user',
    content: [
      { type: 'text', text: 'Analyze this image' },
      { type: 'image', image: base64Image }
    ]
  }]
})
```

### Streaming Tool Results
```typescript
const result = streamText({
  model: openai('gpt-4o'),
  messages,
  tools: toolRegistry.toAISDKTools(),
  maxSteps: 5,
  onStepFinish: ({ stepType, toolCalls }) => {
    // Handle each step
  }
})
```

## Object Detection Patterns

### Simple Object Detection
```typescript
// Find specific objects
const hats = await ObjectDetector.detectObjects(image, "all hats")
const person = await ObjectDetector.detectObjects(image, "the person on the left")
```

### Comprehensive Image Analysis
```typescript
// Get full image breakdown
const regions = await SemanticAnalyzer.analyzeImageRegions(image)

// Access different types
regions.people[0].parts.shirt // Shirt bounds
regions.objects.filter(o => o.wornBy === 'person1') // Items worn by person
regions.emptyAreas // Good spots for adding content
```

### Smart Text Placement
```typescript
// Add text intelligently
const placement = await PlacementAdvisor.suggestTextPlacement(
  image,
  "on his shirt", // where
  "SALE",        // what text
  { fontSize: 24 } // optional style
)
// Returns position, rotation, color suggestions
```

## Orchestration Patterns

### Simple Single-Step
```typescript
// Direct tool call
await toolRegistry.get('adjustBrightness').execute(
  { amount: 20 },
  { canvas }
)
```

### Multi-Step Workflow
```typescript
const plan = {
  steps: [
    { 
      id: "1", 
      tool: "semanticErase", 
      params: { target: "the background" } 
    },
    { 
      id: "2", 
      tool: "generateFill", 
      params: { prompt: "beach scene" },
      dependencies: ["1"] // Runs after step 1
    }
  ]
}

await orchestrator.executePlan(plan)
```

### Intent-Based Execution
```typescript
// Let AI figure out the steps
await orchestrator.orchestrate(
  "Remove the people and make it look like a sunset",
  canvasContext
)
```

## Common Schemas

### Bounds Schema
```typescript
const BoundsSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number()
})
```

### Detection Result
```typescript
interface DetectedObject {
  id: string
  label: string
  confidence: number
  bounds: Bounds
  polygon?: Point[]
  attributes?: Record<string, any>
}
```

### Tool Context
```typescript
interface ToolExecutionContext {
  canvas?: fabric.Canvas
  selection?: fabric.Object[]
  user?: User
  aiContext?: {
    conversation: Message[]
    intent: Intent
  }
}
```

## Error Handling

### Tool Errors
```typescript
// In tool executor
if (!context.canvas) {
  throw new Error('Canvas is required for this operation')
}

if (objects.length === 0) {
  throw new Error(`Could not find "${input.target}" in the image`)
}
```

### Graceful Degradation
```typescript
try {
  // Try semantic detection
  const objects = await ObjectDetector.detectObjects(image, target)
} catch (error) {
  // Fall back to basic selection
  console.warn('Semantic detection failed, using basic selection')
  return basicSelection()
}
```

## Performance Tips

### Parallel Execution
```typescript
// Good - Parallel
const [brightness, contrast, saturation] = await Promise.all([
  adjustBrightness(image, 20),
  adjustContrast(image, 10),
  adjustSaturation(image, -15)
])

// Bad - Sequential
const brightness = await adjustBrightness(image, 20)
const contrast = await adjustContrast(image, 10)
const saturation = await adjustSaturation(image, -15)
```

### Caching Detection Results
```typescript
const detectionCache = new Map()

async function detectWithCache(image: string, query: string) {
  const key = `${hashImage(image)}-${query}`
  
  if (detectionCache.has(key)) {
    return detectionCache.get(key)
  }
  
  const result = await ObjectDetector.detectObjects(image, query)
  detectionCache.set(key, result)
  return result
}
```

## Testing Patterns

### Mock Vision Responses
```typescript
// In tests
jest.mock('@/lib/ai/vision/object-detector', () => ({
  ObjectDetector: {
    detectObjects: jest.fn().mockResolvedValue([
      {
        id: 'test-1',
        label: 'hat',
        confidence: 0.95,
        bounds: { x: 100, y: 50, width: 80, height: 60 }
      }
    ])
  }
}))
```

### Test Tool Execution
```typescript
it('should erase detected object', async () => {
  const result = await semanticEraseTool.execute(
    { target: 'the hat' },
    { canvas: mockCanvas }
  )
  
  expect(result.erasedObjects).toHaveLength(1)
  expect(result.erasedObjects[0].label).toBe('hat')
})
```

## Tool Adapter Troubleshooting

### Common Issues

1. **Tool not appearing in AI chat**
   - Check adapter is registered in `autoDiscoverAdapters()`
   - Verify adapter extends `BaseToolAdapter`
   - Check for import errors in registry

2. **"Canvas required" errors**
   - Ensure tool is marked with `requiresCanvas: true`
   - Check canvas context is available
   - Verify Fabric.js canvas is initialized

3. **Type errors in adapter**
   ```typescript
   // Use type inference for schemas
   type MyInput = z.infer<typeof MyInputSchema>
   type MyOutput = z.infer<typeof MyOutputSchema>
   ```

4. **Tool execution fails**
   - Check canvas has objects (for tools like crop)
   - Validate input parameters are within bounds
   - Test execute method independently

## Common Gotchas

1. **Canvas State**: Always check `context.canvas` exists before using
2. **Async Detection**: Object detection is async - don't forget await
3. **Bounds Validation**: Validate bounds are within image dimensions
4. **Tool Registration**: Register tools before using in chat
5. **Schema Matching**: Input/output schemas must match AI SDK expectations
6. **Vision API Limits**: GPT-4V has rate limits - implement retry logic
7. **Base64 Size**: Large images can exceed limits - resize if needed
8. **Coordinate Systems**: Fabric.js uses different origin than some APIs
9. **Adapter Pattern**: Each tool needs its own adapter file
10. **Auto-discovery**: Must manually add to registry for now

## Debugging Commands

```typescript
// Log tool registry
console.log(toolRegistry.getAllTools())

// Check if tool exists
console.log(toolRegistry.has('semanticErase'))

// Debug detection results
const objects = await ObjectDetector.detectObjects(image, query)
console.log('Detected:', objects.map(o => ({
  label: o.label,
  confidence: o.confidence,
  bounds: o.bounds
})))

// Visualize bounds on canvas
function debugDrawBounds(canvas: fabric.Canvas, bounds: Bounds) {
  const rect = new fabric.Rect({
    left: bounds.x,
    top: bounds.y,
    width: bounds.width,
    height: bounds.height,
    fill: 'transparent',
    stroke: 'red',
    strokeWidth: 2
  })
  canvas.add(rect)
}
``` 