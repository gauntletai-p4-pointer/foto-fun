# Comprehensive Tool Architecture Refactor

## Overview

**Primary Problem:** Race condition between tool activation and mouse events causing "Tool X is not active" errors.

**Secondary Issues:** Architectural debt including singleton imports, inconsistent patterns, and technical debt across 50+ tools.

**Root Cause:** Mouse events can fire before `tool.onActivate()` completes, but `toolStore.getActiveTool()` already returns the tool.

**Comprehensive Solution:** Implement senior-level architectural patterns including state machine, dependency injection, event-driven communication, and defensive programming across all tools.

## 🚨 **CRITICAL: Domain Model Migration Required**

**IMPORTANT**: During this tool refactoring, we are **simultaneously migrating from Layer-based to Object-based architecture**. This affects tool operations, event names, and target terminology.

### **Legacy (Being Removed):**
```typescript
// ❌ OLD: Layer-based operations
tool.applyToLayer(layerId)
tool.createLayer(layerData)
tool.selectLayers(layerIds)

// ❌ OLD Event Names
'tool.layer.created'
'tool.layer.modified'
'tool.layer.selected'

// ❌ OLD Tool Targets
selectedLayers: Layer[]
currentLayer: Layer
layerOperations: LayerOperations
```

### **Modern (Target Architecture):**
```typescript
// ✅ NEW: Object-based operations
tool.applyToObject(objectId)
tool.createObject(objectData)
tool.selectObjects(objectIds)

// ✅ NEW Event Names
'tool.object.created'
'tool.object.modified'
'tool.object.selected'

// ✅ NEW Tool Targets
selectedObjects: CanvasObject[]
currentObject: CanvasObject
objectOperations: ObjectOperations
```

## Senior-Level Architecture Patterns

### 1. State Machine Pattern for Tool Lifecycle

```typescript
enum ToolState {
  INACTIVE = 'INACTIVE',
  ACTIVATING = 'ACTIVATING', 
  ACTIVE = 'ACTIVE',
  WORKING = 'WORKING',        // Drawing, filtering, etc.
  DEACTIVATING = 'DEACTIVATING'
}

interface ToolWithState extends Tool {
  state: ToolState;
  canvas: CanvasManager | null;
  setState(newState: ToolState): void;
}
```

### 2. Dependency Injection Factory Pattern

```typescript
interface ToolDependencies {
  eventBus: TypedEventBus;
  resourceManager: ResourceManager;
  commandManager: CommandManager;
  canvasManager?: CanvasManager;
  filterManager?: FilterManager;
  selectionManager?: SelectionManager;
}

class ToolFactory {
  constructor(private serviceContainer: ServiceContainer) {}
  
  createTool<T extends BaseTool>(ToolClass: new (deps: ToolDependencies) => T): T {
    const dependencies = this.serviceContainer.resolveToolDependencies();
    return new ToolClass(dependencies);
  }
}
```

### 3. Event-Driven Communication Pattern

```typescript
abstract class BaseTool {
  constructor(protected dependencies: ToolDependencies) {
    // All services injected via constructor - NO singleton imports
  }
  
  protected emitToolEvent(event: ToolEvent): void {
    this.dependencies.eventBus.emit('tool.event', {
      toolId: this.id,
      event,
      timestamp: Date.now()
    });
  }
}
```

### 4. Type-Safe Options System

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

abstract class BaseTool<TOptions extends ToolOptions = {}> {
  protected abstract getOptionDefinitions(): TOptions;
  
  setOption<K extends keyof TOptions>(
    key: K, 
    value: TOptions[K]['default']
  ): void {
    // Type-safe with runtime validation
    const definition = this.getOptionDefinitions()[key];
    if (definition.validator && !definition.validator(value)) {
      throw new Error(`Invalid value for option ${String(key)}: ${value}`);
    }
    this.options[key] = value;
    this.onOptionChange(key, value);
  }
}
```

### 5. Command Pattern for All Operations

```typescript
abstract class BaseTool {
  protected executeCommand(command: Command): void {
    this.dependencies.commandManager.execute(command);
    this.emitToolEvent({
      type: 'command.executed',
      command: command.constructor.name,
      canUndo: command.canUndo()
    });
  }
  
  protected createCommand<T extends Command>(
    CommandClass: new (...args: any[]) => T,
    ...args: any[]
  ): T {
    return new CommandClass(this.dependencies.canvasManager, ...args);
  }
}
```

### 6. Composition over Inheritance

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
  // Shared drawing logic across all drawing tools
}

class FilterBehavior implements ToolBehavior {
  id = 'filter';
  // Shared filter logic across all filter tools
}

abstract class BaseTool {
  private behaviors: Map<string, ToolBehavior> = new Map();
  
  addBehavior(behavior: ToolBehavior): void {
    this.behaviors.set(behavior.id, behavior);
  }
  
  protected delegateTobehaviors(method: keyof ToolBehavior, ...args: any[]): void {
    for (const behavior of this.behaviors.values()) {
      const fn = behavior[method];
      if (fn) fn(this, ...args);
    }
  }
}
```

### 7. Performance Optimization Patterns

```typescript
abstract class BaseTool {
  // Debounced operations for real-time previews
  private debounceTimers = new Map<string, NodeJS.Timeout>();
  
  protected debouncedOperation(
    key: string, 
    operation: () => void, 
    delay = 16
  ): void {
    if (this.debounceTimers.has(key)) {
      clearTimeout(this.debounceTimers.get(key)!);
    }
    this.debounceTimers.set(key, setTimeout(operation, delay));
  }
  
  // RAF-based updates for smooth interactions
  protected requestUpdate(callback: () => void): void {
    this.dependencies.resourceManager.registerAnimationFrame('update', callback);
  }
  
  // Cached computations
  private computationCache = new Map<string, any>();
  
  protected memoize<T>(key: string, computation: () => T): T {
    if (!this.computationCache.has(key)) {
      this.computationCache.set(key, computation());
    }
    return this.computationCache.get(key);
  }
}
```

