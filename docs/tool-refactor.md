# Tool Architecture Refactor: Senior Patterns + Error Fixes

## Executive Summary

**Core Issues:** Race conditions in tool activation, inconsistent patterns across 50+ tools, singleton dependencies, and architectural debt.

**Solution:** Implement state machine, dependency injection, event-driven communication, and command pattern with proper interfaces - focusing on patterns that solve actual problems.

**Current Status:** 121 TypeScript errors across 13 files. Complete migration required with zero technical debt.

## 🚨 **CRITICAL: Object-Based Architecture Migration**

**IMPORTANT**: All tools must use Object-based terminology, not Layer-based.

### **Migration Requirements:**
```typescript
// ❌ OLD: Layer-based operations
tool.applyToLayer(layerId)
selectedLayers: Layer[]
'tool.layer.created'

// ✅ NEW: Object-based operations  
tool.applyToObject(objectId)
selectedObjects: CanvasObject[]
'tool.object.created'
```

## 📊 **Complete Tool Inventory & Migration Status**

### **1. Selection Tools** (5 tools)
| Tool | Status | Priority | Notes |
|------|--------|----------|-------|
| marqueeRectTool | ❌ Not Migrated | P1 | Core selection tool |
| marqueeEllipseTool | ❌ Not Migrated | P1 | Core selection tool |
| lassoTool | ❌ Not Migrated | P2 | Freehand selection |
| magicWandTool | ❌ Not Migrated | P2 | Color-based selection |
| quickSelectionTool | ❌ Not Migrated | P2 | Smart selection |

### **2. Transform Tools** (6 tools)
| Tool | Status | Priority | Notes |
|------|--------|----------|-------|
| moveTool | ❌ Not Migrated | P1 | Primary transform tool |
| cropTool | ❌ Not Migrated | P1 | Essential crop functionality |
| rotateTool | ❌ Not Migrated | P2 | Object rotation |
| flipTool | ❌ Not Migrated | P2 | Object flipping |
| resizeTool | ❌ Not Migrated | P2 | Object resizing |
| handTool | ❌ Not Migrated | P3 | Navigation tool |

### **3. Drawing Tools** (3 tools)
| Tool | Status | Priority | Notes |
|------|--------|----------|-------|
| brushTool | ❌ Not Migrated | P1 | Primary painting tool |
| eraserTool | ❌ Not Migrated | P1 | Essential eraser |
| gradientTool | ❌ Not Migrated | P2 | Gradient application |

### **4. Text Tools** (4 tools)
| Tool | Status | Priority | Notes |
|------|--------|----------|-------|
| horizontalTypeTool | ❌ Not Migrated | P1 | Primary text tool |
| verticalTypeTool | ❌ Not Migrated | P2 | Vertical text |
| typeMaskTool | ❌ Not Migrated | P3 | Text-based selections |
| typeOnPathTool | ❌ Not Migrated | P3 | Path-based text |

### **5. Adjustment Tools** (5 tools)
| Tool | Status | Priority | Notes |
|------|--------|----------|-------|
| brightnessTool | ❌ Not Migrated | P2 | Image brightness |
| contrastTool | ❌ Not Migrated | P2 | Image contrast |
| saturationTool | ❌ Not Migrated | P2 | Color saturation |
| hueTool | ❌ Not Migrated | P3 | Hue adjustment |
| exposureTool | ❌ Not Migrated | P3 | Exposure control |

### **6. Filter Tools** (5 tools)
| Tool | Status | Priority | Notes |
|------|--------|----------|-------|
| blurTool | ❌ Not Migrated | P2 | Gaussian blur |
| sharpenTool | ❌ Not Migrated | P2 | Image sharpening |
| grayscaleTool | ❌ Not Migrated | P2 | B&W conversion |
| invertTool | ❌ Not Migrated | P3 | Color inversion |
| vintageEffectsTool | ❌ Not Migrated | P3 | Vintage effects |

