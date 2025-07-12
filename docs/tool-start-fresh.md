# Tool System: Complete Rebuild Plan

## Executive Summary

**Objective**: Rebuild the entire tool system from scratch using senior-level architectural patterns, eliminating technical debt and creating a consistent, maintainable foundation.

**Timeline**: 2-week focused sprint
**Scope**: 42 tools across 6 categories + AI adapter system
**Architecture**: Command-first, event-driven, dependency injection, transient instances

## 🎯 High-Level Architecture Patterns

### 1. **Dependency Injection Foundation**
All tools use constructor injection with standardized dependencies:

```typescript
interface ToolDependencies {
  eventBus: TypedEventBus;           // Event communication
  canvasManager: CanvasManager;      // Canvas operations
  commandManager: CommandManager;    // Command execution
  resourceManager: ResourceManager;  // Resource management
  selectionManager?: SelectionManager; // Selection operations
  filterManager?: FilterManager;     // Filter operations
}

// Every tool follows this pattern
constructor(dependencies: ToolDependencies) {
  super(dependencies);
}
```

### 2. **Command-First Operations**
All state-changing operations go through the command system:

```typescript
// ✅ REQUIRED: All operations use commands
protected handleMouseDown(event: ToolEvent): void {
  const command = new SpecificCommand(
    'Operation description',
    this.getCommandContext(),
    { /* operation data */ }
  );
  
  this.executeCommand(command);
}

// ❌ FORBIDDEN: Direct operations
canvas.updateObject(id, data); // NEVER DO THIS
```

### 3. **Event-Driven Communication**
All communication between components uses the event system:

```typescript
// Tool state changes
this.dependencies.eventBus.emit('tool.activated', { toolId: this.id });

// Operation results
this.dependencies.eventBus.emit('tool.operation.completed', {
  toolId: this.id,
  operationType: 'brush-stroke',
  affectedObjects: [objectId]
});
```

### 4. **Transient Tool Instances**
Tools are created on-demand and disposed when deactivated:

```typescript
// ✅ CORRECT: Tools created fresh each time
class EventToolStore {
  private activeTool: BaseTool | null = null;
  
  async activateTool(toolId: string) {
    await this.deactivateCurrentTool();
    this.activeTool = await this.toolFactory.createTool(toolId);
    await this.activeTool.onActivate();
  }
  
  async deactivateCurrentTool() {
    if (this.activeTool) {
      await this.activeTool.onDeactivate();
      this.activeTool.dispose?.();
      this.activeTool = null; // GC can collect
    }
  }
}
```

### 5. **State Machine Lifecycle**
All tools follow a strict state machine with validation and race condition prevention:

```typescript
enum ToolState {
  INACTIVE = 'INACTIVE',
  ACTIVATING = 'ACTIVATING',
  ACTIVE = 'ACTIVE',
  WORKING = 'WORKING',
  DEACTIVATING = 'DEACTIVATING'
}

// Category-specific state extensions
enum SelectionToolState {
  INACTIVE = 'INACTIVE',
  ACTIVE = 'ACTIVE',
  PREVIEWING = 'PREVIEWING',    // Mouse down, dragging
  CONFIRMING = 'CONFIRMING',    // Selection made, awaiting confirmation
}

enum AIToolState {
  INACTIVE = 'INACTIVE',
  ACTIVE = 'ACTIVE',
  PROCESSING = 'PROCESSING',    // AI operation running
  AWAITING_RESULT = 'AWAITING_RESULT',
}

abstract class BaseTool {
  private state = ToolState.INACTIVE;
  private stateTransitions = new Map<string, Set<ToolState>>();
  private cleanupTasks: Array<() => void> = [];

  constructor(protected dependencies: ToolDependencies) {
    this.setupStateTransitions();
  }

  private setupStateTransitions(): void {
    this.stateTransitions.set(ToolState.INACTIVE, new Set([ToolState.ACTIVATING]));
    this.stateTransitions.set(ToolState.ACTIVATING, new Set([ToolState.ACTIVE, ToolState.INACTIVE]));
    this.stateTransitions.set(ToolState.ACTIVE, new Set([ToolState.WORKING, ToolState.DEACTIVATING]));
    this.stateTransitions.set(ToolState.WORKING, new Set([ToolState.ACTIVE, ToolState.DEACTIVATING]));
    this.stateTransitions.set(ToolState.DEACTIVATING, new Set([ToolState.INACTIVE]));
  }

  protected transitionTo(newState: ToolState): void {
    const allowedTransitions = this.stateTransitions.get(this.state);
    if (!allowedTransitions?.has(newState)) {
      throw new Error(`Invalid state transition: ${this.state} -> ${newState} for tool ${this.id}`);
    }
    
    const oldState = this.state;
    this.state = newState;
    this.onStateChange(oldState, newState);
    
    // Emit state change event
    this.dependencies.eventBus.emit('tool.state.changed', {
      toolId: this.id,
      from: oldState,
      to: newState,
      timestamp: Date.now()
    });
  }

  // Tools can only handle events in certain states
  protected canHandleEvents(): boolean {
    return this.state === ToolState.ACTIVE || this.state === ToolState.WORKING;
  }

  // All event handlers check state first
  onMouseMove(event: ToolEvent): void {
    if (!this.canHandleEvents()) return;
    this.handleMouseMove(event);
  }

  onMouseDown(event: ToolEvent): void {
    if (!this.canHandleEvents()) return;
    this.transitionTo(ToolState.WORKING);
    this.handleMouseDown(event);
  }

  onMouseUp(event: ToolEvent): void {
    if (this.state === ToolState.WORKING) {
      this.transitionTo(ToolState.ACTIVE);
    }
    this.handleMouseUp(event);
  }

  // Resource cleanup system
  protected registerCleanup(cleanup: () => void): void {
    this.cleanupTasks.push(cleanup);
  }

  async dispose(): Promise<void> {
    // Run all cleanup tasks
    for (const task of this.cleanupTasks) {
      try {
        await task();
      } catch (error) {
        console.error('Tool cleanup error:', error);
      }
    }
    
    // Clear references
    this.cleanupTasks = [];
    this.dependencies = null;
  }

  getState(): ToolState {
    return this.state;
  }

  protected abstract onStateChange(from: ToolState, to: ToolState): void;
  protected abstract handleMouseMove(event: ToolEvent): void;
  protected abstract handleMouseDown(event: ToolEvent): void;
  protected abstract handleMouseUp(event: ToolEvent): void;
}
```

