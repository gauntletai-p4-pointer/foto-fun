# Object-Based Canvas Architecture & AI-First Migration Plan

## Executive Summary

Complete architectural overhaul from document/layer-based to object-based system with AI-first design. Currently ~30% complete. This plan provides parallel work streams for two agents to complete the migration efficiently.

**Core Principles:**
- **No Documents/Frames**: Just objects on infinite canvas
- **Flat Object Model**: Like Figma, not nested like Photoshop
- **AI-First**: Every tool accessible via UI and natural language
- **Zero Technical Debt**: Remove all legacy code
- **Event-Driven**: Maintain robust event system

## Work Division

### Agent A (Lead - Architecture & Core Systems)
- Foundation cleanup and core architecture
- Tool system base classes and migration
- AI integration architecture
- Code review and integration of Agent B's work

### Agent B (UI, Commands & Integration)
- UI components migration
- Command system conversion
- Event system updates
- Export system implementation

---

## PHASE 1: Foundation Cleanup (Days 1-2)

### Agent A Tasks: Core Architecture Cleanup

#### 1.1 Remove Legacy Systems
```bash
# Delete these files
rm lib/editor/canvas/CanvasManager.ts  # Old implementation
rm lib/editor/document/*               # All document system
rm lib/store/document/*                # Document store
rm components/dialogs/NewDocumentDialog.tsx
```

#### 1.2 Consolidate Canvas Implementation
1. Rename `SimpleCanvasManager` to `CanvasManager`
2. Update all imports across codebase
3. Remove layer-based methods from interface
4. Ensure these methods exist in interface:
   - `addObject(object: Partial<CanvasObject>): Promise<string>`
   - `removeObject(objectId: string): Promise<void>`
   - `updateObject(objectId: string, updates: Partial<CanvasObject>): Promise<void>`
   - `getObject(objectId: string): CanvasObject | null`
   - `getAllObjects(): CanvasObject[]`
   - `selectObject(objectId: string): void`
   - `selectMultiple(objectIds: string[]): void`

#### 1.3 Fix Core Types
Update `lib/editor/canvas/types.ts`:
```typescript
export interface CanvasState {
  // Canvas properties
  canvasWidth: number
  canvasHeight: number
  zoom: number
  pan: Point
  
  // Object properties (NO LAYERS!)
  objects: Map<string, CanvasObject>
  objectOrder: string[] // Z-order
  selectedObjectIds: Set<string>
  pixelSelection?: PixelSelection // Selection within object
  
  // UI state
  backgroundColor: string
  isLoading: boolean
  canUndo: boolean
  canRedo: boolean
  
  // Remove these:
  // layers?: Layer[]
  // activeLayerId?: string
}

export interface CanvasObject {
  id: string
  type: 'image' | 'text' | 'shape' | 'group'
  name: string
  
  // Position & Transform
  x: number
  y: number
  width: number
  height: number
  rotation: number
  scaleX: number
  scaleY: number
  
  // Stacking
  zIndex: number
  
  // Visual Properties
  opacity: number
  blendMode: BlendMode
  visible: boolean
  locked: boolean
  
  // Effects
  filters: Filter[]
  adjustments: Adjustment[]
  
  // Group-specific
  children?: string[] // Object IDs for groups
  
  // Type-specific data
  data: ImageData | TextData | ShapeData
  
  // Metadata
  metadata?: {
    isEffectGroup?: boolean
    originalObjectId?: string // For effect groups
    [key: string]: unknown
  }
}
```

### Agent B Tasks: UI Foundation Updates

#### 1.1 Update Canvas Component
File: `components/editor/Canvas/index.tsx`
- Remove ALL document existence checks
- Remove "No document" empty state
- Canvas should ALWAYS render
- Update to use object-based canvas methods

#### 1.2 Update MenuBar
File: `components/editor/MenuBar/index.tsx`
- Change "Layer" menu to "Object" menu
- Update all menu items to use object operations
- Remove document-related menu items
- Add object operations: Group, Ungroup, Bring Forward, Send Back

#### 1.3 Update StatusBar
File: `components/editor/StatusBar/index.tsx`
- Remove document store import
- Show object count instead of document info
- Display selected object info

