# Command and Selection Context Architecture

## Overview

This document outlines the comprehensive architectural plan for improving the command and selection systems in FotoFun, with a specific focus on maintaining context for AI-driven workflows.

### Core Problems Identified

1. **AI Context Loss**: The AI loses selection context between sequential tool calls because:
   - Each tool execution can modify the canvas state (add/remove objects)
   - Selection is based on object IDs, which become invalid if objects are replaced
   - No persistent selection context across the entire AI workflow

2. **Dual Command Systems**: Two competing command implementations create confusion:
   - `lib/commands/enhanced/` - Zod-based with middleware
   - `lib/editor/commands/` - Traditional command pattern with events

3. **Selection State Fragmentation**: Multiple systems managing selection:
   - SelectionContext
   - SelectionSnapshot
   - SelectionManager
   - No unified approach for AI workflows

### Goals

1. **Unified Command System**: Single, clear command pattern integrated with event system
2. **Robust Selection Context**: Maintain selection across AI operations even when objects change
3. **AI-First Design**: Built specifically to support multi-step AI workflows
4. **Full Undo/Redo**: Complete history support for all operations
5. **Maintainable Architecture**: Clean, extensible design following established patterns 

## Phase 1: Unified Command System

### 1.1 Remove Redundancy

**Action**: Delete the enhanced command system
- [ ] Remove `lib/commands/enhanced/` directory entirely
- [ ] Remove any imports/references to enhanced commands
- [ ] Keep `lib/editor/commands/` as the single command implementation

### 1.2 Enhanced Base Command

**Location**: `lib/editor/commands/base/Command.ts`

```typescript
export abstract class Command implements ICommand {
  readonly id: string
  readonly timestamp: number
  readonly description: string
  
  // NEW: Execution context for AI workflows
  protected executionContext?: ExecutionContext
  protected selectionSnapshot?: SelectionSnapshot
  
  // NEW: Command metadata for better tracking
  readonly metadata: {
    source: 'user' | 'ai' | 'system'
    workflowId?: string
    parentCommandId?: string
    canMerge: boolean
    affectsSelection: boolean
  }
  
  constructor(description: string, metadata?: Partial<Command['metadata']>) {
    this.id = nanoid()
    this.timestamp = Date.now()
    this.description = description
    this.metadata = {
      source: 'user',
      canMerge: false,
      affectsSelection: true,
      ...metadata
    }
  }
  
  // NEW: Set execution context for AI operations
  setExecutionContext(context: ExecutionContext): void {
    this.executionContext = context
  }
  
  // NEW: Set selection snapshot for consistent targeting
  setSelectionSnapshot(snapshot: SelectionSnapshot): void {
    this.selectionSnapshot = snapshot
  }
  
  // Enhanced execute with automatic event emission
  async execute(): Promise<void> {
    const eventBus = ServiceContainer.getInstance().getSync<TypedEventBus>('TypedEventBus')
    
    try {
      // Emit command started event
      eventBus.emit('command.started', {
        commandId: this.id,
        description: this.description,
        metadata: this.metadata
      })
      
      // Execute with snapshot if available
      if (this.selectionSnapshot) {
        await this.executeWithSnapshot()
      } else {
        await this.doExecute()
      }
      
      // Emit command completed
      eventBus.emit('command.completed', {
        commandId: this.id,
        success: true
      })
      
    } catch (error) {
      // Emit command failed
      eventBus.emit('command.failed', {
        commandId: this.id,
        error: error.message
      })
      throw error
    }
  }
  
  // NEW: Execute with selection snapshot
  protected async executeWithSnapshot(): Promise<void> {
    // Default implementation - subclasses can override
    await this.doExecute()
  }
  
  // Renamed from execute() to avoid confusion
  protected abstract doExecute(): Promise<void>
}
```

### 1.3 Command Manager

**Location**: `lib/editor/commands/CommandManager.ts` (NEW)