### 8. Plugin Architecture for Extensions

```typescript
interface ToolPlugin {
  id: string;
  name: string;
  version: string;
  apply(tool: BaseTool): void;
  remove(tool: BaseTool): void;
  isCompatible(tool: BaseTool): boolean;
}

class PressureSensitivityPlugin implements ToolPlugin {
  id = 'pressure-sensitivity';
  name = 'Pressure Sensitivity';
  version = '1.0.0';
  
  apply(tool: BaseTool): void {
    // Add pressure sensitivity to any compatible tool
    if (this.isCompatible(tool)) {
      tool.addBehavior(new PressureBehavior());
    }
  }
  
  isCompatible(tool: BaseTool): boolean {
    return tool instanceof ObjectDrawingTool;
  }
}

abstract class BaseTool {
  private plugins: Map<string, ToolPlugin> = new Map();
  
  addPlugin(plugin: ToolPlugin): void {
    if (plugin.isCompatible(this)) {
      this.plugins.set(plugin.id, plugin);
      plugin.apply(this);
    }
  }
}
```

## Core Infrastructure Changes

### 1. Enhanced Tool State Machine

```typescript
// lib/editor/canvas/types.ts
export enum ToolState {
  INACTIVE = 'INACTIVE',
  ACTIVATING = 'ACTIVATING', 
  ACTIVE = 'ACTIVE',
  WORKING = 'WORKING',
  DEACTIVATING = 'DEACTIVATING',
  ERROR = 'ERROR'
}

export interface ToolStateTransition {
  from: ToolState;
  to: ToolState;
  timestamp: number;
  reason?: string;
}

export interface ToolWithState extends Tool {
  state: ToolState;
  canvas: CanvasManager | null;
  stateHistory: ToolStateTransition[];
  setState(newState: ToolState, reason?: string): void;
  canTransitionTo(newState: ToolState): boolean;
}
```

### 2. EventToolStore with State Machine

```typescript
// lib/store/tools/EventToolStore.ts
export class EventToolStore extends BaseStore<ToolState> {
  private tools = new Map<string, ToolWithState>();
  private activeToolId: string | null = null;
  private activationQueue: string[] = [];
  
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
    
    // Start activation process
    tool.setState(ToolState.ACTIVATING, 'User activation request');
    
    try {
      // Inject dependencies
      const dependencies = this.serviceContainer.resolveToolDependencies();
      tool.setDependencies(dependencies);
      
      // Activate tool
      await tool.onActivate?.(this.canvasManager);
      
      // Mark as active
      tool.setState(ToolState.ACTIVE, 'Activation completed');
      tool.canvas = this.canvasManager;
      this.activeToolId = toolId;
      
      // Emit activation event
      this.eventBus.emit('tool.activated', { 
        toolId, 
        tool,
        timestamp: Date.now()
      });
      
    } catch (error) {
      tool.setState(ToolState.ERROR, `Activation failed: ${error.message}`);
      throw error;
    }
  }
  
  getActiveTool(): ToolWithState | null {
    if (!this.activeToolId) return null;
    const tool = this.tools.get(this.activeToolId);
    return tool?.state === ToolState.ACTIVE ? tool : null;
  }
  
  private async deactivateCurrentTool(): Promise<void> {
    const currentTool = this.getActiveTool();
    if (!currentTool) return;
    
    currentTool.setState(ToolState.DEACTIVATING, 'Switching to new tool');
    
    try {
      await currentTool.onDeactivate?.(this.canvasManager);
      currentTool.setState(ToolState.INACTIVE, 'Deactivation completed');
      currentTool.canvas = null;
    } catch (error) {
      currentTool.setState(ToolState.ERROR, `Deactivation failed: ${error.message}`);
      throw error;
    }
  }
}
```

### 3. Enhanced BaseTool with All Patterns