---

## PHASE 2: Tool System Overhaul (Days 3-5)

### Agent A Tasks: Tool Base Classes & Core Tools

#### 2.1 Create New Base Classes

Create `lib/editor/tools/base/ObjectTool.ts`:
```typescript
import { BaseTool } from './BaseTool'
import type { CanvasObject } from '@/lib/editor/canvas/types'

export abstract class ObjectTool extends BaseTool {
  // Override requirements - no document needed
  protected requirements = {
    needsDocument: false,
    needsSelection: false,
    needsLayers: false
  }
  
  protected getTargetObject(): CanvasObject | null {
    const canvas = this.getCanvas()
    const selectedIds = Array.from(canvas.state.selectedObjectIds)
    if (selectedIds.length === 0) return null
    return canvas.getObject(selectedIds[0])
  }
  
  protected getTargetObjects(): CanvasObject[] {
    const canvas = this.getCanvas()
    const selectedIds = Array.from(canvas.state.selectedObjectIds)
    return selectedIds.map(id => canvas.getObject(id)).filter(Boolean) as CanvasObject[]
  }
  
  protected async createNewObject(
    type: CanvasObject['type'], 
    data: Partial<CanvasObject>
  ): Promise<string> {
    const canvas = this.getCanvas()
    return canvas.addObject({
      type,
      ...data,
      x: data.x ?? this.lastMousePos?.x ?? 100,
      y: data.y ?? this.lastMousePos?.y ?? 100
    })
  }
}
```

Create `lib/editor/tools/base/ObjectDrawingTool.ts`:
```typescript
export abstract class ObjectDrawingTool extends ObjectTool {
  protected currentDrawingObject: string | null = null
  
  protected async startDrawing(x: number, y: number): Promise<void> {
    // If no object selected, create new one
    const target = this.getTargetObject()
    if (!target || target.type !== 'image') {
      this.currentDrawingObject = await this.createNewObject('image', {
        x, y,
        width: 1,
        height: 1,
        data: this.createEmptyImageData()
      })
    } else {
      this.currentDrawingObject = target.id
    }
  }
  
  protected abstract createEmptyImageData(): ImageData
}
```

#### 2.2 Migrate Core Tools

**Selection Tools** to migrate:
1. `marqueeRectTool.ts` - Select objects or pixels within object
2. `marqueeEllipseTool.ts` - Same pattern
3. `lassoTool.ts` - Freeform selection
4. `magicWandTool.ts` - Select similar pixels within object

**Transform Tools** to migrate:
1. `moveTool.ts` - Move objects (already mostly object-based)
2. `rotateTool.ts` - Rotate selected objects
3. `resizeTool.ts` - Resize objects
4. `cropTool.ts` - Crop individual objects (NOT canvas)

### Agent B Tasks: Drawing Tools & Adjustments

#### 2.1 Migrate Drawing Tools

All drawing tools should extend `ObjectDrawingTool`:

1. `brushTool.ts` - Paint on object or create new paint object
2. `eraserTool.ts` - Erase from object pixels
3. `pencilTool.ts` - Draw on object
4. `gradientTool.ts` - Apply gradient to object

Pattern for each:
```typescript
export class BrushTool extends ObjectDrawingTool {
  protected createEmptyImageData(): ImageData {
    // Create transparent image data
    const canvas = document.createElement('canvas')
    canvas.width = 512 // Default size
    canvas.height = 512
    const ctx = canvas.getContext('2d')!
    return ctx.getImageData(0, 0, 512, 512)
  }
  
  onMouseDown(event: ToolEvent): void {
    const target = this.getTargetObject()
    if (!target) {
      // Create new paint object
      this.startDrawing(event.point.x, event.point.y)
    } else {
      // Paint on existing object
      this.paintOnObject(target, event.point)
    }
  }
}
```

#### 2.2 Migrate Adjustment Tools

1. `brightnessTool.ts` - Apply to selected objects
2. `contrastTool.ts` - Same pattern
3. `saturationTool.ts` - Same pattern
4. `hueTool.ts` - Same pattern