### **7. Navigation Tools** (2 tools)
| Tool | Status | Priority | Notes |
|------|--------|----------|-------|
| zoomTool | ❌ Not Migrated | P2 | Canvas zoom |
| eyedropperTool | ❌ Not Migrated | P2 | Color picker |

### **8. AI Canvas Tools** (1 tool)
| Tool | Status | Priority | Notes |
|------|--------|----------|-------|
| imageGenerationTool | ❌ Not Migrated | P2 | AI image generation |

### **9. AI-Native Tools** (11 tools - Currently Disabled)
| Tool | Status | Priority | Notes |
|------|--------|----------|-------|
| BackgroundRemovalTool | ❌ Not Migrated | P3 | AI background removal |
| FaceEnhancementTool | ❌ Not Migrated | P3 | AI face enhancement |
| InpaintingTool | ❌ Not Migrated | P3 | AI inpainting |
| OutpaintingTool | ❌ Not Migrated | P3 | AI outpainting |
| SemanticSelectionTool | ❌ Not Migrated | P3 | AI semantic selection |
| VariationTool | ❌ Not Migrated | P3 | AI variations |
| UpscalingTool | ❌ Not Migrated | P3 | AI upscaling |
| StyleTransferTool | ❌ Not Migrated | P3 | AI style transfer |
| RelightingTool | ❌ Not Migrated | P3 | AI relighting |
| ObjectRemovalTool | ❌ Not Migrated | P3 | AI object removal |
| promptAdjustmentTool | ❌ Not Migrated | P3 | Natural language adjustments |

**TOTAL: 42 tools requiring migration**

## 🎯 **Current Issues to Fix**

### **1. TypeScript Errors (121 total)**
- **Command Return Types**: All commands need `CommandResult<void>` returns
- **Command Context Usage**: Commands receiving wrong constructor parameters
- **Event Emission Issues**: Missing timestamps and property mismatches
- **Object-Based Migration**: Remove remaining layer references
- **Dependency Injection**: Missing canvas dependencies in filters
- **Type Safety**: Various type mismatches and unsafe assumptions

### **2. AI Tools TypedEventBus Issue (15 instances)**
**Problem**: AI tools create their own TypedEventBus instances instead of using dependency injection
**Impact**: Multiple event buses cause communication breakdown between components
**Files Affected**:
- `lib/ai/tools/SemanticSelectionTool.ts` - Line 21
- `lib/ai/tools/FaceEnhancementTool.ts` - Line 23  
- `lib/ai/tools/InpaintingTool.ts` - Line 27
- `lib/ai/tools/OutpaintingTool.ts` - Line 25
- `lib/ai/adapters/tools/UpscalingAdapter.ts` - Line 37
- `lib/ai/adapters/tools/VariationAdapter.ts` - Line 36
- `lib/ai/adapters/tools/ObjectRemovalAdapter.ts` - Line 60
- `lib/ai/adapters/tools/RelightingAdapter.ts` - Line 59
- `lib/ai/adapters/tools/StyleTransferAdapter.ts` - Line 37
- `lib/editor/tools/ai-native/variationGridTool.ts` - Line 34
- `lib/editor/tools/ai-native/magicEraserTool.ts` - Line 38
- `lib/editor/tools/ai-native/styleTransferBrush.ts` - Line 43
- `lib/editor/tools/ai-native/aiPromptBrush.ts` - Line 44
- `lib/editor/tools/ai-native/smartSelectionTool.ts` - Line 33
- `lib/editor/tools/ai-native/promptAdjustmentTool.ts` - Line 39

**Fix**: Use dependency injection through constructor or adapter initialization

### **3. Race Condition Problem**
**Root Cause**: Mouse events fire before `tool.onActivate()` completes
**Current Error**: "Tool X is not active" when users click during activation
**Impact**: Affects all 42 tools, poor user experience

### **4. Architectural Debt**
- **Singleton Imports**: Direct imports instead of dependency injection
- **Inconsistent Patterns**: Each tool implements activation differently
- **Mixed Responsibilities**: Tools handle their own state management
- **No Event Coordination**: Direct method calls instead of events