```typescript
// lib/editor/tools/base/BaseTool.ts
export abstract class BaseTool<TOptions extends ToolOptions = {}> implements ToolWithState {
  abstract id: string;
  abstract name: string;
  abstract icon: React.ComponentType;
  abstract cursor: string;
  shortcut?: string;
  
  // State machine
  state: ToolState = ToolState.INACTIVE;
  canvas: CanvasManager | null = null;
  stateHistory: ToolStateTransition[] = [];
  
  // Dependencies (injected, not imported)
  protected dependencies!: ToolDependencies;
  
  // Behaviors and plugins
  private behaviors = new Map<string, ToolBehavior>();
  private plugins = new Map<string, ToolPlugin>();
  
  // Performance optimization
  private debounceTimers = new Map<string, NodeJS.Timeout>();
  private computationCache = new Map<string, any>();
  
  // Type-safe options
  protected options: Record<string, any> = {};
  
  constructor(dependencies?: ToolDependencies) {
    if (dependencies) {
      this.setDependencies(dependencies);
    }
  }
  
  // Dependency injection
  setDependencies(dependencies: ToolDependencies): void {
    this.dependencies = dependencies;
    this.initializeOptions();
  }
  
  // State machine implementation
  setState(newState: ToolState, reason?: string): void {
    if (!this.canTransitionTo(newState)) {
      throw new Error(`Invalid state transition from ${this.state} to ${newState}`);
    }
    
    const transition: ToolStateTransition = {
      from: this.state,
      to: newState,
      timestamp: Date.now(),
      reason
    };
    
    this.state = newState;
    this.stateHistory.push(transition);
    
    // Emit state change event
    this.dependencies.eventBus.emit('tool.stateChanged', {
      toolId: this.id,
      transition
    });
  }
  
  canTransitionTo(newState: ToolState): boolean {
    const validTransitions: Record<ToolState, ToolState[]> = {
      [ToolState.INACTIVE]: [ToolState.ACTIVATING],
      [ToolState.ACTIVATING]: [ToolState.ACTIVE, ToolState.ERROR, ToolState.INACTIVE],
      [ToolState.ACTIVE]: [ToolState.WORKING, ToolState.DEACTIVATING, ToolState.ERROR],
      [ToolState.WORKING]: [ToolState.ACTIVE, ToolState.DEACTIVATING, ToolState.ERROR],
      [ToolState.DEACTIVATING]: [ToolState.INACTIVE, ToolState.ERROR],
      [ToolState.ERROR]: [ToolState.INACTIVE]
    };
    
    return validTransitions[this.state]?.includes(newState) ?? false;
  }
  
  // Safe canvas access
  protected getCanvas(): CanvasManager | null {
    if (this.state !== ToolState.ACTIVE && this.state !== ToolState.WORKING) {
      return null;
    }
    return this.canvas;
  }
  
  protected requireCanvas(): CanvasManager {
    const canvas = this.getCanvas();
    if (!canvas) {
      throw new Error(`Tool ${this.id} requires active canvas (current state: ${this.state})`);
    }
    return canvas;
  }
  
  // Event handlers with state guards
  onMouseDown?(event: ToolEvent): void {
    if (this.state !== ToolState.ACTIVE) return;
    this.setState(ToolState.WORKING, 'Mouse interaction started');
    this.delegateTobehaviors('onMouseDown', event);
    this.handleMouseDown(event);
  }
  
  onMouseMove?(event: ToolEvent): void {
    if (this.state !== ToolState.ACTIVE && this.state !== ToolState.WORKING) return;
    this.delegateTobehaviors('onMouseMove', event);
    this.handleMouseMove(event);
  }
  
  onMouseUp?(event: ToolEvent): void {
    if (this.state !== ToolState.WORKING) return;
    this.handleMouseUp(event);
    this.delegateTobehaviors('onMouseUp', event);
    this.setState(ToolState.ACTIVE, 'Mouse interaction completed');
  }
  
  // Abstract methods for subclasses
  protected abstract getOptionDefinitions(): TOptions;
  protected abstract setupTool(): void;
  protected abstract cleanupTool(): void;
  
  // Protected handlers for tool-specific logic
  protected handleMouseDown(event: ToolEvent): void {
    // Override in subclasses
  }
  
  protected handleMouseMove(event: ToolEvent): void {
    // Override in subclasses
  }
  
  protected handleMouseUp(event: ToolEvent): void {
    // Override in subclasses
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
    this.onOptionChange(key, value);
  }
  
  protected onOptionChange(key: keyof TOptions, value: any): void {
    // Override in subclasses
  }
  
  // Command pattern support
  protected executeCommand(command: Command): void {
    this.dependencies.commandManager.execute(command);
    this.emitToolEvent({
      type: 'command.executed',
      command: command.constructor.name,
      canUndo: command.canUndo()
    });
  }
  
  // Behavior composition
  addBehavior(behavior: ToolBehavior): void {
    this.behaviors.set(behavior.id, behavior);
  }
  
  protected delegateTobehaviors(method: keyof ToolBehavior, ...args: any[]): void {
    for (const behavior of this.behaviors.values()) {
      const fn = behavior[method];
      if (fn) fn(this, ...args);
    }
  }
  
  // Plugin system
  addPlugin(plugin: ToolPlugin): void {
    if (plugin.isCompatible(this)) {
      this.plugins.set(plugin.id, plugin);
      plugin.apply(this);
    }
  }
  
  // Performance optimization
  protected debouncedOperation(
    key: string, 
    operation: () => void, 
    delay = 16
  ): void {
    if (this.debounceTimers.has(key)) {
      clearTimeout(this.debounceTimers.get(key)!);
    }
    this.debounceTimers.set(key, setTimeout(operation, delay));
  }
  
  protected memoize<T>(key: string, computation: () => T): T {
    if (!this.computationCache.has(key)) {
      this.computationCache.set(key, computation());
    }
    return this.computationCache.get(key);
  }
  
  // Event emission
  protected emitToolEvent(event: any): void {
    this.dependencies.eventBus.emit('tool.event', {
      toolId: this.id,
      event,
      timestamp: Date.now()
    });
  }
  
  // Lifecycle methods
  async onActivate(canvas: CanvasManager): Promise<void> {
    this.canvas = canvas;
    this.delegateTobehaviors('onActivate');
    this.setupTool();
  }
  
  async onDeactivate(canvas: CanvasManager): Promise<void> {
    this.delegateTobehaviors('onDeactivate');
    this.cleanupTool();
    
    // Cleanup resources
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
    this.computationCache.clear();
    
    this.canvas = null;
  }
}
```

### 4. Service Container Integration

```typescript
// lib/core/ServiceContainer.ts
export class ServiceContainer {
  resolveToolDependencies(): ToolDependencies {
    return {
      eventBus: this.get<TypedEventBus>('eventBus'),
      resourceManager: this.get<ResourceManager>('resourceManager'),
      commandManager: this.get<CommandManager>('commandManager'),
      canvasManager: this.get<CanvasManager>('canvasManager'),
      filterManager: this.get<FilterManager>('filterManager'),
      selectionManager: this.get<SelectionManager>('selectionManager')
    };
  }
}
```

### 5. Tool Factory Implementation

```typescript
// lib/editor/tools/ToolFactory.ts
export class ToolFactory {
  constructor(private serviceContainer: ServiceContainer) {}
  
  createTool<T extends BaseTool>(ToolClass: new (deps: ToolDependencies) => T): T {
    const dependencies = this.serviceContainer.resolveToolDependencies();
    const tool = new ToolClass(dependencies);
    
    // Apply default behaviors based on tool type
    this.applyDefaultBehaviors(tool);
    
    // Apply default plugins
    this.applyDefaultPlugins(tool);
    
    return tool;
  }
  
  private applyDefaultBehaviors(tool: BaseTool): void {
    if (tool instanceof ObjectDrawingTool) {
      tool.addBehavior(new DrawingBehavior());
    }
    if (tool instanceof ObjectWebGLFilterTool) {
      tool.addBehavior(new FilterBehavior());
    }
    if (tool instanceof BaseSelectionTool) {
      tool.addBehavior(new SelectionBehavior());
    }
  }
  
  private applyDefaultPlugins(tool: BaseTool): void {
    // Apply pressure sensitivity to drawing tools
    if (tool instanceof ObjectDrawingTool) {
      tool.addPlugin(new PressureSensitivityPlugin());
    }
    
    // Apply performance monitoring to all tools
    tool.addPlugin(new PerformanceMonitoringPlugin());
  }
}
```