### 6. **Type-Safe Options System**
All tool options are type-safe with validation:

```typescript
interface BrushToolOptions extends ToolOptions {
  size: { type: 'number'; default: number; min: number; max: number };
  color: { type: 'color'; default: string };
  opacity: { type: 'number'; default: number; min: 0; max: 100 };
}
```

## 🏗️ Core Architecture Components

### 1. **ToolRegistry** (New)
```typescript
// lib/editor/tools/registry/ToolRegistry.ts
export class ToolRegistry {
  private toolClasses = new Map<string, ToolClassMetadata>();
  
  registerToolClass<T extends BaseTool>(
    id: string,
    ToolClass: new (deps: ToolDependencies) => T,
    metadata: ToolMetadata
  ): void {
    // Validate the tool class
    if (!ToolClass.prototype.handleMouseMove) {
      throw new Error(`Tool ${id} must implement handleMouseMove`);
    }
    
    if (!ToolClass.prototype.onActivate) {
      throw new Error(`Tool ${id} must implement onActivate`);
    }
    
    if (!ToolClass.prototype.onDeactivate) {
      throw new Error(`Tool ${id} must implement onDeactivate`);
    }
    
    // Check for duplicate registration
    if (this.toolClasses.has(id)) {
      console.warn(`Tool ${id} already registered, overwriting`);
    }
    
    // Validate metadata
    if (!metadata.category || !metadata.icon) {
      throw new Error(`Tool ${id} missing required metadata (category, icon)`);
    }
    
    if (!metadata.name || !metadata.description) {
      throw new Error(`Tool ${id} missing required metadata (name, description)`);
    }
    
    this.toolClasses.set(id, {
      id,
      ToolClass,
      metadata,
      factory: (deps: ToolDependencies) => new ToolClass(deps)
    });
    
    console.log(`✅ Registered tool: ${id} (${metadata.category})`);
  }
  
  getToolClass(id: string): ToolClassMetadata | null {
    return this.toolClasses.get(id) || null;
  }
  
  hasToolClass(id: string): boolean {
    return this.toolClasses.has(id);
  }
  
  getAllToolClasses(): ToolClassMetadata[] {
    return Array.from(this.toolClasses.values());
  }
  
  getToolsByCategory(category: string): ToolClassMetadata[] {
    return this.getAllToolClasses().filter(tool => tool.metadata.category === category);
  }
  
  validateAllTools(): void {
    const errors: string[] = [];
    
    for (const [id, toolClass] of this.toolClasses) {
      try {
        // Try to create a mock instance to validate
        const mockDeps = this.createMockDependencies();
        const instance = new toolClass.ToolClass(mockDeps);
        
        // Check required methods exist
        if (typeof instance.onActivate !== 'function') {
          errors.push(`${id}: missing onActivate method`);
        }
        
        if (typeof instance.onDeactivate !== 'function') {
          errors.push(`${id}: missing onDeactivate method`);
        }
        
        // Clean up
        instance.dispose?.();
        
      } catch (error) {
        errors.push(`${id}: ${error.message}`);
      }
    }
    
    if (errors.length > 0) {
      throw new Error(`Tool validation failed:\n${errors.join('\n')}`);
    }
  }
  
  private createMockDependencies(): ToolDependencies {
    // Create minimal mock dependencies for validation
    return {
      eventBus: { emit: () => {}, on: () => {} } as any,
      canvasManager: { getSelectedObjects: () => [] } as any,
      commandManager: { execute: () => Promise.resolve() } as any,
      // ... other mocks
    };
  }
}
```

### 2. **Enhanced ToolFactory** (Refactor)
```typescript
// lib/editor/tools/base/ToolFactory.ts
export class ToolFactory {
  constructor(
    private serviceContainer: ServiceContainer,
    private toolRegistry: ToolRegistry
  ) {}
  
  async createTool(toolId: string): Promise<BaseTool> {
    const toolClass = this.toolRegistry.getToolClass(toolId);
    if (!toolClass) {
      throw new Error(`Tool class not registered: ${toolId}`);
    }
    
    const dependencies = await this.resolveToolDependencies();
    const tool = toolClass.factory(dependencies);
    
    // Each tool gets a unique instance ID
    tool.instanceId = `${toolId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return tool;
  }
}
```

### 3. **Refactored EventToolStore** (Major Update)
```typescript
// lib/store/tools/EventToolStore.ts
class ToolActivationError extends Error {
  constructor(
    public toolId: string,
    public reason: string,
    public fallbackToolId: string = 'move'
  ) {
    super(`Failed to activate tool ${toolId}: ${reason}`);
  }
}