## 🏗️ **Senior Architecture Solution**

### **0. Tools-Commands Interaction Pattern**

**ESTABLISHED PATTERN**: Tools use commands for ALL state-changing operations.

**🚨 CRITICAL: Command System Architecture**

**Command Pattern Consistency**: ALL commands follow the SAME consistent pattern:
```typescript
// UNIVERSAL COMMAND CONSTRUCTOR PATTERN (used by ALL commands):
constructor(
  description: string,           // Human-readable description
  context: CommandContext,       // Unified dependency injection
  options: SpecificOptions       // Command-specific data
)
```

**CommandContext Interface (Universal)**:
```typescript
interface CommandContext {
  readonly eventBus: TypedEventBus
  readonly canvasManager: CanvasManager
  readonly selectionManager: SelectionManager
  readonly executionId: string
  readonly timestamp: number
}
```

**How Tools Create Commands**:
```typescript
// ✅ CORRECT: Tools use commands for operations
class BrushTool extends BaseTool {
  protected handleMouseDown(event: ToolEvent): void {
    // Create command with proper context
    const strokeCommand = new CreateBrushStrokeCommand(
      'Create brush stroke',
      this.getCommandContext(),  // ← BaseTool provides this method
      {
        startPoint: event.point,
        brushSize: this.options.size,
        color: this.options.color
      }
    );
    
    // Execute through command manager
    this.executeCommand(strokeCommand);
  }
}

// ✅ CORRECT: Commands do the actual work
class CreateBrushStrokeCommand extends Command {
  protected async doExecute(): Promise<void> {
    // Actual pixel manipulation happens here
    const pixelBuffer = new PixelBuffer(this.targetImage);
    pixelBuffer.drawStroke(this.strokeData);
    
    // Update canvas object
    await this.context.canvasManager.updateObject(this.objectId, {
      imageData: pixelBuffer.getImageData()
    });
  }
}
```

**Key Principles**:
- **Tools**: Handle user interaction, create commands, manage tool state
- **Commands**: Perform actual operations, handle undo/redo, emit events
- **Separation**: Tools NEVER directly modify canvas state
- **Consistency**: ALL operations go through commands (no exceptions)
- **Context**: NEVER manually create CommandContext - use BaseTool.getCommandContext()

**Command Integration in BaseTool**:
```typescript
// Built into BaseTool for all tools
protected getCommandContext(): CommandContext {
  return {
    eventBus: this.dependencies.eventBus,
    canvasManager: this.dependencies.canvasManager,
    selectionManager: this.dependencies.selectionManager,
    executionId: nanoid(),
    timestamp: Date.now()
  }
}

protected async executeCommand(command: Command): Promise<void> {
  const result = await this.dependencies.commandManager.executeCommand(command);
  if (result.success) {
    this.dependencies.eventBus.emit('tool.message', {
      toolId: this.id,
      message: `Command executed: ${command.constructor.name}`,
      type: 'success'
    });
  } else {
    this.dependencies.eventBus.emit('tool.message', {
      toolId: this.id,
      message: `Command failed: ${result.error.message}`,
      type: 'error'
    });
  }
}
```

**❌ COMMON MISTAKE TO AVOID**:
```typescript
// NEVER manually create CommandContext objects
const context = {
  eventBus: this.dependencies.eventBus,
  canvasManager: this.dependencies.canvasManager,
  // ... manual creation
}
```

### **2. Tool State Machine**
```typescript
enum ToolState {
  INACTIVE = 'INACTIVE',
  ACTIVATING = 'ACTIVATING', 
  ACTIVE = 'ACTIVE',
  WORKING = 'WORKING',
  DEACTIVATING = 'DEACTIVATING'
}

interface ToolStateTransition {
  from: ToolState;
  to: ToolState;
  timestamp: number;
  reason?: string;
}

interface ToolWithState extends Tool {
  state: ToolState;
  canTransitionTo(newState: ToolState): boolean;
  setState(newState: ToolState, reason?: string): void;
}
```