### 6. Behavior Implementations

```typescript
// lib/editor/tools/behaviors/DrawingBehavior.ts
export class DrawingBehavior implements ToolBehavior {
  id = 'drawing';
  
  onMouseDown(tool: BaseTool, event: ToolEvent): void {
    // Shared drawing initialization logic
    tool.emitToolEvent({ type: 'drawing.started', point: event });
  }
  
  onMouseMove(tool: BaseTool, event: ToolEvent): void {
    // Shared drawing continuation logic
    if (tool.state === ToolState.WORKING) {
      tool.debouncedOperation('drawing-preview', () => {
        tool.emitToolEvent({ type: 'drawing.preview', point: event });
      });
    }
  }
  
  onMouseUp(tool: BaseTool, event: ToolEvent): void {
    // Shared drawing completion logic
    tool.emitToolEvent({ type: 'drawing.completed', point: event });
  }
}

// lib/editor/tools/behaviors/FilterBehavior.ts
export class FilterBehavior implements ToolBehavior {
  id = 'filter';
  
  onActivate(tool: BaseTool): void {
    // Setup real-time preview for filter tools
    tool.addBehavior(new RealTimePreviewBehavior());
  }
  
  // Shared filter application logic
}

// lib/editor/tools/behaviors/SelectionBehavior.ts
export class SelectionBehavior implements ToolBehavior {
  id = 'selection';
  
  onMouseDown(tool: BaseTool, event: ToolEvent): void {
    // Shared selection start logic
    tool.emitToolEvent({ type: 'selection.started', point: event });
  }
  
  // Shared selection logic
}
```

## Implementation Plan

### Phase 1: Core Architecture Foundation (Days 1-3)

#### Step 1.1: Domain Model Migration (CRITICAL FIRST STEP)
- [ ] **Migrate Tool Target Terminology**: Update all tools to use Object-based terminology
  - [ ] Replace `selectedLayers` with `selectedObjects` in all tool files
  - [ ] Replace `currentLayer` with `currentObject` references
  - [ ] Update `layerOperations` to `objectOperations` throughout tools
  - [ ] Change `applyToLayer()` methods to `applyToObject()`
  - [ ] Update event names from `tool.layer.*` to `tool.object.*`
- [ ] **Update Tool Event Names**: Migrate all tool-emitted events
  - [ ] `'tool.layer.created'` → `'tool.object.created'`
  - [ ] `'tool.layer.modified'` → `'tool.object.modified'`
  - [ ] `'tool.layer.selected'` → `'tool.object.selected'`
  - [ ] `'tool.layer.deleted'` → `'tool.object.deleted'`
- [ ] **Update Tool Interfaces**: Change tool method signatures
  - [ ] `getSelectedLayers()` → `getSelectedObjects()`
  - [ ] `createLayer()` → `createObject()`
  - [ ] `selectLayers()` → `selectObjects()`

#### Step 1.2: Update Core Types and Interfaces
- [ ] Add `ToolState` enum and interfaces to `lib/editor/canvas/types.ts`
- [ ] Create `ToolDependencies` interface with Object-based services
- [ ] Add `ToolOptions` and `ToolOptionDefinition` interfaces
- [ ] Update `Tool` interface with state machine properties and Object terminology

#### Step 1.3: Implement Service Container Integration
- [ ] Add `resolveToolDependencies()` method to ServiceContainer
- [ ] Update ServiceContainer registration for all tool dependencies (use Object-based services)
- [ ] Add proper lifecycle management for tool dependencies
- [ ] Register `ObjectManager` instead of `LayerManager`
- [ ] Register `ObjectStore` instead of `LayerStore`

#### Step 1.3: Create Tool Factory System
- [ ] Implement `ToolFactory` class with dependency injection
- [ ] Add behavior and plugin application logic
- [ ] Create factory registration system for all tool types

#### Step 1.4: Implement Behavior System
- [ ] Create `ToolBehavior` interface and base implementations
- [ ] Implement `DrawingBehavior`, `FilterBehavior`, `SelectionBehavior`
- [ ] Add behavior composition logic to BaseTool

#### Step 1.5: Implement Plugin Architecture
- [ ] Create `ToolPlugin` interface and base implementations
- [ ] Implement core plugins (PressureSensitivity, PerformanceMonitoring)
- [ ] Add plugin management system to BaseTool

#### Step 1.6: Refactor BaseTool with All Patterns
- [ ] Implement complete state machine with transitions
- [ ] Add dependency injection support
- [ ] Implement type-safe options system
- [ ] Add behavior composition and plugin support
- [ ] Implement performance optimization patterns
- [ ] Add comprehensive event emission

#### Step 1.7: Refactor EventToolStore
- [ ] Implement state machine logic in `activateTool()`
- [ ] Add proper dependency injection for tools
- [ ] Update `getActiveTool()` to check state
- [ ] Add activation queue for concurrent requests
- [ ] Remove setTimeout hack from AppInitializer

#### Step 1.8: Create Event Queue System
- [ ] Implement `EventQueue` class for race condition handling
- [ ] Integrate with Canvas component mouse handlers
- [ ] Add proper cleanup and performance optimization

### Phase 2: Tool Migration with Senior Patterns (Days 4-10)

#### Step 2.1: Core Tools (Priority 1) - Complete Architecture Refactor
**Tools:** frame, move, crop, rotate, flip, resize, hand, zoom

