# Selection Tools - Clean Migration Plan

## Overview

Complete migration from Fabric's object-based selection to Photoshop-style pixel-based selection tools. No backwards compatibility, no feature flags - a clean architectural implementation.

## Core Architecture

### Selection System Components

```typescript
// All selection tools follow this hierarchy
BaseSelectionTool (abstract)
├── MarqueeRectTool
├── MarqueeEllipseTool
├── LassoTool
├── PolygonalLassoTool
├── MagneticLassoTool
├── MagicWandTool
├── QuickSelectionTool
└── ColorRangeSelectionTool

// Core selection management
SelectionManager
├── SelectionRenderer (marching ants, quick mask)
├── SelectionTransformer (transform selections)
├── SelectionStorage (save/load selections)
└── SelectionOperations (expand, contract, feather, etc.)
```

### Event-Driven Selection Flow

```typescript
Tool → ToolEvent → SelectionManager → SelectionEvent → EventBus → UI Updates
                                    ↓
                              CanvasManager → Visual Feedback
```

## Implementation Steps

### Step 1: Remove All Fabric References

1. Delete all object-based selection code
2. Remove `fabric.Object` selection handling
3. Clean up any Fabric-specific selection events
4. Remove object transformation controls

### Step 2: Implement Clean Selection Architecture

#### 2.1 Base Selection Tool
```typescript
// lib/editor/tools/base/BaseSelectionTool.ts
export abstract class BaseSelectionTool extends BaseTool {
  protected selectionManager: SelectionManager
  protected isCreating = false
  protected startPoint: Point | null = null
  protected currentMode: SelectionMode = 'replace'
  
  constructor(id: string, name: string, icon: React.ComponentType) {
    super(id, name, icon)
  }
  
  onActivate(canvas: CanvasManager): void {
    super.onActivate(canvas)
    this.selectionManager = canvas.selectionManager
    this.setupEventListeners()
  }
  
  protected getSelectionMode(event: ToolEvent): SelectionMode {
    // Real-time modifier detection - no persistent state
    if (event.shiftKey && event.altKey) return 'intersect'
    if (event.shiftKey) return 'add'
    if (event.altKey) return 'subtract'
    return 'replace'
  }
  
  protected abstract createSelection(bounds: SelectionBounds): ImageData
  
  protected finalizeSelection(selectionData: ImageData, mode: SelectionMode): void {
    this.selectionManager.applySelection(selectionData, mode)
    this.cleanup()
  }
  
  protected cleanup(): void {
    this.isCreating = false
    this.startPoint = null
    this.clearVisualFeedback()
  }
}
```

#### 2.2 Selection Manager Rewrite
```typescript
// lib/editor/selection/SelectionManager.ts
export class SelectionManager {
  private selection: PixelSelection | null = null
  private renderer: SelectionRenderer
  private operations: SelectionOperations
  
  constructor(
    private canvas: CanvasManager,
    private eventBus: TypedEventBus
  ) {
    this.renderer = new SelectionRenderer(canvas)
    this.operations = new SelectionOperations()
  }
  
  applySelection(mask: ImageData, mode: SelectionMode): void {
    const newSelection = this.operations.combineSelection(
      this.selection,
      mask,
      mode
    )
    
    this.setSelection(newSelection)
  }
  
  private setSelection(selection: PixelSelection | null): void {
    const previousSelection = this.selection
    this.selection = selection
    
    // Update renderer
    this.renderer.updateSelection(selection)
    
    // Emit event
    this.eventBus.emit(new SelectionChangedEvent({
      selection,
      previousSelection,
      source: 'user'
    }))
  }
  
  // Selection operations
  invert(): void {
    if (!this.selection) return
    const inverted = this.operations.invert(this.selection, this.canvas.size)
    this.setSelection(inverted)
  }
  
  expand(pixels: number): void {
    if (!this.selection) return
    const expanded = this.operations.expand(this.selection, pixels)
    this.setSelection(expanded)
  }
  
  contract(pixels: number): void {
    if (!this.selection) return
    const contracted = this.operations.contract(this.selection, pixels)
    this.setSelection(contracted)
  }
  
  feather(radius: number): void {
    if (!this.selection) return
    const feathered = this.operations.feather(this.selection, radius)
    this.setSelection(feathered)
  }
  
  transform(matrix: DOMMatrix): void {
    if (!this.selection) return
    const transformed = this.operations.transform(this.selection, matrix)
    this.setSelection(transformed)
  }
}
```