### **3. Dependency Injection Pattern**
```typescript
interface ToolDependencies {
  eventBus: TypedEventBus;
  canvasManager: CanvasManager;
  commandManager: CommandManager;
  resourceManager: ResourceManager;
  selectionManager?: SelectionManager;
  filterManager?: FilterManager;
}

class ToolFactory {
  constructor(private serviceContainer: ServiceContainer) {}
  
  createTool<T extends BaseTool>(
    ToolClass: new (deps: ToolDependencies) => T
  ): T {
    const dependencies = this.serviceContainer.resolveToolDependencies();
    return new ToolClass(dependencies);
  }
}
```

### **4. Enhanced BaseTool Architecture**
```typescript
abstract class BaseTool<TOptions extends ToolOptions = {}> implements ToolWithState {
  abstract id: string;
  abstract name: string;
  abstract cursor: string;
  
  // State management
  state: ToolState = ToolState.INACTIVE;
  private stateHistory: ToolStateTransition[] = [];
  
  // Dependencies (injected)
  protected dependencies: ToolDependencies;
  
  // Type-safe options
  protected options: Record<string, any> = {};
  
  constructor(dependencies: ToolDependencies) {
    this.dependencies = dependencies;
    this.initializeOptions();
  }
  
  // State machine implementation
  setState(newState: ToolState, reason?: string): void {
    if (!this.canTransitionTo(newState)) {
      throw new Error(`Invalid transition from ${this.state} to ${newState}`);
    }
    
    const transition: ToolStateTransition = {
      from: this.state,
      to: newState,
      timestamp: Date.now(),
      reason
    };
    
    this.state = newState;
    this.stateHistory.push(transition);
    
    this.dependencies.eventBus.emit('tool.stateChanged', {
      toolId: this.id,
      transition,
      timestamp: Date.now()
    });
  }
  
  canTransitionTo(newState: ToolState): boolean {
    const validTransitions: Record<ToolState, ToolState[]> = {
      [ToolState.INACTIVE]: [ToolState.ACTIVATING],
      [ToolState.ACTIVATING]: [ToolState.ACTIVE, ToolState.INACTIVE],
      [ToolState.ACTIVE]: [ToolState.WORKING, ToolState.DEACTIVATING],
      [ToolState.WORKING]: [ToolState.ACTIVE, ToolState.DEACTIVATING],
      [ToolState.DEACTIVATING]: [ToolState.INACTIVE]
    };
    
    return validTransitions[this.state]?.includes(newState) ?? false;
  }
  
  // Safe event handlers with state guards
  onMouseDown?(event: ToolEvent): void {
    if (this.state !== ToolState.ACTIVE) return;
    this.setState(ToolState.WORKING, 'Mouse interaction started');
    this.handleMouseDown(event);
  }
  
  onMouseMove?(event: ToolEvent): void {
    if (this.state !== ToolState.ACTIVE && this.state !== ToolState.WORKING) return;
    this.handleMouseMove(event);
  }
  
  onMouseUp?(event: ToolEvent): void {
    if (this.state !== ToolState.WORKING) return;
    this.handleMouseUp(event);
    this.setState(ToolState.ACTIVE, 'Mouse interaction completed');
  }
  
  // Abstract methods for tool-specific logic
  protected abstract getOptionDefinitions(): TOptions;
  protected abstract handleMouseDown(event: ToolEvent): void;
  protected abstract handleMouseMove(event: ToolEvent): void;
  protected abstract handleMouseUp(event: ToolEvent): void;
  
  // Command pattern integration
  protected executeCommand(command: Command): void {
    this.dependencies.commandManager.execute(command);
    this.dependencies.eventBus.emit('tool.commandExecuted', {
      toolId: this.id,
      command: command.constructor.name,
      timestamp: Date.now()
    });
  }
  
  // Type-safe options system
  private initializeOptions(): void {
    const definitions = this.getOptionDefinitions();
    Object.entries(definitions).forEach(([key, definition]) => {
      this.options[key] = definition.default;
    });
  }
  
  setOption<K extends keyof TOptions>(
    key: K, 
    value: TOptions[K]['default']
  ): void {
    const definition = this.getOptionDefinitions()[key];
    if (definition.validator && !definition.validator(value)) {
      throw new Error(`Invalid value for option ${String(key)}: ${value}`);
    }
    
    this.options[key] = value;
    this.dependencies.eventBus.emit('tool.optionChanged', {
      toolId: this.id,
      option: String(key),
      value,
      timestamp: Date.now()
    });
  }
  
  // Lifecycle methods
  async onActivate(): Promise<void> {
    this.setState(ToolState.ACTIVATING, 'Tool activation requested');
    await this.setupTool();
    this.setState(ToolState.ACTIVE, 'Tool activation completed');
  }
  
  async onDeactivate(): Promise<void> {
    this.setState(ToolState.DEACTIVATING, 'Tool deactivation requested');
    await this.cleanupTool();
    this.setState(ToolState.INACTIVE, 'Tool deactivation completed');
  }
  
  protected abstract setupTool(): Promise<void>;
  protected abstract cleanupTool(): Promise<void>;
}
```