```typescript
export class CommandManager {
  private static instance: CommandManager
  private executionQueue: Command[] = []
  private isExecuting = false
  
  static getInstance(): CommandManager {
    if (!CommandManager.instance) {
      CommandManager.instance = new CommandManager()
    }
    return CommandManager.instance
  }
  
  // Execute a single command
  async executeCommand(command: Command): Promise<void> {
    const historyStore = ServiceContainer.getInstance().getSync<EventBasedHistoryStore>('HistoryStore')
    
    // Add to history before execution
    historyStore.addCommand(command)
    
    try {
      await command.execute()
    } catch (error) {
      // Automatic rollback handled by history store
      throw error
    }
  }
  
  // Execute commands with shared selection context
  async executeWithSelectionContext(
    commands: Command[],
    selectionSnapshot: SelectionSnapshot,
    workflowId: string
  ): Promise<void> {
    // Set the same snapshot on all commands
    commands.forEach(cmd => {
      cmd.setSelectionSnapshot(selectionSnapshot)
      cmd.metadata.workflowId = workflowId
    })
    
    // Execute in sequence
    for (const command of commands) {
      await this.executeCommand(command)
    }
  }
  
  // Batch execution with transaction support
  async executeBatch(
    commands: Command[],
    options: {
      atomic?: boolean // All succeed or all fail
      continueOnError?: boolean
    } = {}
  ): Promise<BatchExecutionResult> {
    const results: CommandExecutionResult[] = []
    
    for (const command of commands) {
      try {
        await this.executeCommand(command)
        results.push({ command, success: true })
      } catch (error) {
        results.push({ command, success: false, error })
        
        if (options.atomic) {
          // Rollback all successful commands
          await this.rollbackCommands(results.filter(r => r.success).map(r => r.command))
          throw new BatchExecutionError('Batch execution failed', results)
        }
        
        if (!options.continueOnError) {
          break
        }
      }
    }
    
    return { results, allSucceeded: results.every(r => r.success) }
  }
}
```

### 1.4 Update Existing Commands

**Tasks**:
- [ ] Update all command classes to extend from enhanced base
- [ ] Change `execute()` to `doExecute()` in all command implementations
- [ ] Add metadata to command constructors where appropriate
- [ ] Update commands that need selection context support

**Example Migration**:
```typescript
// Before
export class AddTextCommand extends Command {
  async execute(): Promise<void> {
    // implementation
  }
}

// After
export class AddTextCommand extends Command {
  constructor(/* params */) {
    super('Add text', {
      source: 'user',
      affectsSelection: false
    })
  }
  
  protected async doExecute(): Promise<void> {
    // implementation
  }
}
```

### 1.5 Event Types for Commands

**Location**: `lib/events/core/TypedEventBus.ts`

Add new event types:
```typescript
// Command events
'command.started': {
  commandId: string
  description: string
  metadata: Record<string, unknown>
}
'command.completed': {
  commandId: string
  success: boolean
}
'command.failed': {
  commandId: string
  error: string
}
'command.undone': {
  commandId: string
}
'command.redone': {
  commandId: string
}
``` 

## Phase 2: Robust Selection System

### 2.1 Selection Context Manager

**Location**: `lib/editor/selection/SelectionContextManager.ts` (NEW)