Remove ALL layer references, work on objects directly.

---

## PHASE 3: AI Integration Architecture (Days 6-8)

### Agent A Tasks: Core AI Architecture

#### 3.1 Create Unified Adapter Base

Update `lib/ai/adapters/base.ts`:
```typescript
export interface ObjectCanvasContext {
  canvas: CanvasManager
  targetObjects: CanvasObject[]
  targetingMode: 'selected' | 'all' | 'visible'
  pixelSelection?: PixelSelection
}

export abstract class UnifiedToolAdapter<TInput, TOutput> {
  abstract toolId: string // ID of actual tool
  abstract aiName: string // AI function name
  abstract description: string // For AI understanding
  abstract inputSchema: z.ZodType<TInput>
  
  abstract execute(
    params: TInput, 
    context: ObjectCanvasContext
  ): Promise<TOutput>
  
  // Helper to get target objects
  protected getTargets(context: ObjectCanvasContext): CanvasObject[] {
    switch (context.targetingMode) {
      case 'selected':
        return context.targetObjects
      case 'all':
        return context.canvas.getAllObjects()
      case 'visible':
        const viewport = context.canvas.getViewportBounds()
        return context.canvas.getObjectsInBounds(viewport)
    }
  }
}
```

#### 3.2 Create Replicate Service

Create `lib/ai/services/replicate.ts`:
```typescript
import Replicate from 'replicate'

export class ReplicateService {
  private client: Replicate
  
  constructor(apiKey: string) {
    this.client = new Replicate({ auth: apiKey })
  }
  
  async generateImage(
    prompt: string, 
    options: GenerateOptions
  ): Promise<ImageData> {
    const output = await this.client.run(
      "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
      { input: { prompt, ...options } }
    )
    return this.urlToImageData(output[0])
  }
  
  async removeBackground(
    imageData: ImageData
  ): Promise<ImageData> {
    const dataUrl = this.imageDataToDataURL(imageData)
    const output = await this.client.run(
      "cjwbw/rembg:fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003",
      { input: { image: dataUrl } }
    )
    return this.urlToImageData(output)
  }
  
  async enhanceFace(
    imageData: ImageData
  ): Promise<ImageData> {
    const dataUrl = this.imageDataToDataURL(imageData)
    const output = await this.client.run(
      "tencentarc/gfpgan:0fbacf7afc6c144e5be9767cff80f25aff23e52b0708f17e20f9879b2f21516c",
      { input: { img: dataUrl, scale: 2 } }
    )
    return this.urlToImageData(output)
  }
  
  private async urlToImageData(url: string): Promise<ImageData> {
    // Implementation to convert URL to ImageData
  }
  
  private imageDataToDataURL(data: ImageData): string {
    // Implementation to convert ImageData to data URL
  }
}
```

#### 3.3 Create AI-Native Tools

Create these in `lib/ai/tools/`:

1. `ImageGenerationTool.ts` - Text to image
2. `BackgroundRemovalTool.ts` - Remove backgrounds
3. `FaceEnhancementTool.ts` - Enhance faces
4. `InpaintingTool.ts` - Smart fill
5. `OutpaintingTool.ts` - Extend images

### Agent B Tasks: Tool Adapters & Registration

#### 3.1 Migrate Existing Adapters

Update ALL adapters in `lib/ai/adapters/tools/` to:
1. Remove layer references
2. Use object-based operations
3. Implement new `UnifiedToolAdapter` interface

Example pattern:
```typescript
export class BrightnessToolAdapter extends UnifiedToolAdapter<
  { adjustment: number },
  { objectIds: string[] }
> {
  toolId = 'brightness'
  aiName = 'adjustBrightness'
  description = 'Adjust brightness of selected objects. Positive values brighten, negative darken.'
  
  inputSchema = z.object({
    adjustment: z.number().min(-100).max(100)
  })
  
  async execute(params: { adjustment: number }, context: ObjectCanvasContext) {
    const targets = this.getTargets(context)
    
    for (const object of targets) {
      await context.canvas.applyAdjustment(object.id, {
        type: 'brightness',
        value: params.adjustment
      })
    }
    
    return { objectIds: targets.map(t => t.id) }
  }
}
```

