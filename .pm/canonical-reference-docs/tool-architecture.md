# FotoFun Tool Architecture - Canonical Reference

**Last Updated**: Epic 1 - Phase 0 Complete
**Status**: Foundation established, tools pending migration

## Overview

This document serves as the single source of truth for FotoFun's tool architecture. It reflects the actual state of the codebase and is updated at the end of each epic.

## Architecture Layers

### 1. Base Classes

#### BaseTool (`lib/tools/base/BaseTool.ts`)
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

#### SelectionTool (`lib/tools/base/SelectionTool.ts`)
Base class for all selection-based tools (marquee, lasso, magic wand).

**Extends**: BaseTool
**Provides**:
- Selection state management
- Constraint handling (Shift/Alt)
- Visual feedback system
- Selection mode integration

**Required Implementation:**
```typescript
abstract class SelectionTool extends BaseTool {
  protected abstract createFeedback(): void
  protected abstract updateFeedback(): void
  protected abstract finalizeSelection(): void
}
```

#### DrawingTool (`lib/tools/base/DrawingTool.ts`)
Base class for all drawing/painting tools (brush, pencil, eraser).

**Extends**: BaseTool
**Provides**:
- Drawing state management
- Stroke path handling
- Smooth path generation
- Real-time feedback

**Required Implementation:**
```typescript
abstract class DrawingTool extends BaseTool {
  protected abstract strokeColor: string
  protected abstract strokeWidth: number
  protected abstract opacity: number
  
  protected abstract beginStroke(point: Point, event: MouseEvent): void
  protected abstract updateStroke(point: Point, event: MouseEvent): void
  protected abstract finalizeStroke(): void
  protected abstract updateToolProperties(options: ToolOption[]): void
}
```

### 2. State Management

#### ToolStateManager (`lib/tools/utils/toolState.ts`)
Encapsulated state management for tools.

**Features**:
- Type-safe state
- Subscription system
- Serialization support
- Snapshot/restore

**Usage**:
```typescript
const state = createToolState<MyToolState>({
  isActive: false,
  startPoint: null
})
```

### 3. Utilities

#### Constraints (`lib/tools/utils/constraints.ts`)
Helper functions for tool constraints.

**Exports**:
- `constrainProportions()` - Square/circle constraint (Shift)
- `drawFromCenter()` - Center-based drawing (Alt)
- `constrainAngle()` - Angle snapping
- `snapToGrid()` - Grid snapping
- `getBoundingBox()` - Bounding box calculations

### 4. Command System

#### Command Interface (`lib/tools/base/BaseTool.ts`)
**Status**: Interface defined, implementation pending

```typescript
interface Command {
  id: string
  timestamp: number
  description: string
  execute(): Promise<void>
  undo(): Promise<void>
  redo(): Promise<void>
  canExecute(): boolean
  canUndo(): boolean
}
```

## Tool Inventory

### Implemented Tools (Old Architecture)

| Tool | File | Status | Base Class | Notes |
|------|------|--------|------------|-------|
| Move Tool | `moveTool.ts` | ✅ Working | None (module) | Needs migration |
| Rectangular Marquee | `marqueeRectTool.ts` | ✅ Working | None (module) | Should extend SelectionTool |
| Elliptical Marquee | `marqueeEllipseTool.ts` | ✅ Working | None (module) | Should extend SelectionTool |
| Lasso Tool | `lassoTool.ts` | ✅ Working | None (module) | Should extend SelectionTool |
| Magic Wand | `magicWandTool.ts` | ✅ Working | None (module) | Should extend SelectionTool |
| Crop Tool | `cropTool.ts` | ✅ Working | None (module) | Needs migration |
| Hand Tool | `handTool.ts` | ✅ Working | None (module) | Needs migration |
| Zoom Tool | `zoomTool.ts` | ✅ Working | None (module) | Needs migration |
| Brush Tool | `brushTool.ts` | ✅ Working | None (module) | Should extend DrawingTool |
| Eraser Tool | `eraserTool.ts` | ✅ Working | None (module) | Should extend DrawingTool |

### Planned Tools (Epic 1)

| Tool | Planned Base Class | Status |
|------|-------------------|--------|
| Quick Selection | SelectionTool | 📋 TODO |
| Eyedropper | BaseTool | 📋 TODO |

