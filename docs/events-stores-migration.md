# Events & Stores: Complete Architecture Migration

## Executive Summary

This document provides a **comprehensive, detailed migration plan** for completely overhauling the event and store systems to eliminate all technical debt, singleton patterns, and architectural inconsistencies. This is a **full migration with zero backwards compatibility** as requested.

**Priority**: Critical Foundation  
**Estimated Effort**: 3-4 sprints  
**Risk**: High (affects entire application foundation)  
**Impact**: Complete architectural transformation  

---

## 🚨 **Current State: Critical Issues Identified**

### **1. Dual Architecture Chaos**
The codebase runs **TWO competing architectures** simultaneously:

```typescript
// OLD: Command Pattern (partially migrated)
CommandManager.getInstance()
historyStore.executeCommand(command)

// NEW: Event Sourcing (incomplete implementation)
EventStore.getInstance()
context.emit(event)
```

### **2. Singleton Hell - 47 Critical Instances**

#### **Core Event System Singletons (8 instances):**
```typescript
EventStore.getInstance()                    // lib/events/core/EventStore.ts:47
EventStoreBridge.getInstance()              // lib/events/core/EventStoreBridge.ts:28
getTypedEventBus()                         // lib/events/core/TypedEventBus.ts:589
getHistoryStore()                          // lib/events/history/EventBasedHistoryStore.ts:347
CommandAdapter.getInstance()               // lib/events/adapters/CommandAdapter.ts:29
```

#### **Store Singletons (12 instances):**
```typescript
getCanvasStore()                           // lib/store/canvas/CanvasStore.ts:270
getEventToolStore()                        // lib/store/tools/EventToolStore.ts:362
getEventDocumentStore()                    // lib/store/document/EventDocumentStore.ts:345
getEventTextStore()                        // lib/store/text/EventTextStore.ts:261
getEventToolOptionsStore()                 // lib/store/tools/EventToolOptionsStore.ts:276
```

#### **Manager Singletons (15 instances):**
```typescript
CommandManager.getInstance()               // lib/editor/commands/CommandManager.ts:42
SelectionContextManager.getInstance()      // lib/editor/selection/SelectionContextManager.ts:31
FontManager.getInstance()                  // lib/editor/fonts/FontManager.ts:68
WebGLFilterEngine.getInstance()            // lib/editor/filters/WebGLFilterEngine.ts:49
ClipboardManager.getInstance()             // lib/editor/clipboard/ClipboardManager.ts:19
```

#### **Direct Singleton Usage (12 instances):**
```typescript
// In EventTextStore.ts:
const eventStore = EventStore.getInstance()
const typedEventBus = getTypedEventBus()

// In tools and effects:
private typedEventBus = getTypedEventBus()  // 8+ files
```

### **3. Inconsistent Initialization Patterns**

```typescript
// Pattern 1: Factory Functions
getCanvasStore(eventStore)

// Pattern 2: Direct Singletons  
EventStore.getInstance()

// Pattern 3: Constructor Injection (partial)
new EventToolStore(eventStore, typedEventBus)

// Pattern 4: Service Container (new, incomplete)
container.get<EventStore>('EventStore')
```

### **4. Race Conditions & Ordering Issues**

```typescript
// AppInitializer.ts - setTimeout hack
setTimeout(() => {
  store.activateTool('move')
}, 100)

// Missing dependency declarations
container.registerSingleton('EventStore', () => EventStore.getInstance())
// No explicit dependencies, causes race conditions
```

### **5. Memory Leaks & Resource Management**

```typescript
// Stores create their own EventStore instances
const eventStore = EventStore.getInstance() // Not cleaned up
const typedEventBus = getTypedEventBus()    // Not managed

// No proper disposal patterns
// No resource cleanup on unmount
```

---

## 🎯 **Complete Migration Strategy**

### **Phase 1: Core Event Infrastructure (Sprint 1)**

#### **Step 1.1: Eliminate All EventStore Singletons**

**Files to Modify:**
- `lib/events/core/EventStore.ts` - Remove singleton pattern
- `lib/events/core/EventStoreBridge.ts` - Remove singleton pattern  
- `lib/events/adapters/CommandAdapter.ts` - Remove singleton pattern
- `lib/core/AppInitializer.ts` - Update registration

**Before:**
```typescript
// lib/events/core/EventStore.ts
export class EventStore {
  private static instance: EventStore
  
  static getInstance(): EventStore {
    if (!EventStore.instance) {
      EventStore.instance = new EventStore()
    }
    return EventStore.instance
  }
}
```

**After:**
```typescript
// lib/events/core/EventStore.ts
export class EventStore {
  constructor(
    private config: EventStoreConfig = {}
  ) {
    this.initialize()
  }
  
  private initialize(): void {
    // Setup event storage, indexing, persistence
    this.setupPersistence()
    this.setupIndexes()
    this.setupCleanup()
  }
  
  // Remove all static methods
  // Add proper disposal pattern
  dispose(): void {
    this.cleanup()
    this.persistenceCleanup()
  }
}
```

#### **Step 1.2: Eliminate TypedEventBus Singleton**