#### 3.2 Create AI Tool Adapters

Create adapters for the new AI tools:
1. `ImageGenerationAdapter.ts`
2. `BackgroundRemovalAdapter.ts`
3. `FaceEnhancementAdapter.ts`
4. `InpaintingAdapter.ts`
5. `OutpaintingAdapter.ts`

---

## PHASE 4: Smart Object Behaviors (Days 9-10)

### Agent A Tasks: Effect Groups & Smart Selection

#### 4.1 Implement Auto-Grouping

Add to `CanvasManager`:
```typescript
async applyEffectWithGroup(
  targetObject: CanvasObject,
  effectType: string,
  effectData: Partial<CanvasObject>
): Promise<string> {
  // Create effect group
  const groupId = await this.addObject({
    type: 'group',
    name: `${targetObject.name} (${effectType})`,
    metadata: { 
      isEffectGroup: true,
      effectType,
      originalObjectId: targetObject.id
    }
  })
  
  // Move original to group
  await this.moveObjectToGroup(targetObject.id, groupId)
  
  // Add effect object
  const effectId = await this.addObject({
    ...effectData,
    metadata: {
      ...effectData.metadata,
      parentGroup: groupId
    }
  })
  
  await this.moveObjectToGroup(effectId, groupId)
  
  // Select the group
  this.selectObject(groupId)
  
  return groupId
}
```

#### 4.2 Smart Selection Logic

Update selection handling in `CanvasManager`:
```typescript
handleObjectClick(clickedId: string, event: MouseEvent): void {
  const clicked = this.getObject(clickedId)
  if (!clicked) return
  
  // Check if part of effect group
  const parentGroup = this.findParentGroup(clicked)
  if (parentGroup?.metadata?.isEffectGroup) {
    // Alt-click selects individual object
    if (event.altKey) {
      this.selectObject(clickedId)
    } else {
      // Normal click selects whole group
      this.selectObject(parentGroup.id)
    }
  } else {
    this.selectObject(clickedId)
  }
}
```

### Agent B Tasks: Export System & Commands

#### 4.1 Implement Object Export

Create `lib/editor/export/ObjectExportManager.ts`:
```typescript
export class ObjectExportManager {
  constructor(private canvas: CanvasManager) {}
  
  async export(options: ExportOptions): Promise<Blob> {
    let bounds: Rect
    let objects: CanvasObject[]
    
    switch (options.what) {
      case 'selection':
        objects = this.canvas.getSelectedObjects()
        if (objects.length === 0) {
          throw new Error('No objects selected')
        }
        bounds = this.calculateBounds(objects)
        break
        
      case 'visible':
        bounds = this.canvas.getViewportBounds()
        objects = this.canvas.getObjectsInBounds(bounds)
        break
        
      case 'canvas':
        objects = this.canvas.getAllObjects()
        if (objects.length === 0) {
          throw new Error('Canvas is empty')
        }
        bounds = this.calculateBounds(objects)
        break
    }
    
    // Add padding if requested
    if (options.padding) {
      bounds = this.expandBounds(bounds, options.padding)
    }
    
    return this.renderToBlob(objects, bounds, options)
  }
  
  private calculateBounds(objects: CanvasObject[]): Rect {
    // Calculate bounding box of all objects
  }
  
  private renderToBlob(
    objects: CanvasObject[], 
    bounds: Rect, 
    options: ExportOptions
  ): Promise<Blob> {
    // Render objects to canvas and export
  }
}
```

#### 4.2 Update Command System

Create object-based commands in `lib/editor/commands/object/`:

1. `AddObjectCommand.ts`
2. `RemoveObjectCommand.ts`
3. `UpdateObjectCommand.ts`
4. `GroupObjectsCommand.ts`
5. `UngroupObjectsCommand.ts`