// Promise queue for preventing race conditions
class PromiseQueue {
  private queue: Array<() => Promise<void>> = [];
  private isProcessing = false;

  add<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await task();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;
    
    this.isProcessing = true;
    
    while (this.queue.length > 0) {
      const task = this.queue.shift()!;
      await task();
    }
    
    this.isProcessing = false;
  }
}

export class EventToolStore extends BaseStore<ToolStoreState> {
  private activationQueue = new PromiseQueue();
  
  constructor(
    eventStore: EventStore,
    private eventBus: TypedEventBus,
    private toolFactory: ToolFactory,
    private toolRegistry: ToolRegistry,
    private canvasManager: CanvasManager
  ) {
    super({
      activeToolId: null,
      activeTool: null,        // Single active tool instance
      eventQueue: [],
      isActivating: false,
      toolHistory: []          // Track recently used tools
    }, eventStore);
  }
  
  async activateTool(toolId: string): Promise<void> {
    // Queue activations to prevent race conditions
    return this.activationQueue.add(async () => {
      try {
        await this.doActivateTool(toolId);
      } catch (error) {
        console.error(`Tool activation failed:`, error);
        
        // Fallback to safe default
        if (toolId !== 'move') {
          await this.doActivateTool('move');
        }
        
        throw new ToolActivationError(toolId, error.message);
      }
    });
  }
  
  private async doActivateTool(toolId: string): Promise<void> {
    // Mark as activating
    this.setState(state => ({ ...state, isActivating: true }));
    
    // Deactivate current tool first
    await this.deactivateCurrentTool();
    
    // Create fresh tool instance
    const tool = await this.toolFactory.createTool(toolId);
    tool.transitionTo(ToolState.ACTIVATING);
    
    try {
      // Activate the tool
      await tool.onActivate();
      tool.transitionTo(ToolState.ACTIVE);
      
      // Store as active tool
      this.setState(state => ({
        ...state,
        activeToolId: toolId,
        activeTool: tool,
        toolHistory: [toolId, ...state.toolHistory.slice(0, 9)],
        isActivating: false
      }));
      
      // Emit activation event
      this.eventBus.emit('tool.activated', {
        toolId,
        instanceId: tool.instanceId,
        timestamp: Date.now()
      });
      
    } catch (error) {
      tool.transitionTo(ToolState.INACTIVE);
      await tool.dispose();
      throw error;
    }
  }
  
  async deactivateCurrentTool(): Promise<void> {
    const state = this.getState();
    if (!state.activeTool) return;
    
    const tool = state.activeTool;
    
    try {
      tool.transitionTo(ToolState.DEACTIVATING);
      await tool.onDeactivate();
      tool.transitionTo(ToolState.INACTIVE);
      
      // Emit deactivation event
      this.eventBus.emit('tool.deactivated', {
        toolId: state.activeToolId,
        instanceId: tool.instanceId,
        timestamp: Date.now()
      });
      
    } finally {
      // Always dispose and clear, even if deactivation fails
      await tool.dispose();
      
      this.setState(currentState => ({
        ...currentState,
        activeToolId: null,
        activeTool: null
      }));
    }
  }
  
  // Get active tool with type safety
  getActiveTool<T extends BaseTool = BaseTool>(): T | null {
    return this.getState().activeTool as T | null;
  }
  
