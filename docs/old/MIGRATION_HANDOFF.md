# Migration Handoff Document

## Current State Summary

We're migrating FotoFun from Fabric.js to Konva.js with a robust event-sourced architecture. The architectural improvements are COMPLETE, canvas migration is COMPLETE, and store migration is IN PROGRESS.

## Critical Context

### 1. The Original Problem We Solved
- **Selection drift**: When user clicked another image during AI workflow, operations would apply to wrong image
- **Broken undo/redo**: Only worked for some operations, not full workflows
- **State corruption**: Tools directly manipulated canvas without proper isolation

### 2. Our Solution
- **Event sourcing**: All state changes are events
- **ExecutionContext**: Locks selection at workflow start
- **TypedEventBus**: Type-safe event system
- **Dependency injection**: Proper service lifecycle

## Architecture Overview

### Core Systems (✅ Complete)
```typescript
// 1. Dependency Injection
ServiceContainer - lib/core/ServiceContainer.ts
ResourceManager - lib/core/ResourceManager.ts
AppInitializer - lib/core/AppInitializer.ts

// 2. Event System
Event - lib/events/core/Event.ts
EventStore - lib/events/core/EventStore.ts
ExecutionContext - lib/events/execution/ExecutionContext.ts
TypedEventBus - lib/events/core/TypedEventBus.ts

// 3. Stores
BaseStore - lib/store/base/BaseStore.ts
TypedCanvasStore - lib/store/canvas/TypedCanvasStore.ts
EventToolStore - lib/store/tools/EventToolStore.ts
EventLayerStore - lib/store/layers/EventLayerStore.ts
EventSelectionStore - lib/store/selection/EventSelectionStore.ts

// 4. Canvas
CanvasManager - lib/editor/canvas/CanvasManager.ts (✅ fully migrated)
CanvasManagerFactory - lib/editor/canvas/CanvasManagerFactory.ts
Canvas Types - lib/editor/canvas/types.ts
```

### Event Types Created (✅ Complete)
- `lib/events/canvas/LayerEvents.ts` - All layer operations
- `lib/events/canvas/SelectionEvents.ts` - All selection operations  
- `lib/events/canvas/DocumentEvents.ts` - Document lifecycle
- `lib/events/canvas/ToolEvents.ts` - Tool operations

## What's Been Completed

### Phase 1: Core Architecture ✅
- Dependency injection with ServiceContainer
- Event sourcing with EventStore
- TypedEventBus for type-safe events
- Resource management for cleanup

### Phase 2: Canvas Migration ✅
- Full Konva-based CanvasManager implementation
- Pixel operations (getImageData, putImageData)
- Selection rendering with marching ants
- Filter application system
- Transform operations
- ServiceContainerProvider integration
- Canvas component using new CanvasManager

### Phase 3: Store Migration 🚧 (Partially Complete)
Completed:
- ✅ EventToolStore - Tool management with events
- ✅ EventLayerStore - Layer management with TypedEventBus
- ✅ EventSelectionStore - Selection state with events

Remaining:
- 📋 DocumentStore → Event-driven
- 📋 ColorStore → Event-driven
- 📋 PerformanceStore → Event-driven

## What Needs Implementation

### 1. Complete Store Migration
Remaining stores to migrate:
- `store/documentStore.ts` → Create EventDocumentStore
- `store/colorStore.ts` → Create EventColorStore
- `store/performanceStore.ts` → Create EventPerformanceStore

### 2. Update UI Components
Components that need updating to use new stores:
- **ToolPalette** → Use EventToolStore
- **LayersPanel** → Use EventLayerStore
- **OptionsBar** → Use new stores
- **StatusBar** → Use new stores
- **All Panels** → Update to event-driven stores

### 3. Migrate Tools (In Progress by Another Agent)
The tool migration is being handled by another agent. Focus on:
- Store migration completion
- UI component updates
- Integration testing

### 4. Update Tool Adapters
The AI tool adapters in `lib/ai/adapters/tools/` need updating to:
- Use new `CanvasManager` instead of Fabric canvas
- Work with `ExecutionContext` for event emission
- Preserve selection state during execution

## Key Implementation Patterns

### 1. Event Store Pattern
```typescript
class EventMyStore extends BaseStore<MyState> {
  constructor(eventStore: EventStore, typedEventBus: TypedEventBus) {
    super(initialState, eventStore)
    this.typedEventBus = typedEventBus
  }
  
  protected getEventHandlers() {
    return new Map() // Use TypedEventBus instead
  }
  
  initialize() {
    this.typedEventBus.on('event.type', (data) => {
      this.setState(state => ({ ...state, ...changes }))
    })
  }
}
```

### 2. Using New Stores in Components
```typescript
function MyComponent() {
  const toolStore = useService<EventToolStore>('ToolStore')
  const toolState = useStore(toolStore)
  
  const activeTool = toolStore.getActiveTool()
  
  const handleToolChange = async (toolId: string) => {
    await toolStore.activateTool(toolId)
  }
}
```

### 3. Service Registration
```typescript
// In AppInitializer
container.registerSingleton('MyStore', () => {
  const MyStore = require('@/lib/store/my/MyStore').MyStore
  const store = new MyStore(
    container.get('EventStore'),
    container.get('TypedEventBus')
  )
  store.initialize()
  return store
})
```

## Testing Approach

1. **Unit tests**: Each store should have tests
2. **Integration tests**: Test store + events + UI
3. **AI workflow tests**: Ensure selection preservation

## Common Pitfalls to Avoid

1. **Don't use old Zustand patterns** - Use BaseStore
2. **Don't forget to initialize stores** - Call initialize()
3. **Don't skip TypedEventBus** - It ensures consistency
4. **Don't access private eventStore** - Use constructor pattern

## Quick Start Commands

```bash
# Check current status
cat docs/ARCHITECTURAL_MIGRATION_STATUS.md

# Run type checking
bun typecheck

# See what needs fixing
bun lint

# Test the application
bun dev
```

## Success Criteria

1. All stores migrated to event-driven architecture
2. All UI components using new stores
3. No references to old Zustand stores
4. AI workflows preserve selection properly
5. Undo/redo works for all operations

## Final Notes

- Canvas migration is COMPLETE ✅
- Store migration is IN PROGRESS 🚧
- Focus on completing remaining stores
- Update UI components systematically
- Test thoroughly before removing old code

Good luck with the implementation! 🚀 