- [ ] **Frame Tool** - `lib/editor/tools/shapes/FrameTool.ts` (FIRST TOOL - Top-Left Position)
  - [ ] **Domain Migration**: Implement as reference Object-based architecture tool
    - [ ] Create `FrameObject` interface extending `CanvasObject`
    - [ ] Implement object-based operations: `createFrameObject()`, `updateFrameObject()`
    - [ ] Use object terminology throughout (no layer references)
  - [ ] **Dependency Injection**: Full constructor injection pattern
  - [ ] **State Machine**: Implement complete tool state management
  - [ ] **Type-Safe Options**: Define comprehensive FrameTool options interface
    ```typescript
    interface FrameToolOptions {
      fill: FillOptions;
      stroke: StrokeOptions;
      effects: EffectOptions;
      presets: PresetOptions;
      behavior: BehaviorOptions;
    }
    ```
  - [ ] **Command Pattern**: CreateFrameCommand, UpdateFrameCommand, CreateBackgroundCommand
  - [ ] **Behavior Composition**: Add FrameBehavior for preset management
  - [ ] **Performance**: Debounced preview updates and cached preset calculations
  - [ ] **Event-Driven**: Frame creation/modification events for UI synchronization
  - [ ] **Plugin Support**: Add document-preset and snap-to-size plugins
  - [ ] **Preset System**: Built-in document presets (A4, Instagram, business cards, etc.)
  - [ ] **Background Creation**: One-click background frame creation workflow
  - [ ] Test frame creation with all preset types and custom dimensions
  - [ ] Test object-based architecture patterns as reference implementation

- [ ] **MoveTool** - `lib/editor/tools/transform/moveTool.ts`
  - [ ] **Dependency Injection**: Replace any singleton imports with constructor injection
  - [ ] **State Machine**: Implement `onMouseMove` → `handleMouseMove` with state guards
  - [ ] **Type-Safe Options**: Define MoveTool options interface with constraints
  - [ ] **Command Pattern**: Convert all canvas modifications to commands
  - [ ] **Behavior Composition**: Add TransformBehavior for shared transform logic
  - [ ] **Performance**: Add debounced smart guides and memoized calculations
  - [ ] **Event-Driven**: Replace direct calls with event emissions
  - [ ] **Plugin Support**: Add snap-to-grid and alignment plugins
  - [ ] Update all canvas access points (12 locations) with null checks
  - [ ] Test tool activation/deactivation with state machine
  - [ ] Test mouse events during activation with event queue

- [ ] **CropTool** - `lib/editor/tools/transform/cropTool.ts`
  - [ ] **Dependency Injection**: Inject CropCommand factory
  - [ ] **State Machine**: Implement handle* methods with WORKING state
  - [ ] **Type-Safe Options**: Define crop constraints and aspect ratios
  - [ ] **Command Pattern**: CropCommand with proper undo/redo
  - [ ] **Behavior Composition**: Add CropBehavior for overlay management
  - [ ] **Performance**: Debounced crop preview updates
  - [ ] **Event-Driven**: Emit crop events for UI updates
  - [ ] **Plugin Support**: Add rule-of-thirds and golden-ratio plugins
  - [ ] Update crop handles and overlay logic (9 `getCanvas()` calls)
  - [ ] Test crop selection and execution with commands

- [ ] **RotateTool** - `lib/editor/tools/transform/rotateTool.ts`
  - [ ] **Dependency Injection**: Inject RotateCommand and angle calculations
  - [ ] **State Machine**: Handle rotation states properly
  - [ ] **Type-Safe Options**: Define rotation constraints and snap angles
  - [ ] **Command Pattern**: RotateCommand with angle preservation
  - [ ] **Behavior Composition**: Add RotationBehavior for handle management
  - [ ] **Performance**: Memoized rotation calculations
  - [ ] **Event-Driven**: Real-time rotation angle events
  - [ ] **Plugin Support**: Add snap-to-angle plugin
  - [ ] Refactor mouse handlers (8 `getCanvas()` calls)
  - [ ] Test rotation with keyboard modifiers and state machine

- [ ] **FlipTool** - `lib/editor/tools/transform/flipTool.ts`
  - [ ] **Dependency Injection**: Inject FlipCommand factory
  - [ ] **State Machine**: Simple activation pattern for instant operations
  - [ ] **Type-Safe Options**: Define flip directions and constraints
  - [ ] **Command Pattern**: FlipCommand with proper state capture
  - [ ] **Behavior Composition**: Add FlipBehavior for preview
  - [ ] **Performance**: Optimized flip operations
  - [ ] **Event-Driven**: Flip completion events
  - [ ] **Plugin Support**: Add batch-flip plugin for multiple objects
  - [ ] Refactor button handlers (5 `getCanvas()` calls)
  - [ ] Test horizontal/vertical flips with commands

- [ ] **ResizeTool** - `lib/editor/tools/transform/resizeTool.ts`
  - [ ] **Dependency Injection**: Inject ResizeCommand and constraint managers
  - [ ] **State Machine**: Handle resize interaction states
  - [ ] **Type-Safe Options**: Define resize constraints and proportions
  - [ ] **Command Pattern**: ResizeCommand with aspect ratio preservation
  - [ ] **Behavior Composition**: Add ResizeBehavior for handle rendering
  - [ ] **Performance**: Debounced resize previews and cached calculations
  - [ ] **Event-Driven**: Real-time size change events
  - [ ] **Plugin Support**: Add smart-resize plugin for content-aware scaling
  - [ ] Refactor mouse handlers (4 `getCanvas()` calls)
  - [ ] Test proportional and free resize with state machine

- [ ] **HandTool** - `lib/editor/tools/transform/handTool.ts`
  - [ ] **Dependency Injection**: Inject viewport management services
  - [ ] **State Machine**: Handle pan interaction states
  - [ ] **Type-Safe Options**: Define pan constraints and momentum
  - [ ] **Command Pattern**: PanCommand for viewport changes (if needed for undo)
  - [ ] **Behavior Composition**: Add PanBehavior for momentum and inertia
  - [ ] **Performance**: RAF-based smooth panning and momentum calculations
  - [ ] **Event-Driven**: Viewport change events for UI synchronization
  - [ ] **Plugin Support**: Add kinetic-scrolling plugin
  - [ ] Refactor pan handlers (4 `getCanvas()` calls)
  - [ ] Test panning and spacebar activation with state machine