  // Check if tool can be activated
  canActivateTool(toolId: string): boolean {
    const state = this.getState();
    return !state.isActivating && this.toolRegistry.hasToolClass(toolId);
  }
}
```

## 📁 Directory Structure Reorganization

### Current Structure Issues:
- AI tools scattered across `lib/ai/tools/` and `lib/editor/tools/ai-native/`
- Inconsistent organization
- Mixed patterns

### New Structure:
```
lib/editor/tools/
├── base/                    # Base classes and interfaces
│   ├── BaseTool.ts
│   ├── ToolFactory.ts
│   ├── ToolRequirements.ts
│   └── index.ts
├── registry/               # Tool registration system
│   ├── ToolRegistry.ts
│   ├── ToolMetadata.ts
│   └── index.ts
├── templates/              # Tool templates for consistency
│   ├── BaseToolTemplate.ts
│   ├── PixelToolTemplate.ts
│   ├── ObjectToolTemplate.ts
│   └── SelectionToolTemplate.ts
├── selection/              # Selection tools
│   ├── MarqueeRectTool.ts
│   ├── MarqueeEllipseTool.ts
│   ├── LassoTool.ts
│   ├── MagicWandTool.ts
│   └── index.ts
├── transform/              # Transform tools
│   ├── MoveTool.ts
│   ├── CropTool.ts
│   ├── RotateTool.ts
│   ├── FlipTool.ts
│   ├── ResizeTool.ts
│   └── index.ts
├── drawing/                # Drawing tools
│   ├── BrushTool.ts
│   ├── EraserTool.ts
│   ├── GradientTool.ts
│   ├── FrameTool.ts
│   └── index.ts
├── text/                   # Text tools
│   ├── HorizontalTypeTool.ts
│   ├── VerticalTypeTool.ts
│   ├── TypeMaskTool.ts
│   ├── TypeOnPathTool.ts
│   └── index.ts
├── adjustments/            # Adjustment tools
│   ├── BrightnessTool.ts
│   ├── ContrastTool.ts
│   ├── SaturationTool.ts
│   ├── HueTool.ts
│   ├── ExposureTool.ts
│   └── index.ts
├── filters/                # Filter tools
│   ├── BlurTool.ts
│   ├── SharpenTool.ts
│   ├── GrayscaleTool.ts
│   ├── InvertTool.ts
│   ├── VintageEffectsTool.ts
│   └── index.ts
├── navigation/             # Navigation tools
│   ├── HandTool.ts
│   ├── ZoomTool.ts
│   ├── EyedropperTool.ts
│   └── index.ts
├── ai/                     # ALL AI tools consolidated
│   ├── generation/
│   │   ├── ImageGenerationTool.ts
│   │   ├── VariationTool.ts
│   │   └── index.ts
│   ├── enhancement/
│   │   ├── BackgroundRemovalTool.ts
│   │   ├── FaceEnhancementTool.ts
│   │   ├── UpscalingTool.ts
│   │   ├── StyleTransferTool.ts
│   │   └── index.ts
│   ├── editing/
│   │   ├── InpaintingTool.ts
│   │   ├── OutpaintingTool.ts
│   │   ├── ObjectRemovalTool.ts
│   │   ├── RelightingTool.ts
│   │   └── index.ts
│   ├── selection/
│   │   ├── SemanticSelectionTool.ts
│   │   ├── SmartSelectionTool.ts
│   │   └── index.ts
│   ├── creative/
│   │   ├── AIPromptBrush.ts
│   │   ├── StyleTransferBrush.ts
│   │   ├── PromptAdjustmentTool.ts
│   │   └── index.ts
│   └── index.ts
├── engines/                # Tool engines and utilities
│   ├── BrushEngine.ts
│   ├── BlendingEngine.ts
│   ├── PixelBuffer.ts
│   └── index.ts
└── index.ts                # Main tool exports
```

## 🛠️ Comprehensive Tool Inventory & Migration Plan

### **Phase 1: Core Architecture (Days 1-2)**

#### Day 1: Foundation
- [ ] Create `ToolRegistry` class
- [ ] Refactor `ToolFactory` for transient creation
- [ ] Update `EventToolStore` for single active tool
- [ ] Create tool templates and base classes
- [ ] Update `AppInitializer` registration patterns

#### Day 2: Templates & Base Classes
- [ ] Create `BaseToolTemplate` with command integration
- [ ] Create specialized templates (PixelTool, ObjectTool, SelectionTool)
- [ ] Update `BaseTool` with proper disposal methods
- [ ] Create tool metadata system
- [ ] Set up directory structure

### **Phase 2: Priority 1 Tools (Days 3-5)**

#### Selection Tools (2 tools)
**Priority**: P1 (Core functionality)
**Timeline**: Day 3 morning

- [ ] **MarqueeRectTool** - Rectangular selection
  - Base: `SelectionTool`
  - Commands: `CreateSelectionCommand`, `ModifySelectionCommand`
  - Events: `selection.started`, `selection.modified`, `selection.completed`

- [ ] **MarqueeEllipseTool** - Elliptical selection
  - Base: `SelectionTool`
  - Commands: `CreateSelectionCommand`, `ModifySelectionCommand`
  - Events: `selection.started`, `selection.modified`, `selection.completed`

#### Transform Tools (2 tools)
**Priority**: P1 (Essential editing)
**Timeline**: Day 3 afternoon

- [ ] **MoveTool** - Already migrated, just register properly
  - Status: ✅ Complete
  - Commands: `UpdateObjectCommand`, `AddObjectCommand` (for duplication)
  - Events: `object.moved`, `object.duplicated`

- [ ] **CropTool** - Image cropping
  - Base: `ObjectTool`
  - Commands: `CropCommand`, `UpdateObjectCommand`
  - Events: `object.cropped`, `object.bounds.changed`

#### Drawing Tools (1 tool)
**Priority**: P1 (Core creative tool)
**Timeline**: Day 4 morning

- [ ] **BrushTool** - Pixel painting
  - Base: `PixelTool`
  - Commands: `CreateBrushStrokeCommand`, `UpdatePixelDataCommand`
  - Events: `brush.stroke.started`, `brush.stroke.continued`, `brush.stroke.completed`
  - Integration: `BrushEngine`, `PixelBuffer`

#### Text Tools (1 tool)
**Priority**: P1 (Essential content creation)
**Timeline**: Day 4 afternoon

- [ ] **HorizontalTypeTool** - Text creation
  - Base: `TextTool`
  - Commands: `AddTextCommand`, `EditTextCommand`
  - Events: `text.created`, `text.edited`, `text.style.changed`

### **Phase 3: Priority 2 Tools (Days 6-8)**

#### Selection Tools (3 tools)
**Timeline**: Day 6 morning

- [ ] **LassoTool** - Freehand selection
- [ ] **MagicWandTool** - Color-based selection
- [ ] **QuickSelectionTool** - Smart selection

#### Transform Tools (3 tools)
**Timeline**: Day 6 afternoon

- [ ] **RotateTool** - Object rotation
- [ ] **FlipTool** - Object flipping
- [ ] **ResizeTool** - Object resizing

#### Drawing Tools (2 tools)
**Timeline**: Day 7 morning

- [ ] **EraserTool** - Pixel erasing
- [ ] **GradientTool** - Gradient application

#### Text Tools (3 tools)
**Timeline**: Day 7 afternoon

- [ ] **VerticalTypeTool** - Vertical text
- [ ] **TypeMaskTool** - Text-based selections
- [ ] **TypeOnPathTool** - Path-based text

#### Adjustment Tools (5 tools)
**Timeline**: Day 8

- [ ] **BrightnessTool** - Image brightness
- [ ] **ContrastTool** - Image contrast
- [ ] **SaturationTool** - Color saturation
- [ ] **HueTool** - Hue adjustment
- [ ] **ExposureTool** - Exposure control

### **Phase 4: Priority 3 Tools (Days 9-10)**

#### Filter Tools (5 tools)
**Timeline**: Day 9 morning

- [ ] **BlurTool** - Gaussian blur
- [ ] **SharpenTool** - Image sharpening
- [ ] **GrayscaleTool** - B&W conversion
- [ ] **InvertTool** - Color inversion
- [ ] **VintageEffectsTool** - Vintage effects

#### Navigation Tools (3 tools)
**Timeline**: Day 9 afternoon

- [ ] **HandTool** - Pan navigation
- [ ] **ZoomTool** - Zoom control
- [ ] **EyedropperTool** - Color picker

#### Frame Tools (1 tool)
**Timeline**: Day 10 morning

- [ ] **FrameTool** - Document frames
  - Base: `ObjectTool`
  - Commands: `CreateFrameCommand`, `UpdateFrameCommand`
  - Events: `frame.created`, `frame.resized`

### **Phase 5: AI Tools (Days 11-12)**

#### AI Generation Tools (2 tools)
**Timeline**: Day 11 morning

- [ ] **ImageGenerationTool** - AI image generation
  - Base: `AITool`
  - Commands: `GenerateImageCommand`, `AddObjectCommand`
  - Events: `ai.generation.started`, `ai.generation.completed`
  - Integration: Replicate API

- [ ] **VariationTool** - AI image variations
  - Base: `AITool`
  - Commands: `GenerateVariationCommand`, `AddObjectCommand`
  - Events: `ai.variation.started`, `ai.variation.completed`

#### AI Enhancement Tools (4 tools)
**Timeline**: Day 11 afternoon

- [ ] **BackgroundRemovalTool** - AI background removal
- [ ] **FaceEnhancementTool** - AI face enhancement
- [ ] **UpscalingTool** - AI upscaling
- [ ] **StyleTransferTool** - AI style transfer

#### AI Editing Tools (4 tools)
**Timeline**: Day 12 morning

- [ ] **InpaintingTool** - AI inpainting
- [ ] **OutpaintingTool** - AI outpainting
- [ ] **ObjectRemovalTool** - AI object removal
- [ ] **RelightingTool** - AI relighting

#### AI Selection Tools (2 tools)
**Timeline**: Day 12 afternoon

- [ ] **SemanticSelectionTool** - AI semantic selection
- [ ] **SmartSelectionTool** - AI smart selection

#### AI Creative Tools (3 tools)
**Timeline**: Day 12 late afternoon

- [ ] **AIPromptBrush** - Natural language painting
- [ ] **StyleTransferBrush** - Style transfer brush
- [ ] **PromptAdjustmentTool** - Natural language adjustments

## 🤖 AI Adapter System Integration

### Current Issues:
- AI tools scattered across multiple directories
- Inconsistent adapter patterns
- Mixed integration approaches

### New Adapter Architecture:

#### 1. **Unified AI Tool Base**
```typescript
// lib/editor/tools/ai/base/AITool.ts
export abstract class AITool extends BaseTool {
  protected abstract aiService: AIService;
  
