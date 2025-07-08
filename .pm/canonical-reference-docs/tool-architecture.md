# FotoFun Tool Architecture - Canonical Reference

**Last Updated**: Epic 5 - AI Tool Integration Complete
**Status**: Foundation established, AI integration patterns defined

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

## AI Tool Integration (Epic 5)

### Overview

We use AI SDK v5 to enable AI control of canvas tools. The system follows a clean adapter pattern that maintains DRY principles - the same tools work for both UI and AI.

### Architecture

```
Canvas Tools (UI) → Tool Adapters → AI SDK v5 Tools → AI Chat
```

### AI Tool Adapter Pattern

#### BaseToolAdapter (`lib/ai/adapters/base.ts`)

The base class for all AI tool adapters:

```typescript
export abstract class BaseToolAdapter<TInput = unknown, TOutput = unknown> {
  abstract tool: Tool                           // Reference to canvas tool
  abstract aiName: string                       // Name AI will use
  abstract description: string                  // Clear description for AI
  abstract parameters: z.ZodType<TInput>        // Zod schema for validation
  
  abstract execute(
    params: TInput, 
    context: { canvas: Canvas }
  ): Promise<TOutput>
  
  // Optional methods
  canExecute?(canvas: Canvas): boolean
  generatePreview?(
    params: TInput, 
    canvas: Canvas
  ): Promise<{ before: string; after: string }>
  
  // Converts to AI SDK v5 tool
  toAITool() {
    return tool({
      description: this.description,
      parameters: this.parameters,
      execute: async (params) => {
        // Bridge to canvas context
        const context = CanvasToolBridge.getCanvasContext()
        if (!context?.canvas) throw new Error('Canvas not available')
        
        // Check if executable
        if (this.canExecute && !this.canExecute(context.canvas)) {
          throw new Error('Tool cannot be executed in current state')
        }
        
        // Execute with canvas context
        return this.execute(params, { canvas: context.canvas })
      }
    })
  }
}
```

### Creating AI-Compatible Tools

#### Step 1: Determine AI Compatibility

**AI-Compatible Tools** (parameter-based):
- ✅ Crop, Resize, Rotate - Take discrete parameters
- ✅ Brightness, Contrast, Filters - Adjustment values
- ✅ Color adjustments - HSL/RGB values

**Non-AI-Compatible Tools** (require mouse interaction):
- ❌ Selection tools - Need mouse path
- ❌ Drawing tools - Need freehand input
- ❌ Navigation tools - Interactive only

#### Step 2: Create Tool Adapter

Create adapter in `lib/ai/adapters/tools/[toolname].ts`:

```typescript
import { z } from 'zod'
import { BaseToolAdapter } from '../base'
import { myTool } from '@/lib/tools/myTool'

// Define clear parameter schema
const myToolParameters = z.object({
  value: z.number()
    .min(0)
    .max(100)
    .describe('Adjustment value from 0-100'),
  // Be explicit about units (pixels, percentages, etc)
  width: z.number()
    .min(1)
    .describe('Width in pixels (not fraction)')
})

type MyToolInput = z.infer<typeof myToolParameters>

export class MyToolAdapter extends BaseToolAdapter<MyToolInput, MyToolOutput> {
  tool = myTool
  aiName = 'myAITool'
  
  // Clear, specific description
  description = 'Adjust the image brightness. Value must be 0-100 where 50 is neutral.'
  
  parameters = myToolParameters
  
  async execute(params: MyToolInput, context: { canvas: Canvas }): Promise<MyToolOutput> {
    // Implementation that mirrors the UI tool behavior
    // Access canvas through context.canvas
    return { success: true, /* ... */ }
  }
  
  // Optional: Validation
  canExecute(canvas: Canvas): boolean {
    return canvas.getObjects().length > 0
  }
  
  // Optional: Preview generation
  async generatePreview(params: MyToolInput, canvas: Canvas) {
    const before = canvas.toDataURL()
    // Apply changes temporarily
    const after = canvas.toDataURL()
    return { before, after }
  }
}
```