**Files to Modify:**
- `lib/events/core/TypedEventBus.ts` - Remove singleton function
- All files importing `getTypedEventBus()` (12+ files)

**Before:**
```typescript
// lib/events/core/TypedEventBus.ts
let instance: TypedEventBus | null = null

export function getTypedEventBus(): TypedEventBus {
  if (!instance) {
    instance = new TypedEventBus()
  }
  return instance
}
```

**After:**
```typescript
// lib/events/core/TypedEventBus.ts
export class TypedEventBus {
  constructor(
    private config: EventBusConfig = {}
  ) {
    this.initialize()
  }
  
  private initialize(): void {
    this.setupSubscriptions()
    this.setupErrorHandling()
    this.setupMetrics()
  }
  
  dispose(): void {
    this.cleanup()
    this.unsubscribeAll()
  }
}

// Remove singleton function entirely
```

#### **Step 1.3: Update ServiceContainer Registration**

**File:** `lib/core/AppInitializer.ts`

```typescript
// Phase 1: Core Services
container.registerSingleton('EventStore', () => {
  return new EventStore({
    persistence: true,
    indexing: true,
    compression: true
  })
}, {
  dependencies: [],
  phase: 'core'
})

container.registerSingleton('TypedEventBus', () => {
  return new TypedEventBus({
    maxListeners: 1000,
    errorHandling: 'log',
    metrics: true
  })
}, {
  dependencies: [],
  phase: 'core'
})

container.registerSingleton('EventStoreBridge', () => {
  const eventStore = container.getSync<EventStore>('EventStore')
  const eventBus = container.getSync<TypedEventBus>('TypedEventBus')
  const bridge = new EventStoreBridge(eventStore, eventBus)
  bridge.start()
  return bridge
}, {
  dependencies: ['EventStore', 'TypedEventBus'],
  phase: 'core'
})
```

### **Phase 2: Store System Overhaul (Sprint 1-2)**

#### **Step 2.1: Eliminate All Store Singleton Functions**

**Files to Modify:**
- `lib/store/canvas/CanvasStore.ts` - Remove `getCanvasStore()`
- `lib/store/tools/EventToolStore.ts` - Remove `getEventToolStore()`
- `lib/store/document/EventDocumentStore.ts` - Remove `getEventDocumentStore()`
- `lib/store/text/EventTextStore.ts` - Remove `getEventTextStore()`
- `lib/store/tools/EventToolOptionsStore.ts` - Remove `getEventToolOptionsStore()`

**Before (CanvasStore.ts):**
```typescript
// Singleton instance
let instance: CanvasStore | null = null

export function getCanvasStore(eventStore: EventStore): CanvasStore {
  if (!instance) {
    instance = new CanvasStore(eventStore)
  }
  return instance
}
```

**After:**
```typescript
// No singleton pattern - pure constructor injection
export class CanvasStore extends BaseStore<CanvasState> {
  constructor(
    eventStore: EventStore,
    typedEventBus: TypedEventBus,
    config: CanvasStoreConfig = {}
  ) {
    super(initialCanvasState, eventStore)
    this.typedEventBus = typedEventBus
    this.config = config
    this.initialize()
  }
  
  private initialize(): void {
    this.setupEventHandlers()
    this.setupPersistence()
    this.setupValidation()
  }
  
  dispose(): void {
    this.cleanup()
    super.dispose()
  }
}

// Remove singleton function entirely
```

#### **Step 2.2: Update All Store Registrations**

**File:** `lib/core/AppInitializer.ts`

```typescript
// Phase 2: Infrastructure Services
container.registerSingleton('CanvasStore', () => {
  return new CanvasStore(
    container.getSync<EventStore>('EventStore'),
    container.getSync<TypedEventBus>('TypedEventBus'),
    { persistence: true, validation: true }
  )
}, {
  dependencies: ['EventStore', 'TypedEventBus'],
  phase: 'infrastructure'
})

container.registerSingleton('ToolStore', () => {
  return new EventToolStore(
    container.getSync<EventStore>('EventStore'),
    container.getSync<TypedEventBus>('TypedEventBus'),
    { autoActivateDefault: true, persistOptions: true }
  )
}, {
  dependencies: ['EventStore', 'TypedEventBus'],
  phase: 'infrastructure'
})

container.registerSingleton('SelectionStore', () => {
  return new EventSelectionStore(
    container.getSync<EventStore>('EventStore'),
    container.getSync<TypedEventBus>('TypedEventBus'),
    { persistSelection: true, optimizeUpdates: true }
  )
}, {
  dependencies: ['EventStore', 'TypedEventBus'],
  phase: 'infrastructure'
})

container.registerSingleton('DocumentStore', () => {
  return new EventDocumentStore(
    container.getSync<EventStore>('EventStore'),
    container.getSync<TypedEventBus>('TypedEventBus'),
    { autoSave: true, versionControl: true }
  )
}, {
  dependencies: ['EventStore', 'TypedEventBus'],
  phase: 'infrastructure'
})

container.registerSingleton('HistoryStore', () => {
  return new EventBasedHistoryStore(
    container.getSync<EventStore>('EventStore'),
    container.getSync<TypedEventBus>('TypedEventBus'),
    { maxHistory: 100, snapshotInterval: 10 }
  )
}, {
  dependencies: ['EventStore', 'TypedEventBus'],
  phase: 'infrastructure'
})
```

