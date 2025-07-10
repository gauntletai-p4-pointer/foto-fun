# Canvas Tools Migration Guide

## Overview

This document provides a comprehensive guide for migrating all canvas tools, AI native tools, and AI adapters from the Fabric.js architecture to our new event-driven Konva.js architecture.

## Prerequisites - Architectural Setup

Before starting the tool migration, ensure these core services are available:

### 1. Dependency Injection Container
```typescript
import { ServiceContainer } from '@/lib/core/ServiceContainer'
import { AppInitializer } from '@/lib/core/AppInitializer'

// Initialize the DI container
const container = await AppInitializer.initialize()

// Get services
const eventStore = container.get('EventStore')
const resourceManager = container.get('ResourceManager')
const canvasFactory = container.get('CanvasManagerFactory')
```

### 2. Resource Management
All tools now have automatic resource cleanup:
```typescript
class MyTool extends BaseTool {
  protected setupTool(): void {
    // Resources are automatically cleaned up
    this.registerEventListener('mousemove', 
      window, 
      'mousemove', 
      this.handleMouseMove
    )
    
    // Timers are automatically cleared
    this.registerInterval('update', () => {
      this.update()
    }, 100)
  }
  
  // No manual cleanup needed!
}
```

### 3. Event Context
Tools can emit events when used by AI:
```typescript
class MyTool extends BaseTool {
  async applyOperation(): Promise<void> {
    if (this.executionContext) {
      // Emit event for history/undo
      await this.executionContext.emit(new ToolOperationEvent(...))
    }
  }
}
```

## Architecture Principles

### 1. Event Sourcing
- All state changes must emit events through ExecutionContext
- Events enable undo/redo and audit trails
- Use batch events for multiple object modifications

### 2. Pixel-Aware Operations
- Tools can now manipulate pixels directly
- Use `getImageData()` and `putImageData()` for pixel operations
- Leverage WebGL through Konva for performance

### 3. Selection Consistency
- Tools must respect SelectionSnapshot when provided
- Never directly query canvas selection during AI execution
- Use ExecutionContext to lock selection state

### 4. Layer Awareness
- All operations must respect the layer system
- Check layer visibility and lock status
- Maintain proper z-ordering

## Migration Progress Summary

### Phase 2: Tool Migration Status

**Completed Tools (17/31):**
- ✅ Event Types - All tool events implemented
- ✅ MarqueeRectTool - Pixel-aware rectangular selection
- ✅ MarqueeEllipseTool - Pixel-aware elliptical selection  
- ✅ EraserTool - Pixel-based erasing with proper composite operation
- ✅ MoveTool - Object selection and transformation
- ✅ BrightnessTool - Image brightness adjustment with filters
- ✅ CropTool - Non-destructive cropping with visual overlay
- ✅ BlurTool - Gaussian blur filter with adjustable radius
- ✅ ContrastTool - Image contrast adjustment
- ✅ SharpenTool - Image enhancement filter
- ✅ SepiaTool - Sepia tone effect
- ✅ ResizeTool - Smart resizing with quality options
- ✅ SaturationTool - HSL color saturation adjustment
- ✅ GrayscaleTool - Desaturation filter with toggle
- ✅ InvertTool - Color inversion filter with toggle
- ✅ FlipTool - Horizontal/vertical flipping using scale transform
- ✅ HueTool - HSL hue rotation adjustment

**In Progress:**
- 🔄 Selection Tools: 2/5 completed
- ✅ Drawing Tools: 2/2 completed ✅
- 🔄 Transform Tools: 4/5 completed
- 🔄 Adjustment Tools: 4/6 completed
- ✅ Filter Tools: 5/5 completed ✅
- ⏳ Text Tools: 0/4 completed
- ⏳ AI-Native Tools: 0/1 completed
- ⏳ Other Tools: 0/3 completed

**Next Priority Tools:**
1. RotateTool - Last transform tool
2. ExposureTool - Adjustment tool
3. ColorTemperatureTool - Adjustment tool
4. HorizontalTypeTool - Basic text editing

### Migration Patterns Established

1. **Selection Tools Pattern:**
   - Use dedicated Konva.Layer for selection visualization
   - Emit SelectionCreatedEvent on completion
   - Support modifier keys for add/subtract modes