- [ ] **ZoomTool** - `lib/editor/tools/transform/zoomTool.ts`
  - [ ] **Dependency Injection**: Inject zoom management services
  - [ ] **State Machine**: Handle zoom interaction states
  - [ ] **Type-Safe Options**: Define zoom constraints and levels
  - [ ] **Command Pattern**: ZoomCommand for viewport changes (if needed)
  - [ ] **Behavior Composition**: Add ZoomBehavior for smooth transitions
  - [ ] **Performance**: Debounced zoom updates and cached zoom levels
  - [ ] **Event-Driven**: Zoom level change events
  - [ ] **Plugin Support**: Add zoom-to-fit and zoom-to-selection plugins
  - [ ] Refactor zoom handlers (9 `getCanvas()` calls)
  - [ ] Test zoom-in/zoom-out and fit modes with state machine

#### Step 2.2: Selection Tools (Priority 2)
**Tools:** marqueeRect, marqueeEllipse, lasso, magicWand, quickSelection

- [ ] **MarqueeRectTool** - `lib/editor/tools/selection/marqueeRectTool.ts`
  - [ ] Refactor selection drawing (1 `getCanvas()` call)
  - [ ] Update selection preview
  - [ ] Test rectangular selections

- [ ] **MarqueeEllipseTool** - `lib/editor/tools/selection/marqueeEllipseTool.ts`
  - [ ] Refactor selection drawing (2 `getCanvas()` calls)
  - [ ] Update ellipse preview
  - [ ] Test circular selections

- [ ] **LassoTool** - `lib/editor/tools/selection/lassoTool.ts`
  - [ ] Refactor path drawing (6 `getCanvas()` calls)
  - [ ] Update path smoothing
  - [ ] Test freehand selections

- [ ] **MagicWandTool** - `lib/editor/tools/selection/magicWandTool.ts`
  - [ ] Refactor pixel sampling (5 `getCanvas()` calls)
  - [ ] Update tolerance algorithms
  - [ ] Test color-based selections

- [ ] **QuickSelectionTool** - `lib/editor/tools/selection/quickSelectionTool.ts`
  - [ ] Refactor brush-based selection
  - [ ] Update edge detection
  - [ ] Test intelligent selections

#### Step 2.3: Drawing Tools (Priority 3)
**Tools:** brush, eraser, gradient

- [ ] **BrushTool** - `lib/editor/tools/drawing/brushTool.ts`
  - [ ] Refactor stroke drawing
  - [ ] Update pressure sensitivity
  - [ ] Test brush dynamics and blending

- [ ] **EraserTool** - `lib/editor/tools/drawing/eraserTool.ts`
  - [ ] Refactor erasing logic
  - [ ] Update eraser modes
  - [ ] Test background vs object erasing

- [ ] **GradientTool** - `lib/editor/tools/drawing/gradientTool.ts`
  - [ ] Refactor gradient creation
  - [ ] Update gradient types
  - [ ] Test linear, radial, and angular gradients

#### Step 2.4: Text Tools (Priority 4)
**Tools:** horizontalType, verticalType, typeMask, typeOnPath

- [ ] **HorizontalTypeTool** - `lib/editor/tools/text/HorizontalTypeTool.ts`
  - [ ] Refactor text creation (3 `getCanvas()` calls)
  - [ ] Update text editing mode
  - [ ] Test text input and formatting

- [ ] **VerticalTypeTool** - `lib/editor/tools/text/VerticalTypeTool.ts`
  - [ ] Refactor vertical text logic (2 `getCanvas()` calls)
  - [ ] Update text orientation
  - [ ] Test vertical text layout

- [ ] **TypeMaskTool** - `lib/editor/tools/text/TypeMaskTool.ts`
  - [ ] Refactor mask creation (2 `getCanvas()` calls)
  - [ ] Update clipping logic
  - [ ] Test text as selection mask

- [ ] **TypeOnPathTool** - `lib/editor/tools/text/TypeOnPathTool.ts`
  - [ ] Refactor path following (2 `getCanvas()` calls)
  - [ ] Update curve calculations
  - [ ] Test text along paths

#### Step 2.5: Adjustment Tools (Priority 5)
**Tools:** brightness, contrast, saturation, hue, exposure

- [ ] **BrightnessTool** - `lib/editor/tools/adjustments/brightnessTool.ts`
  - [ ] Refactor WebGL filter application
  - [ ] Update real-time preview
  - [ ] Test brightness adjustments

- [ ] **ContrastTool** - `lib/editor/tools/adjustments/contrastTool.ts`
  - [ ] Refactor contrast curves
  - [ ] Update histogram preview
  - [ ] Test contrast adjustments

- [ ] **SaturationTool** - `lib/editor/tools/adjustments/saturationTool.ts`
  - [ ] Refactor HSL adjustments
  - [ ] Update color preview
  - [ ] Test saturation changes

- [ ] **HueTool** - `lib/editor/tools/adjustments/hueTool.ts`
  - [ ] Refactor hue shifting
  - [ ] Update color wheel preview
  - [ ] Test hue rotations

- [ ] **ExposureTool** - `lib/editor/tools/adjustments/exposureTool.ts`
  - [ ] Refactor exposure calculations
  - [ ] Update EV stops
  - [ ] Test exposure adjustments

#### Step 2.6: Filter Tools (Priority 6)
**Tools:** blur, sharpen, grayscale, invert, vintageEffects

- [ ] **BlurTool** - `lib/editor/tools/filters/blurTool.ts`
  - [ ] Refactor Gaussian blur
  - [ ] Update radius controls
  - [ ] Test blur effects