  // AI-specific lifecycle
  protected abstract validateAIRequirements(): Promise<boolean>;
  protected abstract executeAIOperation(params: unknown): Promise<unknown>;
  
  // Standard tool integration
  protected async setupTool(): Promise<void> {
    await this.validateAIRequirements();
    await super.setupTool();
  }
}
```

#### 2. **AI Adapter Registry**
```typescript
// lib/ai/adapters/AIAdapterRegistry.ts
export class AIAdapterRegistry {
  private adapters = new Map<string, UnifiedToolAdapter>();
  
  registerAdapter(adapter: UnifiedToolAdapter): void {
    this.adapters.set(adapter.aiName, adapter);
  }
  
  // Auto-register adapters for all AI tools
  async registerAllAIToolAdapters(): Promise<void> {
    const aiTools = this.toolRegistry.getToolsByCategory('ai');
    
    for (const tool of aiTools) {
      const adapter = this.createAdapterForTool(tool);
      this.registerAdapter(adapter);
    }
  }
}
```

#### 3. **AI Tool Adapters**
Each AI tool gets a corresponding adapter:

```typescript
// lib/ai/adapters/tools/ImageGenerationAdapter.ts
export class ImageGenerationAdapter extends UnifiedToolAdapter<GenerationInput, GenerationOutput> {
  aiName = 'generateImage';
  toolId = 'ai-image-generation';
  
