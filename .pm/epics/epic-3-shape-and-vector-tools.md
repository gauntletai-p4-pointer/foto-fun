# Epic 3: Shape & Vector Tools

## Developer Workflow Instructions

### GitHub Branch Strategy
1. **Branch Naming**: Create a feature branch named `epic-3-shape-vector-tools`
2. **Base Branch**: Branch off from `main`
3. **Commits**: Use conventional commits (e.g., `feat: add rectangle tool`, `fix: path bezier calculations`)
4. **Pull Request**:
   - Title: "Epic 3: Shape & Vector Tools Implementation"
   - Description: Reference this epic document and list completed items
   - Request review from at least one other developer
   - Ensure all CI checks pass before merging

### Development Guidelines
1. **Before Starting**:
   - Pull latest `main` branch
   - Run `bun install` to ensure dependencies are up to date
   - Ensure Epic 1's BaseTool class is available

2. **During Development**:
   - Only modify files related to your epic
   - Run `bun lint && bun typecheck` frequently
   - Fix all errors/warnings in YOUR files only (not other epics' files)
   - NO eslint-disable comments or @ts-ignore suppressions allowed

3. **Testing Requirements**:
   - Test all shape tools with various options
   - Test path creation and editing
   - Test bezier curve manipulation
   - Test shape combination operations
   - Test vector masks
   - Test slice export functionality
   - Verify SVG import/export
   - Document test scenarios in PR description

4. **Before Creating PR**:
   - Run `bun lint && bun typecheck` - must pass with 0 errors/warnings in your files
   - Test all functionality manually
   - Update this epic document marking completed items
   - Commit the updated epic document

### Epic Start Process

Before implementing shape/vector tools:

1. **Deep Dive Analysis** (Required)
   - Study Fabric.js shape classes and path handling
   - Analyze existing selection tool patterns
   - Understand canvas coordinate systems
   - Document vector math utilities needed
   - NO ASSUMPTIONS - verify everything in actual code

2. **Research Phase**
   - Master Photoshop's pen tool behaviors
   - Study Bezier curve mathematics
   - Research vector editing best practices
   - Compare SVG path vs Canvas path approaches

3. **Gap Identification**
   - Path editing UI components needed
   - Bezier handle manipulation
   - Shape combination operations
   - Vector math library requirements

### Epic End Process

1. **Quality Validation**
   - Smooth Bezier curve editing
   - Precise path point manipulation
   - Shape boolean operations working
   - Performance with complex paths

2. **Integration Testing**
   - Test path editing at all zoom levels
   - Test shape combination operations
   - Test with existing selection tools
   - Verify undo/redo for all operations

3. **Documentation**
   - Vector math utilities guide
   - Path editing architecture
   - Shape tool usage documentation

### Coordination
- Depends on Epic 1's BaseTool class
- May need to coordinate with Epic 4 on shared drawing utilities
- Check #dev-vector channel for path/bezier discussions

---

## Overview
This epic covers implementation of all shape and vector drawing tools in FotoFun. These tools are essential for creating graphics, UI elements, and precise vector artwork. The Pen Tool is the most complex and should be tackled last.

## Prerequisites
Before starting these tools, ensure:
- [ ] Base Tool Class is implemented (from Epic 1)
- [ ] Command Pattern/History system is working
- [ ] Tool Options Store is understood
- [ ] Basic understanding of Fabric.js shape objects

## Tools to Implement

### Shape Tools
1. **Rectangle Tool (U)**
**MVP Version**
- Click and drag to create rectangle
- Shift to constrain to square
- Alt to draw from center
- Fill color option
- Stroke color and width options
- Corner radius option (for rounded rectangles)

**Full Photoshop Parity**
- Live shape properties panel
- Multiple fill types (solid, gradient, pattern)
- Multiple stroke types
- Stroke alignment (inside, center, outside)
- Dashed stroke options
- Shape layers vs paths vs pixels
- Combine shapes (unite, subtract, intersect, exclude)
- Transform while drawing
- Snap to grid/guides
- Shape presets library

2. **Ellipse Tool (U)**
**MVP Version**
- Click and drag to create ellipse
- Shift to constrain to circle
- Alt to draw from center
- Same fill/stroke options as rectangle

**Full Photoshop Parity**
- All rectangle tool features
- Pie/arc variations
- Start/end angle controls

3. **Polygon Tool (U)**
**MVP Version**
- Click and drag to create polygon
- Number of sides option (3-100)
- Star variation (inner radius)
- Same fill/stroke options

**Full Photoshop Parity**
- Smooth corners option
- Indent sides option
- Multiple polygon presets
- Live adjustment of sides while drawing

4. **Line Tool (U)**
**MVP Version**
- Click and drag to create line
- Shift to constrain angles (45° increments)
- Line weight option
- Arrowheads option (start/end)

**Full Photoshop Parity**
- Custom arrowhead shapes
- Line cap styles
- Line join styles
- Curved line option
- Multiple line weights in one stroke

5. **Custom Shape Tool (U)**
**MVP Version**
- Select from predefined shapes library
- Scale proportionally by default
- Basic shapes: arrow, speech bubble, heart, star

**Full Photoshop Parity**
- Extensive shape library (100+ shapes)
- Import custom shapes (.csh files)
- Create custom shapes from paths
- Shape categories and search
- Recent shapes
- Shape combinations

### Vector Path Tools
6. **Pen Tool (P)**
**MVP Version**
- Click to add anchor points
- Click and drag to create curves
- Close path to create shape
- Edit existing paths
- Add/delete anchor points
- Convert point types (corner/smooth)

**Full Photoshop Parity**
- Bezier curve manipulation
- Path operations panel
- Rubber band preview
- Magnetic pen option
- Freeform pen option
- Path selection tool
- Direct selection tool
- Convert to selection/shape
- Stroke path with brush
- Save/load paths
- Path animations

7. **Freeform Pen Tool (P)**
   - MVP: Draw paths freehand like pencil
   - Full: Magnetic pen option, path smoothing

8. **Add Anchor Point Tool**
   - MVP: Click on path to add points
   - Full: Smart point placement

9. **Delete Anchor Point Tool**
    - MVP: Click points to remove
    - Full: Maintain curve smoothness

10. **Convert Point Tool**
    - MVP: Convert between corner/smooth points
    - Full: Asymmetric handle control

### Path Selection Tools
11. **Path Selection Tool (A)**
    - MVP: Select entire paths
    - Full: Multiple path selection, alignment

12. **Direct Selection Tool (A)**
    - MVP: Select individual anchor points
    - Full: Marquee selection, handle manipulation

### Measurement & Slice Tools
13. **Ruler Tool (I)**
    - MVP: Measure distances and angles
    - Full: Straighten image based on measurement

14. **Slice Tool (C)**
    - MVP: Create rectangular slices for web export
    - Full: Auto-slice, slice from guides

15. **Slice Select Tool (C)**
    - MVP: Select and modify existing slices
    - Full: Slice properties, optimization settings

## Implementation Guide

### Base Shape Tool Class
```typescript
import { BaseTool } from './base/BaseTool'
import { Canvas, FabricObject } from 'fabric'

abstract class BaseShapeTool extends BaseTool {
  protected isDrawing = false
  protected startPoint: { x: number; y: number } | null = null
  protected currentShape: FabricObject | null = null
  protected shapeOptions: any = {}
  
  protected setupTool(canvas: Canvas): void {
    canvas.selection = false
    canvas.defaultCursor = 'crosshair'
    
    // Get shape options from store
    this.updateShapeOptions()
    
    // Set up event listeners
    canvas.on('mouse:down', this.handleMouseDown)
    canvas.on('mouse:move', this.handleMouseMove)
    canvas.on('mouse:up', this.handleMouseUp)
  }
  
  protected cleanup(canvas: Canvas): void {
    canvas.selection = true
    canvas.defaultCursor = 'default'
    
    // Remove event listeners
    canvas.off('mouse:down', this.handleMouseDown)
    canvas.off('mouse:move', this.handleMouseMove)
    canvas.off('mouse:up', this.handleMouseUp)
    
    // Clean up any incomplete shapes
    if (this.currentShape && this.isDrawing) {
      canvas.remove(this.currentShape)
    }
    
    this.isDrawing = false
    this.startPoint = null
    this.currentShape = null
  }
  
  protected handleMouseDown = (e: any): void => {
    if (!this.canvas) return
    
    const pointer = this.canvas.getPointer(e.e)
    this.startPoint = { x: pointer.x, y: pointer.y }
    this.isDrawing = true
    
    // Create initial shape
    this.currentShape = this.createShape(pointer.x, pointer.y, 0, 0)
    this.canvas.add(this.currentShape)
  }
  
  protected handleMouseMove = (e: any): void => {
    if (!this.isDrawing || !this.currentShape || !this.startPoint || !this.canvas) return
    
    const pointer = this.canvas.getPointer(e.e)
    const width = pointer.x - this.startPoint.x
    const height = pointer.y - this.startPoint.y
    
    // Handle constraints
    const constrainedDimensions = this.applyConstraints(width, height, e.e)
    
    // Update shape
    this.updateShape(this.currentShape, constrainedDimensions)
    this.canvas.renderAll()
  }
  
  protected handleMouseUp = (): void => {
    if (!this.currentShape || !this.canvas) return
    
    this.isDrawing = false
    
    // Check if shape is too small
    const minSize = 2
    if (this.currentShape.width! < minSize || this.currentShape.height! < minSize) {
      this.canvas.remove(this.currentShape)
    } else {
      // Record command for undo/redo
      const command = new AddShapeCommand(this.canvas, this.currentShape)
      this.recordCommand(command)
    }
    
    this.currentShape = null
    this.startPoint = null
  }
  
  protected applyConstraints(width: number, height: number, event: any): { width: number; height: number } {
    let constrainedWidth = width
    let constrainedHeight = height
    
    // Shift key constrains proportions
    if (event.shiftKey) {
      const size = Math.max(Math.abs(width), Math.abs(height))
      constrainedWidth = width < 0 ? -size : size
      constrainedHeight = height < 0 ? -size : size
    }
    
    // Alt key draws from center
    if (event.altKey && this.startPoint) {
      this.currentShape!.set({
        left: this.startPoint.x - Math.abs(constrainedWidth),
        top: this.startPoint.y - Math.abs(constrainedHeight)
      })
      constrainedWidth = Math.abs(constrainedWidth) * 2
      constrainedHeight = Math.abs(constrainedHeight) * 2
    }
    
    return { width: Math.abs(constrainedWidth), height: Math.abs(constrainedHeight) }
  }
  
  protected updateShapeOptions(): void {
    const options = this.options.getToolOptions(this.id)
    this.shapeOptions = {
      fill: options?.fillColor || '#000000',
      stroke: options?.strokeColor || null,
      strokeWidth: options?.strokeWidth || 1,
      opacity: (options?.opacity || 100) / 100
    }
  }
  
  protected abstract createShape(x: number, y: number, width: number, height: number): FabricObject
  protected abstract updateShape(shape: FabricObject, dimensions: { width: number; height: number }): void
}
```

### Rectangle Tool Implementation
```typescript
import { Rect } from 'fabric'
import { Square } from 'lucide-react'

export class RectangleTool extends BaseShapeTool {
  id = TOOL_IDS.SHAPE_RECTANGLE
  name = 'Rectangle Tool'
  icon = Square
  shortcut = 'U'
  
  protected createShape(x: number, y: number, width: number, height: number): Rect {
    const cornerRadius = this.options.getOptionValue<number>(this.id, 'cornerRadius') || 0
    
    return new Rect({
      left: x,
      top: y,
      width: width,
      height: height,
      rx: cornerRadius,
      ry: cornerRadius,
      ...this.shapeOptions
    })
  }
  
  protected updateShape(shape: Rect, dimensions: { width: number; height: number }): void {
    shape.set({
      width: dimensions.width,
      height: dimensions.height
    })
    
    // Update position if drawing from center
    if (this.startPoint && shape.left !== this.startPoint.x) {
      shape.set({
        width: dimensions.width,
        height: dimensions.height
      })
    }
  }
}
```

### Pen Tool Implementation (Complex)
```typescript
import { Path, Point, FabricObject } from 'fabric'
import { PenTool as PenIcon } from 'lucide-react'

interface AnchorPoint {
  point: Point
  handleIn?: Point
  handleOut?: Point
  type: 'corner' | 'smooth'
}

export class PenTool extends BaseTool {
  id = TOOL_IDS.PEN
  name = 'Pen Tool'
  icon = PenIcon
  shortcut = 'P'
  cursor = 'crosshair'
  
  private anchorPoints: AnchorPoint[] = []
  private currentPath: Path | null = null
  private isDrawingPath = false
  private previewLine: FabricObject | null = null
  private isDragging = false
  private currentAnchor: AnchorPoint | null = null
  
  protected setupTool(canvas: Canvas): void {
    canvas.selection = false
    
    // Different event handling for pen tool
    canvas.on('mouse:down', this.handleMouseDown)
    canvas.on('mouse:move', this.handleMouseMove)
    canvas.on('mouse:up', this.handleMouseUp)
    
    // Keyboard shortcuts
    window.addEventListener('keydown', this.handleKeyDown)
  }
  
  protected cleanup(canvas: Canvas): void {
    // Complete any open path
    if (this.isDrawingPath) {
      this.completePath()
    }
    
    canvas.selection = true
    canvas.off('mouse:down', this.handleMouseDown)
    canvas.off('mouse:move', this.handleMouseMove)
    canvas.off('mouse:up', this.handleMouseUp)
    
    window.removeEventListener('keydown', this.handleKeyDown)
    
    // Clean up preview
    if (this.previewLine) {
      canvas.remove(this.previewLine)
    }
  }
  
  private handleMouseDown = (e: any): void => {
    if (!this.canvas) return
    
    const pointer = this.canvas.getPointer(e.e)
    this.isDragging = true
    
    // Check if clicking on first point to close path
    if (this.anchorPoints.length > 2) {
      const firstPoint = this.anchorPoints[0].point
      const distance = Math.sqrt(
        Math.pow(pointer.x - firstPoint.x, 2) + 
        Math.pow(pointer.y - firstPoint.y, 2)
      )
      
      if (distance < 10) {
        this.closePath()
        return
      }
    }
    
    // Add new anchor point
    this.currentAnchor = {
      point: new Point(pointer.x, pointer.y),
      type: 'corner'
    }
    
    this.anchorPoints.push(this.currentAnchor)
    this.isDrawingPath = true
  }
  
  private handleMouseMove = (e: any): void => {
    if (!this.canvas) return
    
    const pointer = this.canvas.getPointer(e.e)
    
    // Update preview line
    if (this.isDrawingPath && this.anchorPoints.length > 0 && !this.isDragging) {
      this.updatePreviewLine(pointer)
    }
    
    // Handle dragging for bezier curves
    if (this.isDragging && this.currentAnchor) {
      this.currentAnchor.handleOut = new Point(
        pointer.x - this.currentAnchor.point.x,
        pointer.y - this.currentAnchor.point.y
      )
      this.currentAnchor.handleIn = new Point(
        -(pointer.x - this.currentAnchor.point.x),
        -(pointer.y - this.currentAnchor.point.y)
      )
      this.currentAnchor.type = 'smooth'
      
      this.updatePath()
    }
  }
  
  private handleMouseUp = (): void => {
    this.isDragging = false
    this.currentAnchor = null
    
    if (this.isDrawingPath) {
      this.updatePath()
    }
  }
  
  private handleKeyDown = (e: KeyboardEvent): void => {
    // ESC cancels current path
    if (e.key === 'Escape' && this.isDrawingPath) {
      this.cancelPath()
    }
    
    // Enter completes current path
    if (e.key === 'Enter' && this.isDrawingPath) {
      this.completePath()
    }
  }
  
  private updatePath(): void {
    if (!this.canvas || this.anchorPoints.length < 2) return
    
    // Remove old path
    if (this.currentPath) {
      this.canvas.remove(this.currentPath)
    }
    
    // Generate SVG path data
    const pathData = this.generatePathData()
    
    // Create new path
    this.currentPath = new Path(pathData, {
      fill: null,
      stroke: this.shapeOptions.stroke || '#000000',
      strokeWidth: this.shapeOptions.strokeWidth || 1,
      selectable: false
    })
    
    this.canvas.add(this.currentPath)
    this.canvas.renderAll()
  }
  
  private generatePathData(): string {
    let pathData = ''
    
    this.anchorPoints.forEach((anchor, index) => {
      if (index === 0) {
        pathData += `M ${anchor.point.x} ${anchor.point.y}`
      } else {
        const prevAnchor = this.anchorPoints[index - 1]
        
        if (anchor.type === 'smooth' || prevAnchor.type === 'smooth') {
          // Cubic bezier curve
          const cp1x = prevAnchor.point.x + (prevAnchor.handleOut?.x || 0)
          const cp1y = prevAnchor.point.y + (prevAnchor.handleOut?.y || 0)
          const cp2x = anchor.point.x + (anchor.handleIn?.x || 0)
          const cp2y = anchor.point.y + (anchor.handleIn?.y || 0)
          
          pathData += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${anchor.point.x} ${anchor.point.y}`
        } else {
          // Straight line
          pathData += ` L ${anchor.point.x} ${anchor.point.y}`
        }
      }
    })
    
    return pathData
  }
  
  private closePath(): void {
    if (!this.currentPath || !this.canvas) return
    
    this.currentPath.set({ fill: this.shapeOptions.fill })
    this.completePath()
  }
  
  private completePath(): void {
    if (!this.currentPath || !this.canvas) return
    
    // Make path selectable
    this.currentPath.set({ selectable: true })
    
    // Record command
    const command = new AddPathCommand(this.canvas, this.currentPath)
    this.recordCommand(command)
    
    // Reset state
    this.anchorPoints = []
    this.currentPath = null
    this.isDrawingPath = false
    
    // Remove preview
    if (this.previewLine) {
      this.canvas.remove(this.previewLine)
      this.previewLine = null
    }
  }
  
  private cancelPath(): void {
    if (!this.canvas) return
    
    if (this.currentPath) {
      this.canvas.remove(this.currentPath)
    }
    
    if (this.previewLine) {
      this.canvas.remove(this.previewLine)
    }
    
    this.anchorPoints = []
    this.currentPath = null
    this.isDrawingPath = false
    this.previewLine = null
  }
}
```

### Tool Options Configuration
```typescript
// Rectangle Tool Options
export const rectangleToolOptions: ToolOptionsConfig = {
  toolId: TOOL_IDS.SHAPE_RECTANGLE,
  options: [
    {
      id: 'fillColor',
      type: 'color',
      label: 'Fill',
      value: '#000000'
    },
    {
      id: 'strokeColor',
      type: 'color',
      label: 'Stroke',
      value: null,
      props: {
        allowNull: true
      }
    },
    {
      id: 'strokeWidth',
      type: 'slider',
      label: 'Stroke Width',
      value: 1,
      props: {
        min: 0,
        max: 100,
        step: 1,
        unit: 'px'
      }
    },
    {
      id: 'cornerRadius',
      type: 'slider',
      label: 'Corner Radius',
      value: 0,
      props: {
        min: 0,
        max: 200,
        step: 1,
        unit: 'px'
      }
    },
    {
      id: 'opacity',
      type: 'slider',
      label: 'Opacity',
      value: 100,
      props: {
        min: 0,
        max: 100,
        step: 1,
        unit: '%'
      }
    }
  ]
}