### **5. Event-Driven Tool Store**
```typescript
export class EventToolStore extends BaseStore<ToolState> {
  private tools = new Map<string, ToolWithState>();
  private activeToolId: string | null = null;
  private eventQueue: ToolEvent[] = [];
  
  async activateTool(toolId: string): Promise<void> {
    const tool = this.tools.get(toolId);
    if (!tool) throw new Error(`Tool ${toolId} not found`);
    
    // Check if tool can be activated
    if (!tool.canTransitionTo(ToolState.ACTIVATING)) {
      throw new Error(`Tool ${toolId} cannot be activated from state ${tool.state}`);
    }
    
    // Deactivate current tool first
    if (this.activeToolId && this.activeToolId !== toolId) {
      await this.deactivateCurrentTool();
    }
    
    try {
      // Start activation
      await tool.onActivate();
      this.activeToolId = toolId;
      
      // Process queued events
      this.processEventQueue();
      
      this.dependencies.eventBus.emit('tool.activated', { 
        toolId, 
        timestamp: Date.now() 
      });
      
    } catch (error) {
      tool.setState(ToolState.INACTIVE, `Activation failed: ${error.message}`);
      throw error;
    }
  }
  
  getActiveTool(): ToolWithState | null {
    if (!this.activeToolId) return null;
    const tool = this.tools.get(this.activeToolId);
    return tool?.state === ToolState.ACTIVE ? tool : null;
  }
  
  // Queue events during activation
  queueEvent(event: ToolEvent): void {
    const activeTool = this.getActiveTool();
    if (!activeTool) {
      this.eventQueue.push(event);
      return;
    }
    
    // Tool is active, process immediately
    this.processEvent(activeTool, event);
  }
  
  private processEventQueue(): void {
    const activeTool = this.getActiveTool();
    if (!activeTool) return;
    
    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift()!;
      this.processEvent(activeTool, event);
    }
  }
  
  private processEvent(tool: ToolWithState, event: ToolEvent): void {
    switch (event.type) {
      case 'mousedown':
        tool.onMouseDown?.(event);
        break;
      case 'mousemove':
        tool.onMouseMove?.(event);
        break;
      case 'mouseup':
        tool.onMouseUp?.(event);
        break;
    }
  }
}
```