```typescript
export interface WorkflowSelectionContext {
  workflowId: string
  originalSnapshot: SelectionSnapshot
  currentSnapshot: SelectionSnapshot
  objectMapping: Map<string, string> // old ID -> new ID
  createdAt: number
  expiresAt: number
}

export class SelectionContextManager {
  private static instance: SelectionContextManager
  private workflowSelections: Map<string, WorkflowSelectionContext> = new Map()
  
  static getInstance(): SelectionContextManager {
    if (!SelectionContextManager.instance) {
      SelectionContextManager.instance = new SelectionContextManager()
    }
    return SelectionContextManager.instance
  }
  
  // Create a workflow-scoped selection context
  createWorkflowContext(
    workflowId: string,
    canvas: CanvasManager
  ): WorkflowSelectionContext {
    const snapshot = SelectionSnapshotFactory.fromCanvas(canvas)
    
    const context: WorkflowSelectionContext = {
      workflowId,
      originalSnapshot: snapshot,
      currentSnapshot: snapshot,
      objectMapping: new Map(),
      createdAt: Date.now(),
      expiresAt: Date.now() + 300000 // 5 minutes
    }
    
    this.workflowSelections.set(workflowId, context)
    this.startExpirationTimer(workflowId)
    
    return context
  }
  
  // Get objects for current workflow, handling ID changes
  getWorkflowObjects(workflowId: string, canvas: CanvasManager): CanvasObject[] {
    const context = this.workflowSelections.get(workflowId)
    if (!context) return []
    
    const objects: CanvasObject[] = []
    
    // Try to find objects by current IDs
    for (const originalId of context.originalSnapshot.objectIds) {
      // Check if ID was remapped
      const currentId = context.objectMapping.get(originalId) || originalId
      const obj = canvas.findObject(currentId)
      
      if (obj) {
        objects.push(obj)
      } else {
        // Try to find by similarity (position, type, etc.)
        const originalMetadata = context.originalSnapshot.objectMetadata.get(originalId)
        if (originalMetadata) {
          const similar = this.findSimilarObject(originalMetadata, canvas)
          if (similar) {
            context.objectMapping.set(originalId, similar.id)
            objects.push(similar)
          }
        }
      }
    }
    
    // Update current snapshot
    context.currentSnapshot = SelectionSnapshotFactory.fromObjects(objects)
    
    return objects
  }
  
  // Update mapping when objects are replaced
  updateObjectMapping(
    workflowId: string,
    oldId: string,
    newId: string
  ): void {
    const context = this.workflowSelections.get(workflowId)
    if (context) {
      context.objectMapping.set(oldId, newId)
    }
  }
  
  // Find similar object by characteristics
  private findSimilarObject(
    metadata: ObjectMetadata,
    canvas: CanvasManager
  ): CanvasObject | null {
    const candidates = canvas.getObjects().filter(obj => 
      obj.type === metadata.type &&
      Math.abs(obj.transform.x - metadata.position.x) < 5 &&
      Math.abs(obj.transform.y - metadata.position.y) < 5 &&
      obj.layerId === metadata.layerId
    )
    
    // If multiple candidates, use the one with closest signature match
    if (candidates.length > 1) {
      return candidates.find(c => 
        this.generateObjectSignature(c) === metadata.signature
      ) || candidates[0]
    }
    
    return candidates[0] || null
  }
  
  // Clean up expired contexts
  private startExpirationTimer(workflowId: string): void {
    setTimeout(() => {
      const context = this.workflowSelections.get(workflowId)
      if (context && Date.now() > context.expiresAt) {
        this.workflowSelections.delete(workflowId)
      }
    }, 300000) // Check after 5 minutes
  }
}
```

### 2.2 Enhanced Selection Snapshot

**Location**: `lib/ai/execution/SelectionSnapshot.ts` (ENHANCE)

```typescript
export interface ObjectMetadata {
  id: string
  type: string
  position: { x: number; y: number }
  size: { width: number; height: number }
  layerId: string
  zIndex: number
  signature: string // Hash of key properties
  // Additional metadata for better recovery
  style?: Record<string, unknown>
  data?: unknown
}

export class SelectionSnapshot {
  // ... existing properties ...
  
  // NEW: Detailed object metadata for recovery
  public readonly objectMetadata: ReadonlyMap<string, ObjectMetadata>
  
  constructor(objects: CanvasObject[]) {
    // ... existing constructor ...
    
    // Capture detailed metadata
    const metadata = new Map<string, ObjectMetadata>()
    objects.forEach((obj, index) => {
      metadata.set(obj.id, {
        id: obj.id,
        type: obj.type,
        position: { x: obj.transform.x, y: obj.transform.y },
        size: this.getObjectSize(obj),
        layerId: obj.layerId,
        zIndex: index,
        signature: this.generateObjectSignature(obj),
        style: obj.style,
        data: obj.type === 'text' ? obj.data : undefined
      })
    })
    
    this.objectMetadata = Object.freeze(metadata)
  }
  
  // Generate a signature for object identification
  private generateObjectSignature(obj: CanvasObject): string {
    const key = `${obj.type}-${Math.round(obj.transform.x)}-${Math.round(obj.transform.y)}-${obj.layerId}`
    return btoa(key).substring(0, 8)
  }
  
  // Get object size based on type
  private getObjectSize(obj: CanvasObject): { width: number; height: number } {
    // Implementation depends on object type
    // This is a placeholder
    return { width: 100, height: 100 }
  }
  
  // NEW: Get object by ID
  getObjectById(id: string): CanvasObject | null {
    return this.objects.find(obj => obj.id === id) || null
  }
  
  // NEW: Find objects in new canvas state
  findObjectsInCanvas(canvas: CanvasManager): CanvasObject[] {
    const found: CanvasObject[] = []
    const usedIds = new Set<string>()
    
    for (const [originalId, metadata] of this.objectMetadata) {
      // Try direct ID lookup first
      let obj = canvas.findObject(originalId)
      
      // If not found, try by signature
      if (!obj) {
        const allObjects = canvas.getObjects()
        obj = allObjects.find(o => 
          !usedIds.has(o.id) &&
          this.generateObjectSignature(o) === metadata.signature
        )
      }
      
      // If still not found, try by similarity
      if (!obj) {
        obj = this.findSimilarObject(metadata, canvas, usedIds)
      }
      
      if (obj) {
        found.push(obj)
        usedIds.add(obj.id)
      }
    }
    
    return found
  }
  
  private findSimilarObject(
    metadata: ObjectMetadata,
    canvas: CanvasManager,
    excludeIds: Set<string>
  ): CanvasObject | null {
    const candidates = canvas.getObjects().filter(obj =>
      !excludeIds.has(obj.id) &&
      obj.type === metadata.type &&
      obj.layerId === metadata.layerId &&
      Math.abs(obj.transform.x - metadata.position.x) < 10 &&
      Math.abs(obj.transform.y - metadata.position.y) < 10
    )
    
    return candidates[0] || null
  }
}
```