### Step 3: Implement All Selection Tools

#### 3.1 Marquee Tools
```typescript
// lib/editor/tools/selection/marqueeRectTool.ts
export class MarqueeRectTool extends BaseSelectionTool {
  private preview: Konva.Rect | null = null
  
  onMouseDown(event: ToolEvent): void {
    this.isCreating = true
    this.startPoint = event.point
    this.currentMode = this.getSelectionMode(event)
    
    // Create preview
    this.preview = new Konva.Rect({
      x: event.point.x,
      y: event.point.y,
      width: 0,
      height: 0,
      stroke: '#000',
      strokeWidth: 1,
      dash: [5, 5],
      listening: false
    })
    
    this.canvas.overlayLayer.add(this.preview)
  }
  
  onMouseMove(event: ToolEvent): void {
    if (!this.isCreating || !this.startPoint || !this.preview) return
    
    let bounds = {
      x: Math.min(this.startPoint.x, event.point.x),
      y: Math.min(this.startPoint.y, event.point.y),
      width: Math.abs(event.point.x - this.startPoint.x),
      height: Math.abs(event.point.y - this.startPoint.y)
    }
    
    // Apply constraints
    if (event.shiftKey && !event.altKey) {
      // Square constraint
      const size = Math.max(bounds.width, bounds.height)
      bounds.width = bounds.height = size
    }
    
    if (event.altKey && !event.shiftKey) {
      // Center constraint
      bounds.x = this.startPoint.x - bounds.width / 2
      bounds.y = this.startPoint.y - bounds.height / 2
    }
    
    this.preview.setAttrs(bounds)
    this.canvas.renderOverlay()
  }
  
  onMouseUp(event: ToolEvent): void {
    if (!this.isCreating || !this.preview) return
    
    const bounds = this.preview.getAttrs()
    const selection = this.createSelection(bounds)
    
    this.finalizeSelection(selection, this.currentMode)
  }
  
  protected createSelection(bounds: SelectionBounds): ImageData {
    const mask = new ImageData(this.canvas.width, this.canvas.height)
    
    // Fill rectangle in mask
    for (let y = bounds.y; y < bounds.y + bounds.height; y++) {
      for (let x = bounds.x; x < bounds.x + bounds.width; x++) {
        if (x >= 0 && x < mask.width && y >= 0 && y < mask.height) {
          const index = (y * mask.width + x) * 4
          mask.data[index + 3] = 255 // Full selection
        }
      }
    }
    
    return mask
  }
}
```