### **6. Shared Tool Behaviors**
```typescript
interface ToolBehavior {
  id: string;
  onActivate?(tool: BaseTool): void;
  onDeactivate?(tool: BaseTool): void;
  onMouseDown?(tool: BaseTool, event: ToolEvent): void;
  onMouseMove?(tool: BaseTool, event: ToolEvent): void;
  onMouseUp?(tool: BaseTool, event: ToolEvent): void;
}

class DrawingBehavior implements ToolBehavior {
  id = 'drawing';
  
  onMouseDown(tool: BaseTool, event: ToolEvent): void {
    // Shared drawing initialization
    tool.dependencies.eventBus.emit('drawing.started', {
      toolId: tool.id,
      point: event.point,
      timestamp: Date.now()
    });
  }
  
  onMouseMove(tool: BaseTool, event: ToolEvent): void {
    // Shared drawing continuation
    if (tool.state === ToolState.WORKING) {
      tool.dependencies.eventBus.emit('drawing.continued', {
        toolId: tool.id,
        point: event.point,
        timestamp: Date.now()
      });
    }
  }
}

class SelectionBehavior implements ToolBehavior {
  id = 'selection';
  
  onMouseDown(tool: BaseTool, event: ToolEvent): void {
    // Shared selection logic
    tool.dependencies.eventBus.emit('selection.started', {
      toolId: tool.id,
      point: event.point,
      timestamp: Date.now()
    });
  }
}

// Tools can compose behaviors
abstract class BaseTool {
  private behaviors: Map<string, ToolBehavior> = new Map();
  
  addBehavior(behavior: ToolBehavior): void {
    this.behaviors.set(behavior.id, behavior);
  }
  
  protected delegateToBehaviors(method: keyof ToolBehavior, ...args: any[]): void {
    for (const behavior of this.behaviors.values()) {
      const fn = behavior[method];
      if (fn) fn(this, ...args);
    }
  }
}
```

### **7. Type-Safe Tool Options**
```typescript
interface ToolOptionDefinition<T = any> {
  type: 'number' | 'string' | 'boolean' | 'color' | 'enum';
  default: T;
  min?: number;
  max?: number;
  enum?: T[];
  validator?: (value: T) => boolean;
  description?: string;
}

interface ToolOptions {
  [key: string]: ToolOptionDefinition;
}

// Example tool implementation
class BrushTool extends BaseTool<BrushToolOptions> {
  id = 'brush';
  name = 'Brush Tool';
  cursor = 'crosshair';
  
  protected getOptionDefinitions(): BrushToolOptions {
    return {
      size: {
        type: 'number',
        default: 10,
        min: 1,
        max: 100,
        description: 'Brush size in pixels'
      },
      opacity: {
        type: 'number',
        default: 100,
        min: 0,
        max: 100,
        description: 'Brush opacity percentage'
      },
      color: {
        type: 'color',
        default: '#000000',
        description: 'Brush color'
      },
      blendMode: {
        type: 'enum',
        default: 'normal',
        enum: ['normal', 'multiply', 'screen', 'overlay'],
        description: 'Blend mode'
      }
    };
  }
  
  protected async setupTool(): Promise<void> {
    // Initialize brush-specific resources
    this.addBehavior(new DrawingBehavior());
  }
  
  protected async cleanupTool(): Promise<void> {
    // Clean up brush resources
  }
  
  protected handleMouseDown(event: ToolEvent): void {
    this.delegateToBehaviors('onMouseDown', event);
    // Brush-specific mouse down logic
  }
}
```

## 🔧 **Implementation Plan**

### **Phase 1: Core Architecture (Priority 1)**
- [ ] **Fix Command Return Types**: Update all commands to return `CommandResult<void>`
- [ ] **Fix Command Context**: Ensure commands receive proper `CommandContext` parameters
- [ ] **Update BaseTool**: Implement state machine and dependency injection
- [ ] **Update EventToolStore**: Add proper activation logic with state management
- [ ] **Create ToolFactory**: Implement dependency injection factory

### **Phase 2: Core Tools Migration (Priority 1)**
- [ ] **moveTool**: Primary transform tool
- [ ] **marqueeRectTool**: Core selection tool
- [ ] **marqueeEllipseTool**: Core selection tool
- [ ] **cropTool**: Essential crop functionality
- [ ] **brushTool**: Primary painting tool
- [ ] **eraserTool**: Essential eraser
- [ ] **horizontalTypeTool**: Primary text tool