// Polygon Tool Options
export const polygonToolOptions: ToolOptionsConfig = {
  toolId: TOOL_IDS.SHAPE_POLYGON,
  options: [
    {
      id: 'sides',
      type: 'number',
      label: 'Sides',
      value: 6,
      props: {
        min: 3,
        max: 100,
        step: 1
      }
    },
    {
      id: 'starMode',
      type: 'checkbox',
      label: 'Star',
      value: false
    },
    {
      id: 'innerRadius',
      type: 'slider',
      label: 'Inner Radius',
      value: 50,
      props: {
        min: 1,
        max: 99,
        step: 1,
        unit: '%',
        disabled: (options: any) => !options.starMode
      }
    },
    // ... other common shape options
  ]
}
```

## Testing Guidelines

### Manual Testing Checklist

#### Basic Shape Creation
1. **Rectangle Tool**
   - [ ] Click and drag creates rectangle
   - [ ] Shift constrains to square
   - [ ] Alt draws from center
   - [ ] Shift+Alt works together
   - [ ] Corner radius applies correctly
   - [ ] Negative dimensions handled

2. **Ellipse Tool**
   - [ ] Click and drag creates ellipse
   - [ ] Shift constrains to circle
   - [ ] Alt draws from center
   - [ ] Proper ellipse math

3. **Polygon Tool**
   - [ ] Creates polygon with correct sides
   - [ ] Star mode works
   - [ ] Inner radius affects star properly
   - [ ] Rotation while drawing

4. **Line Tool**
   - [ ] Creates straight lines
   - [ ] Shift constrains to 45° angles
   - [ ] Arrowheads render correctly
   - [ ] Line weight applies

5. **Pen Tool**
   - [ ] Click adds anchor points
   - [ ] Drag creates curves
   - [ ] Close path by clicking first point
   - [ ] ESC cancels path
   - [ ] Enter completes path
   - [ ] Preview line shows

#### Integration Tests
- [ ] Undo/redo works for all shapes
- [ ] Shapes appear in layers panel
- [ ] Transform tools work on shapes
- [ ] Fill/stroke changes apply
- [ ] Export preserves vector quality

### Automated Testing
```typescript
describe('RectangleTool', () => {
  let canvas: Canvas
  let tool: RectangleTool
  
  beforeEach(() => {
    canvas = new Canvas('test-canvas')
    tool = new RectangleTool()
    tool.onActivate(canvas)
  })
  
  it('should create rectangle on drag', async () => {
    // Simulate mouse down
    const downEvent = createMouseEvent(100, 100)
    tool.handleMouseDown(downEvent)
    
    // Simulate mouse move
    const moveEvent = createMouseEvent(200, 150)
    tool.handleMouseMove(moveEvent)
    
    // Simulate mouse up
    tool.handleMouseUp()
    
    const objects = canvas.getObjects()
    expect(objects).toHaveLength(1)
    expect(objects[0]).toBeInstanceOf(Rect)
    expect(objects[0].width).toBe(100)
    expect(objects[0].height).toBe(50)
  })
  
  it('should constrain to square with shift', async () => {
    const downEvent = createMouseEvent(100, 100)
    tool.handleMouseDown(downEvent)
    
    const moveEvent = createMouseEvent(200, 150, { shiftKey: true })
    tool.handleMouseMove(moveEvent)
    
    tool.handleMouseUp()
    
    const rect = canvas.getObjects()[0] as Rect
    expect(rect.width).toBe(rect.height)
  })
})
```

## Performance Considerations

### Path Optimization
```typescript
class PathOptimizer {
  // Simplify paths with too many points
  static simplifyPath(path: Path, tolerance: number = 1): Path {
    const points = this.pathToPoints(path)
    const simplified = this.douglasPeucker(points, tolerance)
    return this.pointsToPath(simplified)
  }
  