#### Step 3: Register Adapter

In `lib/ai/adapters/registry.ts`:

```typescript
export async function autoDiscoverAdapters(): Promise<void> {
  // Add your adapter import
  const { MyToolAdapter } = await import('./tools/myTool')
  adapterRegistry.register(new MyToolAdapter())
}
```

### Best Practices

1. **Clear Parameter Descriptions**
   - Always specify units (pixels, percentages, degrees)
   - Use explicit min/max constraints
   - Provide examples in descriptions

2. **Error Handling**
   - Check canvas state in `canExecute`
   - Provide clear error messages
   - Validate bounds and constraints

3. **Type Safety**
   - Use Zod inference for types
   - Avoid `any` types
   - Let TypeScript catch errors

4. **Consistency**
   - Follow naming conventions
   - Mirror UI tool behavior exactly
   - Use same validation rules

### Canvas Bridge (`lib/ai/tools/canvas-bridge.ts`)

Provides canvas context for AI tools:

```typescript
interface CanvasContext {
  canvas: Canvas
  imageData?: ImageData
  selection?: FabricObject[]
  dimensions: { width: number; height: number }
  metadata?: { zoom?: number; documentName?: string }
}
```

### System Integration

The API route (`app/api/ai/chat/route.ts`) automatically:
1. Discovers all registered adapters
2. Converts them to AI SDK v5 tools
3. Provides them to the AI model
4. Includes descriptions in system prompt

## Tool Inventory

### Implemented Tools (Old Architecture)

| Tool | File | Status | Base Class | AI Ready |
|------|------|--------|------------|----------|
| Move Tool | `moveTool.ts` | ✅ Working | None (module) | ❌ Interactive |
| Rectangular Marquee | `marqueeRectTool.ts` | ✅ Working | None (module) | ❌ Interactive |
| Elliptical Marquee | `marqueeEllipseTool.ts` | ✅ Working | None (module) | ❌ Interactive |
| Lasso Tool | `lassoTool.ts` | ✅ Working | None (module) | ❌ Interactive |
| Magic Wand | `magicWandTool.ts` | ✅ Working | None (module) | ❌ Interactive |
| Crop Tool | `cropTool.ts` | ✅ Working | None (module) | ✅ Has Adapter |
| Hand Tool | `handTool.ts` | ✅ Working | None (module) | ❌ Interactive |
| Zoom Tool | `zoomTool.ts` | ✅ Working | None (module) | ❌ Interactive |
| Brush Tool | `brushTool.ts` | ✅ Working | None (module) | ❌ Interactive |
| Eraser Tool | `eraserTool.ts` | ✅ Working | None (module) | ❌ Interactive |

### Planned Tools (Epic 1)

| Tool | Planned Base Class | Status | AI Compatible |
|------|-------------------|--------|---------------|
| Quick Selection | SelectionTool | 📋 TODO | ❌ Interactive |
| Eyedropper | BaseTool | 📋 TODO | ✅ Parameter-based |

### Future Tools (Epics 2-4)

#### Epic 2 - Text Tools
- Type Tool → BaseTool (✅ AI: text content, position)
- Type Mask Tool → SelectionTool (❌ Interactive)
- Vertical Type Tool → BaseTool (✅ AI: text content, position)
- Vertical Type Mask Tool → SelectionTool (❌ Interactive)

#### Epic 3 - Shape/Vector Tools
- Rectangle Tool → BaseShapeTool (✅ AI: dimensions, position)
- Rounded Rectangle Tool → BaseShapeTool (✅ AI: dimensions, radius)
- Ellipse Tool → BaseShapeTool (✅ AI: dimensions, position)
- Polygon Tool → BaseShapeTool (✅ AI: sides, size)
- Line Tool → BaseShapeTool (✅ AI: start/end points)
- Custom Shape Tool → BaseShapeTool (✅ AI: shape selection)
- Pen Tool → BaseVectorTool (❌ Interactive path creation)
- Freeform Pen Tool → BaseVectorTool (❌ Interactive)
- Curvature Pen Tool → BaseVectorTool (❌ Interactive)
- Path Selection Tool → BaseTool (❌ Interactive)
- Direct Selection Tool → BaseTool (❌ Interactive)