#### **Step 2.3: Fix Direct EventStore Usage in Stores**

**Files to Fix:**
- `lib/store/text/EventTextStore.ts:261`
- `lib/store/document/EventDocumentStore.ts:348`
- `lib/store/tools/EventToolOptionsStore.ts:279`

**Before:**
```typescript
// lib/store/text/EventTextStore.ts
const eventStore = EventStore.getInstance()
const typedEventBus = getTypedEventBus()
const store = new EventTextStore(eventStore, typedEventBus)
```

**After:**
```typescript
// lib/store/text/EventTextStore.ts
// Remove singleton usage entirely
// Store creation handled by ServiceContainer only

export class EventTextStore extends BaseStore<TextState> {
  constructor(
    eventStore: EventStore,
    typedEventBus: TypedEventBus,
    config: TextStoreConfig = {}
  ) {
    super(initialTextState, eventStore)
    this.typedEventBus = typedEventBus
    this.config = config
    this.initialize()
  }
}

// Register in AppInitializer.ts
container.registerSingleton('TextStore', () => {
  return new EventTextStore(
    container.getSync<EventStore>('EventStore'),
    container.getSync<TypedEventBus>('TypedEventBus'),
    { persistence: true, validation: true }
  )
}, {
  dependencies: ['EventStore', 'TypedEventBus'],
  phase: 'infrastructure'
})
```

### **Phase 3: Manager System Overhaul (Sprint 2)**

#### **Step 3.1: Eliminate Manager Singletons**

**Files to Modify:**
- `lib/editor/commands/CommandManager.ts` - Remove singleton
- `lib/editor/selection/SelectionContextManager.ts` - Remove singleton  
- `lib/editor/fonts/FontManager.ts` - Remove singleton
- `lib/editor/filters/WebGLFilterEngine.ts` - Remove singleton
- `lib/editor/clipboard/ClipboardManager.ts` - Remove singleton

**Before (CommandManager.ts):**
```typescript
export class CommandManager {
  private static instance: CommandManager
  
  static getInstance(): CommandManager {
    if (!CommandManager.instance) {
      CommandManager.instance = new CommandManager()
    }
    return CommandManager.instance
  }
}
```

**After:**
```typescript
export class CommandManager {
  constructor(
    private eventStore: EventStore,
    private typedEventBus: TypedEventBus,
    private historyStore: EventBasedHistoryStore,
    private config: CommandManagerConfig = {}
  ) {
    this.initialize()
  }
  
  private initialize(): void {
    this.setupEventHandlers()
    this.setupMiddleware()
    this.setupValidation()
  }
  
  dispose(): void {
    this.cleanup()
    this.disposeMiddleware()
  }
}
```

#### **Step 3.2: Register All Managers in ServiceContainer**

```typescript
// lib/core/AppInitializer.ts
container.registerSingleton('CommandManager', () => {
  return new CommandManager(
    container.getSync<EventStore>('EventStore'),
    container.getSync<TypedEventBus>('TypedEventBus'),
    container.getSync<EventBasedHistoryStore>('HistoryStore'),
    { validation: true, middleware: true, metrics: true }
  )
}, {
  dependencies: ['EventStore', 'TypedEventBus', 'HistoryStore'],
  phase: 'infrastructure'
})

container.registerSingleton('SelectionManager', () => {
  return new SelectionManager(
    container.getSync<EventStore>('EventStore'),
    container.getSync<TypedEventBus>('TypedEventBus'),
    { persistence: true, optimization: true }
  )
}, {
  dependencies: ['EventStore', 'TypedEventBus'],
  phase: 'infrastructure'
})

container.registerSingleton('FontManager', () => {
  return new FontManager(
    container.getSync<TypedEventBus>('TypedEventBus'),
    { preload: true, caching: true }
  )
}, {
  dependencies: ['TypedEventBus'],
  phase: 'infrastructure'
})

container.registerSingleton('WebGLFilterEngine', () => {
  return new WebGLFilterEngine(
    container.getSync<EventStore>('EventStore'),
    container.getSync<TypedEventBus>('TypedEventBus'),
    container.getSync<ResourceManager>('ResourceManager'),
    { optimization: true, caching: true }
  )
}, {
  dependencies: ['EventStore', 'TypedEventBus', 'ResourceManager'],
  phase: 'infrastructure'
})

container.registerSingleton('ClipboardManager', () => {
  return new ClipboardManager(
    container.getSync<EventStore>('EventStore'),
    container.getSync<TypedEventBus>('TypedEventBus'),
    { persistence: true, validation: true }
  )
}, {
  dependencies: ['EventStore', 'TypedEventBus'],
  phase: 'infrastructure'
})
```

### **Phase 4: Direct Usage Elimination (Sprint 2-3)**

#### **Step 4.1: Fix Direct EventBus Usage in Tools**