2. **Drawing Tools Pattern:**
   - Use Konva.Line with appropriate globalCompositeOperation
   - Emit StrokeAddedEvent with full stroke data
   - Cache layers for pixel operations

3. **Transform Tools Pattern:**
   - Use Konva.Transformer for visual handles
   - Track original transform state
   - Emit ObjectsTransformedEvent with before/after states

4. **Adjustment Tools Pattern:**
   - Cache images before applying filters
   - Use Konva built-in filters when available
   - Emit FilterAppliedEvent with parameters

5. **Filter Tools Pattern:**
   - Toggle functionality for filters like invert/grayscale
   - Emit FilterAppliedEvent when applying, FilterRemovedEvent when removing
   - Clear cache when no filters remain

## Tool Categories and Migration Status

### 1. Selection Tools
Current tools that need migration:
- `marqueeRectTool` → Pixel-aware rectangular selection ✅ MIGRATED
- `marqueeEllipseTool` → Pixel-aware elliptical selection ✅ MIGRATED
- `lassoTool` → Freeform selection with pixel precision
- `magicWandTool` → Color-based selection (requires pixel access)
- `quickSelectionTool` → Brush-based selection

**Migration Example:**
```typescript
// Old Fabric.js approach
class MarqueeRectTool extends SelectionTool {
  protected createSelection(): void {
    const rect = new fabric.Rect({...})
    this.canvas.setActiveObject(rect)
  }
}

// New Konva approach
class MarqueeRectTool extends BaseTool {
  private selectionRect: Konva.Rect | null = null
  
  onMouseDown(event: ToolEvent): void {
    this.startPoint = { x: event.point.x, y: event.point.y }
    
    // Create visual feedback
    this.selectionRect = new Konva.Rect({
      x: event.point.x,
      y: event.point.y,
      width: 0,
      height: 0,
      stroke: '#000',
      strokeWidth: 1,
      dash: [4, 4]
    })
    
    const canvas = this.getCanvas()
    canvas.selectionLayer.add(this.selectionRect)
  }
  
  onMouseUp(event: ToolEvent): void {
    if (!this.selectionRect) return
    
    const canvas = this.getCanvas()
    const bounds = {
      x: Math.min(this.startPoint.x, event.point.x),
      y: Math.min(this.startPoint.y, event.point.y),
      width: Math.abs(event.point.x - this.startPoint.x),
      height: Math.abs(event.point.y - this.startPoint.y)
    }
    
    // Set pixel-aware selection
    canvas.setSelection({
      type: 'rectangle',
      bounds,
      feather: 0,
      antiAlias: true
    })
    
    // Emit event if in ExecutionContext
    if (this.executionContext) {
      await this.executionContext.emit(new SelectionCreatedEvent(
        canvas.id,
        { type: 'rectangle', bounds },
        this.executionContext.getMetadata()
      ))
    }
  }
}
```

### 2. Drawing Tools
Current tools:
- `brushTool` ✅ Already migrated as example
- `eraserTool` → Pixel-based erasing (not just object removal) ✅ MIGRATED

**Eraser Tool Migration:**
```typescript
class EraserTool extends BaseTool {
  private isErasing = false
  private eraserBrush: Konva.Line | null = null
  
  protected setupTool(): void {
    // Set composite operation for erasing
    this.globalCompositeOperation = 'destination-out'
  }
  
  onMouseDown(event: ToolEvent): void {
    this.isErasing = true
    const canvas = this.getCanvas()
    const activeLayer = canvas.getActiveLayer()
    
    if (!activeLayer) return
    
    // Create eraser stroke
    this.eraserBrush = new Konva.Line({
      points: [event.point.x, event.point.y],
      stroke: '#000000',
      strokeWidth: this.getOption('size') || 20,
      globalCompositeOperation: 'destination-out',
      lineCap: 'round',
      lineJoin: 'round'
    })
    
    activeLayer.konvaLayer.add(this.eraserBrush)
  }
  
  onMouseMove(event: ToolEvent): void {
    if (!this.isErasing || !this.eraserBrush) return
    
    // Add points to eraser path
    const points = this.eraserBrush.points()
    points.push(event.point.x, event.point.y)
    this.eraserBrush.points(points)
    
    const canvas = this.getCanvas()
    canvas.getActiveLayer()?.konvaLayer.batchDraw()
  }
}
```

