# FotoFun: Foundation Architecture Document

## 🏗️ Core Architectural Principles

This document establishes the foundational patterns that ALL agents must follow when implementing tools and adapters. These patterns ensure consistency, maintainability, and senior-level architecture throughout the codebase.

## 🎯 Foundation Overview

### Key Principles
1. **Dependency Injection (DI)** - No singletons, no direct instantiation
2. **Event-Driven Architecture** - All communication through TypedEventBus
3. **Command Pattern** - All state changes through commands
4. **Registry/Factory Pattern** - Consistent object creation
5. **Type Safety** - 100% TypeScript strict mode
6. **Zero Technical Debt** - Clean, maintainable code from the start

### Critical Rules
- ✅ **ALWAYS** use constructor injection for dependencies
- ✅ **ALWAYS** emit events for cross-component communication
- ✅ **ALWAYS** use commands for state mutations
- ✅ **ALWAYS** register services in ServiceContainer
- ❌ **NEVER** use singleton patterns (`getInstance()`)
- ❌ **NEVER** call methods directly between components
- ❌ **NEVER** mutate state without commands
- ❌ **NEVER** use `any` types

## 📦 Service Container Architecture

### Core Service Registration Pattern

```typescript
// lib/core/ServiceContainer.ts
export interface ServiceRegistration {
  factory: (container: ServiceContainer) => any | Promise<any>;
  dependencies?: string[];
  lifecycle?: 'singleton' | 'transient' | 'scoped';
  phase?: 'core' | 'infrastructure' | 'application';
}

// Registration in AppInitializer.ts
container.registerSingleton('ServiceName', (container) => {
  return new ServiceClass(
    container.getSync('Dependency1'),
    container.getSync('Dependency2'),
    container.getSync('Dependency3')
  );
}, {
  dependencies: ['Dependency1', 'Dependency2', 'Dependency3'],
  phase: 'infrastructure'
});
```

### Service Lifecycle Phases

1. **Core Phase** - Fundamental services (EventBus, ServiceContainer)
2. **Infrastructure Phase** - Canvas, Store, Command services
3. **Application Phase** - Tools, Adapters, UI services

### Dependency Resolution Pattern

```typescript
// Synchronous resolution (for constructor injection)
const service = container.getSync<ServiceType>('ServiceName');

// Asynchronous resolution (for lazy loading)
const service = await container.get<ServiceType>('ServiceName');

// Batch resolution
const [service1, service2] = await container.getMany(['Service1', 'Service2']);
```

## 🛠️ Tool Architecture Foundation

### BaseTool Pattern

```typescript
// lib/editor/tools/base/BaseTool.ts
export abstract class BaseTool<TOptions extends ToolOptions = {}> {
  protected readonly id: string;
  protected readonly instanceId: string;
  protected readonly dependencies: ToolDependencies;
  protected state: ToolState = ToolState.INACTIVE;
  
  constructor(id: string, dependencies: ToolDependencies) {
    this.id = id;
    this.instanceId = `${id}-${Date.now()}-${Math.random()}`;
    this.dependencies = dependencies;
  }
  
  // Lifecycle methods - MUST be implemented
  abstract onActivate(canvas: CanvasManager): Promise<void>;
  abstract onDeactivate(canvas: CanvasManager): Promise<void>;
  
  // Event handlers - Override as needed
  onMouseDown?(event: ToolEvent): void;
  onMouseMove?(event: ToolEvent): void;
  onMouseUp?(event: ToolEvent): void;
  onKeyDown?(event: KeyboardEvent): void;
  onKeyUp?(event: KeyboardEvent): void;
  
  // State management
  protected setState(newState: ToolState): void {
    const oldState = this.state;
    this.state = newState;
    this.dependencies.eventBus.emit('tool.state.changed', {
      toolId: this.id,
      instanceId: this.instanceId,
      oldState,
      newState,
      timestamp: Date.now()
    });
  }
  
  // Resource cleanup
  protected registerCleanup(cleanup: () => void | Promise<void>): void {
    this.cleanupFunctions.push(cleanup);
  }
}
```

### Tool Dependencies Interface

