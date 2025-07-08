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

## Code Quality Issues to Fix 🔴 CRITICAL

### Current Problems
1. **Module-level state in tools**
   - Variables like `let cropRect`, `let isDrawing`, `let activeCanvas` at module level
   - Makes tools untestable and prone to state bugs
   - Memory leak potential with lingering references

2. **Inconsistent event handling**
   - Some tools clean up listeners, others don't
   - Mix of canvas events and window events without clear patterns
   - Event handler references stored in different ways

3. **No command recording**
   - Tools directly modify canvas without recording actions
   - Impossible to implement undo/redo without refactoring

4. **Repetitive patterns**
   - Each tool reimplements common functionality
   - No shared abstractions for selection tools, drawing tools, etc.

5. **Memory leak risks**
   - Event listeners not always removed
   - Subscriptions to stores not cleaned up
   - Canvas references kept after deactivation

### Required Patterns & Standards

#### 1. Tool State Encapsulation
```typescript
// ❌ BAD - Current pattern with module-level state
let cropRect: Rect | null = null
let isDrawing = false

// ✅ GOOD - Encapsulated state
class CropTool extends BaseTool {
  private state = {
    cropRect: null as Rect | null,
    isDrawing: false,
    startPoint: null as Point | null
  }
  
  protected cleanup() {
    // State automatically cleared by BaseTool
    if (this.state.cropRect) {
      this.canvas?.remove(this.state.cropRect)
    }
  }
}
```

#### 2. Consistent Event Management
```typescript
abstract class BaseTool {
  private eventCleanups: (() => void)[] = []
  
  protected addEventListener(
    target: EventTarget,
    event: string,
    handler: EventListener,
    options?: AddEventListenerOptions
  ): void {
    target.addEventListener(event, handler, options)
    this.eventCleanups.push(() => 
      target.removeEventListener(event, handler, options)
    )
  }
  
  protected addCanvasEvent<K extends keyof CanvasEvents>(
    event: K,
    handler: (e: CanvasEvents[K]) => void
  ): void {
    this.canvas?.on(event, handler)
    this.eventCleanups.push(() => this.canvas?.off(event, handler))
  }
  
  onDeactivate() {
    // Automatically clean up ALL event listeners
    this.eventCleanups.forEach(cleanup => cleanup())
    this.eventCleanups = []
  }
}
```

#### 3. Command Recording Pattern
```typescript
// Every tool action must create a command
class BrushTool extends DrawingTool {
  private currentPath: fabric.Path | null = null
  
  protected handleMouseUp(e: ToolEvent) {
    if (this.currentPath) {
      // Create command instead of direct manipulation
      const command = new AddPathCommand(
        this.canvas,
        this.currentPath,
        this.getActiveLayer()
      )
      
      this.executeCommand(command) // Records in history
      this.currentPath = null
    }
  }
}
```

#### 4. Store Subscription Management
```typescript
abstract class BaseTool {
  private unsubscribers: (() => void)[] = []
  
  protected subscribeToStore<T>(
    store: StoreApi<T>,
    selector: (state: T) => any,
    handler: (value: any) => void
  ): void {
    const unsubscribe = store.subscribe(
      (state) => handler(selector(state))
    )
    this.unsubscribers.push(unsubscribe)
  }
  
  onDeactivate() {
    // Auto cleanup all subscriptions
    this.unsubscribers.forEach(unsub => unsub())
    this.unsubscribers = []
  }
}
```

#### 5. Lifecycle Guarantees
```typescript
interface ToolLifecycle {
  // Called once when tool is activated
  onActivate(canvas: Canvas): void
  
  // Called once when tool is deactivated
  onDeactivate(canvas: Canvas): void
  
  // Optional event handlers - only called while active
  onMouseDown?(e: ToolEvent): void
  onMouseMove?(e: ToolEvent): void
  onMouseUp?(e: ToolEvent): void
  onKeyDown?(e: KeyboardEvent): void
  onKeyUp?(e: KeyboardEvent): void
}

// BaseTool ensures cleanup happens even if tool crashes
abstract class BaseTool implements ToolLifecycle {
  onActivate(canvas: Canvas) {
    try {
      this.setupTool(canvas)
    } catch (error) {
      console.error(`Tool ${this.id} activation failed:`, error)
      this.emergencyCleanup()
    }
  }
}
```

### Implementation Standards for All Epics

1. **No Module-Level State**
   - All state must be encapsulated in classes or stores
   - Use WeakMaps for external object associations if needed

2. **Explicit Resource Management**
   - Every resource allocation must have corresponding cleanup
   - Use try/finally or RAII patterns for critical resources

3. **Command Pattern for All Mutations**
   - No direct canvas/layer modifications
   - All changes go through commands for undo/redo