  async execute(params: GenerationInput, context: CanvasContext): Promise<GenerationOutput> {
    // 1. Activate the canvas tool
    await context.toolStore.activateTool(this.toolId);
    
    // 2. Execute through tool's AI interface
    const tool = context.toolStore.getActiveTool() as ImageGenerationTool;
    const result = await tool.executeAIOperation(params);
    
    return result;
  }
}
```

#### 4. **Adapter Auto-Discovery**
```typescript
// lib/ai/adapters/autoDiscovery.ts
export async function autoDiscoverAIAdapters(): Promise<void> {
  const aiTools = await toolRegistry.getToolsByCategory('ai');
  
  for (const toolMetadata of aiTools) {
    // Create adapter for each AI tool
    const adapter = new GenericAIToolAdapter(toolMetadata);
    adapterRegistry.registerAdapter(adapter);
  }
}
```

## 🔧 Tool Templates

### 1. **Base Tool Template**
```typescript
// lib/editor/tools/templates/BaseToolTemplate.ts
export abstract class BaseToolTemplate extends BaseTool<ToolOptionsType> {
  abstract id: string;
  abstract name: string;
  abstract icon: React.ComponentType;
  abstract cursor: string;
  shortcut?: string;
  
  constructor(dependencies: ToolDependencies) {
    super(dependencies);
  }
  
  protected abstract getOptionDefinitions(): ToolOptionsType;
  
  protected async setupTool(): Promise<void> {
    // Tool-specific setup
  }
  
  protected async cleanupTool(): Promise<void> {
    // Tool-specific cleanup
  }
  
  protected handleMouseDown(event: ToolEvent): void {
    // 🎯 CRITICAL: All operations go through commands
    const command = this.createCommand(event);
    this.executeCommand(command);
  }
  
  protected handleMouseMove(event: ToolEvent): void {
    // Handle mouse move
  }
  
  protected handleMouseUp(event: ToolEvent): void {
    // Complete operation
  }
  
  protected abstract createCommand(event: ToolEvent): Command;
}
```

### 2. **Pixel Tool Template**
```typescript
// lib/editor/tools/templates/PixelToolTemplate.ts
export abstract class PixelToolTemplate extends BaseToolTemplate {
  protected pixelBuffer: PixelBuffer | null = null;
  
  protected async setupTool(): Promise<void> {
    // Initialize pixel buffer for selected image objects
    const selectedObjects = this.dependencies.canvasManager.getSelectedObjects();
    const imageObjects = selectedObjects.filter(obj => obj.type === 'image');
    
    if (imageObjects.length > 0) {
      this.pixelBuffer = new PixelBuffer(imageObjects[0].data.imageData);
    }
    
    await super.setupTool();
  }
  
  protected createCommand(event: ToolEvent): Command {
    return new PixelOperationCommand(
      this.getOperationDescription(),
      this.getCommandContext(),
      {
        operation: this.getPixelOperation(),
        targetObjects: this.getTargetObjects(),
        toolOptions: this.getAllOptions()
      }
    );
  }
  
  protected abstract getPixelOperation(): PixelOperation;
  protected abstract getOperationDescription(): string;
}
```

### 3. **Object Tool Template**
```typescript
// lib/editor/tools/templates/ObjectToolTemplate.ts
export abstract class ObjectToolTemplate extends BaseToolTemplate {
  protected createCommand(event: ToolEvent): Command {
    return new ObjectOperationCommand(
      this.getOperationDescription(),
      this.getCommandContext(),
      {
        operation: this.getObjectOperation(),
        targetObjects: this.getTargetObjects(),
        toolOptions: this.getAllOptions()
      }
    );
  }
  
  protected abstract getObjectOperation(): ObjectOperation;
  protected abstract getOperationDescription(): string;
}
```

### 4. **AI Tool Template**
```typescript
// lib/editor/tools/templates/AIToolTemplate.ts
export abstract class AIToolTemplate extends BaseToolTemplate {
  protected abstract aiService: AIService;
  
  protected async setupTool(): Promise<void> {
    await this.validateAIRequirements();
    await super.setupTool();
  }
  
  protected createCommand(event: ToolEvent): Command {
    return new AIOperationCommand(
      this.getOperationDescription(),
      this.getCommandContext(),
      {
        aiService: this.aiService,
        operation: this.getAIOperation(),
        parameters: this.getAIParameters(event),
        targetObjects: this.getTargetObjects()
      }
    );
  }
  