```typescript
export interface ToolDependencies {
  eventBus: TypedEventBus;
  canvasManager: CanvasManager;
  commandManager: CommandManager;
  selectionManager: SelectionManager;
  objectManager: ObjectManager;
  toolOptionsStore: ToolOptionsStore;
  resourceManager: ResourceManager;
  historyManager: HistoryManager;
}
```

### Tool State Machine

```typescript
export enum ToolState {
  INACTIVE = 'INACTIVE',           // Tool not selected
  ACTIVATING = 'ACTIVATING',       // Tool initializing
  ACTIVE = 'ACTIVE',               // Tool ready for input
  WORKING = 'WORKING',             // Tool processing
  DEACTIVATING = 'DEACTIVATING'    // Tool cleaning up
}

// State transitions MUST follow this flow:
// INACTIVE → ACTIVATING → ACTIVE ↔ WORKING → DEACTIVATING → INACTIVE
```

## 🏭 Factory Pattern Implementation

### Tool Factory

```typescript
// lib/editor/tools/base/ToolFactory.ts
export class ToolFactory {
  constructor(private serviceContainer: ServiceContainer) {}
  
  createTool<T extends BaseTool>(
    ToolClass: new (id: string, deps: ToolDependencies) => T,
    id: string
  ): T {
    const dependencies: ToolDependencies = {
      eventBus: this.serviceContainer.getSync('TypedEventBus'),
      canvasManager: this.serviceContainer.getSync('CanvasManager'),
      commandManager: this.serviceContainer.getSync('CommandManager'),
      selectionManager: this.serviceContainer.getSync('SelectionManager'),
      objectManager: this.serviceContainer.getSync('ObjectManager'),
      toolOptionsStore: this.serviceContainer.getSync('ToolOptionsStore'),
      resourceManager: this.serviceContainer.getSync('ResourceManager'),
      historyManager: this.serviceContainer.getSync('HistoryManager')
    };
    
    return new ToolClass(id, dependencies);
  }
}
```

### Adapter Factory

```typescript
// lib/ai/adapters/base/AdapterFactory.ts
export class AdapterFactory {
  constructor(private serviceContainer: ServiceContainer) {}
  
  createAdapter<T extends UnifiedToolAdapter>(
    AdapterClass: new (deps: AdapterDependencies) => T
  ): T {
    const dependencies: AdapterDependencies = {
      eventBus: this.serviceContainer.getSync('TypedEventBus'),
      canvasManager: this.serviceContainer.getSync('CanvasManager'),
      commandManager: this.serviceContainer.getSync('CommandManager'),
      toolStore: this.serviceContainer.getSync('EventToolStore'),
      parameterConverter: this.serviceContainer.getSync('ParameterConverter'),
      aiClient: this.serviceContainer.getSync('AIClient'),
      contextBuilder: this.serviceContainer.getSync('CanvasContextBuilder')
    };
    
    return new AdapterClass(dependencies);
  }
}
```

## 📋 Registry Pattern Implementation

### Tool Registry

```typescript
// lib/editor/tools/base/ToolRegistry.ts
export class ToolRegistry {
  private toolClasses = new Map<string, ToolRegistration>();
  private toolGroups = new Map<string, ToolGroupMetadata>();
  
  registerTool(registration: ToolRegistration): void {
    // Validate tool class
    if (!registration.toolClass.prototype.onActivate) {
      throw new Error(`Tool ${registration.id} must implement onActivate`);
    }
    
    this.toolClasses.set(registration.id, registration);
    
    // Emit registration event
    this.eventBus.emit('registry.tool.registered', {
      toolId: registration.id,
      metadata: registration.metadata
    });
  }
  
  getToolClass(id: string): ToolRegistration | null {
    return this.toolClasses.get(id) || null;
  }
}
```

### Adapter Registry