**Files to Fix (12+ files):**
- `lib/editor/tools/base/DrawingTool.ts:236`
- `lib/editor/tools/base/EnhancedDrawingTool.ts:59`
- `lib/editor/tools/engines/PixelBuffer.ts:14`
- `lib/editor/text/effects/EnhancedLayerStyles.ts:106`
- `lib/editor/text/effects/EnhancedTextWarp.ts:43`

**Before:**
```typescript
// lib/editor/tools/base/DrawingTool.ts
import { getTypedEventBus } from '@/lib/events/core/TypedEventBus'

export class DrawingTool {
  private typedEventBus = getTypedEventBus()
  
  protected emitDrawingEvent(event: DrawingEvent): void {
    this.typedEventBus.emit('drawing.event', event)
  }
}
```

**After:**
```typescript
// lib/editor/tools/base/DrawingTool.ts
export class DrawingTool {
  constructor(
    private typedEventBus: TypedEventBus,
    private eventStore: EventStore,
    config: DrawingToolConfig = {}
  ) {
    this.config = config
    this.initialize()
  }
  
  protected emitDrawingEvent(event: DrawingEvent): void {
    this.typedEventBus.emit('drawing.event', event)
  }
  
  dispose(): void {
    this.cleanup()
  }
}
```

#### **Step 4.2: Update Tool Factory Pattern**

```typescript
// lib/editor/tools/ToolFactory.ts
export class ToolFactory {
  constructor(private serviceContainer: ServiceContainer) {}
  
  createTool<T extends BaseTool>(
    ToolClass: new (dependencies: ToolDependencies) => T,
    config?: ToolConfig
  ): T {
    const dependencies = {
      eventStore: this.serviceContainer.getSync<EventStore>('EventStore'),
      typedEventBus: this.serviceContainer.getSync<TypedEventBus>('TypedEventBus'),
      canvasManager: this.serviceContainer.getSync<CanvasManager>('CanvasManager'),
      commandManager: this.serviceContainer.getSync<CommandManager>('CommandManager'),
      resourceManager: this.serviceContainer.getSync<ResourceManager>('ResourceManager')
    }
    
    return new ToolClass(dependencies, config)
  }
}
```

### **Phase 5: Event Architecture Completion (Sprint 3)**

#### **Step 5.1: Complete Event Sourcing Implementation**

**New Event Types to Implement:**

```typescript
// lib/events/canvas/CanvasEvents.ts
export class CanvasCreatedEvent extends Event {
  constructor(
    canvasId: string,
    dimensions: { width: number; height: number },
    metadata: Event['metadata']
  ) {
    super('canvas.created', canvasId, 'canvas', metadata)
  }
}

export class CanvasResizedEvent extends Event {
  constructor(
    canvasId: string,
    oldDimensions: { width: number; height: number },
    newDimensions: { width: number; height: number },
    metadata: Event['metadata']
  ) {
    super('canvas.resized', canvasId, 'canvas', metadata)
  }
}

export class CanvasBackgroundChangedEvent extends Event {
  constructor(
    canvasId: string,
    oldBackground: string,
    newBackground: string,
    metadata: Event['metadata']
  ) {
    super('canvas.background.changed', canvasId, 'canvas', metadata)
  }
}
```

```typescript
// lib/events/selection/SelectionEvents.ts
export class SelectionCreatedEvent extends Event {
  constructor(
    canvasId: string,
    selection: Selection,
    metadata: Event['metadata']
  ) {
    super('selection.created', canvasId, 'selection', metadata)
  }
}

export class SelectionModifiedEvent extends Event {
  constructor(
    canvasId: string,
    oldSelection: Selection,
    newSelection: Selection,
    metadata: Event['metadata']
  ) {
    super('selection.modified', canvasId, 'selection', metadata)
  }
}

export class SelectionClearedEvent extends Event {
  constructor(
    canvasId: string,
    clearedSelection: Selection,
    metadata: Event['metadata']
  ) {
    super('selection.cleared', canvasId, 'selection', metadata)
  }
}
```

```typescript
// lib/events/tools/ToolEvents.ts
export class ToolActivatedEvent extends Event {
  constructor(
    toolId: string,
    previousToolId: string | null,
    metadata: Event['metadata']
  ) {
    super('tool.activated', toolId, 'tool', metadata)
  }
}

export class ToolDeactivatedEvent extends Event {
  constructor(
    toolId: string,
    metadata: Event['metadata']
  ) {
    super('tool.deactivated', toolId, 'tool', metadata)
  }
}

export class ToolOptionChangedEvent extends Event {
  constructor(
    toolId: string,
    optionKey: string,
    oldValue: unknown,
    newValue: unknown,
    metadata: Event['metadata']
  ) {
    super('tool.option.changed', toolId, 'tool', metadata)
  }
}
```

#### **Step 5.2: Implement Event Persistence**