### 2.3 Selection Manager Integration

**Location**: `lib/editor/selection/SelectionManager.ts` (ENHANCE)

Add workflow support:
```typescript
export class SelectionManager {
  // ... existing code ...
  
  private workflowContext?: WorkflowSelectionContext
  
  // NEW: Set workflow context for AI operations
  setWorkflowContext(context: WorkflowSelectionContext): void {
    this.workflowContext = context
  }
  
  // NEW: Get selection with workflow awareness
  getWorkflowAwareSelection(): CanvasObject[] {
    if (!this.workflowContext) {
      return this.getSelectedObjects()
    }
    
    const contextManager = SelectionContextManager.getInstance()
    return contextManager.getWorkflowObjects(
      this.workflowContext.workflowId,
      this.canvasManager
    )
  }
  
  // ENHANCE: Update selection to track workflow changes
  applySelection(mask: ImageData, mode: SelectionMode): void {
    // ... existing implementation ...
    
    // If in workflow context, update the snapshot
    if (this.workflowContext) {
      const selectedObjects = this.getSelectedObjects()
      this.workflowContext.currentSnapshot = SelectionSnapshotFactory.fromObjects(selectedObjects)
    }
  }
}
```

### 2.4 Tasks

- [ ] Create SelectionContextManager class
- [ ] Enhance SelectionSnapshot with metadata and recovery methods
- [ ] Add workflow context support to SelectionManager
- [ ] Create unit tests for object recovery scenarios
- [ ] Add integration tests for multi-step workflows 

## Phase 3: AI Integration

### 3.1 Enhanced Canvas Context

**Location**: `lib/ai/tools/canvas-bridge.ts` (ENHANCE)

