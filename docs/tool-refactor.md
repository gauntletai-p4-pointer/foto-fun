# Tool Architecture Refactor: Senior Patterns + Error Fixes

## Executive Summary

**Primary Goal:** Fix 169 TypeScript errors while implementing senior-level architectural patterns that solve real tool problems.

**Core Issues:** Race conditions in tool activation, inconsistent patterns across 50+ tools, singleton dependencies, and architectural debt.

**Solution:** Implement state machine, dependency injection, event-driven communication, and command pattern with proper interfaces - focusing on patterns that solve actual problems.

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

## 🎯 **Current Issues to Fix**

### **1. TypeScript Errors (169 total)**
- **Command Return Types**: All commands need `CommandResult<void>` returns
- **Command Context Usage**: Commands receiving wrong constructor parameters
- **Event Emission Issues**: Missing timestamps and property mismatches
- **Object-Based Migration**: Remove remaining layer references
- **Dependency Injection**: Missing canvas dependencies in filters
- **Type Safety**: Various type mismatches and unsafe assumptions

### **2. Race Condition Problem**
**Root Cause**: Mouse events fire before `tool.onActivate()` completes
**Current Error**: "Tool X is not active" when users click during activation
**Impact**: Affects all 50+ tools, poor user experience

### **3. Architectural Debt**
- **Singleton Imports**: Direct imports instead of dependency injection
- **Inconsistent Patterns**: Each tool implements activation differently
- **Mixed Responsibilities**: Tools handle their own state management
- **No Event Coordination**: Direct method calls instead of events

## 🏗️ **Senior Architecture Solution**

### **1. Tool State Machine**
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

### **2. Dependency Injection Pattern**
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

### **3. Enhanced BaseTool Architecture**
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
      transition
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

### **4. Event-Driven Tool Store**
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

### **5. Shared Tool Behaviors**
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

### **6. Type-Safe Tool Options**
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

### **Phase 1: Core Architecture (Days 1-2)**
- [ ] **Fix Command Return Types**: Update all commands to return `CommandResult<void>`
- [ ] **Fix Command Context**: Ensure commands receive proper `CommandContext` parameters
- [ ] **Update BaseTool**: Implement state machine and dependency injection
- [ ] **Update EventToolStore**: Add proper activation logic with state management
- [ ] **Create ToolFactory**: Implement dependency injection factory

### **Phase 2: Event System (Days 3-4)**
- [ ] **Fix Event Emissions**: Add missing timestamps and fix property mismatches
- [ ] **Implement Event Queue**: Add event queuing during tool activation
- [ ] **Update Canvas Component**: Integrate with event queue system
- [ ] **Add Tool Behaviors**: Create shared behaviors for common patterns

### **Phase 3: Tool Migration (Days 5-10)**
- [ ] **Core Tools**: Migrate frame, move, crop, rotate tools (Priority 1)
- [ ] **Drawing Tools**: Migrate brush, eraser, gradient tools (Priority 2)
- [ ] **Selection Tools**: Migrate marquee, lasso, magic wand tools (Priority 3)
- [ ] **Filter Tools**: Migrate blur, sharpen, adjustment tools (Priority 4)
- [ ] **AI Tools**: Migrate AI-native tools (Priority 5)

### **Phase 4: Object Migration (Days 11-12)**
- [ ] **Find/Replace Layer References**: Update all layer terminology to object
- [ ] **Update Event Names**: Change event names from layer.* to object.*
- [ ] **Fix Type Definitions**: Update interfaces and types
- [ ] **Update Documentation**: Ensure all docs use object terminology

### **Phase 5: Dependency Injection (Days 13-14)**
- [ ] **Remove Singleton Imports**: Replace with constructor injection
- [ ] **Fix Missing Dependencies**: Add canvas dependencies to filters
- [ ] **Update Service Container**: Add tool dependency resolution
- [ ] **Fix Type Safety**: Remove 'any' types and unsafe assumptions

## 🎯 **Success Criteria**

### **Primary Goals**
- ✅ **Zero TypeScript Errors**: All 169 errors fixed
- ✅ **No Race Conditions**: "Tool X is not active" errors eliminated
- ✅ **Consistent Patterns**: All tools follow same architecture
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

This architecture provides senior-level patterns that solve real problems while maintaining clean, maintainable code that follows consistent patterns across all tools. 