#### 3.2 Lasso Variants
```typescript
// lib/editor/tools/selection/polygonalLassoTool.ts
export class PolygonalLassoTool extends BaseSelectionTool {
  private points: Point[] = []
  private preview: Konva.Line | null = null
  private tempLine: Konva.Line | null = null
  
  onMouseDown(event: ToolEvent): void {
    if (!this.isCreating) {
      // Start new selection
      this.isCreating = true
      this.currentMode = this.getSelectionMode(event)
      this.points = [event.point]
      this.createPreview()
    } else {
      // Add point
      this.points.push(event.point)
      this.updatePreview()
      
      // Check if closing polygon
      if (this.isNearStart(event.point)) {
        this.completeSelection()
      }
    }
  }
  
  onMouseMove(event: ToolEvent): void {
    if (!this.isCreating || this.points.length === 0) return
    
    // Update temp line to show next segment
    this.updateTempLine(event.point)
  }
  
  onDoubleClick(event: ToolEvent): void {
    if (this.isCreating) {
      this.completeSelection()
    }
  }
  
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.isCreating) {
      this.cleanup()
    }
  }
  
  private completeSelection(): void {
    if (this.points.length < 3) {
      this.cleanup()
      return
    }
    
    const selection = this.createPolygonSelection(this.points)
    this.finalizeSelection(selection, this.currentMode)
  }
  
  protected createSelection(bounds: SelectionBounds): ImageData {
    // Not used - we use createPolygonSelection instead
    throw new Error('Use createPolygonSelection')
  }
  
  private createPolygonSelection(points: Point[]): ImageData {
    const mask = new ImageData(this.canvas.width, this.canvas.height)
    
    // Use scanline fill algorithm
    const polygon = new Path2D()
    polygon.moveTo(points[0].x, points[0].y)
    points.slice(1).forEach(p => polygon.lineTo(p.x, p.y))
    polygon.closePath()
    
    // Create offscreen canvas for polygon fill
    const offscreen = document.createElement('canvas')
    offscreen.width = mask.width
    offscreen.height = mask.height
    const ctx = offscreen.getContext('2d')!
    
    ctx.fillStyle = 'white'
    ctx.fill(polygon)
    
    // Convert to mask
    const imageData = ctx.getImageData(0, 0, mask.width, mask.height)
    for (let i = 0; i < imageData.data.length; i += 4) {
      mask.data[i + 3] = imageData.data[i] // Use red channel as alpha
    }
    
    return mask
  }
}
```

### Step 4: Smart Selection Tools

#### 4.1 Magic Wand with Proper Tolerance
```typescript
// lib/editor/tools/selection/magicWandTool.ts
export class MagicWandTool extends BaseSelectionTool {
  protected options = {
    tolerance: 32,
    antiAlias: true,
    contiguous: true,
    sampleAllLayers: false
  }
  
  onMouseDown(event: ToolEvent): void {
    const mode = this.getSelectionMode(event)
    const selection = this.selectSimilarColors(event.point)
    this.finalizeSelection(selection, mode)
  }
  
  private selectSimilarColors(seedPoint: Point): ImageData {
    const imageData = this.getSampleData()
    const mask = new ImageData(imageData.width, imageData.height)
    
    // Get seed color
    const seedIndex = (seedPoint.y * imageData.width + seedPoint.x) * 4
    const seedColor = {
      r: imageData.data[seedIndex],
      g: imageData.data[seedIndex + 1],
      b: imageData.data[seedIndex + 2],
      a: imageData.data[seedIndex + 3]
    }
    
    if (this.options.contiguous) {
      // Flood fill algorithm
      this.floodFill(imageData, mask, seedPoint, seedColor)
    } else {
      // Select all similar colors
      this.selectAllSimilar(imageData, mask, seedColor)
    }
    
    if (this.options.antiAlias) {
      this.antiAliasSelection(mask)
    }
    
    return mask
  }
  
  private floodFill(
    source: ImageData,
    mask: ImageData,
    start: Point,
    targetColor: Color
  ): void {
    const tolerance = this.options.tolerance
    const stack: Point[] = [start]
    const visited = new Set<string>()
    
    while (stack.length > 0) {
      const point = stack.pop()!
      const key = `${point.x},${point.y}`
      
      if (visited.has(key)) continue
      visited.add(key)
      
      const index = (point.y * source.width + point.x) * 4
      const color = {
        r: source.data[index],
        g: source.data[index + 1],
        b: source.data[index + 2],
        a: source.data[index + 3]
      }
      
      const distance = this.colorDistance(color, targetColor)
      if (distance <= tolerance) {
        // Add to selection with soft edge based on distance
        const alpha = 255 * (1 - distance / tolerance)
        mask.data[index + 3] = alpha
        
        // Add neighbors
        const neighbors = [
          { x: point.x - 1, y: point.y },
          { x: point.x + 1, y: point.y },
          { x: point.x, y: point.y - 1 },
          { x: point.x, y: point.y + 1 }
        ]
        
        neighbors.forEach(n => {
          if (n.x >= 0 && n.x < source.width && 
              n.y >= 0 && n.y < source.height) {
            stack.push(n)
          }
        })
      }
    }
  }
}
```