- [ ] **SharpenTool** - `lib/editor/tools/filters/sharpenTool.ts`
  - [ ] Refactor unsharp mask
  - [ ] Update sharpening amount
  - [ ] Test sharpening effects

- [ ] **GrayscaleTool** - `lib/editor/tools/filters/grayscaleTool.ts`
  - [ ] Refactor desaturation
  - [ ] Update channel mixing
  - [ ] Test grayscale conversion

- [ ] **InvertTool** - `lib/editor/tools/filters/invertTool.ts`
  - [ ] Refactor color inversion
  - [ ] Update channel inversion
  - [ ] Test color negative effects

- [ ] **VintageEffectsTool** - `lib/editor/tools/filters/vintageEffectsTool.ts`
  - [ ] Refactor vintage filters
  - [ ] Update effect combinations
  - [ ] Test vintage presets

#### Step 2.7: Navigation Tools (Priority 7)
**Tools:** eyedropper

- [ ] **EyedropperTool** - `lib/editor/tools/eyedropperTool.ts`
  - [ ] Refactor color sampling (2 `getCanvas()` calls)
  - [ ] Update color preview
  - [ ] Test color picking

#### Step 2.8: AI-Native Tools (Priority 8)
**Tools:** imageGeneration, variationGrid, aiPromptBrush, styleTransferBrush, smartSelection, magicEraser, promptAdjustment

- [ ] **ImageGenerationTool** - `lib/editor/tools/ai-native/imageGenerationCanvasTool.ts`
  - [ ] Refactor generation placement
  - [ ] Update progress indicators
  - [ ] Test image generation workflow

- [ ] **VariationGridTool** - `lib/editor/tools/ai-native/variationGridTool.ts`
  - [ ] Refactor variation display (1 `getCanvas()` call)
  - [ ] Update grid layout
  - [ ] Test variation selection

- [ ] **AIPromptBrush** - `lib/editor/tools/ai-native/aiPromptBrush.ts`
  - [ ] Refactor brush strokes (1 `getCanvas()` call)
  - [ ] Update prompt application
  - [ ] Test AI-guided painting

- [ ] **StyleTransferBrush** - `lib/editor/tools/ai-native/styleTransferBrush.ts`
  - [ ] Refactor style application
  - [ ] Update style preview
  - [ ] Test style transfer brush

- [ ] **SmartSelectionTool** - `lib/editor/tools/ai-native/smartSelectionTool.ts`
  - [ ] Refactor AI selection
  - [ ] Update edge detection
  - [ ] Test intelligent selections

- [ ] **MagicEraserTool** - `lib/editor/tools/ai-native/magicEraserTool.ts`
  - [ ] Refactor content-aware erasing
  - [ ] Update inpainting logic
  - [ ] Test magic eraser

- [ ] **PromptAdjustmentTool** - `lib/editor/tools/ai-native/promptAdjustmentTool.ts`
  - [ ] Refactor prompt-based adjustments
  - [ ] Update parameter inference
  - [ ] Test AI adjustments

#### Step 2.9: AI Service Tools (Priority 9)
**Tools:** backgroundRemoval, faceEnhancement, inpainting, outpainting, semanticSelection

- [ ] **BackgroundRemovalTool** - `lib/ai/tools/BackgroundRemovalTool.ts`
  - [ ] Refactor background detection
  - [ ] Update masking logic
  - [ ] Test background removal

- [ ] **FaceEnhancementTool** - `lib/ai/tools/FaceEnhancementTool.ts`
  - [ ] Refactor face detection
  - [ ] Update enhancement algorithms
  - [ ] Test face improvements

- [ ] **InpaintingTool** - `lib/ai/tools/InpaintingTool.ts`
  - [ ] Refactor mask-based inpainting
  - [ ] Update content generation
  - [ ] Test object removal/replacement

- [ ] **OutpaintingTool** - `lib/ai/tools/OutpaintingTool.ts`
  - [ ] Refactor canvas extension
  - [ ] Update boundary blending
  - [ ] Test image expansion

- [ ] **SemanticSelectionTool** - `lib/ai/tools/SemanticSelectionTool.ts`
  - [ ] Refactor object recognition
  - [ ] Update selection accuracy
  - [ ] Test semantic selections

### Phase 3: Integration & Testing (Days 8-10)

#### Step 3.1: Canvas Component Updates
- [ ] Update mouse event handlers to use EventQueue
- [ ] Remove race condition workarounds
- [ ] Test tool switching during mouse events
- [ ] Test rapid tool activation/deactivation

#### Step 3.2: AppInitializer Cleanup
- [ ] Remove setTimeout hack for tool activation
- [ ] Add proper canvas readiness detection
- [ ] Test initialization order
- [ ] Verify all tools are registered correctly

#### Step 3.3: Integration Testing
- [ ] Test all 50+ tools for race conditions
- [ ] Test tool switching during active operations
- [ ] Test mouse events during tool activation
- [ ] Test keyboard shortcuts and tool activation
- [ ] Test AI tool execution with proper activation

#### Step 3.4: Performance Testing
- [ ] Measure tool activation times
- [ ] Test EventQueue performance with rapid events
- [ ] Verify no memory leaks in state machine
- [ ] Test with high-frequency mouse events

## Testing Checklist

### Per-Tool Testing
For each tool, verify:
- [ ] No "Tool X is not active" errors
- [ ] Tool activates properly when selected
- [ ] Mouse events work correctly during activation
- [ ] Tool deactivates cleanly when switching
- [ ] All tool-specific functionality works
- [ ] No performance regressions

### Integration Testing
- [ ] Rapid tool switching works
- [ ] Mouse events during activation are queued properly
- [ ] Keyboard shortcuts activate tools correctly
- [ ] AI tool execution works with state machine
- [ ] Canvas operations work across all tools
- [ ] No race conditions in any scenario

### Regression Testing
- [ ] All existing functionality preserved
- [ ] No breaking changes in tool APIs
- [ ] Performance is same or better
- [ ] Memory usage is stable
- [ ] Error handling is improved