4. **Type Safety**
   - No `any` types except in generic constraints
   - No `@ts-ignore` or `@ts-expect-error`
   - Strict null checks enabled

5. **Performance Budget**
   - Tool operations must complete in < 16ms
   - Use requestAnimationFrame for animations
   - Debounce rapid updates (min 16ms)

6. **Testing Requirements**
   - Each tool must have unit tests
   - Test state management and cleanup
   - Test command creation and execution

## Implementation Order

1. **Phase 0: Code Quality Foundation** (2-3 days) 🔴 NEW PRIORITY
   - [ ] Create BaseTool abstract class with proper lifecycle
   - [ ] Implement ToolStateManager for encapsulated state
   - [ ] Create EventManager mixin for consistent event handling
   - [ ] Set up performance monitoring infrastructure
   - [ ] Document patterns and create examples

2. **Phase 1: Command Pattern & History** (3-4 days)
   - [ ] Implement Command interface and base classes
   - [ ] Create HistoryStore with undo/redo
   - [ ] Add command implementations for existing operations
   - [ ] Enable Edit menu with Undo/Redo UI
   - [ ] Add keyboard shortcuts (Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z)

3. **Phase 2: Tool Migration** (4-5 days)
   - [ ] Migrate Move Tool as reference implementation
   - [ ] Create SelectionTool base class
   - [ ] Migrate all selection tools (with proper cleanup)
   - [ ] Create DrawingTool base class
   - [ ] Migrate Brush/Eraser tools (with command recording)
   - [ ] Migrate remaining tools (Hand, Zoom, Crop)
   - [ ] Fix all memory leaks and module-level state

4. **Phase 3: Layer System** (3-4 days)
   - [ ] Implement Layer types and interfaces
   - [ ] Create LayerStore with proper state management
   - [ ] Build Layers Panel UI
   - [ ] Update all tools to work with layers
   - [ ] Add layer commands for history

5. **Phase 4: Selection Enhancement** (2-3 days)
   - [ ] Implement SelectionManager with boolean operations
   - [ ] Add add/subtract/intersect modes to all selection tools
   - [ ] Implement selection transformation
   - [ ] Add selection commands for history

6. **Phase 5: Missing Tools** (2-3 days)
   - [ ] Implement Quick Selection Tool (W)
   - [ ] Implement Eyedropper Tool (I)
   - [ ] Ensure both follow new patterns

7. **Phase 6: Testing & Documentation** (2-3 days)
   - [ ] Write unit tests for BaseTool and utilities
   - [ ] Write integration tests for each tool
   - [ ] Test memory leaks and performance
   - [ ] Document architecture for future epics
   - [ ] Create tool implementation guide

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

## Epic 1 Completion Criteria

### Code Quality Standards Met
- [ ] **Zero module-level state** - All tools use encapsulated state
- [ ] **Consistent event handling** - All events properly cleaned up
- [ ] **Command pattern implemented** - All mutations go through commands
- [ ] **No memory leaks** - Verified with Chrome DevTools
- [ ] **Type safety** - Zero `any` types, no suppressions
- [ ] **Performance budget met** - All operations < 16ms

### Infrastructure Complete
- [ ] **BaseTool class** - All tools inherit from it
- [ ] **HistoryStore** - Full undo/redo working
- [ ] **LayerStore** - Basic layer management
- [ ] **SelectionManager** - Boolean operations working
- [ ] **ToolStateManager** - Encapsulated state management
- [ ] **EventManager** - Consistent event handling
- [ ] **PerformanceMonitor** - Tracking all operations

### Tools Migrated & Working
- [ ] **10 existing tools** - All migrated to new architecture
- [ ] **2 new tools** - Quick Selection & Eyedropper implemented
- [ ] **All tools support**:
  - [ ] Undo/redo for all operations
  - [ ] Proper state encapsulation
  - [ ] Clean event management
  - [ ] Layer awareness
  - [ ] Performance tracking

### UI Complete
- [ ] **Edit menu** - Undo/Redo items working
- [ ] **History panel** - Shows operation history
- [ ] **Layers panel** - Basic layer management UI
- [ ] **Selection modes** - UI for add/subtract/intersect

### Documentation & Testing
- [ ] **Architecture guide** - Patterns documented for future epics
- [ ] **Tool implementation guide** - Step-by-step for new tools
- [ ] **Unit tests** - BaseTool and core utilities tested
- [ ] **Integration tests** - Each tool has basic tests
- [ ] **Performance benchmarks** - Baseline established

### Definition of Done
Epic 1 is complete when:
1. All code quality issues are resolved
2. New architecture patterns are established and documented
3. All existing tools work with the new patterns
4. Undo/redo works for all operations
5. Basic layer system is functional
6. No regressions in existing functionality
7. Future epics can build on these patterns without refactoring