### Future Tools (Epics 2-4)

#### Epic 2 - Text Tools
- Type Tool → BaseTool
- Type Mask Tool → SelectionTool
- Vertical Type Tool → BaseTool
- Vertical Type Mask Tool → SelectionTool

#### Epic 3 - Shape/Vector Tools
- Rectangle Tool → BaseShapeTool (extends BaseTool)
- Rounded Rectangle Tool → BaseShapeTool
- Ellipse Tool → BaseShapeTool
- Polygon Tool → BaseShapeTool
- Line Tool → BaseShapeTool
- Custom Shape Tool → BaseShapeTool
- Pen Tool → BaseVectorTool (extends BaseTool)
- Freeform Pen Tool → BaseVectorTool
- Curvature Pen Tool → BaseVectorTool
- Path Selection Tool → BaseTool
- Direct Selection Tool → BaseTool

#### Epic 4 - Paint/Clone Tools
- Clone Stamp Tool → BaseCloneTool (extends BaseTool)
- Pattern Stamp Tool → BaseCloneTool
- Healing Brush Tool → BaseCloneTool
- Spot Healing Brush Tool → BaseCloneTool
- Patch Tool → BaseTool
- Content-Aware Move Tool → BaseTool
- Red Eye Tool → BaseTool
- Gradient Tool → BaseTool
- Paint Bucket Tool → BaseTool
- Blur Tool → BaseEffectTool (extends DrawingTool)
- Sharpen Tool → BaseEffectTool
- Smudge Tool → BaseEffectTool
- Dodge Tool → BaseEffectTool
- Burn Tool → BaseEffectTool
- Sponge Tool → BaseEffectTool

## Migration Status

### Phase 0 ✅ Complete
- [x] BaseTool class created
- [x] SelectionTool base class created
- [x] DrawingTool base class created
- [x] ToolStateManager implemented
- [x] Constraint utilities added
- [x] Performance monitoring integrated

### Phase 1 🚧 In Progress
- [ ] Command pattern implementation
- [ ] History store creation
- [ ] Canvas commands (Add, Remove, Transform, Modify)
- [ ] Edit menu integration

### Tool Migration Plan
1. **Move Tool** - First migration as reference
2. **Selection Tools** - Migrate to SelectionTool base
3. **Drawing Tools** - Migrate to DrawingTool base
4. **Navigation Tools** - Migrate to BaseTool
5. **New Tools** - Implement with new architecture

## Code Quality Standards

### Required for All Tools
1. **No module-level state** - Use ToolStateManager
2. **Extend appropriate base class** - Never standalone modules
3. **Implement all abstract methods** - No partial implementations
4. **Use event helpers** - addCanvasEvent, addEventListener
5. **Track performance** - Use track() for all operations
6. **Handle errors gracefully** - Try/catch in critical paths
7. **Clean up resources** - Implement cleanup() properly

### Anti-Patterns to Avoid
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

// ❌ BAD - Manual event management
canvas.on('mouse:down', this.handleMouseDown)
// No cleanup!

// ✅ GOOD - Automatic cleanup
this.addCanvasEvent('mouse:down', this.handleMouseDown.bind(this))
```

## Store Integration

### Available Stores
- `canvasStore` - Canvas state and operations
- `toolOptionsStore` - Tool-specific options
- `selectionStore` - Selection state
- `colorStore` - Color management
- `documentStore` - Document state
- `performanceStore` - Performance metrics

### Pending Stores (Epic 1)
- `historyStore` - Undo/redo management
- `layerStore` - Layer management

## Performance Requirements

- All tool operations must complete in < 16ms (60 FPS)
- Use `requestAnimationFrame` for animations
- Debounce rapid updates (mouse move)
- Track performance with `track()` method
- Log warnings for slow operations

## Testing Requirements

### Unit Tests (Per Tool)
- State management
- Event handling
- Constraint application
- Command generation
- Error recovery

### Integration Tests
- Tool switching
- Store integration
- Canvas interaction
- Performance benchmarks

## Next Steps

1. Implement Command pattern and HistoryStore
2. Migrate Move Tool as reference implementation
3. Batch migrate selection tools
4. Batch migrate drawing tools
5. Implement new tools (Quick Selection, Eyedropper)

---

**Note**: This document reflects the actual state of the codebase. Update after each epic completion. 