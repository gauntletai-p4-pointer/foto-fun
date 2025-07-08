# FotoFun Tool Architecture - Canonical Reference

**Last Updated**: Epic 1 Complete - All Foundation Tools Implemented
**Status**: Production-ready architecture with clear patterns established

## Overview

This document serves as the single source of truth for FotoFun's tool architecture. It reflects the actual state of the codebase and establishes patterns for all future tool development.

## Quick Start: Creating a New Tool

### Step-by-Step Tool Creation

1. **Add Tool ID** (`constants/index.ts`):
```typescript
export const TOOL_IDS = {
  // ... existing tools
  MY_NEW_TOOL: 'my-new-tool',
} as const
```

2. **Create Tool Class** (`lib/editor/tools/[category]/myNewTool.ts`):
```typescript
import { IconName } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import type { Canvas, TPointerEventInfo } from 'fabric'
import { BaseTool } from '../base/BaseTool'
import { createToolState } from '../utils/toolState'

// Define tool state
type MyToolState = {
  isActive: boolean
  // Add other state properties
}

class MyNewTool extends BaseTool {
  // Required properties
  id = TOOL_IDS.MY_NEW_TOOL
  name = 'My New Tool'
  icon = IconName
  cursor = 'crosshair'
  shortcut = 'X'
  
  // Tool state
  private state = createToolState<MyToolState>({
    isActive: false
  })
  
  // Required: Setup
  protected setupTool(canvas: Canvas): void {
    // Add event handlers
    this.addCanvasEvent('mouse:down', (e: unknown) => {
      this.handleMouseDown(e as TPointerEventInfo<MouseEvent>)
    })
    
    // Subscribe to options
    this.subscribeToToolOptions((options) => {
      // Handle option changes
    })
    
    canvas.renderAll()
  }
  
  // Required: Cleanup
  protected cleanup(canvas: Canvas): void {
    // Clean up resources
    this.state.reset()
    canvas.renderAll()
  }
  
  // Implement tool logic...
}

// Export singleton
export const myNewTool = new MyNewTool()
```

3. **Add Tool Options** (`store/toolOptionsStore.ts`):
```typescript
[TOOL_IDS.MY_NEW_TOOL]: {
  toolId: TOOL_IDS.MY_NEW_TOOL,
  options: [
    {
      id: 'size',
      type: 'slider',
      label: 'Size',
      value: 10,
      props: { min: 1, max: 100, step: 1, unit: 'px' }
    }
  ]
}
```

4. **Register Tool** (`lib/editor/tools/index.ts`):
```typescript
import { myNewTool } from './category/myNewTool'

export const tools: Tool[] = [
  // ... existing tools
  myNewTool,
]

export { myNewTool }
```

## Architecture Layers

### 1. Base Classes

#### BaseTool (`lib/editor/tools/base/BaseTool.ts`)
The foundation class that ALL tools must extend.

**Key Features:**
- Lifecycle management (`onActivate`, `onDeactivate`)
- Automatic event cleanup
- Store subscription management
- Performance tracking
- Error recovery

**Required Implementation:**
```typescript
abstract class BaseTool implements Tool {
  abstract id: string
  abstract name: string
  abstract icon: ComponentType
  abstract cursor: string
  abstract shortcut?: string
  
  protected abstract setupTool(canvas: Canvas): void
  protected abstract cleanup(canvas: Canvas): void
}
```

**Provided Methods:**
- `addCanvasEvent(event, handler)` - Auto-cleanup canvas events
- `addEventListener(target, event, handler)` - Auto-cleanup DOM events
- `track(name, operation)` - Performance tracking
- `executeCommand(command)` - History integration
- `subscribeToToolOptions(callback)` - Options subscription

#### SelectionTool (`lib/editor/tools/base/SelectionTool.ts`)
Base class for all selection-based tools (marquee, lasso).

**Extends**: BaseTool
**Provides**:
- Selection state management
- Constraint handling (Shift/Alt)
- Visual feedback system
- Selection mode integration