  // Douglas-Peucker algorithm for path simplification
  private static douglasPeucker(points: Point[], tolerance: number): Point[] {
    if (points.length <= 2) return points
    
    // Find point with maximum distance
    let maxDist = 0
    let maxIndex = 0
    
    for (let i = 1; i < points.length - 1; i++) {
      const dist = this.perpendicularDistance(
        points[i],
        points[0],
        points[points.length - 1]
      )
      
      if (dist > maxDist) {
        maxDist = dist
        maxIndex = i
      }
    }
    
    // If max distance is greater than tolerance, recursively simplify
    if (maxDist > tolerance) {
      const left = this.douglasPeucker(points.slice(0, maxIndex + 1), tolerance)
      const right = this.douglasPeucker(points.slice(maxIndex), tolerance)
      
      return [...left.slice(0, -1), ...right]
    } else {
      return [points[0], points[points.length - 1]]
    }
  }
}
```

### Shape Caching
```typescript
class ShapeCache {
  private cache = new Map<string, FabricObject>()
  
  getCachedShape(type: string, options: any): FabricObject | null {
    const key = this.generateKey(type, options)
    return this.cache.get(key) || null
  }
  
  cacheShape(type: string, options: any, shape: FabricObject): void {
    const key = this.generateKey(type, options)
    this.cache.set(key, shape.clone())
  }
  
