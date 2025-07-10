# Architectural Improvements for FotoFun

## Overview

This document outlines major architectural improvements to make the system more robust, maintainable, and senior-level.

## 1. Store Architecture Improvements

### Current Issues
- Stores are tightly coupled to Fabric.js
- No proper state synchronization between stores
- Missing reactive patterns for complex state

### Proposed Solution: Event-Driven Store Architecture

```typescript
// Base Store with Event Sourcing
abstract class BaseStore<TState> {
  private state: TState
  private eventStore: EventStore
  private listeners: Set<(state: TState) => void> = new Set()
  
  constructor(initialState: TState, eventStore: EventStore) {
    this.state = initialState
    this.eventStore = eventStore
    this.subscribeToEvents()
  }
  
  protected abstract getEventHandlers(): Map<string, (event: Event) => void>
  
  private subscribeToEvents(): void {
    const handlers = this.getEventHandlers()
    handlers.forEach((handler, eventType) => {
      this.eventStore.subscribe(eventType, (event) => {
        handler(event)
        this.notifyListeners()
      })
    })
  }
  
  subscribe(listener: (state: TState) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
  
  protected setState(updater: (state: TState) => TState): void {
    this.state = updater(this.state)
    this.notifyListeners()
  }
  
  getState(): TState {
    return this.state
  }
}

// Example: New Canvas Store
class CanvasStore extends BaseStore<CanvasStoreState> {
  protected getEventHandlers() {
    return new Map([
      ['ObjectAddedEvent', this.handleObjectAdded.bind(this)],
      ['ObjectRemovedEvent', this.handleObjectRemoved.bind(this)],
      ['LayerCreatedEvent', this.handleLayerCreated.bind(this)],
      // ... more handlers
    ])
  }
  
  private handleObjectAdded(event: ObjectAddedEvent): void {
    this.setState(state => ({
      ...state,
      objects: [...state.objects, event.object],
      lastModified: Date.now()
    }))
  }
}
```

### Benefits
- Single source of truth through events
- Automatic state synchronization
- Time-travel debugging capability
- Testable state transitions

## 2. Dependency Injection System

### Current Issues
- Hard-coded dependencies everywhere
- Difficult to test in isolation
- No proper service lifecycle management

### Proposed Solution: IoC Container

```typescript
// Service Container
class ServiceContainer {
  private services = new Map<string, any>()
  private factories = new Map<string, () => any>()
  private singletons = new Map<string, any>()
  
  // Register a singleton service
  registerSingleton<T>(token: string, factory: () => T): void {
    this.factories.set(token, factory)
  }
  
  // Register a transient service
  registerTransient<T>(token: string, factory: () => T): void {
    this.factories.set(token, factory)
  }
  
  // Get a service
  get<T>(token: string): T {
    // Check if singleton exists
    if (this.singletons.has(token)) {
      return this.singletons.get(token)
    }
    
    // Create new instance
    const factory = this.factories.get(token)
    if (!factory) {
      throw new Error(`Service ${token} not registered`)
    }
    
    const instance = factory()
    
    // Cache if singleton
    if (this.isSingleton(token)) {
      this.singletons.set(token, instance)
    }
    
    return instance
  }
}

// Usage
const container = new ServiceContainer()

// Register services
container.registerSingleton('EventStore', () => new EventStore())
container.registerSingleton('CanvasManager', () => 
  new CanvasManager(
    container.get('EventStore'),
    container.get('SelectionManager')
  )
)

// In components
function MyComponent() {
  const canvas = useService<CanvasManager>('CanvasManager')
  // ...
}
```

## 3. Plugin Architecture

### Enable extensibility through plugins

```typescript
interface Plugin {
  id: string
  name: string
  version: string
  
  // Lifecycle hooks
  onInstall(context: PluginContext): Promise<void>
  onActivate(context: PluginContext): Promise<void>
  onDeactivate(): Promise<void>
  onUninstall(): Promise<void>
}

interface PluginContext {
  canvas: CanvasManager
  eventStore: EventStore
  container: ServiceContainer
  
  // Plugin APIs
  registerTool(tool: Tool): void
  registerFilter(filter: Filter): void
  registerAIAdapter(adapter: BaseToolAdapter): void
  registerCommand(command: Command): void
  
  // UI extension points
  registerPanel(panel: PanelConfig): void
  registerMenuItem(item: MenuItemConfig): void
  registerShortcut(shortcut: ShortcutConfig): void
}

// Example Plugin
class WatermarkPlugin implements Plugin {
  id = 'watermark'
  name = 'Watermark Plugin'
  version = '1.0.0'
  
  async onInstall(context: PluginContext): Promise<void> {
    // Register watermark tool
    context.registerTool(new WatermarkTool())
    
    // Register AI adapter
    context.registerAIAdapter(new WatermarkAdapter())
    
    // Add menu item
    context.registerMenuItem({
      id: 'add-watermark',
      label: 'Add Watermark',
      parent: 'image-menu',
      command: 'watermark.add'
    })
  }
}
```