### 3. Transform Tools
Current tools:
- `moveTool` → Object and pixel movement ✅ MIGRATED
- `rotateTool` → Rotation with pixel interpolation
- `resizeTool` → Smart resizing with quality options ✅ MIGRATED
- `cropTool` → Non-destructive cropping ✅ MIGRATED
- `flipTool` → Horizontal/vertical flipping

**Move Tool Migration:**
```typescript
class MoveTool extends BaseTool {
  private dragState: {
    target: CanvasObject | null
    startPos: Point
    originalTransform: Transform
  } | null = null
  
  onMouseDown(event: ToolEvent): void {
    const canvas = this.getCanvas()
    const target = canvas.getObjectAtPoint(event.point)
    
    if (target && !target.locked) {
      this.dragState = {
        target,
        startPos: event.point,
        originalTransform: { ...target.transform }
      }
      
      // Show move cursor
      canvas.container.style.cursor = 'move'
    }
  }
  
  onMouseMove(event: ToolEvent): void {
    if (!this.dragState) return
    
    const dx = event.point.x - this.dragState.startPos.x
    const dy = event.point.y - this.dragState.startPos.y
    
    const newTransform = {
      ...this.dragState.originalTransform,
      x: this.dragState.originalTransform.x + dx,
      y: this.dragState.originalTransform.y + dy
    }
    
    // Update object position
    this.dragState.target.node.setAttrs(newTransform)
    
    const canvas = this.getCanvas()
    canvas.stage.batchDraw()
  }
  
  async onMouseUp(event: ToolEvent): Promise<void> {
    if (!this.dragState) return
    
    const canvas = this.getCanvas()
    
    // Emit event for history
    await canvas.updateObject(this.dragState.target.id, {
      transform: this.dragState.target.transform
    })
    
    this.dragState = null
    canvas.container.style.cursor = this.cursor
  }
}
```

### 4. Adjustment Tools
Current tools:
- `brightnessTool` → Pixel-level brightness adjustment ✅ MIGRATED
- `contrastTool` → Pixel-level contrast adjustment ✅ MIGRATED
- `saturationTool` → HSL manipulation ✅ MIGRATED
- `hueTool` → Hue shifting
- `exposureTool` → Exposure compensation
- `colorTemperatureTool` → White balance adjustment

**Brightness Tool Migration:**
```typescript
class BrightnessTool extends BaseTool {
  id = 'brightness'
  name = 'Brightness'
  icon = FaSun
  cursor = 'default'
  
  async applyAdjustment(value: number): Promise<void> {
    const canvas = this.getCanvas()
    const selection = canvas.state.selection
    
    if (selection?.type === 'objects') {
      // Apply to selected objects
      for (const objectId of selection.objectIds) {
        const obj = canvas.findObject(objectId)
        if (obj && obj.type === 'image') {
          await this.applyBrightnessToImage(obj, value)
        }
      }
    } else if (selection?.type === 'pixel' || selection?.type === 'rectangle') {
      // Apply to pixel selection
      const bounds = selection.bounds
      const imageData = canvas.getImageData(bounds)
      
      // Adjust brightness in pixel data
      for (let i = 0; i < imageData.data.length; i += 4) {
        imageData.data[i] = Math.min(255, imageData.data[i] + value)     // R
        imageData.data[i+1] = Math.min(255, imageData.data[i+1] + value) // G
        imageData.data[i+2] = Math.min(255, imageData.data[i+2] + value) // B
        // Alpha unchanged
      }
      
      canvas.putImageData(imageData, { x: bounds.x, y: bounds.y })
    }
  }
  
  private async applyBrightnessToImage(obj: CanvasObject, value: number): Promise<void> {
    // Use Konva filters for performance
    const image = obj.node as Konva.Image
    image.cache()
    image.filters([Konva.Filters.Brighten])
    image.brightness(value / 100)
    
    const canvas = this.getCanvas()
    canvas.stage.batchDraw()
  }
}
```