```typescript
// lib/ai/adapters/base/AdapterRegistry.ts
export class AdapterRegistry {
  private adapters = new Map<string, UnifiedToolAdapter>();
  private adapterFactory: AdapterFactory;
  
  constructor(private serviceContainer: ServiceContainer) {
    this.adapterFactory = this.serviceContainer.getSync('AdapterFactory');
  }
  
  registerAdapter<T extends UnifiedToolAdapter>(
    AdapterClass: new (deps: AdapterDependencies) => T
  ): void {
    const adapter = this.adapterFactory.createAdapter(AdapterClass);
    
    // Validate adapter
    if (!adapter.aiName || !adapter.toolId) {
      throw new Error('Adapter must have aiName and toolId');
    }
    
    this.adapters.set(adapter.aiName, adapter);
    
    // Emit registration event
    this.eventBus.emit('registry.adapter.registered', {
      aiName: adapter.aiName,
      toolId: adapter.toolId
    });
  }
}
```

## 🎭 Event System Patterns

### Event Definition Pattern

```typescript
// lib/events/core/EventRegistry.ts
export interface EventRegistry {
  // Tool events
  'tool.activated': { toolId: string; instanceId: string; timestamp: number };
  'tool.deactivated': { toolId: string; instanceId: string; timestamp: number };
  'tool.state.changed': { 
    toolId: string; 
    instanceId: string; 
    oldState: ToolState; 
    newState: ToolState; 
    timestamp: number 
  };
  
  // Canvas events
  'canvas.object.created': { objectId: string; object: CanvasObject; timestamp: number };
  'canvas.object.modified': { objectId: string; changes: Partial<CanvasObject>; timestamp: number };
  'canvas.object.deleted': { objectId: string; timestamp: number };
  
  // Command events
  'command.executed': { commandId: string; commandType: string; timestamp: number };
  'command.undone': { commandId: string; timestamp: number };
  'command.redone': { commandId: string; timestamp: number };
}
```

### Event Emission Pattern

```typescript
// Always include full context
this.eventBus.emit('canvas.object.created', {
  objectId: newObject.id,
  object: newObject,
  timestamp: Date.now()
});

// Never emit without required data
// ❌ WRONG: this.eventBus.emit('canvas.object.created', { objectId });
// ✅ RIGHT: Include all required fields
```

### Event Subscription Pattern

```typescript
// Subscribe with proper typing
const unsubscribe = this.eventBus.on('canvas.object.created', (data) => {
  // data is fully typed based on EventRegistry
  console.log(`Object created: ${data.objectId}`);
});

// Always clean up subscriptions
this.registerCleanup(unsubscribe);
```

## 📝 Command Pattern Implementation

### Base Command Pattern

```typescript
// lib/editor/commands/base/Command.ts
export abstract class Command {
  readonly id: string = `cmd-${Date.now()}-${Math.random()}`;
  readonly timestamp: number = Date.now();
  
  abstract execute(): Promise<void>;
  abstract undo(): Promise<void>;
  abstract canUndo(): boolean;
  abstract getDescription(): string;
  
  // Optional methods
  canExecute?(): boolean;
  merge?(other: Command): boolean;
}
```

### Command Implementation Pattern

```typescript
export class CreateObjectCommand extends Command {
  private objectId?: string;
  
  constructor(
    private canvasManager: CanvasManager,
    private objectData: Partial<CanvasObject>
  ) {
    super();
  }
  
  async execute(): Promise<void> {
    // Create object
    this.objectId = await this.canvasManager.addObject(this.objectData);
    
    // Emit event
    this.canvasManager.eventBus.emit('command.executed', {
      commandId: this.id,
      commandType: 'CreateObject',
      timestamp: Date.now()
    });
  }
  
  async undo(): Promise<void> {
    if (!this.objectId) throw new Error('Cannot undo - no object created');
    
    await this.canvasManager.removeObject(this.objectId);
    
    this.canvasManager.eventBus.emit('command.undone', {
      commandId: this.id,
      timestamp: Date.now()
    });
  }
  
  canUndo(): boolean {
    return !!this.objectId;
  }
  
  getDescription(): string {
    return `Create ${this.objectData.type} object`;
  }
}
```

## 🔌 Adapter Pattern Foundation

### UnifiedToolAdapter Base