```typescript
// lib/events/persistence/EventPersistence.ts
export class EventPersistence {
  constructor(
    private config: PersistenceConfig = {}
  ) {
    this.initialize()
  }
  
  private async initialize(): Promise<void> {
    await this.setupIndexedDB()
    await this.setupCompression()
    await this.setupSynchronization()
  }
  
  async saveEvents(events: Event[]): Promise<void> {
    const batch = this.createBatch(events)
    await this.writeBatch(batch)
    await this.updateIndexes(events)
  }
  
  async loadEvents(criteria: EventCriteria): Promise<Event[]> {
    const indexes = await this.queryIndexes(criteria)
    const events = await this.loadEventBatch(indexes)
    return this.deserializeEvents(events)
  }
  
  async createSnapshot(state: CanvasState): Promise<string> {
    const snapshot = this.serializeSnapshot(state)
    const compressed = await this.compressSnapshot(snapshot)
    return this.saveSnapshot(compressed)
  }
  
  async restoreSnapshot(snapshotId: string): Promise<CanvasState> {
    const compressed = await this.loadSnapshot(snapshotId)
    const snapshot = await this.decompressSnapshot(compressed)
    return this.deserializeSnapshot(snapshot)
  }
}
```

#### **Step 5.3: Implement Event Replay System**

```typescript
// lib/events/replay/EventReplay.ts
export class EventReplay {
  constructor(
    private eventStore: EventStore,
    private canvasManager: CanvasManager,
    private typedEventBus: TypedEventBus
  ) {}
  
  async replayToTimestamp(timestamp: number): Promise<void> {
    // Get all events up to timestamp
    const events = await this.eventStore.getEventsUntil(timestamp)
    
    // Reset canvas to initial state
    await this.resetCanvas()
    
    // Replay events in order
    for (const event of events) {
      await this.replayEvent(event)
    }
    
    // Emit replay completed event
    this.typedEventBus.emit('replay.completed', {
      timestamp,
      eventCount: events.length
    })
  }
  
  async replayEventSequence(eventIds: string[]): Promise<void> {
    const events = await this.eventStore.getEventsByIds(eventIds)
    
    for (const event of events) {
      await this.replayEvent(event)
    }
  }
  
  private async replayEvent(event: Event): Promise<void> {
    // Apply event to canvas state
    await this.applyEventToCanvas(event)
    
    // Emit UI update event
    this.typedEventBus.emit('event.replayed', {
      eventId: event.id,
      eventType: event.type,
      timestamp: event.timestamp
    })
  }
}
```

### **Phase 6: Performance & Optimization (Sprint 3-4)**

#### **Step 6.1: Implement Event Compression**

```typescript
// lib/events/optimization/EventCompression.ts
export class EventCompression {
  async compressEventSequence(events: Event[]): Promise<CompressedEvent> {
    // Group related events
    const groups = this.groupRelatedEvents(events)
    
    // Compress each group
    const compressed = await Promise.all(
      groups.map(group => this.compressGroup(group))
    )
    
    return {
      id: nanoid(),
      originalEventIds: events.map(e => e.id),
      compressedData: compressed,
      compressionRatio: this.calculateRatio(events, compressed),
      timestamp: Date.now()
    }
  }
  
  async decompressEvents(compressed: CompressedEvent): Promise<Event[]> {
    const groups = await Promise.all(
      compressed.compressedData.map(data => this.decompressGroup(data))
    )
    
    return groups.flat()
  }
  
  private groupRelatedEvents(events: Event[]): Event[][] {
    // Group by aggregate ID and time proximity
    const groups: Map<string, Event[]> = new Map()
    
    for (const event of events) {
      const key = `${event.aggregateType}:${event.aggregateId}`
      const group = groups.get(key) || []
      group.push(event)
      groups.set(key, group)
    }
    
    return Array.from(groups.values())
  }
}
```

#### **Step 6.2: Implement Event Batching**

```typescript
// lib/events/batching/EventBatcher.ts
export class EventBatcher {
  private batchQueue: Event[] = []
  private batchTimer: NodeJS.Timeout | null = null
  private readonly batchSize = 50
  private readonly batchTimeout = 100 // ms
  
  constructor(
    private eventStore: EventStore,
    private config: BatcherConfig = {}
  ) {
    this.batchSize = config.batchSize || 50
    this.batchTimeout = config.batchTimeout || 100
  }
  
  async addEvent(event: Event): Promise<void> {
    this.batchQueue.push(event)
    
    // Process batch if size limit reached
    if (this.batchQueue.length >= this.batchSize) {
      await this.processBatch()
      return
    }
    
    // Schedule batch processing if not already scheduled
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.processBatch()
      }, this.batchTimeout)
    }
  }
  
  private async processBatch(): Promise<void> {
    if (this.batchQueue.length === 0) return
    
    const batch = [...this.batchQueue]
    this.batchQueue = []
    
    if (this.batchTimer) {
      clearTimeout(this.batchTimer)
      this.batchTimer = null
    }
    
    await this.eventStore.appendBatch(batch)
  }
}
```

#### **Step 6.3: Implement Event Indexing**