Example:
```typescript
export class GroupObjectsCommand extends Command {
  private groupId: string | null = null
  
  constructor(
    private canvas: CanvasManager,
    private objectIds: string[]
  ) {
    super()
  }
  
  async execute(): Promise<void> {
    // Create group
    this.groupId = await this.canvas.addObject({
      type: 'group',
      name: 'Group',
      children: this.objectIds
    })
    
    // Move objects to group
    for (const id of this.objectIds) {
      await this.canvas.moveObjectToGroup(id, this.groupId)
    }
    
    // Select group
    this.canvas.selectObject(this.groupId)
  }
  
  async undo(): Promise<void> {
    if (!this.groupId) return
    
    // Move objects out of group
    for (const id of this.objectIds) {
      await this.canvas.moveObjectToRoot(id)
    }
    
    // Remove group
    await this.canvas.removeObject(this.groupId)
    
    // Restore selection
    this.canvas.selectMultiple(this.objectIds)
  }
}
```

---

## PHASE 5: WebGL Filter Integration (Days 11-13)

### Overview

WebGL filters provide 10-100x performance improvement over CPU-based filters. We'll integrate the existing WebGL infrastructure with our object-based architecture.

### Filter Strategy

**Use WebGL for:**
- Color adjustments (brightness, contrast, saturation, hue)
- Complex effects (vintage, artistic styles)
- Heavy operations (sharpen, edge detection)
- Real-time preview during adjustment

**Use Konva for:**
- Blur (WebGLImageFilter lacks gaussian blur)
- Simple masks and overlays
- Text rendering effects
- Fallback when WebGL unavailable

### Agent A Tasks: WebGL Filter Architecture

#### 5.1 Update Filter System for Objects

Update `lib/editor/filters/ObjectFilterManager.ts`:
```typescript
export class ObjectFilterManager {
  private webglFilterManager: WebGLFilterManager
  
  async applyFilterToObject(
    objectId: string,
    filter: Filter,
    executionContext?: ExecutionContext
  ): Promise<void> {
    const object = this.canvas.getObject(objectId)
    if (!object) return
    
    // Determine engine type
    const engineType = this.getEngineType(filter.type)
    
    if (engineType === 'webgl') {
      await this.applyWebGLFilter(object, filter, executionContext)
    } else {
      await this.applyKonvaFilter(object, filter, executionContext)
    }
  }
  
  private getEngineType(filterType: string): 'webgl' | 'konva' {
    const webglFilters = [
      'brightness', 'contrast', 'saturation', 'hue',
      'grayscale', 'sepia', 'invert', 'sharpen',
      'vintage', 'brownie', 'kodachrome', 'technicolor',
      'polaroid', 'detectEdges', 'emboss'
    ]
    
    return webglFilters.includes(filterType) ? 'webgl' : 'konva'
  }
  
  private async applyWebGLFilter(
    object: CanvasObject,
    filter: Filter,
    executionContext?: ExecutionContext
  ): Promise<void> {
    if (object.type !== 'image') {
      throw new Error('WebGL filters only work on image objects')
    }
    
    // Get image data
    const imageData = object.data as ImageData
    
    // Process with WebGL
    const processed = await this.webglFilterManager.processWithWebGL(
      imageData.element,
      filter.type,
      filter.params
    )
    
    // Update object
    await this.canvas.updateObject(object.id, {
      data: {
        ...imageData,
        element: processed,
        lastFilter: filter
      }
    })
    
    // Emit event
    const event = new ObjectFilterAppliedEvent(
      object.id,
      filter,
      executionContext?.getMetadata() || { source: 'user' }
    )
    
    if (executionContext) {
      await executionContext.emit(event)
    } else {
      this.eventStore.append(event)
    }
  }
}
```

#### 5.2 Create WebGL Filter Tools

Update base class for WebGL filter tools:
```typescript
// lib/editor/tools/base/ObjectWebGLFilterTool.ts
export abstract class ObjectWebGLFilterTool extends ObjectTool {
  protected abstract getFilterType(): string
  protected abstract getDefaultParams(): Record<string, any>
  
  protected async applyFilter(params: Record<string, any>): Promise<void> {
    const targets = this.getTargetObjects()
    
    for (const target of targets) {
      if (target.type !== 'image') continue
      
      const filter: Filter = {
        type: this.getFilterType(),
        params
      }
      
      await this.canvas.applyFilterToObject(target.id, filter)
    }
  }
  
  protected onOptionChange(key: string, value: unknown): void {
    // Real-time preview with debouncing
    this.debounce(() => {
      const params = this.getAllOptions()
      this.applyFilter(params)
    }, 16) // 60fps
  }
}
```