## 4. Command Pattern with Validation

### Enhanced command system with validation and composition

```typescript
abstract class Command<TParams = void> {
  abstract id: string
  abstract name: string
  
  // Validation schema
  abstract schema: z.ZodSchema<TParams>
  
  // Check if command can execute
  abstract canExecute(context: CommandContext): boolean
  
  // Execute with validated params
  abstract execute(params: TParams, context: CommandContext): Promise<void>
  
  // Create validated command instance
  static create<T>(this: new() => Command<T>, params: T): ValidatedCommand<T> {
    const instance = new this()
    const validated = instance.schema.parse(params)
    return new ValidatedCommand(instance, validated)
  }
}

// Composite command for complex operations
class CompositeCommand extends Command<void> {
  private commands: Command[] = []
  
  add(command: Command): this {
    this.commands.push(command)
    return this
  }
  
  async execute(params: void, context: CommandContext): Promise<void> {
    // Execute all commands in sequence
    for (const command of this.commands) {
      if (command.canExecute(context)) {
        await command.execute(params, context)
      }
    }
  }
  
  canExecute(context: CommandContext): boolean {
    return this.commands.some(cmd => cmd.canExecute(context))
  }
}

// Usage
const brightenAndSharpen = new CompositeCommand()
  .add(BrightnessCommand.create({ adjustment: 20 }))
  .add(SharpenCommand.create({ radius: 2 }))

await commandBus.execute(brightenAndSharpen)
```

## 5. Reactive Selection System

### Make selection reactive and composable

```typescript
class ReactiveSelection {
  private selection$ = new BehaviorSubject<Selection | null>(null)
  private eventStore: EventStore
  
  // Observable selection
  get observable(): Observable<Selection | null> {
    return this.selection$.asObservable()
  }
  
  // Derived observables
  get bounds$(): Observable<Rect | null> {
    return this.selection$.pipe(
      map(sel => sel ? this.getBounds(sel) : null),
      distinctUntilChanged()
    )
  }
  
  get isEmpty$(): Observable<boolean> {
    return this.selection$.pipe(
      map(sel => sel === null),
      distinctUntilChanged()
    )
  }
  
  get objectCount$(): Observable<number> {
    return this.selection$.pipe(
      map(sel => sel?.type === 'objects' ? sel.objectIds.length : 0),
      distinctUntilChanged()
    )
  }
  
  // Selection operations return new selections
  expand(pixels: number): Selection | null {
    const current = this.selection$.value
    if (!current) return null
    
    // Expand selection bounds
    const expanded = this.expandSelection(current, pixels)
    this.setSelection(expanded)
    return expanded
  }
  
  intersect(other: Selection): Selection | null {
    const current = this.selection$.value
    if (!current) return null
    
    const intersection = this.intersectSelections(current, other)
    this.setSelection(intersection)
    return intersection
  }
}

// Usage in React
function SelectionInfo() {
  const selection = useObservable(selectionSystem.observable)
  const bounds = useObservable(selectionSystem.bounds$)
  const count = useObservable(selectionSystem.objectCount$)
  
  return (
    <div>
      {selection && (
        <>
          <p>Type: {selection.type}</p>
          <p>Objects: {count}</p>
          {bounds && <p>Size: {bounds.width}x{bounds.height}</p>}
        </>
      )}
    </div>
  )
}
```

## 6. Performance Monitoring System

### Built-in performance tracking and optimization