```typescript
// lib/events/indexing/EventIndexer.ts
export class EventIndexer {
  private indexes: Map<string, EventIndex> = new Map()
  
  constructor(private config: IndexerConfig = {}) {
    this.setupIndexes()
  }
  
  private setupIndexes(): void {
    // Timestamp index for time-based queries
    this.indexes.set('timestamp', new TimeIndex())
    
    // Aggregate index for entity-based queries
    this.indexes.set('aggregate', new AggregateIndex())
    
    // Type index for event type queries
    this.indexes.set('type', new TypeIndex())
    
    // Workflow index for workflow-based queries
    this.indexes.set('workflow', new WorkflowIndex())
    
    // User index for user-based queries
    this.indexes.set('user', new UserIndex())
  }
  
  async indexEvent(event: Event): Promise<void> {
    const promises = Array.from(this.indexes.values()).map(index =>
      index.addEvent(event)
    )
    
    await Promise.all(promises)
  }
  
  async queryEvents(criteria: EventCriteria): Promise<string[]> {
    // Determine best index to use
    const index = this.selectOptimalIndex(criteria)
    
    // Query the index
    return index.query(criteria)
  }
  
  private selectOptimalIndex(criteria: EventCriteria): EventIndex {
    // Select most efficient index based on query criteria
    if (criteria.timeRange) return this.indexes.get('timestamp')!
    if (criteria.aggregateId) return this.indexes.get('aggregate')!
    if (criteria.eventType) return this.indexes.get('type')!
    if (criteria.workflowId) return this.indexes.get('workflow')!
    if (criteria.userId) return this.indexes.get('user')!
    
    // Default to timestamp index
    return this.indexes.get('timestamp')!
  }
}
```

---

## 🔧 **Implementation Guidelines**

### **Migration Checklist**

#### **Phase 1: Core Event Infrastructure**
- [ ] Remove `EventStore.getInstance()` pattern
- [ ] Remove `getTypedEventBus()` function
- [ ] Remove `EventStoreBridge.getInstance()` pattern
- [ ] Remove `CommandAdapter.getInstance()` pattern
- [ ] Update ServiceContainer registrations
- [ ] Add proper disposal patterns
- [ ] Add configuration support
- [ ] Test event flow end-to-end

#### **Phase 2: Store System Overhaul**
- [ ] Remove all `getXxxStore()` functions
- [ ] Update all store constructors for DI
- [ ] Fix direct EventStore usage in stores
- [ ] Add store configuration support
- [ ] Add store disposal patterns
- [ ] Update ServiceContainer registrations
- [ ] Test store initialization order
- [ ] Test store cleanup

#### **Phase 3: Manager System Overhaul**
- [ ] Remove `CommandManager.getInstance()`
- [ ] Remove `SelectionContextManager.getInstance()`
- [ ] Remove `FontManager.getInstance()`
- [ ] Remove `WebGLFilterEngine.getInstance()`
- [ ] Remove `ClipboardManager.getInstance()`
- [ ] Update all manager constructors
- [ ] Add manager configurations
- [ ] Register managers in ServiceContainer
- [ ] Test manager dependencies
- [ ] Test manager disposal

#### **Phase 4: Direct Usage Elimination**
- [ ] Fix 12+ files using `getTypedEventBus()`
- [ ] Update tool constructors for DI
- [ ] Create ToolFactory pattern
- [ ] Update all tool instantiation
- [ ] Fix text effects direct usage
- [ ] Fix drawing tools direct usage
- [ ] Test tool initialization
- [ ] Test tool cleanup

#### **Phase 5: Event Architecture Completion**
- [ ] Implement all missing event types
- [ ] Add event persistence system
- [ ] Add event replay system
- [ ] Add event validation
- [ ] Add event serialization
- [ ] Add event compression
- [ ] Test event sourcing flow
- [ ] Test time travel debugging

#### **Phase 6: Performance & Optimization**
- [ ] Implement event batching
- [ ] Implement event indexing
- [ ] Implement event compression
- [ ] Add performance monitoring
- [ ] Add memory management
- [ ] Optimize event queries
- [ ] Test performance benchmarks
- [ ] Test memory usage

### **Testing Strategy**

#### **Unit Tests (95% Coverage Required)**
```typescript
// Event system tests
describe('EventStore', () => {
  test('stores events without singleton pattern')
  test('handles concurrent event appending')
  test('maintains event ordering')
  test('supports event querying')
  test('handles disposal properly')
})

// Store tests
describe('Stores', () => {
  test('all stores initialize with DI')
  test('no store uses singleton patterns')
  test('stores handle event subscriptions')
  test('stores dispose properly')
})

// Manager tests
describe('Managers', () => {
  test('all managers use constructor injection')
  test('managers register in ServiceContainer')
  test('managers handle dependencies correctly')
  test('managers dispose resources')
})
```

#### **Integration Tests**
```typescript
describe('Event System Integration', () => {
  test('events flow from store to UI')
  test('event replay reconstructs state')
  test('event persistence works correctly')
  test('event batching improves performance')
  test('no memory leaks during long sessions')
})
```

#### **Performance Tests**
```typescript
describe('Event System Performance', () => {
  test('handles 10,000 events per second')
  test('memory usage stays under 100MB')
  test('event queries complete under 10ms')
  test('event persistence is non-blocking')
  test('batch processing improves throughput')
})
```

### **Rollback Strategy**

#### **Feature Flags (Not Used - Full Migration)**
Since this is a full migration with no backwards compatibility:
- No feature flags
- No gradual rollout
- Complete replacement of old patterns
- Comprehensive testing before deployment