### **Phase 3: Secondary Tools Migration (Priority 2)**
- [ ] **lassoTool**: Freehand selection
- [ ] **magicWandTool**: Color-based selection
- [ ] **quickSelectionTool**: Smart selection
- [ ] **rotateTool**: Object rotation
- [ ] **flipTool**: Object flipping
- [ ] **resizeTool**: Object resizing
- [ ] **gradientTool**: Gradient application
- [ ] **verticalTypeTool**: Vertical text
- [ ] **brightnessTool**: Image brightness
- [ ] **contrastTool**: Image contrast
- [ ] **saturationTool**: Color saturation
- [ ] **blurTool**: Gaussian blur
- [ ] **sharpenTool**: Image sharpening
- [ ] **grayscaleTool**: B&W conversion
- [ ] **zoomTool**: Canvas zoom
- [ ] **eyedropperTool**: Color picker
- [ ] **imageGenerationTool**: AI image generation

### **Phase 4: Tertiary Tools Migration (Priority 3)**
- [ ] **handTool**: Navigation tool
- [ ] **typeMaskTool**: Text-based selections
- [ ] **typeOnPathTool**: Path-based text
- [ ] **hueTool**: Hue adjustment
- [ ] **exposureTool**: Exposure control
- [ ] **invertTool**: Color inversion
- [ ] **vintageEffectsTool**: Vintage effects

### **Phase 5: AI-Native Tools Migration (Priority 3)**
- [ ] **BackgroundRemovalTool**: AI background removal
- [ ] **FaceEnhancementTool**: AI face enhancement
- [ ] **InpaintingTool**: AI inpainting
- [ ] **OutpaintingTool**: AI outpainting
- [ ] **SemanticSelectionTool**: AI semantic selection
- [ ] **VariationTool**: AI variations
- [ ] **UpscalingTool**: AI upscaling
- [ ] **StyleTransferTool**: AI style transfer
- [ ] **RelightingTool**: AI relighting
- [ ] **ObjectRemovalTool**: AI object removal
- [ ] **promptAdjustmentTool**: Natural language adjustments

### **Phase 6: Object Migration & Cleanup**
- [ ] **Find/Replace Layer References**: Update all layer terminology to object
- [ ] **Update Event Names**: Change event names from layer.* to object.*
- [ ] **Fix Type Definitions**: Update interfaces and types
- [ ] **Remove Singleton Imports**: Replace with constructor injection
- [ ] **Fix Missing Dependencies**: Add canvas dependencies to filters
- [ ] **Fix Type Safety**: Remove 'any' types and unsafe assumptions

## 🎯 **Success Criteria**

### **Primary Goals**
- ✅ **Zero TypeScript Errors**: All 121 errors fixed
- ✅ **No Race Conditions**: "Tool X is not active" errors eliminated
- ✅ **Consistent Patterns**: All 42 tools follow same architecture
- ✅ **Proper Dependency Injection**: No singleton imports
- ✅ **Event-Driven**: All communication through events

### **Architecture Goals**
- ✅ **State Machine**: Proper tool lifecycle management
- ✅ **Command Pattern**: All operations through commands
- ✅ **Type Safety**: 100% TypeScript strict compliance
- ✅ **Behavior Composition**: Shared behaviors reduce code duplication
- ✅ **Clear Interfaces**: Well-defined contracts between components

### **Quality Goals**
- ✅ **DRY**: Shared behaviors eliminate code duplication
- ✅ **Modular**: Clear separation of concerns
- ✅ **Maintainable**: Easy to add new tools following patterns
- ✅ **Testable**: Clear dependencies and interfaces
- ✅ **Performance**: Efficient event handling and state management

This architecture provides senior-level patterns that solve real problems while maintaining clean, maintainable code that follows consistent patterns across all 42 tools. 