#### 4.2 Enhanced Quick Selection
```typescript
// lib/editor/tools/selection/quickSelectionTool.ts
export class QuickSelectionTool extends BaseSelectionTool {
  private brushSize = 20
  private isSelecting = false
  private segmenter: ImageSegmenter
  
  protected setupTool(): void {
    super.setupTool()
    this.segmenter = new ImageSegmenter()
  }
  
  onMouseDown(event: ToolEvent): void {
    this.isSelecting = true
    this.currentMode = this.getSelectionMode(event)
    this.startSelection(event.point)
  }
  
  onMouseMove(event: ToolEvent): void {
    if (!this.isSelecting) return
    this.expandSelection(event.point)
  }
  
  onMouseUp(event: ToolEvent): void {
    this.isSelecting = false
  }
  
  private expandSelection(point: Point): void {
    // Get region around brush
    const region = this.getRegionAroundPoint(point, this.brushSize)
    
    // Find edges and similar regions
    const segments = this.segmenter.findSegments(region)
    const selection = this.segmenter.expandToSimilar(segments, point)
    
    // Apply to current selection
    this.selectionManager.applySelection(selection, this.currentMode)
  }
}
```

### Step 5: Selection UI Components

#### 5.1 Clean Tool Options
```typescript
// components/editor/ToolOptions/SelectionToolOptions.tsx
export function SelectionToolOptions({ tool }: { tool: BaseSelectionTool }) {
  const options = tool.options
  
  return (
    <div className="flex flex-col gap-2">
      {/* Mode indicators - read-only, shows current modifier state */}
      <div className="flex gap-1 text-xs text-muted-foreground">
        <kbd>Shift</kbd> Add
        <kbd>Alt</kbd> Subtract
        <kbd>Shift+Alt</kbd> Intersect
      </div>
      
      {/* Tool-specific options */}
      {tool.id === 'magic-wand' && (
        <>
          <OptionSlider
            label="Tolerance"
            value={options.tolerance}
            min={0}
            max={255}
            onChange={(v) => tool.setOption('tolerance', v)}
          />
          <OptionCheckbox
            label="Contiguous"
            checked={options.contiguous}
            onChange={(v) => tool.setOption('contiguous', v)}
          />
          <OptionCheckbox
            label="Anti-alias"
            checked={options.antiAlias}
            onChange={(v) => tool.setOption('antiAlias', v)}
          />
        </>
      )}
      
      {tool.id === 'quick-selection' && (
        <OptionSlider
          label="Brush Size"
          value={options.brushSize}
          min={1}
          max={200}
          suffix="px"
          onChange={(v) => tool.setOption('brushSize', v)}
        />
      )}
    </div>
  )
}
```

#### 5.2 Selection Panel
```typescript
// components/editor/Panels/SelectionPanel/index.tsx
export function SelectionPanel() {
  const selection = useSelection()
  const operations = useSelectionOperations()
  
  if (!selection) {
    return (
      <Panel title="Selection">
        <div className="text-sm text-muted-foreground p-4 text-center">
          No active selection
        </div>
      </Panel>
    )
  }
  
  return (
    <Panel title="Selection">
      <div className="space-y-4 p-4">
        {/* Selection info */}
        <div className="text-sm">
          <div>Size: {selection.bounds.width} × {selection.bounds.height}px</div>
          <div>Position: ({selection.bounds.x}, {selection.bounds.y})</div>
        </div>
        
        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" onClick={operations.invert}>
            Invert
          </Button>
          <Button size="sm" onClick={operations.deselect}>
            Deselect
          </Button>
        </div>
        
        {/* Modify selection */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Modify</h4>
          <ModifyInput
            label="Expand"
            onApply={(pixels) => operations.expand(pixels)}
          />
          <ModifyInput
            label="Contract"
            onApply={(pixels) => operations.contract(pixels)}
          />
          <ModifyInput
            label="Feather"
            onApply={(pixels) => operations.feather(pixels)}
          />
        </div>
        
        {/* Advanced */}
        <Button 
          className="w-full" 
          variant="outline"
          onClick={() => openSelectAndMask(selection)}
        >
          Select and Mask...
        </Button>
      </div>
    </Panel>
  )
}
```