#### Epic 4 - Paint/Clone Tools
- Clone Stamp Tool → BaseCloneTool (✅ AI: source/target points)
- Pattern Stamp Tool → BaseCloneTool (✅ AI: pattern, position)
- Healing Brush Tool → BaseCloneTool (✅ AI: area to heal)
- Spot Healing Brush Tool → BaseCloneTool (✅ AI: spots to heal)
- Patch Tool → BaseTool (✅ AI: source/target areas)
- Content-Aware Move Tool → BaseTool (✅ AI: object, new position)
- Red Eye Tool → BaseTool (✅ AI: eye detection)
- Gradient Tool → BaseTool (✅ AI: type, colors, angle)
- Paint Bucket Tool → BaseTool (✅ AI: color, tolerance)
- Blur Tool → BaseEffectTool (✅ AI: strength, area)
- Sharpen Tool → BaseEffectTool (✅ AI: strength, area)
- Smudge Tool → BaseEffectTool (❌ Interactive)
- Dodge Tool → BaseEffectTool (✅ AI: exposure, area)
- Burn Tool → BaseEffectTool (✅ AI: exposure, area)
- Sponge Tool → BaseEffectTool (✅ AI: mode, flow, area)

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

### Epic 5 ✅ AI Integration Complete
- [x] AI SDK v5 integration
- [x] Tool adapter pattern
- [x] Canvas bridge implementation
- [x] Crop tool AI adapter
- [x] Registry system
- [x] API route integration

### Tool Migration Plan
1. **Move Tool** - First migration as reference
2. **Selection Tools** - Migrate to SelectionTool base
3. **Drawing Tools** - Migrate to DrawingTool base
4. **Navigation Tools** - Migrate to BaseTool
5. **New Tools** - Implement with new architecture
6. **AI Adapters** - Create for parameter-based tools

## Code Quality Standards

### Required for All Tools
1. **No module-level state** - Use ToolStateManager
2. **Extend appropriate base class** - Never standalone modules
3. **Implement all abstract methods** - No partial implementations
4. **Use event helpers** - addCanvasEvent, addEventListener
5. **Track performance** - Use track() for all operations
6. **Handle errors gracefully** - Try/catch in critical paths
7. **Clean up resources** - Implement cleanup() properly

### AI Tool Standards
1. **Clear parameter schemas** - Use Zod with descriptions
2. **Explicit units** - Always specify pixels/percentages/degrees
3. **Validation** - Check bounds and constraints
4. **Error messages** - Provide actionable feedback
5. **Preview support** - Implement when visual changes occur
6. **Type safety** - Use TypeScript inference

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

// ❌ BAD - Vague AI descriptions
description = 'Crop the image'

// ✅ GOOD - Clear AI descriptions
description = 'Crop the image to specified pixel coordinates. The x,y coordinates specify the top-left corner of the crop area.'

// ❌ BAD - Ambiguous parameters
width: z.number().describe('Width value')

// ✅ GOOD - Explicit parameters
width: z.number().min(1).describe('Width in pixels (must be at least 1)')
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

### AI Tool Tests
- Parameter validation
- Canvas state checks
- Preview generation
- Error handling
- Type safety

### Integration Tests
- Tool switching
- Store integration
- Canvas interaction
- Performance benchmarks
- AI chat integration

## Next Steps

1. Implement Command pattern and HistoryStore
2. Migrate Move Tool as reference implementation
3. Batch migrate selection tools
4. Batch migrate drawing tools
5. Implement new tools (Quick Selection, Eyedropper)
6. Create AI adapters for all parameter-based tools

---

**Note**: This document reflects the actual state of the codebase. Update after each epic completion. 