# Event System Migration Plan

## Overview

This document outlines the migration from the current Command pattern to the new Event Sourcing architecture. The migration will be done incrementally to ensure system stability.

## Migration Phases

### Phase 1: Infrastructure Setup ✅
- [x] Create Event base classes
- [x] Create EventStore
- [x] Create ExecutionContext
- [x] Create Canvas events
- [x] Create EventBasedHistoryStore
- [x] Create EventBasedToolChain
- [x] Create CommandAdapter for backward compatibility

### Phase 2: Tool Adapter Migration
- [ ] Update BaseToolAdapter to emit events
- [ ] Update all tool adapters to use ExecutionContext
- [ ] Update filter tools to emit events properly
- [ ] Remove direct command creation from tools

### Phase 3: AI Agent Migration
- [ ] Update BaseExecutionAgent to use EventBasedToolChain
- [ ] Update ImageImprovementAgent to use events
- [ ] Update CreativeEnhancementAgent to use events
- [ ] Update BatchProcessingAgent to use events
- [ ] Update MasterRoutingAgent to coordinate with events

### Phase 4: UI Integration
- [ ] Update useToolCallHandler to use EventBasedToolChain
- [ ] Update canvas store to use event system
- [ ] Update history UI components to use EventBasedHistoryStore
- [ ] Add version history UI

### Phase 5: Cleanup
- [ ] Remove old Command classes
- [ ] Remove old historyStore
- [ ] Remove old ToolChain
- [ ] Remove CommandAdapter
- [ ] Update all imports

## Key Changes

### 1. Tool Execution Flow

**Before:**
```typescript
// Tool creates command
const command = new ModifyCommand(canvas, object, modifications)
historyStore.executeCommand(command)
```

**After:**
```typescript
// Tool emits event through context
const event = new ObjectModifiedEvent(canvasId, object, prevState, newState, metadata)
await context.emit(event)
```

### 2. AI Workflow Execution

**Before:**
```typescript
const chain = new ToolChain(options)
chain.addStep(step)
await chain.execute()
```

**After:**
```typescript
const chain = EventBasedToolChainFactory.fromCanvas(canvas, options)
chain.addStep(step)
await chain.execute()
```

### 3. History Management

**Before:**
```typescript
historyStore.undo() // Undoes last command
```

**After:**
```typescript
eventHistoryStore.undo() // Undoes last event (or group of events)
```

## Benefits

1. **Robust Selection Management**: Selection is locked at context creation
2. **Workflow Isolation**: Each workflow has its own context
3. **Event Sourcing**: Complete audit trail of all changes
4. **Version History**: Can restore to any point in time
5. **Better Undo/Redo**: Can undo entire workflows or individual operations
6. **Concurrent Operations**: Multiple contexts can run without interference

## Migration Strategy

1. **Parallel Systems**: Run both systems in parallel initially
2. **Gradual Migration**: Migrate one component at a time
3. **Testing**: Extensive testing at each phase
4. **Rollback Plan**: CommandAdapter allows easy rollback
5. **Feature Flag**: Use feature flag to switch between systems

## Risk Mitigation

1. **Data Loss**: Event store persists to storage
2. **Performance**: Events are indexed for fast queries
3. **Compatibility**: CommandAdapter ensures backward compatibility
4. **User Experience**: UI changes are minimal
5. **Bugs**: Comprehensive error handling and logging 