### 5. Filter Tools
Current tools:
- `blurTool` → Gaussian blur with radius control ✅ MIGRATED
- `sharpenTool` → Unsharp mask filter ✅ MIGRATED
- `grayscaleTool` → Desaturation filter ✅ MIGRATED
- `sepiaTool` → Sepia tone effect ✅ MIGRATED
- `invertTool` → Color inversion

**Blur Tool Migration:**
```typescript
class BlurTool extends BaseTool {
  async applyBlur(radius: number): Promise<void> {
    const canvas = this.getCanvas()
    const targets = this.getTargetObjects()
    
    for (const target of targets) {
      if (target.type === 'image') {
        const image = target.node as Konva.Image
        
        // Use Konva's blur filter
        image.cache()
        image.filters([Konva.Filters.Blur])
        image.blurRadius(radius)
      }
    }
    
    canvas.stage.batchDraw()
    
    // Emit event
    if (this.executionContext) {
      await this.executionContext.emit(new FilterAppliedEvent(
        canvas.id,
        'blur',
        { radius },
        targets.map(t => t.id),
        this.executionContext.getMetadata()
      ))
    }
  }
}
```

### 6. Text Tools
Current tools:
- `HorizontalTypeTool` → Standard text editing
- `VerticalTypeTool` → Vertical text layout
- `TypeOnPathTool` → Text along paths
- `TypeMaskTool` → Text as selection mask

**Text Tool Migration:**
```typescript
class TextTool extends BaseTool {
  private activeText: Konva.Text | null = null
  
  onMouseDown(event: ToolEvent): void {
    const canvas = this.getCanvas()
    
    // Create new text object
    this.activeText = new Konva.Text({
      x: event.point.x,
      y: event.point.y,
      text: 'Type here...',
      fontSize: this.getOption('fontSize') || 16,
      fontFamily: this.getOption('fontFamily') || 'Arial',
      fill: this.getOption('color') || '#000000',
      draggable: true
    })
    
    const activeLayer = canvas.getActiveLayer()
    if (activeLayer) {
      activeLayer.konvaLayer.add(this.activeText)
      
      // Enable inline editing
      this.activeText.on('dblclick dbltap', () => {
        this.enableTextEditing()
      })
    }
  }
  
  private enableTextEditing(): void {
    if (!this.activeText) return
    
    // Create textarea for editing
    const textarea = document.createElement('textarea')
    document.body.appendChild(textarea)
    
    // Position textarea over text
    const textPosition = this.activeText.absolutePosition()
    textarea.value = this.activeText.text()
    textarea.style.position = 'absolute'
    textarea.style.top = `${textPosition.y}px`
    textarea.style.left = `${textPosition.x}px`
    textarea.style.width = `${this.activeText.width()}px`
    
    textarea.focus()
    
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        this.finishTextEditing(textarea)
      }
    })
  }
}
```

### 7. AI-Native Tools
Current tools:
- `imageGenerationTool` → Replicate integration

**Image Generation Tool Migration:**
```typescript
class ImageGenerationTool extends BaseTool {
  async generateImage(prompt: string, options: GenerationOptions): Promise<void> {
    const canvas = this.getCanvas()
    
    try {
      // Show loading state
      canvas.setLoadingState(true)
      
      // Call generation API
      const response = await fetch('/api/replicate/generate-image', {
        method: 'POST',
        body: JSON.stringify({ prompt, ...options })
      })
      
      const { imageUrl } = await response.json()
      
      // Load generated image
      const img = new Image()
      img.crossOrigin = 'anonymous'
      
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = imageUrl
      })
      
      // Add to canvas
      const imageObject = await canvas.addObject({
        type: 'image',
        data: img,
        name: `Generated: ${prompt.slice(0, 30)}...`,
        transform: {
          x: (canvas.state.width - img.width) / 2,
          y: (canvas.state.height - img.height) / 2,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
          skewX: 0,
          skewY: 0
        }
      })
      
      // Emit event
      if (this.executionContext) {
        await this.executionContext.emit(new ImageGeneratedEvent(
          canvas.id,
          imageObject.id,
          prompt,
          options,
          this.executionContext.getMetadata()
        ))
      }
      
    } finally {
      canvas.setLoadingState(false)
    }
  }
}
```

## AI Adapter Migration Pattern

All AI adapters need to be updated to work with the new architecture:

### Base Adapter Pattern
```typescript
export abstract class BaseToolAdapter<TInput, TOutput> {
  abstract tool: Tool
  abstract aiName: string
  abstract description: string
  abstract metadata: ToolMetadata
  abstract inputSchema: z.ZodType<TInput>
  
  async execute(
    params: TInput, 
    context: CanvasContext,
    executionContext?: ExecutionContext
  ): Promise<TOutput> {
    try {
      // Get the new canvas manager
      const canvasManager = context.canvas as unknown as CanvasManager
      
      // Get target objects based on context
      const targets = this.getTargets(context, canvasManager)
      
      // Apply tool operation
      const result = await this.applyOperation(
        params, 
        targets, 
        canvasManager,
        executionContext
      )
      
      return {
        success: true,
        ...result,
        targetingMode: context.targetingMode
      } as TOutput
      
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Operation failed',
        targetingMode: context.targetingMode
      } as TOutput
    }
  }
  
  protected abstract applyOperation(
    params: TInput,
    targets: CanvasObject[],
    canvas: CanvasManager,
    executionContext?: ExecutionContext
  ): Promise<Partial<TOutput>>
  
  private getTargets(
    context: CanvasContext, 
    canvas: CanvasManager
  ): CanvasObject[] {
    // Use context.targetImages for image operations
    // Or canvas.state.selection for general operations
    if (context.targetImages?.length > 0) {
      // Map Fabric images to our CanvasObjects
      return context.targetImages.map(img => 
        canvas.findObjectByFabricId(img.id)
      ).filter(Boolean)
    }
    
    // Check current selection
    const selection = canvas.state.selection
    if (selection?.type === 'objects') {
      return selection.objectIds
        .map(id => canvas.findObject(id))
        .filter(Boolean)
    }
    
    return []
  }
}
```

### Example: Brightness Adapter
```typescript
export class BrightnessToolAdapter extends BaseToolAdapter<
  BrightnessInput, 
  BrightnessOutput
> {
  tool = brightnessTool // Reference to actual tool instance
  aiName = 'adjust_brightness'
  description = 'Adjust image brightness...'
  metadata = { category: 'canvas-editing', ... }
  inputSchema = brightnessParameters
  
  protected async applyOperation(
    params: BrightnessInput,
    targets: CanvasObject[],
    canvas: CanvasManager,
    executionContext?: ExecutionContext
  ): Promise<Partial<BrightnessOutput>> {
    // Use the actual tool to apply the operation
    const tool = this.tool as BrightnessTool
    
    // Set tool option
    tool.setOption('adjustment', params.adjustment)
    
    // Apply to targets
    for (const target of targets) {
      await tool.applyToObject(target, canvas, executionContext)
    }
    
    return {
      adjustment: params.adjustment,
      message: `Brightness adjusted by ${params.adjustment}%`
    }
  }
}
```

## Event Types to Implement

✅ **COMPLETED** - All event types have been implemented in `lib/events/canvas/ToolEvents.ts`:

```typescript
// Canvas Events
export class SelectionCreatedEvent extends Event { ... } ✅
export class SelectionModifiedEvent extends Event { ... } ✅
export class SelectionClearedEvent extends Event { ... } ✅

// Filter Events  
export class FilterAppliedEvent extends Event { ... } ✅
export class FilterRemovedEvent extends Event { ... } ✅

// Drawing Events
export class StrokeAddedEvent extends Event { ... } ✅
export class StrokeModifiedEvent extends Event { ... } ✅

// Generation Events
export class ImageGeneratedEvent extends Event { ... } ✅
export class GenerationFailedEvent extends Event { ... } ✅

// Transform Events
export class ObjectsTransformedEvent extends Event { ... } ✅
export class CanvasResizedEvent extends Event { ... } ✅ (in CanvasEvents.ts)
export class CanvasCroppedEvent extends Event { ... } ✅
```

## Testing Strategy