```typescript
// lib/ai/adapters/base/UnifiedToolAdapter.ts
export abstract class UnifiedToolAdapter<TInput = any, TOutput = any> {
  abstract readonly toolId: string;      // Canvas tool ID
  abstract readonly aiName: string;      // AI function name
  abstract readonly description: string; // AI context description
  abstract readonly inputSchema: z.ZodType<TInput>;
  
  constructor(protected dependencies: AdapterDependencies) {}
  
  // Core execution method
  abstract execute(params: TInput, context: CanvasContext): Promise<TOutput>;
  
  // Validation helper
  protected validateInput(params: unknown): TInput {
    const result = this.inputSchema.safeParse(params);
    if (!result.success) {
      throw new ValidationError('Invalid input parameters', result.error);
    }
    return result.data;
  }
  
  // Context helpers
  protected requireSelection(context: CanvasContext): CanvasObject[] {
    if (context.targetObjects.length === 0) {
      throw new SelectionRequiredError('Please select objects first');
    }
    return context.targetObjects;
  }
  
  // Command execution helper
  protected async executeCommand(command: Command): Promise<void> {
    await this.dependencies.commandManager.execute(command);
  }
}
```

### Adapter Dependencies

```typescript
export interface AdapterDependencies {
  eventBus: TypedEventBus;
  canvasManager: CanvasManager;
  commandManager: CommandManager;
  toolStore: EventToolStore;
  parameterConverter: ParameterConverter;
  aiClient: AIClient;
  contextBuilder: CanvasContextBuilder;
}
```

## 🎯 Canvas Context Pattern

### Context Building

```typescript
// lib/ai/context/CanvasContextBuilder.ts
export class CanvasContextBuilder {
  constructor(
    private canvasManager: CanvasManager,
    private selectionManager: SelectionManager
  ) {}
  
  async buildContext(): Promise<CanvasContext> {
    const selection = this.selectionManager.getSelection();
    const allObjects = this.canvasManager.getAllObjects();
    
    return {
      canvas: this.canvasManager,
      targetObjects: this.determineTargets(selection, allObjects),
      targetingMode: this.determineTargetingMode(selection),
      dimensions: this.canvasManager.getDimensions(),
      hasContent: allObjects.length > 0,
      objectCount: allObjects.length,
      pixelSelection: selection.pixelSelection,
      screenshot: await this.canvasManager.captureScreenshot()
    };
  }
  
  private determineTargets(
    selection: Selection,
    allObjects: CanvasObject[]
  ): CanvasObject[] {
    if (selection.objectIds.length > 0) {
      return allObjects.filter(obj => selection.objectIds.includes(obj.id));
    }
    
    // No selection - use all objects if only one exists
    if (allObjects.length === 1) {
      return allObjects;
    }
    
    return [];
  }
  
  private determineTargetingMode(selection: Selection): TargetingMode {
    if (selection.objectIds.length > 0) return 'selected';
    return 'all';
  }
}
```

## 🧪 Testing Patterns

### Tool Testing Pattern

```typescript
describe('FrameTool', () => {
  let tool: FrameTool;
  let mockDependencies: ToolDependencies;
  
  beforeEach(() => {
    mockDependencies = createMockToolDependencies();
    tool = new FrameTool('frame', mockDependencies);
  });
  
  describe('activation', () => {
    it('should transition to ACTIVE state', async () => {
      await tool.onActivate(mockDependencies.canvasManager);
      
      expect(tool.getState()).toBe(ToolState.ACTIVE);
      expect(mockDependencies.eventBus.emit).toHaveBeenCalledWith(
        'tool.state.changed',
        expect.objectContaining({
          toolId: 'frame',
          newState: ToolState.ACTIVE
        })
      );
    });
  });
  
  describe('mouse interaction', () => {
    it('should create frame on drag', async () => {
      await tool.onActivate(mockDependencies.canvasManager);
      
      const startEvent = createMockToolEvent({ x: 100, y: 100 });
      const endEvent = createMockToolEvent({ x: 300, y: 200 });
      
      tool.onMouseDown(startEvent);
      tool.onMouseMove(endEvent);
      tool.onMouseUp(endEvent);
      
      expect(mockDependencies.commandManager.execute).toHaveBeenCalledWith(
        expect.any(CreateObjectCommand)
      );
    });
  });
});
```

### Adapter Testing Pattern