#### **Rollback Plan**
- **Git Strategy**: Maintain working branch for each phase
- **Database Backup**: Full backup before event store changes
- **Configuration Rollback**: Ability to restore ServiceContainer config
- **Emergency Stop**: Ability to halt migration mid-phase

### **Risk Mitigation**

#### **High-Risk Areas**
1. **Event Store Replacement** - Core data storage
   - **Mitigation**: Comprehensive backup and restore procedures
   - **Testing**: Extensive data integrity tests
   - **Monitoring**: Real-time data validation

2. **ServiceContainer Changes** - Dependency resolution
   - **Mitigation**: Gradual service registration updates
   - **Testing**: Dependency resolution validation
   - **Monitoring**: Service health checks

3. **Store Initialization Order** - Race conditions
   - **Mitigation**: Explicit dependency declarations
   - **Testing**: Concurrent initialization tests
   - **Monitoring**: Initialization timing metrics

#### **Performance Risks**
1. **Event Volume** - High-frequency event generation
   - **Mitigation**: Event batching and compression
   - **Testing**: Load testing with realistic event volumes
   - **Monitoring**: Event processing metrics

2. **Memory Usage** - Event accumulation
   - **Mitigation**: Event cleanup and archival
   - **Testing**: Long-running memory tests
   - **Monitoring**: Memory usage tracking

---

## 📊 **Success Metrics**

### **Phase 1 Success Criteria**
- ✅ Zero singleton patterns in event system
- ✅ All services use constructor injection
- ✅ ServiceContainer manages all dependencies
- ✅ Event flow works end-to-end
- ✅ No memory leaks in event system

### **Phase 2 Success Criteria**
- ✅ Zero singleton functions in stores
- ✅ All stores use dependency injection
- ✅ Store initialization order is deterministic
- ✅ Store disposal works correctly
- ✅ No race conditions in store initialization

### **Phase 3 Success Criteria**
- ✅ Zero singleton patterns in managers
- ✅ All managers registered in ServiceContainer
- ✅ Manager dependencies resolved correctly
- ✅ Manager disposal prevents resource leaks
- ✅ No circular dependencies

### **Phase 4 Success Criteria**
- ✅ Zero direct singleton usage in codebase
- ✅ All tools use dependency injection
- ✅ Tool factory pattern implemented
- ✅ Tool initialization is consistent
- ✅ Tool cleanup prevents memory leaks

### **Phase 5 Success Criteria**
- ✅ Complete event sourcing implementation
- ✅ Event persistence working
- ✅ Event replay functionality
- ✅ Time travel debugging
- ✅ Event validation and serialization

### **Phase 6 Success Criteria**
- ✅ Event batching improves performance by 50%
- ✅ Event indexing enables fast queries
- ✅ Event compression reduces storage by 70%
- ✅ Memory usage stable over long sessions
- ✅ Performance benchmarks met

### **Overall Success Metrics**
- **Zero Technical Debt**: No singleton patterns anywhere
- **Full Dependency Injection**: 100% of services use DI
- **Performance**: 50% improvement in event processing
- **Memory**: Stable memory usage over 8+ hour sessions
- **Reliability**: Zero race conditions or initialization issues
- **Maintainability**: Clear dependency graph and service boundaries

---

## 🎯 **Final Architecture Vision**

After completing this migration, the event and store systems will achieve:

### **Complete Architectural Consistency**
- ✅ **Zero Singleton Patterns**: Every service uses dependency injection
- ✅ **Unified Event Sourcing**: Single source of truth for all state changes
- ✅ **Proper Resource Management**: All services dispose resources correctly
- ✅ **Deterministic Initialization**: Clear dependency order and phases

### **Enterprise-Grade Event System**
- ✅ **Event Persistence**: Durable storage with backup and recovery
- ✅ **Event Replay**: Time travel debugging and state reconstruction
- ✅ **Event Compression**: Efficient storage and fast queries
- ✅ **Event Batching**: High-performance event processing

---

## 🚨 **CRITICAL: Domain Model Migration**

### **Layer → Object Architecture Migration**

**IMPORTANT**: During this migration, we are **simultaneously migrating from Layer-based to Object-based architecture**. This affects event names, store structures, and domain terminology.

#### **Legacy (Being Removed):**
```typescript
// ❌ OLD: Layer-based (Photoshop-style)
interface Layer {
  id: string
  type: 'image' | 'text' | 'shape'
  visible: boolean
  opacity: number
  blendMode: string
  zIndex: number
}

// ❌ OLD Event Names
'layer.created'
'layer.updated' 
'layer.deleted'
'layer.moved'
'layer.reordered'

// ❌ OLD Store Names
LayerStore
EventLayerStore
getLayerStore()
```

#### **Modern (Target Architecture):**
```typescript
// ✅ NEW: Object-based (Figma/Sketch-style)
interface CanvasObject {
  id: string
  type: 'image' | 'text' | 'shape' | 'group'
  position: Point
  dimensions: Size
  properties: ObjectProperties
  parent?: string
  children?: string[]
}

// ✅ NEW Event Names
'object.created'
'object.updated'
'object.deleted'
'object.moved'
'object.reordered'

// ✅ NEW Store Names
ObjectStore
EventObjectStore
// No singleton functions - use ServiceContainer
```