1. **Unit Tests for Each Tool**
```typescript
describe('BrushTool', () => {
  let canvas: CanvasManager
  let tool: BrushTool
  
  beforeEach(() => {
    const container = document.createElement('div')
    canvas = new CanvasManager(container, eventStore)
    tool = new BrushTool()
  })
  
  it('should create stroke on mouse drag', async () => {
    tool.onActivate(canvas)
    
    await tool.onMouseDown({ point: { x: 0, y: 0 }, pressure: 1 })
    await tool.onMouseMove({ point: { x: 100, y: 100 }, pressure: 0.8 })
    await tool.onMouseUp({ point: { x: 100, y: 100 } })
    
    const activeLayer = canvas.getActiveLayer()
    expect(activeLayer.objects).toHaveLength(1)
    expect(activeLayer.objects[0].type).toBe('path')
  })
})
```

2. **Integration Tests for AI Adapters**
```typescript
describe('BrightnessAdapter', () => {
  it('should work with ExecutionContext', async () => {
    const context = new ExecutionContext(eventStore, metadata)
    const adapter = new BrightnessToolAdapter()
    
    const result = await adapter.execute(
      { adjustment: 20 },
      canvasContext,
      context
    )
    
    expect(result.success).toBe(true)
    expect(context.getEvents()).toHaveLength(1)
    expect(context.getEvents()[0]).toBeInstanceOf(ObjectModifiedEvent)
  })
})
```

## Performance Considerations

1. **Use Konva's caching for complex operations**
```typescript
image.cache()
image.filters([...filters])
// Operations on cached image are faster
```

2. **Batch operations when possible**
```typescript
layer.batchDraw() // Instead of draw() for multiple updates
```

3. **Use FastLayer for real-time drawing**
```typescript
const drawingLayer = new Konva.FastLayer()
// Better performance for brush strokes
```

4. **Implement viewport culling**
```typescript
// Only render objects in viewport
const viewport = canvas.getViewport()
objects.forEach(obj => {
  obj.visible = viewport.intersects(obj.bounds)
})
```

## Migration Checklist

- [ ] Create new tool class extending BaseTool
- [ ] Implement all mouse/keyboard handlers
- [ ] Add proper event emission
- [ ] Update tool options to use new system
- [ ] Create or update AI adapter
- [ ] Add unit tests
- [ ] Add integration tests
- [ ] Update tool registration
- [ ] Update UI bindings
- [ ] Document any breaking changes

## Common Pitfalls to Avoid

1. **Don't access Fabric objects directly** - Use CanvasManager API
2. **Don't forget event emission** - All state changes need events
3. **Don't ignore layer system** - Check visibility and locks
4. **Don't skip ExecutionContext** - Required for AI operations
5. **Don't use synchronous pixel operations** - Use async methods
6. **Don't forget to batch draw** - Performance is critical
7. **Don't hardcode tool options** - Use getOption/setOption

## Resources

- [Konva Documentation](https://konvajs.org/docs/)
- [Event Sourcing Pattern](./events/README.md)
- [AI SDK v5 Docs](https://sdk.vercel.ai/docs)
- [WebGL Filters Guide](https://webglfundamentals.org/)

## Remaining Work

### Tools Still Requiring Migration (14/31)

**Selection Tools (3 remaining):**
- `lassoTool` - Freeform selection with pixel precision
- `magicWandTool` - Color-based selection (requires pixel access)
- `quickSelectionTool` - Brush-based selection

**Transform Tools (1 remaining):**
- `rotateTool` - Rotation with pixel interpolation

**Adjustment Tools (2 remaining):**
- `exposureTool` - Exposure compensation
- `colorTemperatureTool` - White balance adjustment

**Text Tools (4 remaining):**
- `HorizontalTypeTool` - Standard text editing
- `VerticalTypeTool` - Vertical text layout
- `TypeOnPathTool` - Text along paths
- `TypeMaskTool` - Text as selection mask

**AI-Native Tools (1 remaining):**
- `imageGenerationTool` - Replicate integration

**Other Tools (3 remaining):**
- `handTool` - Canvas panning
- `zoomTool` - Canvas zoom control
- `eyedropperTool` - Color picker

### AI Adapters Requiring Updates
All AI adapters need to be updated to work with the new Konva-based tools. The base adapter pattern has been established in the guide.

### Integration Tasks
1. Update tool registration to use new Konva tools
2. Update UI bindings for tool options
3. Integration testing with the full application
4. Performance testing with large images
5. Update any remaining Fabric.js dependencies in the codebase 