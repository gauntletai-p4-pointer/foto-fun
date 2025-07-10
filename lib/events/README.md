# Event Sourcing System

## Overview

This directory contains the new event-sourced architecture that replaces the command pattern. The system provides:

- **Robust Selection Management**: Selection is locked at context creation time
- **Workflow Isolation**: Each workflow executes in its own isolated context
- **Complete Audit Trail**: Every change is recorded as an event
- **Version History**: Can restore to any point in time
- **Better Undo/Redo**: Can undo entire workflows or individual operations

## Architecture

### Core Components

1. **Event** (`core/Event.ts`)
   - Base class for all events
   - Immutable records of state changes
   - Support for reversal (undo)
   - Metadata tracking (source, workflow, correlation)

2. **EventStore** (`core/EventStore.ts`)
   - Central storage for all events
   - Append-only, immutable
   - Supports queries and subscriptions
   - Version tracking for optimistic concurrency

3. **ExecutionContext** (`execution/ExecutionContext.ts`)
   - Isolated environment for operations
   - Locks selection at creation time
   - Collects events before committing
   - Supports nested contexts for sub-operations

4. **EventBasedToolChain** (`execution/EventBasedToolChain.ts`)
   - Replaces the old ToolChain
   - Executes multiple tools with locked selection
   - Preserves user selection after execution
   - Atomic commit/rollback of all operations

5. **EventBasedHistoryStore** (`history/EventBasedHistoryStore.ts`)
   - Replaces the old historyStore
   - Manages undo/redo through events
   - Supports workflow-level undo
   - Subscribes to EventStore for automatic tracking

### Event Types

1. **Canvas Events** (`canvas/CanvasEvents.ts`)
   - ObjectAddedEvent
   - ObjectRemovedEvent
   - ObjectModifiedEvent
   - ObjectsBatchModifiedEvent
   - CanvasBackgroundChangedEvent
   - CanvasResizedEvent

2. **Workflow Events** (`execution/EventBasedToolChain.ts`)
   - WorkflowStartedEvent
   - WorkflowCompletedEvent

3. **Selection Events** (future)
   - SelectionCreatedEvent
   - SelectionModifiedEvent
   - SelectionClearedEvent

## Usage Examples

### Creating an Execution Context

```typescript
// From current canvas state
const context = await ExecutionContextFactory.fromCanvas(canvas, 'user')

// With specific selection
const context = await ExecutionContextFactory.fromSelection(canvas, objects, 'ai')

// From existing snapshot
const context = ExecutionContextFactory.fromSnapshot(canvas, snapshot, 'system')
```

### Emitting Events

```typescript
// Create and emit an event
const event = new ObjectModifiedEvent(
  canvasId,
  object,
  previousState,
  newState,
  context.getMetadata()
)

await context.emit(event)

// Commit all events
await context.commit()

// Or rollback if something goes wrong
context.rollback()
```

### Using EventBasedToolChain

```typescript
// Create a tool chain
const chain = await EventBasedToolChainFactory.fromCanvas(canvas, {
  description: 'Apply filters',
  preserveSelection: true
})

// Add steps
chain.addStep({
  tool: 'brightness',
  params: { value: 20 },
  continueOnError: false
})

chain.addStep({
  tool: 'contrast',
  params: { value: 10 },
  continueOnError: false
})

// Execute
const results = await chain.execute()
```

### History Management

```typescript
// Start a new execution
const context = await eventHistoryStore.startExecution(canvas, 'user')

// Do some work...
await context.emit(event)

// Commit the execution
await eventHistoryStore.commitExecution(context)

// Undo/Redo
await eventHistoryStore.undo()
await eventHistoryStore.redo()
```

## Migration Status

### Completed ✅
- Event base classes
- EventStore implementation
- ExecutionContext with selection locking
- Canvas events
- EventBasedHistoryStore
- EventBasedToolChain
- CommandAdapter for backward compatibility
- BaseToolAdapter event emission

### In Progress 🚧
- Tool adapter migration
- AI agent integration
- UI component updates

### Planned 📋
- Selection events
- Layer events
- Version history UI
- Event persistence to IndexedDB
- Event replay for debugging

## Benefits Over Command Pattern

1. **Selection Consistency**: Selection is captured at the start of an operation and cannot change
2. **Workflow Atomicity**: All operations in a workflow succeed or fail together
3. **Event Sourcing**: Complete history of all changes, not just commands
4. **Time Travel**: Can restore to any point in history, not just undo/redo
5. **Debugging**: Can replay events to reproduce issues
6. **Concurrency**: Multiple contexts can execute without interference
7. **Audit Trail**: Know exactly who did what and when

## Future Enhancements

1. **Event Persistence**: Save events to IndexedDB or server
2. **Event Streaming**: Real-time collaboration through event streams
3. **Event Replay**: Debug by replaying event sequences
4. **Branching History**: Create alternative timelines
5. **Selective Undo**: Undo specific operations without affecting others
6. **Event Compression**: Optimize storage by compressing event sequences 