# Epic 1: Foundation & Current Tools Status

## Developer Workflow Instructions

### GitHub Branch Strategy
1. **Branch Naming**: Create a feature branch named `epic-1-foundation-tools`
2. **Base Branch**: Branch off from `main` 
3. **Commits**: Use conventional commits (e.g., `feat: add eyedropper tool`, `fix: selection mode switching`)
4. **Pull Request**: 
   - Title: "Epic 1: Foundation & Current Tools Implementation"
   - Description: Reference this epic document and list completed items
   - Request review from at least one other developer
   - Ensure all CI checks pass before merging

### Development Guidelines
1. **Before Starting**: 
   - Pull latest `main` branch
   - Run `bun install` to ensure dependencies are up to date
   
2. **During Development**:
   - Only modify files related to your epic
   - Run `bun lint && bun typecheck` frequently
   - Fix all errors/warnings in YOUR files only (not other epics' files)
   - NO eslint-disable comments or @ts-ignore suppressions allowed
   
3. **Testing Requirements**:
   - Manually test ALL tools you implement
   - Test keyboard shortcuts
   - Test tool switching
   - Test undo/redo with your changes
   - Test in both light and dark themes
   - Document test scenarios in PR description

4. **Before Creating PR**:
   - Run `bun lint && bun typecheck` - must pass with 0 errors/warnings in your files
   - Test all functionality manually
   - Update this epic document marking completed items
   - Commit the updated epic document

### Coordination
- Check #dev-canvas channel in Slack/Discord for updates
- Don't modify files being worked on in other epics
- If you need changes in shared files (e.g., constants, types), coordinate with team

### Epic Start Process

Before implementing any tools or infrastructure:

1. **Deep Dive Analysis** (Required)
   - Analyze ALL existing tool implementations in `lib/tools/`
   - Study Fabric.js integration patterns in the codebase
   - Document current state management in stores
   - Understand event handling patterns
   - NO ASSUMPTIONS - verify everything in actual code

2. **Research Phase**
   - Study how each tool works in Photoshop
   - Research alternative implementation approaches
   - Document pros/cons of each approach
   - Justify chosen implementation

3. **Gap Identification**
   - List missing infrastructure
   - Identify type definitions needed
   - Document integration challenges
   - Plan solutions for each gap

### Epic End Process

1. **Quality Validation**
   - All code follows existing patterns EXACTLY
   - Comprehensive error handling
   - Performance profiled and optimized
   - No `any` types or suppressions

2. **Integration Testing**
   - Test with all zoom levels
   - Test with large documents
   - Test undo/redo for all operations
   - Test keyboard shortcuts

3. **Documentation**
   - Update this epic doc
   - Document architecture decisions
   - Create migration guide for other epics

---

## Overview
This epic tracks the current state of FotoFun implementation, including completed foundational work, existing tools, and critical infrastructure needed before expanding tool development.

## Completed Foundational Work

### 1. Project Setup ✅
- **Tech Stack**: Next.js 15, React 19, TypeScript (strict mode), Tailwind CSS v4
- **Canvas Engine**: Fabric.js for 2D manipulation
- **State Management**: Zustand stores
- **Build Tool**: Bun (not npm/npx)
- **Icons**: Lucide React
- **Linting**: ESLint configured (no suppressions allowed)

### 2. Database & Auth ✅
- Supabase integration configured
- Authentication foundation in place
- User management system ready

### 3. AI Chat Foundation ✅
- AI assistant panel UI created
- Chat interface implemented
- Integration points ready for AI tools
- Memory system scaffolding in place

### 4. Landing Page ✅
- Initial landing page draft completed
- Marketing copy and design in place
- Ready for conversion optimization

### 5. Core UI Shell ✅
- **MenuBar**: File, Edit, Image, Layer, Select, Filter, View menus
- **ToolPalette**: All tools visible (implemented show "Coming Soon" modal)
- **Canvas Area**: Zoom, pan, rulers ready
- **Panels**: Layers, Properties, History, AI Chat panels
- **OptionsBar**: Dynamic tool options
- **StatusBar**: Document info, zoom level display

### 6. Canvas System ✅
- Zoom levels: 1% - 3200%
- Pan with Space + drag
- Mouse wheel zoom
- Keyboard shortcuts (Cmd/Ctrl + 0/1/+/-)
- Canvas resize and centering

### 7. Document Management ✅
- New document dialog with presets
- File open (drag & drop support)
- Save functionality (PNG export)
- Recent documents tracking
- Document state management

## Current Tools Implementation Status

### Implemented Tools (MVP Level)

| Tool | Shortcut | MVP Status | MVP Features | Full Version Features Needed |
|------|----------|------------|--------------|----------------------------|
| **Move Tool** | V | ✅ Complete | • Select and move objects<br>• Auto-select option<br>• Basic cursor feedback | • Transform controls UI<br>• Alignment options<br>• Distribution options<br>• Layer auto-selection<br>• Group selection |
| **Rectangular Marquee** | M | ✅ Complete | • Draw rectangle selection<br>• Visual feedback (marching ants)<br>• Basic constraints | • Shift for square constraint<br>• Alt for center origin<br>• Add/Subtract/Intersect modes<br>• Feather option<br>• Anti-alias<br>• Fixed ratio/size |
| **Elliptical Marquee** | M | ✅ Complete | • Draw ellipse selection<br>• Visual feedback<br>• Basic constraints | • Shift for circle constraint<br>• Alt for center origin<br>• Add/Subtract/Intersect modes<br>• Feather option<br>• Anti-alias |
| **Lasso Tool** | L | ✅ Complete | • Freehand selection<br>• Path closing | • Polygonal Lasso mode<br>• Magnetic Lasso mode<br>• Add/Subtract/Intersect<br>• Feather<br>• Anti-alias |
| **Magic Wand** | W | ✅ Complete | • Click color selection<br>• Tolerance setting<br>• Contiguous option | • Sample all layers<br>• Add/Subtract/Intersect<br>• Better edge detection<br>• Anti-alias |
| **Crop Tool** | C | ✅ Complete | • Rectangle crop<br>• Aspect ratios<br>• Enter/Esc shortcuts<br>• Non-destructive (clipPath) | • Perspective crop<br>• Content-aware crop<br>• Straighten tool<br>• Delete/hide pixels option<br>• Rule of thirds overlay |
| **Hand Tool** | H | ✅ Complete | • Pan canvas<br>• Space key temporary<br>• Grab cursor | Fully implemented for MVP |
| **Zoom Tool** | Z | ✅ Complete | • Click zoom in/out<br>• Alt+click zoom out<br>• Zoom levels | • Scrubby zoom<br>• Zoom rectangle<br>• Animated zoom<br>• Fit/Fill options |
| **Brush Tool** | B | ✅ Complete | • Size control<br>• Opacity<br>• Color picker<br>• Basic smoothing | • Pressure sensitivity<br>• Hardness control<br>• Flow control<br>• Brush presets<br>• Dual brush<br>• Texture<br>• Dynamics |
| **Eraser Tool** | E | ✅ Complete | • Basic erasing<br>• Size control | • Background eraser mode<br>• Magic eraser mode<br>• Opacity/flow<br>• Hardness |

### Unimplemented Tools

| Tool | Shortcut | Category | Priority |
|------|----------|----------|----------|
| Type Tool | T | Text | High |
| Clone Stamp | S | Retouching | High |
| Healing Brush | J | Retouching | High |
| Pen Tool | P | Vector | Medium |
| Shape Tools | U | Vector | Medium |
| Gradient Tool | G | Paint | Medium |
| Paint Bucket | G | Paint | Low |

## Critical Infrastructure Needed (To Do)

### 1. Undo/Redo System 🔴 CRITICAL
**Problem**: No undo/redo despite being marked complete in plan
**Solution**: Implement Command Pattern
```typescript
interface Command {
  execute(): Promise<void>
  undo(): Promise<void>
  redo(): Promise<void>
  description: string
  timestamp: number
}

class HistoryStore {
  private history: Command[] = []
  private currentIndex: number = -1
  private maxHistory: number = 50
  
  async executeCommand(command: Command): Promise<void>
  async undo(): Promise<void>
  async redo(): Promise<void>
  getHistory(): HistoryEntry[]
}
```

### 2. Layer System 🔴 CRITICAL
**Problem**: Single canvas, no layer management
**Solution**: Implement layer architecture
```typescript
interface Layer {
  id: string
  name: string
  type: 'image' | 'text' | 'shape' | 'adjustment' | 'group'
  visible: boolean
  opacity: number
  blendMode: BlendMode
  locked: boolean
  parent?: string // for groups
  children?: string[] // for groups
  data: FabricObject | PixelData
}

class LayerStore {
  layers: Layer[]
  activeLayerId: string
  
  addLayer(layer: Layer): void
  removeLayer(id: string): void
  reorderLayers(fromIndex: number, toIndex: number): void
  mergeDown(id: string): void
  duplicateLayer(id: string): void
}
```

### 3. Selection Operations 🟡 HIGH
**Problem**: Only 'new' selection mode works
**Solution**: Implement boolean operations
```typescript
enum SelectionMode {
  New = 'new',
  Add = 'add',
  Subtract = 'subtract',
  Intersect = 'intersect'
}

class SelectionManager {
  combineSelections(
    existing: Path,
    new: Path,
    mode: SelectionMode
  ): Path
}
```

### 4. Base Tool Class 🟡 HIGH
**Problem**: Repetitive tool code, module-level state
**Solution**: Abstract base class
```typescript
abstract class BaseTool implements Tool {
  abstract id: string
  abstract name: string
  abstract icon: ComponentType
  abstract cursor: string
  abstract shortcut?: string
  
  protected state = new Map<string, any>()
  protected canvas: Canvas | null = null
  protected history: HistoryStore
  protected options: ToolOptionsStore
  
  isImplemented = true
  
  onActivate(canvas: Canvas): void {
    this.canvas = canvas
    this.setupTool(canvas)
    this.subscribeToOptions()
  }
  
  onDeactivate(canvas: Canvas): void {
    this.cleanup(canvas)
    this.unsubscribeFromOptions()
    this.canvas = null
    this.state.clear()
  }
  
  protected abstract setupTool(canvas: Canvas): void
  protected abstract cleanup(canvas: Canvas): void
  
  protected recordCommand(command: Command): void {
    this.history.executeCommand(command)
  }
}
```

### 5. Filter Pipeline 🟡 HIGH
**Problem**: No GPU acceleration framework
**Solution**: WebGL/GPU.js pipeline
```typescript
interface Filter {
  id: string
  name: string
  apply(imageData: ImageData, params: any): Promise<ImageData>
  createUI(): FilterUI
}

class FilterPipeline {
  private gpu: GPU
  private filters: Map<string, Filter>
  
  async applyFilter(
    canvas: Canvas,
    filterId: string,
    params: any
  ): Promise<void>
  
  async applyMultiple(
    canvas: Canvas,
    filters: FilterApplication[]
  ): Promise<void>
}
```

### 6. Tool State Management 🟢 MEDIUM
**Problem**: Module-level variables, not testable
**Solution**: Encapsulated state management
```typescript
class ToolStateManager {
  private states = new Map<string, Map<string, any>>()
  
  setState(toolId: string, key: string, value: any): void
  getState<T>(toolId: string, key: string): T | undefined
  clearState(toolId: string): void
  
  // Persist state between tool switches
  saveState(toolId: string): void
  restoreState(toolId: string): void
}
```

### 7. Performance Monitoring 🟢 MEDIUM
```typescript
class PerformanceMonitor {
  trackOperation(name: string, fn: () => void): void
  getMetrics(): PerformanceMetrics
  logSlowOperations(): void
}
```

## Implementation Order

1. **Phase 1: Critical Infrastructure** (1-2 weeks)
   - [ ] Implement Command Pattern and History Store
   - [ ] Add Undo/Redo UI and shortcuts
   - [ ] Create Base Tool Class
   - [ ] Migrate existing tools to new pattern

2. **Phase 2: Layer System** (1 week)
   - [ ] Implement Layer Store
   - [ ] Add Layers Panel functionality
   - [ ] Update tools to work with layers

3. **Phase 3: Selection Enhancement** (3-4 days)
   - [ ] Implement selection boolean operations
   - [ ] Update all selection tools
   - [ ] Add selection transformation

4. **Phase 4: Tool State & Performance** (3-4 days)
   - [ ] Implement Tool State Manager
   - [ ] Add performance monitoring
   - [ ] Optimize existing tools

## Testing Guidelines

### Manual Testing Checklist for Each Tool
1. **Tool Activation**
   - [ ] Cursor changes correctly
   - [ ] Previous tool deactivates properly
   - [ ] Options bar updates

2. **Basic Functionality**
   - [ ] Primary action works (draw, select, etc.)
   - [ ] Modifiers work (Shift, Alt, Cmd)
   - [ ] Visual feedback is clear

3. **Edge Cases**
   - [ ] Works at different zoom levels
   - [ ] Works with rotated canvas
   - [ ] Handles empty canvas
   - [ ] Handles multiple objects

4. **Integration**
   - [ ] Undo/Redo works correctly
   - [ ] History updates
   - [ ] Layers respect tool action
   - [ ] Performance is acceptable

### Automated Testing
```typescript
describe('ToolName', () => {
  let canvas: Canvas
  let tool: Tool
  
  beforeEach(() => {
    canvas = new Canvas()
    tool = new ToolImplementation()
  })
  
  it('should activate correctly', () => {
    tool.onActivate(canvas)
    expect(canvas.defaultCursor).toBe(tool.cursor)
  })
  
  it('should handle mouse events', () => {
    // Test mouse down, move, up
  })
  
  it('should record history', () => {
    // Verify commands are recorded
  })
})
```

## Code Standards

### Tool File Structure
```
lib/tools/
├── base/
│   ├── BaseTool.ts
│   ├── SelectionTool.ts
│   └── DrawingTool.ts
├── commands/
│   ├── Command.ts
│   └── [tool]Commands.ts
├── [toolName]Tool.ts
└── index.ts
```

### Naming Conventions
- Tools: `[toolName]Tool.ts` (camelCase)
- Commands: `[ToolName]Command.ts` (PascalCase)
- Store actions: `verbNoun` (e.g., `addLayer`, `setZoom`)
- Event handlers: `handle[Event]` (e.g., `handleMouseDown`)

### Type Safety Rules
- No `any` types
- No `@ts-ignore` or suppressions
- All event handlers properly typed
- Strict null checks

### Performance Guidelines
- Debounce rapid updates (sliders, etc.)
- Use `requestAnimationFrame` for animations
- Lazy load heavy components
- Implement virtual scrolling for long lists

## File Organization for Epic 1

### Infrastructure Files to Create/Modify

#### 1. Command Pattern & History System
```
lib/
├── commands/
│   ├── base/
│   │   ├── Command.ts              # Base command interface
│   │   └── CompositeCommand.ts     # For grouping commands
│   ├── canvas/
│   │   ├── AddObjectCommand.ts     # Add shapes/objects
│   │   ├── RemoveObjectCommand.ts  # Remove objects
│   │   ├── TransformCommand.ts     # Move/scale/rotate
│   │   └── ModifyCommand.ts        # Property changes
│   └── index.ts

store/
├── historyStore.ts                  # History management store
```

#### 2. Base Tool Class System
```
lib/
├── tools/
│   ├── base/
│   │   ├── BaseTool.ts             # Abstract base class
│   │   ├── SelectionTool.ts        # Base for selection tools
│   │   ├── DrawingTool.ts          # Base for drawing tools
│   │   ├── TransformTool.ts        # Base for transform tools
│   │   └── index.ts
│   ├── utils/
│   │   ├── toolState.ts            # Tool state manager
│   │   └── constraints.ts          # Shift/Alt constraints
```

#### 3. Layer System
```
store/
├── layerStore.ts                    # Layer management store

lib/
├── layers/
│   ├── Layer.ts                     # Layer class
│   ├── LayerGroup.ts               # Group management
│   ├── LayerEffects.ts             # Effects/filters
│   ├── BlendModes.ts               # Blend mode implementations
│   └── index.ts

components/
├── panels/
│   ├── LayersPanel/
│   │   ├── index.tsx               # Main panel component
│   │   ├── LayerItem.tsx           # Individual layer item
│   │   ├── LayerControls.tsx       # Opacity, visibility, etc.
│   │   └── LayerContextMenu.tsx    # Right-click menu
```

#### 4. Selection System Enhancement
```
lib/
├── selection/
│   ├── SelectionManager.ts          # Boolean operations
│   ├── SelectionPath.ts            # Path-based selections
│   ├── SelectionTransform.ts       # Transform selections
│   └── index.ts

store/
├── selectionStore.ts                # UPDATE existing file
```

#### 5. Filter Pipeline
```
lib/
├── filters/
│   ├── base/
│   │   ├── Filter.ts               # Base filter interface
│   │   ├── GPUFilter.ts            # GPU-accelerated base
│   │   └── FilterPipeline.ts       # Chain filters
│   ├── adjustments/
│   │   ├── BrightnessContrast.ts
│   │   ├── HueSaturation.ts
│   │   ├── Levels.ts
│   │   └── Curves.ts
│   ├── effects/
│   │   ├── Blur.ts
│   │   ├── Sharpen.ts
│   │   └── Noise.ts
│   └── index.ts
```

#### 6. Performance Monitoring
```
lib/
├── performance/
│   ├── PerformanceMonitor.ts       # Main monitoring class
│   ├── metrics.ts                  # Metric definitions
│   └── index.ts

hooks/
├── usePerformance.ts               # React hook for perf data
```

#### 7. History Panel UI
```
components/
├── panels/
│   ├── HistoryPanel/
│   │   ├── index.tsx               # Main panel component
│   │   ├── HistoryItem.tsx         # Individual history entry
│   │   ├── HistorySnapshot.tsx     # Snapshot preview
│   │   └── HistoryControls.tsx     # Undo/redo buttons
```

#### 8. Update Existing Tool Files
```
lib/tools/
├── moveTool.ts                     # Refactor to use BaseTool
├── marqueeRectTool.ts              # Add selection operations
├── marqueeEllipseTool.ts           # Add selection operations
├── lassoTool.ts                    # Add selection operations
├── magicWandTool.ts                # Add selection operations
├── cropTool.ts                     # Add history commands
├── handTool.ts                     # Refactor to use BaseTool
├── zoomTool.ts                     # Refactor to use BaseTool
├── brushTool.ts                    # Add stroke commands
├── eraserTool.ts                   # Add erase commands
```

#### 9. Constants and Types Updates
```
constants/
├── index.ts                        # Add new constants:
                                   # - BLEND_MODES
                                   # - FILTER_TYPES
                                   # - HISTORY_LIMITS

types/
├── index.ts                        # Add new types:
                                   # - Command interface
                                   # - Layer interface
                                   # - Filter interface
                                   # - PerformanceMetrics
```

#### 10. Menu Bar Updates
```
components/
├── editor/
│   ├── MenuBar/
│   │   ├── menus/
│   │   │   └── EditMenu.tsx        # Add Undo/Redo items
```

### Migration Strategy

1. **Phase 1: Command Pattern** (Days 1-3)
   - Create command base classes
   - Implement history store
   - Add undo/redo to menu

2. **Phase 2: Base Tool Migration** (Days 4-6)
   - Create BaseTool class
   - Migrate one tool as example
   - Document patterns

3. **Phase 3: Layer System** (Days 7-10)
   - Implement layer store
   - Create layers panel
   - Update canvas to support layers

4. **Phase 4: Selection Operations** (Days 11-12)
   - Implement boolean operations
   - Update selection tools
   - Add selection transform

5. **Phase 5: Tool Updates** (Days 13-14)
   - Migrate all tools to new system
   - Add command recording
   - Test thoroughly

## Next Steps

1. **Immediate Actions**
   - Set up Epic 2, 3, 4 for tool development
   - Assign infrastructure tasks
   - Create shared components branch

2. **Before Tool Development**
   - Complete Command Pattern implementation
   - Set up base tool class
   - Document tool creation guide

3. **Parallel Work**
   - One dev on infrastructure
   - Others can start tool research/planning 

5. **Magic Wand (W)** ✅
   - Status: MVP Complete
   - Current: Basic color-based selection
   - Full: Tolerance adjustment, contiguous/non-contiguous, sample all layers

6. **Quick Selection Tool (W)** 🚧
   - Status: To Implement in This Epic
   - MVP: Brush-based smart selection with basic edge detection
   - Full: Auto-enhance edges, subtract mode, adjustable brush size

### Navigation Tools
7. **Hand Tool (H)** ✅
   - Status: MVP Complete
   - Current: Pan functionality
   - Full: Flick panning, overscroll

8. **Zoom Tool (Z)** ✅
   - Status: MVP Complete
   - Current: Click to zoom in/out
   - Full: Scrubby zoom, animated zoom

### Drawing Tools  
9. **Brush Tool (B)** ✅
   - Status: MVP Complete
   - Current: Basic painting with size/opacity
   - Full: Pressure sensitivity, brush dynamics, custom brushes

10. **Eraser Tool (E)** ✅
    - Status: MVP Complete
    - Current: Basic erasing
    - Full: Background eraser, magic eraser modes

### Sampling Tools
11. **Eyedropper Tool (I)** 🚧
    - Status: To Implement in This Epic
    - MVP: Sample color from canvas, update foreground color
    - Full: Sample size options, sample all layers, show color info

12. **Crop Tool (C)** ✅
    - Status: MVP Complete (Recently finished with clipPath approach)
    - Current: Basic crop with aspect ratios
    - Full: Perspective crop, content-aware crop, straighten