  protected abstract validateAIRequirements(): Promise<boolean>;
  protected abstract getAIOperation(): AIOperation;
  protected abstract getAIParameters(event: ToolEvent): Record<string, unknown>;
}
```

## 📋 Migration Checklist

### Per-Tool Migration Checklist:
- [ ] **Architecture**
  - [ ] Extends appropriate base class (BaseTool, PixelTool, ObjectTool, AITool)
  - [ ] Uses constructor dependency injection
  - [ ] Implements proper state machine
  - [ ] Follows transient instance pattern

- [ ] **Command Integration**
  - [ ] All operations go through commands
  - [ ] Uses `this.getCommandContext()` for command creation
  - [ ] Implements proper command descriptions
  - [ ] Commands are undoable/redoable

- [ ] **Event Integration**
  - [ ] Emits events through `this.dependencies.eventBus`
  - [ ] Uses standard event naming conventions
  - [ ] Includes proper event metadata

- [ ] **Store Integration**
  - [ ] Integrates with EventStore for persistence
  - [ ] Uses proper store patterns
  - [ ] Handles state updates correctly

- [ ] **Options System**
  - [ ] Implements `getOptionDefinitions()` with type safety
  - [ ] Uses validation for option values
  - [ ] Integrates with EventToolOptionsStore

- [ ] **Lifecycle Management**
  - [ ] Implements `setupTool()` and `cleanupTool()`
  - [ ] Proper resource management
  - [ ] Handles activation/deactivation correctly

- [ ] **AI Integration** (AI tools only)
  - [ ] Has corresponding adapter in `lib/ai/adapters/`
  - [ ] Implements AI service integration
  - [ ] Handles AI operation errors gracefully

### System-Wide Validation:
- [ ] **Memory Management**
  - [ ] Only active tool in memory
  - [ ] Proper disposal of inactive tools
  - [ ] No memory leaks

- [ ] **Performance**
  - [ ] Tool activation < 16ms
  - [ ] Smooth operation execution
  - [ ] Efficient event handling

- [ ] **Type Safety**
  - [ ] Zero TypeScript errors
  - [ ] Proper type definitions
  - [ ] Safe event payload types

- [ ] **Architecture Consistency**
  - [ ] All tools follow same patterns
  - [ ] Consistent command usage
  - [ ] Standardized event emission

## 🚀 Implementation Timeline

### Week 1: Foundation & Core Tools
- **Day 1-2**: Architecture foundation
- **Day 3-5**: Priority 1 tools (5 tools)

### Week 2: Complete Migration
- **Day 6-8**: Priority 2 tools (16 tools)
- **Day 9-10**: Priority 3 tools (9 tools)
- **Day 11-12**: AI tools (12 tools)

### Week 3: Integration & Polish
- **Day 13-14**: System testing and optimization
- **Day 15**: Documentation and deployment

## 📊 Success Metrics

### Technical Metrics:
- **Memory Usage**: 93% reduction (2MB → 150KB)
- **Activation Time**: <16ms (60 FPS)
- **TypeScript Errors**: 0 (currently 121)
- **Command Integration**: 100% (currently ~2%)

### Architecture Metrics:
- **Pattern Consistency**: 100% (currently ~2%)
- **Event-Driven**: 100% (currently ~20%)
- **Dependency Injection**: 100% (currently ~10%)
- **Resource Management**: 100% (currently 0%)

### Quality Metrics:
- **Code Duplication**: <5% (currently ~40%)
- **Test Coverage**: >90% (currently ~10%)
- **Documentation**: 100% (currently ~20%)
- **Performance**: 60 FPS operations (currently variable)

## 🎯 Risk Mitigation

### Technical Risks:
1. **Tool Compatibility**: Ensure all tools work with existing canvas
2. **Performance Regression**: Monitor activation times
3. **Memory Leaks**: Implement proper disposal patterns
4. **Event System Load**: Optimize event handling

### Mitigation Strategies:
1. **Incremental Testing**: Test each tool as it's migrated
2. **Performance Monitoring**: Continuous performance tracking
3. **Memory Profiling**: Regular memory usage analysis
4. **Rollback Plan**: Keep old system available during migration

## 🔄 Post-Migration Benefits

### Developer Experience:
- **Consistent Patterns**: All tools follow same architecture
- **Easy Extension**: New tools follow established templates
- **Better Debugging**: Clear event flow and command history
- **Type Safety**: Full TypeScript support

### User Experience:
- **Faster Tool Switching**: Optimized activation times
- **Better Performance**: Reduced memory usage
- **Reliable Undo/Redo**: All operations are commands
- **Consistent Behavior**: Standardized tool interactions

### System Benefits:
- **Scalability**: Architecture supports growth
- **Maintainability**: Clear patterns and separation of concerns
- **Extensibility**: Plugin system ready
- **Performance**: Optimal resource usage

---

This comprehensive plan provides a clear roadmap for rebuilding the tool system with senior-level architecture patterns, ensuring consistency, performance, and maintainability across all 42 tools.

---

## 🧪 Testing Framework & Production Robustness

### Tool Testing Architecture
Every tool MUST have comprehensive tests covering state machine, lifecycle, and functionality:

```typescript
// lib/editor/tools/__tests__/ToolTestFramework.ts
export class ToolTestFramework {
  static createMockDependencies(): ToolDependencies {
    return {
      eventBus: new MockEventBus(),
      canvasManager: new MockCanvasManager(),
      commandManager: new MockCommandManager(),
      selectionManager: new MockSelectionManager(),
      objectManager: new MockObjectManager()
    };
  }
  
  static async testToolLifecycle<T extends BaseTool>(
    ToolClass: new (deps: ToolDependencies) => T
  ): Promise<void> {
    const deps = this.createMockDependencies();
    const tool = new ToolClass(deps);
    
    // Test initial state
    expect(tool.getState()).toBe(ToolState.INACTIVE);
    
    // Test activation
    await tool.onActivate();
    expect(tool.getState()).toBe(ToolState.ACTIVE);
    
    // Test invalid state transitions
    expect(() => tool.transitionTo(ToolState.INACTIVE))
      .toThrow('Invalid state transition');
    
    // Test deactivation
    await tool.onDeactivate();
    expect(tool.getState()).toBe(ToolState.INACTIVE);
    
    // Test cleanup
    await tool.dispose();
    expect(tool.getState()).toBe(ToolState.INACTIVE);
  }
}