## Success Criteria

### Primary Goals (Race Condition Fix)
- ✅ Zero "Tool X is not active" errors
- ✅ All 50+ tools work reliably during activation
- ✅ No race conditions in tool activation/deactivation
- ✅ Proper event queuing during state transitions

### Secondary Goals (Senior Architecture)
- ✅ 100% dependency injection compliance (zero singleton imports)
- ✅ Complete event-driven communication (no direct method calls)
- ✅ Type-safe options system across all tools
- ✅ Command pattern for all canvas modifications
- ✅ Behavior composition reducing code duplication by 60%+
- ✅ Plugin architecture enabling easy extensibility
- ✅ Performance optimizations (debouncing, memoization, RAF)
- ✅ Comprehensive error handling and state management

### Code Quality Goals
- ✅ Zero technical debt in tool architecture
- ✅ Consistent patterns across all 50+ tools
- ✅ Self-documenting code with clear interfaces
- ✅ 100% test coverage for state machine logic
- ✅ Performance benchmarks met or improved
- ✅ Memory usage stable or reduced

### Developer Experience Goals
- ✅ Easy to add new tools following established patterns
- ✅ Clear separation of concerns and responsibilities
- ✅ Predictable behavior and debugging capabilities
- ✅ Comprehensive documentation and examples
- ✅ Hot-reload friendly architecture

## Risk Mitigation

### High-Risk Changes
1. **BaseTool complete refactor** - Affects all 50+ tools
   - **Mitigation**: 
     - Implement new BaseTool alongside existing (parallel development)
     - Tool-by-tool migration with feature flags
     - Comprehensive unit tests for state machine
     - Integration tests for each migrated tool
     - Performance benchmarking at each step

2. **EventToolStore state machine** - Core activation system
   - **Mitigation**:
     - Feature flag for new activation system
     - Fallback to old system if issues detected
     - Extensive testing with rapid tool switching
     - Load testing with high-frequency events
     - User acceptance testing for responsiveness

3. **Dependency injection refactor** - Changes construction patterns
   - **Mitigation**:
     - ServiceContainer backwards compatibility
     - Gradual migration of tool dependencies
     - Factory pattern for smooth transition
     - Comprehensive DI container testing

4. **Canvas event handling** - Critical user interaction path
   - **Mitigation**:
     - EventQueue with fallback to direct handling
     - Performance monitoring for event processing
     - User testing for interaction responsiveness
     - Rollback capability for event system

### Medium-Risk Changes
1. **Behavior composition system** - New architecture pattern
2. **Plugin architecture** - Additional complexity
3. **Type-safe options** - Breaking changes to option APIs

### Rollback Plan
- **Immediate Rollback**: Feature flags for all major systems
- **Tool-Level Rollback**: Individual tool reversion capability
- **System-Level Rollback**: Complete architecture rollback
- **Partial Rollback**: Mix old and new systems during transition
- **Git Strategy**: Maintain working branches for each phase

### Monitoring and Validation
- **Performance Monitoring**: Tool activation times, memory usage, event processing
- **Error Tracking**: State machine violations, dependency injection failures
- **User Experience**: Interaction responsiveness, tool switching smoothness
- **Code Quality**: Test coverage, type safety, architectural compliance

## Progress Tracking

### Phase 1: Core Architecture Foundation (Days 1-3)
**Progress:** 0/8 steps complete (0%)
- [ ] Core types and interfaces (0%)
- [ ] Service container integration (0%)
- [ ] Tool factory system (0%)
- [ ] Behavior system (0%)
- [ ] Plugin architecture (0%)
- [ ] BaseTool refactor (0%)
- [ ] EventToolStore refactor (0%)
- [ ] Event queue system (0%)

### Phase 2: Tool Migration with Senior Patterns (Days 4-10)
**Progress:** 0/46 tools migrated (0%)
- **Core Tools (8):** 0/8 complete (0%)
- **Selection Tools (5):** 0/5 complete (0%)
- **Drawing Tools (3):** 0/3 complete (0%)
- **Text Tools (4):** 0/4 complete (0%)
- **Adjustment Tools (5):** 0/5 complete (0%)
- **Filter Tools (5):** 0/5 complete (0%)
- **Navigation Tools (1):** 0/1 complete (0%)
- **AI-Native Tools (7):** 0/7 complete (0%)
- **AI Service Tools (5):** 0/5 complete (0%)
- **Legacy Tools (3):** 0/3 complete (0%)

### Phase 3: Integration & Validation (Days 11-14)
**Progress:** 0/6 steps complete (0%)
- [ ] Canvas component integration (0%)
- [ ] AppInitializer cleanup (0%)
- [ ] Comprehensive testing (0%)
- [ ] Performance validation (0%)
- [ ] Documentation updates (0%)
- [ ] Final validation (0%)

### Overall Progress Metrics
- **Total Items:** 60 major items
- **Completed:** 0/60 (0%)
- **In Progress:** 0/60 (0%)
- **Blocked:** 0/60 (0%)

### Quality Gates
- [ ] **Gate 1:** Core architecture compiles and passes basic tests
- [ ] **Gate 2:** First 5 tools migrated and fully functional
- [ ] **Gate 3:** All core tools (including Frame Tool) working with new architecture
- [ ] **Gate 4:** All tools migrated and race condition eliminated
- [ ] **Gate 5:** Performance benchmarks met or exceeded
- [ ] **Gate 6:** Full integration testing passed
- [ ] **Gate 7:** User acceptance testing completed

### Success Metrics
- **Race Condition Elimination:** 0 "Tool X is not active" errors in 1000 rapid tool switches
- **Performance:** Tool activation time < 16ms (60 FPS), memory usage stable
- **Code Quality:** 100% TypeScript coverage, 0 any types, 0 singleton imports
- **Maintainability:** New tool creation time reduced by 50%
- **Extensibility:** Plugin system functional with 3+ example plugins

---

*Last Updated: [Date]*
*Next Review: [Date]* 