  private generateKey(type: string, options: any): string {
    return `${type}_${JSON.stringify(options)}`
  }
}
```

## Advanced Features Implementation Notes

### Shape Combination Operations
```typescript
enum CombineMode {
  Unite = 'unite',
  Subtract = 'subtract',
  Intersect = 'intersect',
  Exclude = 'exclude'
}

class ShapeCombiner {
  static combine(
    shape1: FabricObject,
    shape2: FabricObject,
    mode: CombineMode
  ): Path {
    // Convert shapes to paths
    const path1 = this.shapeToPath(shape1)
    const path2 = this.shapeToPath(shape2)
    
    // Use paper.js or similar for boolean operations
    const result = this.booleanOperation(path1, path2, mode)
    
    return this.createFabricPath(result)
  }
}
```

### Live Shape Properties
```typescript
interface LiveShapeProperties {
  // Rectangle specific
  width: number
  height: number
  cornerRadius: number[]  // Individual corners
  
  // Ellipse specific
  rx: number
  ry: number
  startAngle?: number
  endAngle?: number
  
  // Polygon specific
  sides: number
  innerRadius?: number
  smoothness?: number
  
  // Common
  transform: Matrix
  fill: Fill
  stroke: Stroke
}

class LiveShapeEditor {
  editShape(shape: FabricObject, properties: Partial<LiveShapeProperties>): void {
    // Apply properties while maintaining shape type
    // Allow non-destructive editing
  }
}
```

## File Organization for Epic 3

### Shape & Vector Tool Files to Create

#### 1. Tool Implementations
```
lib/
├── tools/
│   ├── shapes/
│   │   ├── base/
│   │   │   ├── BaseShapeTool.ts        # Base for all shapes
│   │   │   ├── ShapeConstraints.ts      # Shift/Alt handling
│   │   │   └── ShapeFactory.ts         # Shape creation utilities
│   │   ├── RectangleTool.ts            # Rectangle/rounded rectangle
│   │   ├── EllipseTool.ts              # Ellipse/circle
│   │   ├── PolygonTool.ts              # Polygon/star
│   │   ├── LineTool.ts                 # Line/arrow
│   │   ├── CustomShapeTool.ts          # Predefined shapes
│   │   └── index.ts
│   │
│   ├── vector/
│   │   ├── PenTool.ts                  # Main pen tool
│   │   ├── PathSelectionTool.ts        # Select paths
│   │   ├── DirectSelectionTool.ts      # Select points
│   │   ├── AddAnchorTool.ts            # Add points
│   │   ├── DeleteAnchorTool.ts         # Remove points
│   │   ├── ConvertPointTool.ts         # Convert point types
│   │   └── index.ts
```

#### 2. Shape Commands
```
lib/
├── commands/
│   ├── shapes/
│   │   ├── AddShapeCommand.ts          # Add new shape
│   │   ├── TransformShapeCommand.ts    # Transform shape
│   │   ├── ModifyShapeCommand.ts       # Change properties
│   │   ├── CombineShapesCommand.ts     # Boolean operations
│   │   └── index.ts
│   │
│   ├── paths/
│   │   ├── AddPathCommand.ts           # Add path
│   │   ├── ModifyPathCommand.ts        # Edit path points
│   │   ├── ConvertToShapeCommand.ts    # Path to shape
│   │   └── index.ts
```

#### 3. Shape Library
```
lib/
├── shapes/
│   ├── library/
│   │   ├── ShapeLibrary.ts             # Shape management
│   │   ├── BasicShapes.ts              # Arrow, star, etc.
│   │   ├── UIShapes.ts                 # Buttons, badges
│   │   ├── SymbolShapes.ts             # Icons, symbols
│   │   ├── CustomShapeLoader.ts        # Load .csh files
│   │   └── index.ts
│   │
│   ├── presets/                        # Shape presets
│   │   ├── arrows.json
│   │   ├── speech-bubbles.json
│   │   ├── badges.json
│   │   └── symbols.json
```

#### 4. Path System
```
lib/
├── paths/
│   ├── Path.ts                         # Enhanced path class
│   ├── PathPoint.ts                    # Anchor point class
│   ├── PathSegment.ts                  # Path segments
│   ├── BezierCurve.ts                  # Bezier math
│   ├── PathOperations.ts               # Path manipulation
│   ├── PathSimplifier.ts               # Simplify paths
│   └── index.ts
```

#### 5. Shape Operations
```
lib/
├── shapes/
│   ├── operations/
│   │   ├── ShapeCombiner.ts            # Boolean operations
│   │   ├── ShapeTransformer.ts         # Transform shapes
│   │   ├── ShapeConverter.ts           # Convert between types
│   │   ├── LiveShapeEditor.ts          # Non-destructive editing
│   │   └── index.ts
```

#### 6. Shape Properties Panel
```
components/
├── panels/
│   ├── ShapePropertiesPanel/
│   │   ├── index.tsx                   # Main panel
│   │   ├── RectangleProperties.tsx     # Rectangle-specific
│   │   ├── EllipseProperties.tsx       # Ellipse-specific
│   │   ├── PolygonProperties.tsx       # Polygon-specific
│   │   ├── LineProperties.tsx          # Line-specific
│   │   ├── FillOptions.tsx             # Fill controls
│   │   ├── StrokeOptions.tsx           # Stroke controls
│   │   └── TransformControls.tsx       # Position/size
│   │
│   ├── PathsPanel/
│   │   ├── index.tsx                   # Paths panel
│   │   ├── PathItem.tsx                # Individual path
│   │   ├── PathOperations.tsx          # Path actions
│   │   └── PathPreview.tsx             # Path thumbnail
```

#### 7. Tool Options Components
```
components/
├── editor/
│   ├── OptionsBar/
│   │   ├── options/
│   │   │   ├── shapes/
│   │   │   │   ├── RectangleOptions.tsx # Corner radius, etc.
│   │   │   │   ├── PolygonOptions.tsx   # Sides, star mode
│   │   │   │   ├── LineOptions.tsx      # Arrows, weight
│   │   │   │   └── PenOptions.tsx       # Rubber band, etc.
```

#### 8. Shape Styles
```
lib/
├── shapes/
│   ├── styles/
│   │   ├── ShapeStyle.ts               # Style definition
│   │   ├── FillStyle.ts                # Fill types
│   │   ├── StrokeStyle.ts              # Stroke types
│   │   ├── GradientFill.ts             # Gradient fills
│   │   ├── PatternFill.ts              # Pattern fills
│   │   └── index.ts