### Step 6: Selection Rendering

#### 6.1 Marching Ants & Quick Mask
```typescript
// lib/editor/selection/SelectionRenderer.ts
export class SelectionRenderer {
  private marchingAnts: MarchingAntsRenderer
  private quickMask: QuickMaskRenderer
  private mode: 'ants' | 'quickmask' = 'ants'
  
  constructor(private canvas: CanvasManager) {
    this.marchingAnts = new MarchingAntsRenderer(canvas)
    this.quickMask = new QuickMaskRenderer(canvas)
  }
  
  updateSelection(selection: PixelSelection | null): void {
    if (this.mode === 'ants') {
      this.marchingAnts.update(selection)
    } else {
      this.quickMask.update(selection)
    }
  }
  
  setMode(mode: 'ants' | 'quickmask'): void {
    this.mode = mode
    this.updateSelection(this.canvas.selectionManager.selection)
  }
}

// Marching ants implementation
class MarchingAntsRenderer {
  private path: Path2D | null = null
  private animationFrame: number | null = null
  private offset = 0
  
  update(selection: PixelSelection | null): void {
    this.cleanup()
    
    if (!selection) return
    
    // Extract selection outline
    this.path = this.extractOutline(selection.mask)
    this.startAnimation()
  }
  
  private startAnimation(): void {
    const animate = () => {
      this.offset = (this.offset + 1) % 10
      this.render()
      this.animationFrame = requestAnimationFrame(animate)
    }
    animate()
  }
  
  private render(): void {
    const ctx = this.canvas.overlayContext
    ctx.save()
    
    // Clear previous
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    
    // Draw marching ants
    ctx.strokeStyle = 'white'
    ctx.lineWidth = 1
    ctx.setLineDash([5, 5])
    ctx.lineDashOffset = this.offset
    ctx.stroke(this.path!)
    
    ctx.strokeStyle = 'black'
    ctx.lineDashOffset = this.offset + 5
    ctx.stroke(this.path!)
    
    ctx.restore()
  }
}
```

## Migration Timeline

### Week 1: Foundation
- Remove all Fabric selection code
- Implement BaseSelectionTool
- Implement SelectionManager
- Basic marquee tools working

### Week 2: Core Tools
- All lasso variants
- Magic wand with proper tolerance
- Quick selection with segmentation
- Selection rendering (marching ants)

### Week 3: UI & Operations
- Tool options panels
- Selection panel
- Quick mask mode
- Selection operations (expand, contract, etc.)

### Week 4: Advanced Features
- Select and Mask workspace
- Color range selection
- Selection transformation
- Selection save/load

### Week 5: Polish & Testing
- Performance optimization
- Comprehensive testing
- Edge case handling
- Documentation

## Success Criteria

1. **No Fabric Dependencies**: Zero references to Fabric in selection code
2. **Photoshop Parity**: All standard Photoshop selection tools implemented
3. **Performance**: < 16ms per frame for interactive selection
4. **Architecture**: Clean event-driven architecture with no technical debt
5. **Testing**: 100% test coverage for selection operations

## Key Differences from Previous Implementation

1. **No Object Selection**: Purely pixel-based selection
2. **Real-time Modifiers**: No persistent mode buttons
3. **Clean Architecture**: No adapter patterns or compatibility layers
4. **Event-Driven**: All state changes through TypedEventBus
5. **Konva Native**: Direct Konva usage, no abstraction layers 