### Agent B Tasks: Migrate Filter Tools

#### 5.1 Convert Adjustment Tools to WebGL

Update these tools to use WebGL:

1. **BrightnessTool** (HIGH PRIORITY - WebGL)
```typescript
export class BrightnessTool extends ObjectWebGLFilterTool {
  protected getFilterType() { return 'brightness' }
  protected getDefaultParams() { return { amount: 0 } }
}
```

2. **ContrastTool** (HIGH PRIORITY - WebGL)
3. **SaturationTool** (HIGH PRIORITY - WebGL)
4. **HueTool** (HIGH PRIORITY - WebGL)

#### 5.2 Create New WebGL Effect Tools

1. **VintageEffectsTool**
```typescript
export class VintageEffectsTool extends ObjectWebGLFilterTool {
  private effects = [
    'brownie', 'vintagePinhole', 'kodachrome', 
    'technicolor', 'polaroid'
  ]
  
  protected getFilterType() {
    return this.getOption('effect') || 'brownie'
  }
  
  protected getDefaultParams() {
    return { effect: 'brownie' }
  }
}
```

2. **EdgeDetectionTool**
3. **SharpenTool** (convert from Konva)

#### 5.3 Keep Konva for These Tools

1. **BlurTool** - WebGLImageFilter lacks gaussian blur
2. Complex masking operations
3. Fallback for unsupported browsers

### Integration Points

1. **Filter Stacking**: Objects can have multiple filters
```typescript
interface CanvasObject {
  // ... existing properties
  filters: Filter[] // Can stack WebGL and Konva filters
  filterCache?: HTMLCanvasElement // Cache filtered result
}
```

2. **Performance**: Cache filtered results
3. **Real-time Preview**: Use WebGL for live adjustments
4. **Export**: Apply all filters during export

---

## PHASE 6: Final Integration (Days 14-16)

### Both Agents: Collaborative Tasks

#### 6.1 Update Events System
- Agent A: Update event definitions for objects
- Agent B: Update event consumers

#### 6.2 Fix Type Errors
- Run `bun typecheck` and divide errors
- Agent A: Core system type errors
- Agent B: UI and integration type errors

#### 6.3 Testing Checklist
Both agents test their areas:

**Agent A Tests:**
- [ ] Object creation/deletion
- [ ] Object selection
- [ ] Transform tools
- [ ] AI tool execution
- [ ] Effect groups
- [ ] WebGL filters

**Agent B Tests:**
- [ ] UI responsiveness
- [ ] Menu operations
- [ ] Export all formats
- [ ] Undo/redo
- [ ] Command execution
- [ ] Filter preview

---

## Code Review Process

### Agent A (Lead) Reviews:
1. All architectural changes
2. Tool implementations
3. AI integrations
4. Performance implications
5. WebGL filter quality

### Review Checklist:
- [ ] No layer references remain
- [ ] No document references remain
- [ ] All tools work with objects
- [ ] WebGL filters perform well
- [ ] Type safety maintained
- [ ] Event system consistent
- [ ] No technical debt introduced

---

## Success Criteria

1. **Zero type errors** after migration
2. **All tools** work with objects
3. **AI chat** can execute all operations
4. **Export** works for any configuration
5. **WebGL filters** provide 10x performance
6. **Real-time preview** at 60fps
7. **Code** is clean and maintainable

---

## Daily Sync Points

**Morning Sync:**
- Review previous day's work
- Resolve any blockers
- Confirm day's tasks

**Evening Sync:**
- Merge work
- Run tests
- Plan next day

## WebGL Performance Targets

- 4K image brightness adjustment: <50ms
- Real-time preview latency: <16ms
- Filter chain (3 filters): <100ms
- Memory usage: <200MB for 10 4K images

This plan ensures both agents can work efficiently in parallel while maintaining code quality and architectural consistency. 