store/
├── shapeStyleStore.ts                  # Shape styles state
```

#### 9. Constants Updates
```
constants/
├── shapes.ts                           # New file with:
                                       # - DEFAULT_CORNER_RADIUS
                                       # - DEFAULT_POLYGON_SIDES
                                       # - ARROW_TYPES
                                       # - STROKE_CAPS
                                       # - STROKE_JOINS
                                       # - SHAPE_CATEGORIES
```

#### 10. Types Updates
```
types/
├── shapes.ts                           # New file with:
                                       # - ShapeType enum
                                       # - ShapeStyle interface
                                       # - PathPoint interface
                                       # - BezierHandle interface
                                       # - ShapeProperties interface
                                       # - CombineMode enum
```

#### 11. Vector Graphics Utilities
```
lib/
├── vector/
│   ├── utils/
│   │   ├── BezierMath.ts              # Bezier calculations
│   │   ├── PathMath.ts                # Path algorithms
│   │   ├── Intersection.ts            # Shape intersections
│   │   ├── BoundingBox.ts             # Bounds calculation
│   │   └── index.ts
```

#### 12. Hooks for Shape Tools
```
hooks/
├── useShapeTool.ts                    # Shape tool state
├── usePathEditing.ts                  # Path editing state
├── useShapeConstraints.ts             # Shift/Alt modifiers
├── useShapePreview.ts                 # Live preview
```

### Testing Structure
```
__tests__/
├── tools/
│   ├── shapes/
│   │   ├── RectangleTool.test.ts
│   │   ├── EllipseTool.test.ts
│   │   ├── PolygonTool.test.ts
│   │   ├── LineTool.test.ts
│   │   └── PenTool.test.ts
│   ├── shapes/
│   │   ├── operations/
│   │   │   ├── ShapeCombiner.test.ts
│   │   │   └── PathOperations.test.ts
```

### SVG Import/Export
```
lib/
├── shapes/
│   ├── io/
│   │   ├── SVGImporter.ts             # Import SVG files
│   │   ├── SVGExporter.ts             # Export to SVG
│   │   ├── PathParser.ts              # Parse path data
│   │   └── index.ts
```

### Implementation Order

1. **Week 1: Basic Shapes**
   - BaseShapeTool class
   - Rectangle, Ellipse tools
   - Basic shape commands
   - Shape properties panel

2. **Week 2: Advanced Shapes**
   - Polygon, Line tools
   - Custom shape tool
   - Shape library setup
   - Fill/stroke options

3. **Week 3: Pen Tool (MVP)**
   - Basic pen tool
   - Path creation
   - Simple point editing
   - Path commands

4. **Week 4: Full Vector Features**
   - Path selection tools
   - Point manipulation
   - Boolean operations
   - SVG import/export

### Performance Considerations

1. **Shape Caching**
   - Cache frequently used shapes
   - Reuse shape instances
   - Optimize render calls

2. **Path Optimization**
   - Simplify complex paths
   - Limit anchor points
   - Use GPU for rendering

3. **Live Preview**
   - Debounce updates
   - Use simplified preview
   - Defer complex calculations

## Deliverables Checklist

### MVP Phase
- [ ] Rectangle Tool with corner radius
- [ ] Ellipse Tool
- [ ] Polygon Tool with star mode
- [ ] Line Tool with arrowheads
- [ ] Custom Shape Tool (basic shapes)
- [ ] Shape commands for undo/redo
- [ ] Tool options for each shape
- [ ] Basic fill/stroke controls
- [ ] Unit tests (80% coverage)
- [ ] Manual test documentation

### Full Photoshop Parity Phase
- [ ] Pen Tool with full bezier editing
- [ ] Path selection tools
- [ ] Shape combination operations
- [ ] Live shape properties panel
- [ ] Gradient fills
- [ ] Pattern fills
- [ ] Advanced stroke options
- [ ] Shape presets library
- [ ] Custom shape import/export
- [ ] Path operations panel
- [ ] Shape layers vs paths vs pixels
- [ ] Performance optimizations 

## File Organization

### New Files to Create
```
/lib/tools/
  baseShapeTool.ts         # Base class for shape tools
  rectangleTool.ts         # Rectangle shape tool
  ellipseTool.ts           # Ellipse shape tool
  polygonTool.ts           # Polygon shape tool
  lineTool.ts              # Line shape tool
  customShapeTool.ts       # Custom shape tool
  penTool.ts               # Bezier path tool
  freeformPenTool.ts       # Freehand path drawing
  addAnchorTool.ts         # Add path points
  deleteAnchorTool.ts      # Remove path points
  convertPointTool.ts      # Change point types
  pathSelectionTool.ts     # Select whole paths
  directSelectionTool.ts   # Select anchor points
  rulerTool.ts             # Measurement tool
  sliceTool.ts             # Create web slices
  sliceSelectTool.ts       # Modify slices

/lib/shapes/
  shapeEngine.ts           # Core shape rendering
  shapeLibrary.ts          # Predefined shapes
  pathOperations.ts        # Boolean operations
  shapeProperties.ts       # Fill, stroke, effects

/lib/paths/
  pathEngine.ts            # Path manipulation
  bezierMath.ts            # Bezier calculations
  pathSimplify.ts          # Path optimization
  pathConverter.ts         # Convert between formats
  svgParser.ts             # SVG import/export

/lib/measurement/
  ruler.ts                 # Distance/angle calculations
  guides.ts                # Guide management
  sliceManager.ts          # Slice optimization

/components/panels/
  PathsPanel.tsx           # Path management UI
  PropertiesPanel.tsx      # Shape properties
  SlicesPanel.tsx          # Slice management

/components/shapes/
  ShapeOptions.tsx         # Tool options bar
  PathEditor.tsx           # On-canvas path editing
  ShapeLibraryPicker.tsx   # Custom shape selector
```

### Updates to Existing Files 