```typescript
class PerformanceMonitor {
  private metrics = new Map<string, PerformanceMetric[]>()
  private observers = new Set<PerformanceObserverCallback>()
  
  // Track operation performance
  async track<T>(name: string, operation: () => Promise<T>): Promise<T> {
    const start = performance.now()
    const memory = (performance as any).memory?.usedJSHeapSize
    
    try {
      const result = await operation()
      const duration = performance.now() - start
      
      this.recordMetric(name, {
        duration,
        memory: (performance as any).memory?.usedJSHeapSize - memory,
        timestamp: Date.now(),
        success: true
      })
      
      return result
    } catch (error) {
      const duration = performance.now() - start
      
      this.recordMetric(name, {
        duration,
        memory: 0,
        timestamp: Date.now(),
        success: false,
        error: error.message
      })
      
      throw error
    }
  }
  
  // Get performance report
  getReport(operation?: string): PerformanceReport {
    const metrics = operation 
      ? this.metrics.get(operation) || []
      : Array.from(this.metrics.values()).flat()
    
    return {
      operations: this.aggregateMetrics(metrics),
      slowestOps: this.findSlowestOps(metrics),
      memoryLeaks: this.detectMemoryLeaks(metrics),
      recommendations: this.generateRecommendations(metrics)
    }
  }
  
  // Real-time monitoring
  startMonitoring(callback: PerformanceObserverCallback): () => void {
    this.observers.add(callback)
    return () => this.observers.delete(callback)
  }
}

// Usage
const perf = container.get<PerformanceMonitor>('PerformanceMonitor')

// Track tool operations
await perf.track('brush.stroke', async () => {
  await brushTool.createStroke(points)
})

// Monitor in UI
function PerformancePanel() {
  const [report, setReport] = useState<PerformanceReport>()
  
  useEffect(() => {
    return perf.startMonitoring((metrics) => {
      setReport(perf.getReport())
    })
  }, [])
  
  return (
    <div>
      <h3>Performance</h3>
      {report?.slowestOps.map(op => (
        <div key={op.name}>
          {op.name}: {op.avgDuration.toFixed(2)}ms
        </div>
      ))}
    </div>
  )
}
```

## 7. Type-Safe Event Bus

### Strongly typed event system

```typescript
// Event type registry
interface EventRegistry {
  'canvas.object.added': { object: CanvasObject; layerId: string }
  'canvas.object.removed': { objectId: string }
  'selection.changed': { selection: Selection | null }
  'tool.activated': { toolId: string }
  // ... more events
}

// Type-safe event bus
class TypedEventBus {
  private handlers = new Map<keyof EventRegistry, Set<Function>>()
  
  on<K extends keyof EventRegistry>(
    event: K,
    handler: (data: EventRegistry[K]) => void
  ): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set())
    }
    
    this.handlers.get(event)!.add(handler)
    
    return () => {
      this.handlers.get(event)?.delete(handler)
    }
  }
  
  emit<K extends keyof EventRegistry>(
    event: K,
    data: EventRegistry[K]
  ): void {
    this.handlers.get(event)?.forEach(handler => {
      handler(data)
    })
  }
}

// Usage - TypeScript ensures type safety
eventBus.on('canvas.object.added', ({ object, layerId }) => {
  console.log(`Object ${object.id} added to layer ${layerId}`)
})

eventBus.emit('canvas.object.added', {
  object: newObject,
  layerId: 'layer-1'
})
```

## 8. Middleware System

### Add middleware for cross-cutting concerns

```typescript
type Middleware<TContext> = (
  context: TContext,
  next: () => Promise<void>
) => Promise<void>

class MiddlewarePipeline<TContext> {
  private middlewares: Middleware<TContext>[] = []
  
  use(middleware: Middleware<TContext>): this {
    this.middlewares.push(middleware)
    return this
  }
  
  async execute(context: TContext, final: () => Promise<void>): Promise<void> {
    let index = 0
    
    const next = async (): Promise<void> => {
      if (index >= this.middlewares.length) {
        return final()
      }
      
      const middleware = this.middlewares[index++]
      return middleware(context, next)
    }
    
    return next()
  }
}

// Example middlewares
const loggingMiddleware: Middleware<CommandContext> = async (ctx, next) => {
  console.log(`Executing command: ${ctx.command.id}`)
  const start = Date.now()
  
  try {
    await next()
    console.log(`Command completed in ${Date.now() - start}ms`)
  } catch (error) {
    console.error(`Command failed:`, error)
    throw error
  }
}

const authMiddleware: Middleware<CommandContext> = async (ctx, next) => {
  if (ctx.command.requiresAuth && !ctx.user) {
    throw new Error('Authentication required')
  }
  await next()
}

const validationMiddleware: Middleware<CommandContext> = async (ctx, next) => {
  if (ctx.command.schema) {
    ctx.params = ctx.command.schema.parse(ctx.params)
  }
  await next()
}

// Setup pipeline
const commandPipeline = new MiddlewarePipeline<CommandContext>()
  .use(loggingMiddleware)
  .use(authMiddleware)
  .use(validationMiddleware)
```