// Example tool test
describe('BrushTool', () => {
  it('should follow proper lifecycle', async () => {
    await ToolTestFramework.testToolLifecycle(BrushTool);
  });
  
  it('should handle mouse events only when active', () => {
    const tool = new BrushTool(ToolTestFramework.createMockDependencies());
    const mockEvent = { x: 100, y: 100 } as ToolEvent;
    
    // Should ignore events when inactive
    tool.onMouseMove(mockEvent);
    expect(tool.getState()).toBe(ToolState.INACTIVE);
    
    // Should handle events when active
    tool.onActivate();
    tool.onMouseMove(mockEvent);
    // Assert expected behavior
  });
  
  it('should clean up resources on disposal', async () => {
    const tool = new BrushTool(ToolTestFramework.createMockDependencies());
    const cleanupSpy = jest.fn();
    
    tool.registerCleanup(cleanupSpy);
    await tool.dispose();
    
    expect(cleanupSpy).toHaveBeenCalled();
  });
});
```

### Integration Testing
```typescript
// Test tool activation with EventToolStore
describe('EventToolStore Integration', () => {
  it('should prevent race conditions during tool switching', async () => {
    const store = new EventToolStore(mockDependencies);
    
    // Rapid tool switching
    const promises = [
      store.activateTool('brush'),
      store.activateTool('eraser'),
      store.activateTool('move')
    ];
    
    await Promise.all(promises);
    
    // Only the last tool should be active
    expect(store.getState().activeToolId).toBe('move');
  });
  
  it('should fallback to safe tool on activation failure', async () => {
    const store = new EventToolStore(mockDependencies);
    
    // Mock a tool that fails to activate
    jest.spyOn(store['toolFactory'], 'createTool')
      .mockRejectedValueOnce(new Error('Failed to create tool'));
    
    await expect(store.activateTool('broken-tool')).rejects.toThrow();
    
    // Should fallback to move tool
    expect(store.getState().activeToolId).toBe('move');
  });
});
```

## 🛡️ Production Robustness Features

### 1. **Memory Leak Prevention**
```typescript
// Automatic cleanup detection
class MemoryLeakDetector {
  private toolInstances = new WeakMap<BaseTool, { created: number; disposed: boolean }>();
  
  trackTool(tool: BaseTool): void {
    this.toolInstances.set(tool, { created: Date.now(), disposed: false });
  }
  
  markDisposed(tool: BaseTool): void {
    const info = this.toolInstances.get(tool);
    if (info) {
      info.disposed = true;
    }
  }
  
  checkForLeaks(): void {
    const now = Date.now();
    const threshold = 5 * 60 * 1000; // 5 minutes
    
    for (const [tool, info] of this.toolInstances) {
      if (!info.disposed && (now - info.created) > threshold) {
        console.warn(`Potential memory leak: tool not disposed after ${now - info.created}ms`);
      }
    }
  }
}
```

### 2. **Performance Monitoring**
```typescript
// Tool performance tracking
class ToolPerformanceMonitor {
  private metrics = new Map<string, { count: number; totalTime: number; maxTime: number }>();
  
  measureToolOperation<T>(toolId: string, operation: string, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;
    
    this.recordMetric(`${toolId}.${operation}`, duration);
    
    // Warn about slow operations
    if (duration > 16) { // 60fps threshold
      console.warn(`Slow tool operation: ${toolId}.${operation} took ${duration}ms`);
    }
    
    return result;
  }
  
  private recordMetric(key: string, duration: number): void {
    const existing = this.metrics.get(key) || { count: 0, totalTime: 0, maxTime: 0 };
    
    this.metrics.set(key, {
      count: existing.count + 1,
      totalTime: existing.totalTime + duration,
      maxTime: Math.max(existing.maxTime, duration)
    });
  }
}
```

### 3. **Error Recovery System**
```typescript
// Graceful error handling
class ToolErrorRecovery {
  private errorCounts = new Map<string, number>();
  private readonly maxErrors = 3;
  
  async handleToolError(toolId: string, error: Error): Promise<void> {
    const count = (this.errorCounts.get(toolId) || 0) + 1;
    this.errorCounts.set(toolId, count);
    
    // Log error with context
    console.error(`Tool error (${count}/${this.maxErrors}):`, {
      toolId,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    // Disable tool if too many errors
    if (count >= this.maxErrors) {
      console.warn(`Disabling tool ${toolId} due to repeated errors`);
      await this.disableTool(toolId);
    }
  }
  
  private async disableTool(toolId: string): Promise<void> {
    // Remove from tool palette
    // Prevent future activation
    // Notify user
  }
}
```

## 📋 Updated Success Metrics

### Critical Production Requirements
- **State Machine**: Zero invalid state transitions
- **Race Conditions**: Zero race conditions in tool activation
- **Resource Management**: Automatic cleanup and disposal
- **Error Recovery**: Graceful handling of all failure modes
- **Memory Leaks**: Automatic detection and prevention
- **Performance**: All operations maintain 60fps
- **Test Coverage**: 90%+ coverage for all tool classes

### Architecture Excellence
- **Consistency**: All tools follow identical patterns
- **Maintainability**: New tools can be added in < 1 day
- **Extensibility**: Plugin system supports third-party tools
- **Reliability**: Zero silent failures, proper error handling
- **Type Safety**: 100% TypeScript strict mode compliance

---

**This plan now includes all the critical senior-level architecture features you identified. Ready to build a truly production-ready tool system! 🚀** 