```typescript
export interface WorkflowObjectTracking {
  created: Set<string>
  modified: Set<string>
  deleted: Set<string>
}

export interface TargetingIntent {
  mode: 'user-selection' | 'all-images' | 'workflow-created' | 'specific-ids'
  description: string // "the images the user selected" | "all images on canvas" etc.
}

export interface EnhancedCanvasContext extends CanvasContext {
  // Workflow-scoped selection that persists across tool calls
  workflowSelection?: WorkflowSelectionContext
  
  // Track what objects were created/modified in this workflow
  workflowObjects: WorkflowObjectTracking
  
  // Maintain targeting intent across operations
  targetingIntent: TargetingIntent
}

export class EnhancedCanvasToolBridge {
  private static workflowContexts: Map<string, EnhancedCanvasContext> = new Map()
  
  static createWorkflowContext(
    workflowId: string,
    canvas: CanvasManager
  ): EnhancedCanvasContext {
    const base = this.getCanvasContext()
    if (!base) {
      throw new Error('No canvas context available')
    }
    
    const selectionManager = SelectionContextManager.getInstance()
    
    const context: EnhancedCanvasContext = {
      ...base,
      workflowSelection: selectionManager.createWorkflowContext(workflowId, canvas),
      workflowObjects: {
        created: new Set(),
        modified: new Set(),
        deleted: new Set()
      },
      targetingIntent: this.determineTargetingIntent(base)
    }
    
    this.workflowContexts.set(workflowId, context)
    return context
  }
  
  static getWorkflowContext(workflowId: string): EnhancedCanvasContext | null {
    return this.workflowContexts.get(workflowId) || null
  }
  
  // Update context when objects change
  static updateWorkflowContext(
    workflowId: string,
    changes: {
      created?: string[]
      modified?: string[]
      deleted?: string[]
      remapped?: Array<{ oldId: string; newId: string }>
    }
  ): void {
    const context = this.workflowContexts.get(workflowId)
    if (!context) return
    
    // Update object tracking
    changes.created?.forEach(id => context.workflowObjects.created.add(id))
    changes.modified?.forEach(id => context.workflowObjects.modified.add(id))
    changes.deleted?.forEach(id => context.workflowObjects.deleted.add(id))
    
    // Update ID mappings
    changes.remapped?.forEach(({ oldId, newId }) => {
      const selectionManager = SelectionContextManager.getInstance()
      selectionManager.updateObjectMapping(workflowId, oldId, newId)
    })
  }
  
  // Get current target objects for workflow
  static getWorkflowTargetObjects(workflowId: string, canvas: CanvasManager): CanvasObject[] {
    const context = this.workflowContexts.get(workflowId)
    if (!context || !context.workflowSelection) {
      return []
    }
    
    const selectionManager = SelectionContextManager.getInstance()
    return selectionManager.getWorkflowObjects(workflowId, canvas)
  }
  
  private static determineTargetingIntent(context: CanvasContext): TargetingIntent {
    if (context.targetingMode === 'selection') {
      return {
        mode: 'user-selection',
        description: 'the images the user selected'
      }
    } else if (context.targetingMode === 'all') {
      return {
        mode: 'all-images',
        description: 'all images on the canvas'
      }
    } else if (context.targetingMode === 'auto-single') {
      return {
        mode: 'all-images',
        description: 'the single image on the canvas'
      }
    }
    
    return {
      mode: 'specific-ids',
      description: 'specific objects'
    }
  }
}
```

### 3.2 Enhanced Tool Chain

**Location**: `lib/ai/execution/EventBasedToolChain.ts` (ENHANCE)

```typescript
export class EnhancedEventBasedToolChain extends EventBasedToolChain {
  private workflowContext: EnhancedCanvasContext
  private commandManager: CommandManager
  
  constructor(options: ToolChainOptions & { workflowId: string }) {
    super(options)
    
    // Create workflow context
    this.workflowContext = EnhancedCanvasToolBridge.createWorkflowContext(
      options.workflowId,
      options.canvas
    )
    
    this.commandManager = CommandManager.getInstance()
  }
  
  // Override execute to maintain context
  async execute(
    toolId: string,
    params: Record<string, unknown>,
    toolExecutor: (params: Record<string, unknown>) => Promise<ToolExecutionResult>
  ): Promise<ToolExecutionResult> {
    // Get current target objects using workflow context
    const targetObjects = EnhancedCanvasToolBridge.getWorkflowTargetObjects(
      this.options.workflowId!,
      this.canvas
    )
    
    console.log(`[EnhancedToolChain] Executing ${toolId} on ${targetObjects.length} objects`)
    
    // Track object state before execution
    const beforeState = this.captureObjectStates(targetObjects)
    
    // Execute the tool
    const result = await super.execute(toolId, params, toolExecutor)
    
    // Track changes
    if (result.success) {
      const changes = this.detectChanges(beforeState, targetObjects)
      EnhancedCanvasToolBridge.updateWorkflowContext(
        this.options.workflowId!,
        changes
      )
    }
    
    return result
  }
  
  // Create command for tool execution
  private createCommandForTool(
    toolId: string,
    params: Record<string, unknown>,
    targetObjects: CanvasObject[]
  ): Command {
    // This would be implemented based on the specific tool
    // For now, return a generic command
    return new GenericToolCommand(
      toolId,
      params,
      targetObjects,
      this.workflowContext.workflowSelection!
    )
  }
  
  // Capture object states for change detection
  private captureObjectStates(objects: CanvasObject[]): Map<string, Record<string, unknown>> {
    const states = new Map<string, Record<string, unknown>>()
    
    objects.forEach(obj => {
      states.set(obj.id, {
        transform: { ...obj.transform },
        style: obj.style ? { ...obj.style } : {},
        data: obj.data,
        opacity: obj.opacity,
        visible: obj.visible
      })
    })
    
    return states
  }
  
  // Detect what changed after tool execution
  private detectChanges(
    beforeState: Map<string, Record<string, unknown>>,
    currentObjects: CanvasObject[]
  ): {
    created: string[]
    modified: string[]
    deleted: string[]
    remapped: Array<{ oldId: string; newId: string }>
  } {
    const changes = {
      created: [] as string[],
      modified: [] as string[],
      deleted: [] as string[],
      remapped: [] as Array<{ oldId: string; newId: string }>
    }
    
    // Check for modifications and new objects
    currentObjects.forEach(obj => {
      const before = beforeState.get(obj.id)
      if (!before) {
        changes.created.push(obj.id)
      } else if (JSON.stringify(before) !== JSON.stringify(this.captureObjectState(obj))) {
        changes.modified.push(obj.id)
      }
    })
    
    // Check for deleted objects
    beforeState.forEach((_, id) => {
      if (!currentObjects.find(obj => obj.id === id)) {
        changes.deleted.push(id)
      }
    })
    
    return changes
  }
  
  private captureObjectState(obj: CanvasObject): Record<string, unknown> {
    return {
      transform: { ...obj.transform },
      style: obj.style ? { ...obj.style } : {},
      data: obj.data,
      opacity: obj.opacity,
      visible: obj.visible
    }
  }
}
```