## 9. Resource Management

### Proper cleanup and memory management

```typescript
interface Disposable {
  dispose(): void
}

class ResourceManager {
  private resources = new Map<string, Disposable>()
  private disposeCallbacks = new Map<string, (() => void)[]>()
  
  // Register a resource
  register(id: string, resource: Disposable): void {
    // Dispose existing resource
    this.dispose(id)
    
    this.resources.set(id, resource)
  }
  
  // Add cleanup callback
  onDispose(id: string, callback: () => void): void {
    if (!this.disposeCallbacks.has(id)) {
      this.disposeCallbacks.set(id, [])
    }
    this.disposeCallbacks.get(id)!.push(callback)
  }
  
  // Dispose specific resource
  dispose(id: string): void {
    const resource = this.resources.get(id)
    if (resource) {
      resource.dispose()
      this.resources.delete(id)
      
      // Run callbacks
      const callbacks = this.disposeCallbacks.get(id)
      callbacks?.forEach(cb => cb())
      this.disposeCallbacks.delete(id)
    }
  }
  
  // Dispose all resources
  disposeAll(): void {
    Array.from(this.resources.keys()).forEach(id => {
      this.dispose(id)
    })
  }
}

// Usage in tools
class BrushTool extends BaseTool implements Disposable {
  private resources = new ResourceManager()
  
  protected setupTool(): void {
    // Register event listeners as resources
    const listener = this.canvas.on('mouse:move', this.handleMouseMove)
    this.resources.register('mousemove', {
      dispose: () => this.canvas.off('mouse:move', listener)
    })
    
    // Register temporary canvas
    const tempCanvas = document.createElement('canvas')
    this.resources.register('tempCanvas', {
      dispose: () => tempCanvas.remove()
    })
  }
  
  dispose(): void {
    this.resources.disposeAll()
  }
}
```

## 10. Testing Infrastructure

### Comprehensive testing utilities

```typescript
// Test utilities
class CanvasTestUtils {
  static createMockCanvas(options?: Partial<CanvasState>): CanvasManager {
    const container = document.createElement('div')
    const eventStore = new EventStore()
    const canvas = new CanvasManager(container, eventStore)
    
    // Apply options
    if (options) {
      Object.assign(canvas.state, options)
    }
    
    return canvas
  }
  
  static createMockSelection(type: Selection['type']): Selection {
    switch (type) {
      case 'rectangle':
        return {
          type: 'rectangle',
          bounds: { x: 0, y: 0, width: 100, height: 100 },
          feather: 0,
          antiAlias: true
        }
      // ... other types
    }
  }
  
  static async simulateToolAction(
    tool: Tool,
    canvas: CanvasManager,
    actions: ToolAction[]
  ): Promise<void> {
    tool.onActivate(canvas)
    
    for (const action of actions) {
      switch (action.type) {
        case 'mousedown':
          await tool.onMouseDown(action.event)
          break
        case 'mousemove':
          await tool.onMouseMove(action.event)
          break
        // ... other actions
      }
    }
    
    tool.onDeactivate(canvas)
  }
}

// Test helpers for AI operations
class AITestUtils {
  static createMockExecutionContext(): ExecutionContext {
    const eventStore = new EventStore()
    return new ExecutionContext(eventStore, {
      workflowId: 'test-workflow',
      source: 'test'
    })
  }
  
  static async expectEvents(
    context: ExecutionContext,
    expectedTypes: string[]
  ): Promise<void> {
    const events = context.getEvents()
    const types = events.map(e => e.type)
    expect(types).toEqual(expectedTypes)
  }
}
```

## Implementation Priority

1. **High Priority** (Core stability)
   - Event-driven stores
   - Dependency injection
   - Resource management

2. **Medium Priority** (Developer experience)
   - Type-safe event bus
   - Enhanced command pattern
   - Testing infrastructure

3. **Lower Priority** (Future extensibility)
   - Plugin architecture
   - Middleware system
   - Performance monitoring

## Migration Strategy

1. **Phase 1**: Implement core services (EventStore, DI container)
2. **Phase 2**: Migrate stores to event-driven architecture
3. **Phase 3**: Add middleware and command enhancements
4. **Phase 4**: Implement plugin system
5. **Phase 5**: Add performance monitoring

Each phase should be completed with full tests before moving to the next. 