**State Management:**
```typescript
protected state = createToolState<SelectionToolState>({
  isSelecting: false,
  startPoint: null,
  currentPoint: null,
  constrainProportions: false,
  drawFromCenter: false
})
```

#### DrawingTool (`lib/editor/tools/base/DrawingTool.ts`)
Base class for all drawing/painting tools (brush, pencil, eraser - removed).

**Extends**: BaseTool
**Provides**:
- Drawing state management
- Stroke path handling
- Smooth path generation
- Layer integration

**Required Implementation:**
```typescript
protected abstract strokeColor: string
protected abstract strokeWidth: number
protected abstract opacity: number
```

### 2. State Management

#### ToolStateManager (`lib/editor/tools/utils/toolState.ts`)
Encapsulated state management for tools.

**Usage:**
```typescript
const state = createToolState<MyToolState>({
  isActive: false,
  startPoint: null
})

// Get state
const isActive = state.get('isActive')

// Set single value
state.set('isActive', true)

// Set multiple values
state.setState({
  isActive: true,
  startPoint: { x: 10, y: 20 }
})

// Reset to initial
state.reset()
```

### 3. Tool Categories

#### Selection Tools
- **Base Class**: SelectionTool
- **Examples**: Rectangular Marquee, Elliptical Marquee, Lasso
- **Integration**: SelectionManager, SelectionRenderer
- **Pattern**: Create visual feedback → Convert to pixel selection

#### Drawing Tools
- **Base Class**: DrawingTool
- **Examples**: Brush, Pencil (Eraser - removed)
- **Integration**: LayerStore, HistoryStore
- **Pattern**: Track strokes → Create path → Add to canvas

#### Transform Tools
- **Base Class**: BaseTool
- **Examples**: Move, Crop, Rotate
- **Integration**: Direct canvas manipulation
- **Pattern**: Visual feedback → Apply transformation

#### Utility Tools
- **Base Class**: BaseTool
- **Examples**: Eyedropper, Hand, Zoom
- **Integration**: Various stores
- **Pattern**: Tool-specific

### 4. Integration Points

#### Command System
```typescript
// In your tool
import { AddObjectCommand } from '@/lib/editor/commands/canvas'

// Record undoable action
const command = new AddObjectCommand(canvas, newObject)
await this.executeCommand(command)
```

#### Layer System
```typescript
// Check if can modify
import { LayerAwareMixin } from '@/lib/editor/tools/utils/layerAware'

if (this.canModifyObject(object)) {
  // Perform modification
}

// Add to active layer
this.addObjectToActiveLayer(object)
```

#### Selection System
```typescript
// Get selection manager
const { selectionManager } = useCanvasStore.getState()

// Create selection
selectionManager.createRectangle(x, y, width, height, mode)

// Check if pixel selected
const isSelected = selectionManager.isPixelSelected(x, y)
```

## Tool Implementation Checklist

### Required
- [ ] Extends appropriate base class
- [ ] Implements `setupTool()` and `cleanup()`
- [ ] Uses `createToolState` for state management
- [ ] Has unique tool ID in constants
- [ ] Exports singleton instance
- [ ] Registered in tools index

### Best Practices
- [ ] No module-level variables
- [ ] All events use helper methods
- [ ] Performance tracked with `track()`
- [ ] Integrates with command system
- [ ] Respects layer visibility/lock
- [ ] Handles errors gracefully

### Testing
- [ ] Works at all zoom levels (1% - 3200%)
- [ ] Undo/redo functions correctly
- [ ] No memory leaks
- [ ] Dark mode compatible
- [ ] Keyboard shortcuts work

## Common Patterns

### Pattern 1: Selection Tool
```typescript
class MySelectionTool extends SelectionTool {
  protected createFeedback(): void {
    // Create visual feedback shape
  }
  
  protected updateFeedback(): void {
    // Update feedback during drag
  }
  
  protected finalizeSelection(): void {
    // Convert to pixel selection
    const { selectionManager } = useCanvasStore.getState()
    selectionManager.createFromPath(path, mode)
  }
}
```