### 3.3 Tool Adapter Updates

**Location**: `lib/ai/adapters/base.ts` (ENHANCE)

```typescript
export abstract class BaseToolAdapter<TInput = unknown, TOutput = unknown> {
  // ... existing code ...
  
  // ENHANCE: Execute with workflow context
  async execute(
    params: TInput,
    context: CanvasContext,
    executionContext?: ExecutionContext
  ): Promise<TOutput> {
    // Check if this is part of a workflow
    const workflowId = executionContext?.getMetadata()?.workflowId as string | undefined
    
    if (workflowId) {
      // Use workflow context
      const enhancedContext = EnhancedCanvasToolBridge.getWorkflowContext(workflowId)
      if (enhancedContext) {
        return this.executeWithWorkflowContext(params, enhancedContext, executionContext)
      }
    }
    
    // Fallback to regular execution
    return this.executeRegular(params, context, executionContext)
  }
  
  // NEW: Execute with workflow awareness
  protected async executeWithWorkflowContext(
    params: TInput,
    context: EnhancedCanvasContext,
    executionContext?: ExecutionContext
  ): Promise<TOutput> {
    // Get target objects from workflow context
    const targetObjects = EnhancedCanvasToolBridge.getWorkflowTargetObjects(
      context.workflowSelection!.workflowId,
      context.canvas
    )
    
    console.log(`[${this.aiName}] Executing on ${targetObjects.length} workflow objects`)
    
    // Default implementation - subclasses can override
    return this.executeRegular(
      params,
      {
        ...context,
        targetImages: targetObjects.filter(obj => obj.type === 'image')
      } as CanvasContext,
      executionContext
    )
  }
  
  // Renamed existing execute logic
  protected abstract executeRegular(
    params: TInput,
    context: CanvasContext,
    executionContext?: ExecutionContext
  ): Promise<TOutput>
}
```

### 3.4 Chain Adapter Integration

**Location**: `lib/ai/execution/ChainAdapter.ts` (ENHANCE)

```typescript
export class ChainAdapter extends BaseToolAdapter<ExecuteChainInput, ExecuteChainOutput> {
  // ... existing code ...
  
  async execute(params: ExecuteChainInput, context: CanvasContext): Promise<ExecuteChainOutput> {
    try {
      console.log('[ChainAdapter] Executing chain with steps:', params.steps)
      
      // Get required services
      const container = ServiceContainer.getInstance()
      const eventStore = container.getSync<EventStore>('EventStore')
      const canvas = context.canvas
      
      if (!canvas) {
        throw new Error('Canvas is required for chain execution')
      }
      
      // Create enhanced tool chain with workflow ID
      const workflowId = `workflow_${Date.now()}`
      const chain = new EnhancedEventBasedToolChain({
        canvasId: canvas.id,
        canvas: canvas as CanvasManager,
        eventStore,
        workflowId,
        metadata: {
          source: 'ai-chain-adapter',
          preserveSelection: params.preserveSelection
        }
      })
      
      // ... rest of implementation using enhanced chain ...
    } catch (error) {
      // ... error handling ...
    }
  }
}
```

### 3.5 Tasks