```typescript
describe('BrightnessAdapter', () => {
  let adapter: BrightnessAdapter;
  let mockDependencies: AdapterDependencies;
  let mockContext: CanvasContext;
  
  beforeEach(() => {
    mockDependencies = createMockAdapterDependencies();
    adapter = new BrightnessAdapter(mockDependencies);
    mockContext = createMockCanvasContext();
  });
  
  describe('execute', () => {
    it('should adjust brightness of selected images', async () => {
      const params = { adjustment: 20 };
      const imageObject = createMockImageObject();
      mockContext.targetObjects = [imageObject];
      
      await adapter.execute(params, mockContext);
      
      expect(mockDependencies.toolStore.activateTool)
        .toHaveBeenCalledWith('brightness');
      expect(mockDependencies.commandManager.execute)
        .toHaveBeenCalledWith(expect.any(BrightnessCommand));
    });
    
    it('should throw error when no images selected', async () => {
      mockContext.targetObjects = [];
      
      await expect(adapter.execute({ adjustment: 20 }, mockContext))
        .rejects.toThrow(SelectionRequiredError);
    });
  });
});
```

## 📊 Performance Patterns

### Memory Management

```typescript
// Always clean up resources
protected registerCleanup(cleanup: () => void | Promise<void>): void {
  this.cleanupFunctions.push(cleanup);
}

// Example usage
const subscription = this.eventBus.on('event', handler);
this.registerCleanup(() => subscription.unsubscribe());

const interval = setInterval(update, 1000);
this.registerCleanup(() => clearInterval(interval));
```

### Event Batching

```typescript
// Batch multiple operations
export class BatchCommand extends Command {
  constructor(private commands: Command[]) {
    super();
  }
  
  async execute(): Promise<void> {
    // Execute all commands
    for (const command of this.commands) {
      await command.execute();
    }
    
    // Emit single batch event
    this.eventBus.emit('command.batch.executed', {
      commandId: this.id,
      commandCount: this.commands.length,
      timestamp: Date.now()
    });
  }
}
```

## 🚨 Common Pitfalls to Avoid

### ❌ Direct Instantiation
```typescript
// WRONG - Never instantiate directly
const tool = new FrameTool();

// RIGHT - Always use factory
const tool = this.toolFactory.createTool(FrameTool, 'frame');
```

### ❌ Direct Method Calls
```typescript
// WRONG - Never call methods directly
this.canvasManager.refreshUI();

// RIGHT - Always emit events
this.eventBus.emit('canvas.refresh.requested', { timestamp: Date.now() });
```

### ❌ State Mutation Without Commands
```typescript
// WRONG - Never mutate state directly
this.objects.push(newObject);

// RIGHT - Always use commands
await this.commandManager.execute(new CreateObjectCommand(objectData));
```

### ❌ Missing Cleanup
```typescript
// WRONG - Memory leak
this.eventBus.on('event', handler);

// RIGHT - Register cleanup
const unsubscribe = this.eventBus.on('event', handler);
this.registerCleanup(unsubscribe);
```

## 🎯 Implementation Checklist

When implementing any tool or adapter, ensure:

- [ ] Uses constructor injection for all dependencies
- [ ] Extends appropriate base class (BaseTool or UnifiedToolAdapter)
- [ ] Implements all required abstract methods
- [ ] Uses event emission for cross-component communication
- [ ] Uses commands for all state changes
- [ ] Registers all event subscriptions for cleanup
- [ ] Includes comprehensive error handling
- [ ] Has full TypeScript typing (no `any`)
- [ ] Follows state machine transitions
- [ ] Includes unit tests

## 📚 Quick Reference

### Service Resolution
```typescript
const service = container.getSync<ServiceType>('ServiceName');
```

### Event Emission
```typescript
this.eventBus.emit('event.name', { required: 'data' });
```

### Command Execution
```typescript
await this.commandManager.execute(new CommandClass(params));
```

### Tool Activation
```typescript
await this.toolStore.activateTool('tool-id');
```

### Adapter Execution
```typescript
const adapter = this.adapterRegistry.getAdapter('aiName');
await adapter.execute(params, context);
```

---

This foundation document provides the core patterns that ensure our codebase maintains senior-level architecture throughout. All agents must follow these patterns to ensure consistency and maintainability.