### Pattern 2: Drawing Tool
```typescript
class MyDrawingTool extends DrawingTool {
  protected beginStroke(point: Point): void {
    // Start new stroke
  }
  
  protected updateStroke(point: Point): void {
    // Add point to stroke
  }
  
  protected finalizeStroke(): void {
    // Create final object and add to canvas
    const command = new AddObjectCommand(canvas, strokeObject)
    this.executeCommand(command)
  }
}
```

### Pattern 3: Interactive Tool
```typescript
class MyInteractiveTool extends BaseTool {
  private handleMouseDown(e: TPointerEventInfo<MouseEvent>): void {
    this.track('mouseDown', () => {
      // Handle interaction
    })
  }
}
```

## Tool Inventory (Epic 1 Complete)

### Implemented Tools

| Tool | File | Base Class | Shortcut | Category |
|------|------|------------|----------|----------|
| Move Tool | `moveTool.ts` | BaseTool | V | Transform |
| Rectangular Marquee | `marqueeRectTool.ts` | SelectionTool | M | Selection |
| Elliptical Marquee | `marqueeEllipseTool.ts` | SelectionTool | M | Selection |
| Lasso Tool | `lassoTool.ts` | SelectionTool | L | Selection |
| Magic Wand | `magicWandTool.ts` | BaseTool | W | Selection |
| Quick Selection | `quickSelectionTool.ts` | BaseTool | W | Selection |
| Crop Tool | `cropTool.ts` | BaseTool | C | Transform |
| Eyedropper | `eyedropperTool.ts` | BaseTool | I | Utility |
| Hand Tool | `handTool.ts` | BaseTool | H | Navigation |
| Zoom Tool | `zoomTool.ts` | BaseTool | Z | Navigation |
| Brush Tool | `brushTool.ts` | DrawingTool | B | Drawing |
| Eraser Tool | `eraserTool.ts` | DrawingTool | E | Drawing | ❌ REMOVED |

### Tool Option Types

Available option types for tool options:
- `slider` - Numeric value with min/max
- `checkbox` - Boolean toggle
- `dropdown` - Select from options
- `number` - Direct numeric input
- `button-group` - Multiple choice buttons
- `color` - Color picker

## Performance Requirements

- All tool operations must complete in < 16ms (60 FPS)
- Use `requestAnimationFrame` for animations
- Debounce rapid updates (mouse move)
- Track performance with `track()` method
- Log warnings for slow operations

## Anti-Patterns to Avoid

```typescript
// ❌ BAD - Module-level state
let isDrawing = false
let currentPath: Point[] = []

// ✅ GOOD - Encapsulated state
class MyTool extends BaseTool {
  private state = createToolState({
    isDrawing: false,
    currentPath: [] as Point[]
  })
}

// ❌ BAD - Direct event handling
canvas.on('mouse:down', this.handleMouseDown)

// ✅ GOOD - Use helper method
this.addCanvasEvent('mouse:down', this.handleMouseDown.bind(this))

// ❌ BAD - No performance tracking
private processPixels() {
  // Heavy operation
}

// ✅ GOOD - Track performance
private processPixels() {
  this.track('processPixels', () => {
    // Heavy operation
  })
}
```

## Store Integration

### Available Stores
- `canvasStore` - Canvas state and operations
- `toolOptionsStore` - Tool-specific options
- `selectionStore` - Selection state and mode
- `colorStore` - Color management and recent colors
- `documentStore` - Document state
- `performanceStore` - Performance metrics
- `historyStore` - Undo/redo management
- `layerStore` - Layer management
- `toolStore` - Active tool management

### Store Usage Example
```typescript
// Get store state
const { selectionManager } = useCanvasStore.getState()
const activeLayer = useLayerStore.getState().getActiveLayer()

// Subscribe to changes
this.subscribeToStore(useSelectionStore, (state) => {
  // React to selection mode changes
})
```

## Future Tool Guidelines (Epics 2-4)

### Epic 2 - Text Tools
- Create `BaseTextTool` extending `BaseTool`
- Integrate with future TextEngine
- Support text layers