- [ ] Enhance CanvasContext with workflow tracking
- [ ] Create EnhancedCanvasToolBridge
- [ ] Update EventBasedToolChain with workflow support
- [ ] Update BaseToolAdapter for workflow execution
- [ ] Update ChainAdapter to use enhanced tool chain
- [ ] Add workflow context cleanup mechanisms
- [ ] Create integration tests for multi-step AI workflows 

## Implementation Timeline

### Week 1: Command System Unification
- **Day 1-2**: Remove enhanced command system, update base command class
- **Day 3-4**: Implement CommandManager and update existing commands
- **Day 5**: Add event types and integration tests

### Week 2: Selection System Enhancement
- **Day 1-2**: Create SelectionContextManager
- **Day 3-4**: Enhance SelectionSnapshot with metadata
- **Day 5**: Integration with SelectionManager and testing

### Week 3: AI Integration
- **Day 1-2**: Implement EnhancedCanvasContext and bridge
- **Day 3-4**: Update tool chain and adapters
- **Day 5**: End-to-end testing with AI workflows

## Testing Strategy

### Unit Tests

1. **Command System**
   - Command execution with/without selection snapshot
   - Command metadata propagation
   - Batch execution scenarios
   - Error handling and rollback

2. **Selection System**
   - Object recovery after ID changes
   - Workflow context expiration
   - Similar object detection
   - Object signature generation

3. **AI Integration**
   - Workflow context creation/retrieval
   - Object tracking across tool executions
   - Context preservation in multi-step workflows

### Integration Tests

1. **Multi-Step AI Workflow**
   ```typescript
   test('maintains selection across multiple AI operations', async () => {
     // 1. User selects two images
     // 2. AI executes: brightness -> rotate -> blur
     // 3. Verify all operations applied to original selection
     // 4. Verify selection still valid after operations
   })
   ```

2. **Object Replacement Scenario**
   ```typescript
   test('tracks objects when IDs change', async () => {
     // 1. Select an image
     // 2. Apply filter that replaces the object
     // 3. Apply another operation
     // 4. Verify second operation targets the replaced object
   })
   ```

3. **Workflow Context Cleanup**
   ```typescript
   test('cleans up expired workflow contexts', async () => {
     // 1. Create workflow context
     // 2. Wait for expiration
     // 3. Verify context is cleaned up
     // 4. Verify memory is released
   })
   ```

## Migration Notes

### Breaking Changes

1. **Command Pattern**
   - All commands must change `execute()` to `doExecute()`
   - Commands should use constructor metadata
   - Remove any enhanced command imports

2. **Selection System**
   - AI tools must use workflow context for selection
   - Direct selection modification discouraged during AI ops

3. **Event Types**
   - New command events must be handled
   - History system integration required

### Backward Compatibility

1. **Gradual Migration**
   - Old commands continue to work without workflow context
   - Selection system falls back to current behavior
   - AI tools can opt-in to enhanced context

2. **Feature Flags**
   ```typescript
   const FEATURES = {
     USE_ENHANCED_SELECTION: true,
     USE_WORKFLOW_CONTEXT: true,
     USE_COMMAND_MANAGER: true
   }
   ```

### Migration Checklist

- [ ] Backup current codebase
- [ ] Create feature branch for implementation
- [ ] Implement Phase 1 (Command System)
- [ ] Run all existing tests
- [ ] Implement Phase 2 (Selection System)
- [ ] Add new unit tests
- [ ] Implement Phase 3 (AI Integration)
- [ ] Add integration tests
- [ ] Update documentation
- [ ] Code review
- [ ] Merge to main branch

## Success Metrics

1. **AI Context Preservation**: 100% of multi-step AI workflows maintain correct selection
2. **Object Recovery Rate**: >95% success rate in finding objects after ID changes
3. **Performance**: <10ms overhead for workflow context operations
4. **Memory Usage**: <1MB per active workflow context
5. **Test Coverage**: >90% for new code

## Future Enhancements

1. **Persistent Workflow History**
   - Save workflow contexts to database
   - Resume interrupted workflows
   - Workflow templates

2. **Advanced Object Matching**
   - Content-based hashing for images
   - Perceptual hashing for similarity
   - Machine learning for object recognition

3. **Collaborative Workflows**
   - Share workflow contexts between users
   - Real-time collaborative AI editing
   - Conflict resolution for concurrent edits

## Conclusion

This architecture provides a robust foundation for AI-driven image editing with proper selection context preservation. The phased approach ensures minimal disruption while delivering significant improvements to the AI workflow experience. 