### **Migration Rules for Implementers**

#### **1. Event Name Migration**
```typescript
// Replace ALL instances:
'layer.created' → 'object.created'
'layer.updated' → 'object.updated'
'layer.deleted' → 'object.deleted'
'layer.moved' → 'object.moved'
'layer.reordered' → 'object.reordered'
'layer.visibility.changed' → 'object.visibility.changed'
'layer.opacity.changed' → 'object.opacity.changed'
'layer.blendMode.changed' → 'object.blendMode.changed'
```

#### **2. Store/Manager Migration**
```typescript
// Replace ALL instances:
LayerStore → ObjectStore
LayerManager → ObjectManager
EventLayerStore → EventObjectStore
getLayerStore() → Remove (use ServiceContainer)
getLayerManager() → Remove (use ServiceContainer)

// File renames required:
lib/store/layers/ → lib/store/objects/
lib/editor/layers/ → lib/editor/objects/
lib/events/layers/ → lib/events/objects/
```

#### **3. Variable/Property Migration**
```typescript
// Replace ALL instances:
layerId → objectId
layerStore → objectStore
layerManager → objectManager
currentLayer → currentObject
selectedLayers → selectedObjects
layerTree → objectTree
layerHierarchy → objectHierarchy
```

#### **4. Interface/Type Migration**
```typescript
// Replace ALL instances:
interface Layer → interface CanvasObject
type LayerType → type ObjectType
LayerEvent → ObjectEvent
LayerState → ObjectState
LayerConfig → ObjectConfig
LayerProperties → ObjectProperties
```

### **Why This Migration is Critical**

#### **Modern Design Tool Pattern**
- **Figma/Sketch Model**: Objects with parent-child relationships
- **Flexible Hierarchy**: Groups, nested objects, complex compositions
- **Performance**: Better for complex documents with many elements
- **User Mental Model**: Users think in terms of "objects" not "layers"

#### **Technical Benefits**
- **Composition**: Objects can contain other objects
- **Flexibility**: Dynamic parent-child relationships
- **Performance**: Better memory usage and rendering
- **Extensibility**: Easier to add new object types

### **Implementation Priority**

#### **Phase 1: Core Infrastructure** 
```typescript
// FIRST: Update event system with object events
container.registerSingleton('ObjectStore', () => {
  return new EventObjectStore(
    container.getSync<EventStore>('EventStore'),
    container.getSync<TypedEventBus>('TypedEventBus'),
    { persistence: true, validation: true }
  )
}, {
  dependencies: ['EventStore', 'TypedEventBus'],
  phase: 'infrastructure'
})

// NOT: LayerStore (remove entirely)
```

#### **Phase 2: Event Definitions**
```typescript
// lib/events/objects/ObjectEvents.ts (NEW FILE)
export class ObjectCreatedEvent extends Event {
  constructor(
    canvasId: string,
    object: CanvasObject,
    metadata: Event['metadata']
  ) {
    super('object.created', canvasId, 'object', metadata)
  }
}

// Remove: lib/events/layers/ (entire directory)
```

#### **Phase 3: Store Implementation**
```typescript
// lib/store/objects/ObjectStore.ts (NEW FILE)
export class EventObjectStore extends BaseStore<ObjectState> {
  constructor(
    eventStore: EventStore,
    typedEventBus: TypedEventBus,
    config: ObjectStoreConfig = {}
  ) {
    super(initialObjectState, eventStore)
    // Object-specific logic, not layer logic
  }
}

// Remove: lib/store/layers/ (entire directory)
```

### **File Structure Changes Required**

```bash
# REMOVE these directories entirely:
lib/store/layers/
lib/editor/layers/
lib/events/layers/
components/editor/Panels/LayersPanel/

# CREATE these new directories:
lib/store/objects/
lib/editor/objects/
lib/events/objects/
components/editor/Panels/ObjectsPanel/

# RENAME these files:
LayerManager.ts → ObjectManager.ts
LayerStore.ts → ObjectStore.ts
LayerEvents.ts → ObjectEvents.ts
```

### **Testing Strategy for Domain Migration**

```typescript
describe('Layer to Object Migration', () => {
  test('no layer references remain in codebase', () => {
    // Scan all files for 'layer' references
    // Ensure only intentional layer references (like CSS layers)
  })
  
  test('all object events are properly defined', () => {
    // Verify object event types exist
    // Verify object event handlers work
  })
  
  test('object store replaces layer store functionality', () => {
    // Verify object CRUD operations
    // Verify object hierarchy management
  })
})
```

### **Validation Checklist**

- [ ] **Zero "layer" references** in TypeScript files (except CSS/styling)
- [ ] **All object events** properly defined and registered
- [ ] **Object store** handles hierarchy and composition
- [ ] **UI components** use "object" terminology
- [ ] **Event names** use object.* pattern
- [ ] **File structure** reflects object-based architecture



This foundation will support all subsequent refactoring phases (Commands, Tools, Adapters) with a rock-solid, enterprise-grade event and store architecture. 