### Epic 3 - Shape/Vector Tools
- Create `BaseShapeTool` extending `BaseTool`
- Create `BaseVectorTool` for path-based tools
- Integrate with vector editing system

### Epic 4 - Paint/Clone Tools
- Create `BaseCloneTool` extending `BaseTool`
- Create `BaseEffectTool` for blur/sharpen/smudge
- Integrate with image processing pipeline

## Migration from Old Architecture

If migrating tools from module-based to class-based:

1. Convert module variables to class state
2. Move event handlers to class methods
3. Use `addCanvasEvent` instead of direct `canvas.on`
4. Add proper cleanup in `cleanup()` method
5. Export singleton instance
6. Update imports throughout codebase

## AI Tool Integration (Epic 5)

### Overview

Tools can be made AI-compatible through the adapter pattern. Not all tools are suitable for AI - only parameter-based tools work well.

### AI-Compatible Tools

Tools that work with discrete parameters:
- **Adjustments**: brightness, contrast, saturation
- **Transforms**: crop, resize, rotate
- **Filters**: blur, sharpen, effects
- **Additions**: text, shapes with specific dimensions

### Non-AI-Compatible Tools

Tools requiring mouse interaction:
- **Selection tools**: Need drawn paths
- **Drawing tools**: Need freehand input
- **Navigation**: Hand, zoom are UI-only

### Creating an AI Adapter

```typescript
// lib/ai/adapters/tools/brightness.ts
import { BaseToolAdapter } from '../base'
import { brightnessTool } from '@/lib/tools/brightnessTool'

export class BrightnessToolAdapter extends BaseToolAdapter<Input, Output> {
  tool = brightnessTool
  aiName = 'adjustBrightness'
  description = 'Adjust brightness from -100 (darkest) to 100 (brightest)'
  
  parameters = z.object({
    adjustment: z.number()
      .min(-100)
      .max(100)
      .describe('Brightness adjustment value')
  })
  
  async execute(params: Input, context: { canvas: Canvas }): Promise<Output> {
    // Implementation
  }
}
```

### Key Patterns

1. **Singleton Tools**: Tools are singleton instances
   ```typescript
   export const brightnessTool = new BrightnessTool()
   ```

2. **Canvas Context**: Always verify canvas is available
   ```typescript
   const context = CanvasToolBridge.getCanvasContext()
   if (!context?.canvas) throw new Error('Canvas not available')
   ```

3. **Parameter Descriptions**: Be explicit about units
   ```typescript
   z.number().describe('Rotation in degrees (positive = clockwise)')
   ```

### Common Issues & Solutions

#### Canvas Not Ready
**Issue**: Race condition between canvas init and tool execution
**Solution**: Always wait and verify
```typescript
await useCanvasStore.getState().waitForReady()
const canvas = useCanvasStore.getState().fabricCanvas
if (!canvas) throw new Error('Canvas not ready')
```

#### Natural Language Parameters
**Issue**: User says "crop 50%" but tool needs exact pixels
**Solution**: Pass canvas dimensions in system prompt
```typescript
// AI model calculates: 50% of 1000px = 500px
```

#### TypeScript with AI SDK v5
**Issue**: Complex type inference with `tool()` function
**Solution**: Cast through unknown
```typescript
return tool({...}) as unknown as Tool<unknown, unknown>
```

### Testing AI Tools

1. Load an image first
2. Test natural language: "make it brighter"
3. Test specific values: "brightness +50"
4. Verify canvas updates
5. Check undo/redo works
6. Test edge cases (no image, invalid params)

### Architecture Considerations

The adapter pattern successfully:
- Separates AI concerns from tool logic
- Allows single implementation for UI and AI
- Scales to many tools
- Provides consistent interface

However, the canvas initialization has challenges:
- Async state updates cause race conditions
- Multiple sources of truth for "ready" state
- Promises capture stale closures

Future improvements should consider:
- State machine for initialization
- Operation queuing
- Transaction support for multi-step operations

---

**Note**: This document reflects the production architecture after Epic 1 completion. All new tools must follow these patterns. 