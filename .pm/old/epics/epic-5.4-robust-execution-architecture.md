# Epic 5.4: Robust Execution Architecture with Holistic Undo/Redo

## Overview

This epic addresses the fundamental brittleness in our current system by introducing an event-sourced, context-isolated architecture that provides robust undo/redo capabilities and proper selection management across user and AI operations.

## Problem Statement

### Current Issues
1. **Brittle Selection Context**: User selection changes during AI workflow execution affect the operation targets
2. **Incomplete Undo/Redo**: Individual commands are recorded but lose workflow context
3. **Tool State Pollution**: Tools maintain state that leaks between operations
4. **Temporal Coupling**: System assumes state at execution matches state at planning
5. **No Transaction Boundaries**: Partial failures leave system in inconsistent state

### Impact
- Users lose work when AI operations fail midway
- Undo doesn't properly reverse complex multi-step operations
- Selection context is lost between planning and execution
- Tool reactivation causes unintended side effects

## Proposed Architecture

### Core Concepts

#### 1. Immutable Execution Contexts
Every operation (user or AI) captures an immutable snapshot of relevant state:

```typescript
interface ExecutionContext {
  id: string
  timestamp: number
  type: 'user' | 'ai-workflow' | 'ai-tool'
  
  // Immutable snapshot at creation time
  snapshot: {
    canvasState: CanvasSnapshot
    selection: SelectionSnapshot
    activeToolId: string
    toolOptions: Map<string, ToolOptions>
    layerState: LayerSnapshot
  }
  
  // Execution metadata
  metadata: {
    userId?: string
    workflowId?: string
    parentContextId?: string
    aiModel?: string
    userIntent?: string
    sourceEvent?: UserEvent // What triggered this
  }
  
  // Validation rules
  constraints: {
    requiresSelection: boolean
    minimumObjects: number
    allowedObjectTypes: Set<string>
    timeout: number
  }
}
```

#### 2. Event-Sourced History

All changes are recorded as events, enabling perfect replay:

```typescript
interface CanvasEvent {
  id: string
  type: EventType
  contextId: string
  timestamp: number
  
  // The actual change
  change: CanvasChange
  
  // For undo/redo
  reverseChange: CanvasChange
  
  // Grouping and metadata
  metadata: {
    workflowId?: string
    groupId?: string // For grouping related events
    isUserInitiated: boolean
    description: string
    tags: Set<string>
  }
}

type EventType = 
  | 'object-added'
  | 'object-modified' 
  | 'object-removed'
  | 'selection-changed'
  | 'layer-created'
  | 'filter-applied'
  | 'transform-applied'
  // ... etc
```

### Undo/Redo System Design

#### 1. Hierarchical Undo/Redo

The system supports multiple levels of undo:

```typescript
class HierarchicalUndoSystem {
  private eventStore: EventStore
  private undoStack: UndoEntry[] = []
  private redoStack: UndoEntry[] = []
  
  // Undo entries can be single events or groups
  interface UndoEntry {
    id: string
    type: 'single' | 'group' | 'workflow'
    events: CanvasEvent[]
    description: string
    contextId: string
    timestamp: number
    
    // For workflows
    workflow?: {
      id: string
      name: string
      steps: WorkflowStep[]
      userIntent: string
    }
  }
  
  async undo(): Promise<void> {
    const entry = this.undoStack.pop()
    if (!entry) return
    
    // Handle based on type
    switch (entry.type) {
      case 'single':
        await this.undoSingleEvent(entry.events[0])
        break
        
      case 'group':
        // Undo all events in reverse order
        for (const event of entry.events.reverse()) {
          await this.undoSingleEvent(event)
        }
        break
        
      case 'workflow':
        // Undo entire workflow as atomic operation
        await this.undoWorkflow(entry)
        break
    }
    
    this.redoStack.push(entry)
  }
  
  // Intelligent grouping of related operations
  groupRelatedEvents(events: CanvasEvent[]): UndoEntry[] {
    const groups: UndoEntry[] = []
    let currentGroup: CanvasEvent[] = []
    
    for (const event of events) {
      if (this.shouldStartNewGroup(event, currentGroup)) {
        if (currentGroup.length > 0) {
          groups.push(this.createUndoEntry(currentGroup))
        }
        currentGroup = [event]
      } else {
        currentGroup.push(event)
      }
    }
    
    return groups
  }
}
```

#### 2. Selection-Aware Undo

Selection changes are part of the undo system:

```typescript
class SelectionAwareUndo {
  // Selection changes are recorded as events
  recordSelectionChange(
    oldSelection: SelectionSnapshot,
    newSelection: SelectionSnapshot,
    context: ExecutionContext
  ): CanvasEvent {
    return {
      id: generateId(),
      type: 'selection-changed',
      contextId: context.id,
      timestamp: Date.now(),
      change: {
        type: 'selection',
        newSelection: newSelection.serialize(),
        oldSelection: oldSelection.serialize()
      },
      reverseChange: {
        type: 'selection',
        newSelection: oldSelection.serialize(),
        oldSelection: newSelection.serialize()
      },
      metadata: {
        isUserInitiated: context.type === 'user',
        description: `Selection changed: ${oldSelection.count} → ${newSelection.count} objects`
      }
    }
  }
  
  // Undo restores selection state
  async undoSelectionChange(event: CanvasEvent): Promise<void> {
    const { oldSelection } = event.reverseChange
    const snapshot = SelectionSnapshot.deserialize(oldSelection)
    
    // Restore the selection
    await this.selectionManager.restoreSelection(snapshot)
  }
}
```

#### 3. Workflow-Aware Undo

AI workflows are undone as complete units:

```typescript
class WorkflowUndo {
  async undoWorkflow(entry: UndoEntry): Promise<void> {
    const workflow = entry.workflow!
    
    // Show user what's being undone
    this.ui.showUndoNotification({
      title: 'Undoing AI Workflow',
      description: workflow.userIntent,
      steps: workflow.steps.length
    })
    
    // Create a transaction for atomic undo
    const transaction = new UndoTransaction()
    
    try {
      // Restore the original context
      const originalContext = await this.contextStore.get(entry.contextId)
      await this.canvasManager.restoreContext(originalContext)
      
      // Undo all events from the workflow
      for (const event of entry.events.reverse()) {
        transaction.addOperation(() => this.undoEvent(event))
      }
      
      await transaction.commit()
      
      this.ui.showUndoComplete({
        title: 'Workflow Undone',
        description: `Reverted: ${workflow.userIntent}`
      })
      
    } catch (error) {
      await transaction.rollback()
      throw new UndoError('Failed to undo workflow', error)
    }
  }
}
```

### Selection Management

#### 1. Selection Contexts

Selection is captured and managed as immutable contexts:

```typescript
class SelectionContext {
  id: string
  timestamp: number
  
  // What's selected
  objects: ObjectReference[]
  
  // Selection metadata
  metadata: {
    source: 'user-click' | 'user-drag' | 'ai-workflow' | 'tool-operation'
    tool?: string
    workflowId?: string
  }
  
  // Selection can be resolved even if objects move
  async resolve(canvas: Canvas): Promise<FabricObject[]> {
    const resolver = new ObjectResolver(canvas)
    return resolver.resolveReferences(this.objects)
  }
}

interface ObjectReference {
  id: string
  type: string
  
  // Multiple ways to identify object
  identifiers: {
    position?: { x: number; y: number }
    size?: { width: number; height: number }
    layerId?: string
    contentHash?: string // For images
    textContent?: string // For text
  }
  
  // Confidence scoring for resolution
  confidence: number
}
```

#### 2. Selection Isolation

Different execution contexts maintain independent selection:

```typescript
class IsolatedSelectionManager {
  private contexts: Map<string, SelectionContext> = new Map()
  private activeUserSelection: SelectionContext | null = null
  private activeAISelection: Map<string, SelectionContext> = new Map()
  
  // User selection is separate from AI selection
  setUserSelection(objects: FabricObject[]): void {
    this.activeUserSelection = this.createContext(objects, 'user-click')
    this.notifyObservers('user-selection-changed', this.activeUserSelection)
  }
  
  // AI workflows get their own selection context
  createAISelection(objects: FabricObject[], workflowId: string): SelectionContext {
    const context = this.createContext(objects, 'ai-workflow', { workflowId })
    this.activeAISelection.set(workflowId, context)
    return context
  }
  
  // Tools can request appropriate selection
  getSelectionForExecution(executionContext: ExecutionContext): SelectionContext {
    if (executionContext.type === 'user') {
      return this.activeUserSelection || this.createEmptyContext()
    }
    
    if (executionContext.metadata.workflowId) {
      return this.activeAISelection.get(executionContext.metadata.workflowId) || 
             this.contexts.get(executionContext.snapshot.selection.id)!
    }
    
    throw new Error('Cannot determine selection for execution context')
  }
}
```

#### 3. Selection Persistence

Selection survives across operations:

```typescript
class PersistentSelection {
  // Selection is saved with enough info to restore
  async saveSelection(context: SelectionContext): Promise<void> {
    await this.storage.put(`selection:${context.id}`, {
      ...context,
      
      // Store visual representation for user
      thumbnail: await this.generateSelectionThumbnail(context),
      
      // Store recovery data
      recovery: {
        canvasSize: this.canvas.getSize(),
        objectCount: this.canvas.getObjects().length,
        checksum: await this.calculateCanvasChecksum()
      }
    })
  }
  
  // Intelligent selection restoration
  async restoreSelection(contextId: string): Promise<boolean> {
    const saved = await this.storage.get(`selection:${contextId}`)
    if (!saved) return false
    
    // Verify canvas hasn't changed too much
    const currentChecksum = await this.calculateCanvasChecksum()
    const similarity = this.compareChecksums(saved.recovery.checksum, currentChecksum)
    
    if (similarity < 0.8) {
      // Canvas has changed significantly
      const resolved = await this.fuzzyResolveSelection(saved)
      if (resolved.confidence < 0.6) {
        this.ui.showWarning('Selection may not be accurate due to canvas changes')
      }
      return this.applySelection(resolved.objects)
    }
    
    // Canvas is similar enough for direct restoration
    const objects = await saved.resolve(this.canvas)
    return this.applySelection(objects)
  }
}
```

### Version History System

#### 1. Automatic Version Creation

The event-sourced architecture naturally creates a complete version history:

```typescript
class VersionHistoryManager {
  private eventStore: EventStore
  private versionStore: VersionStore
  
  // Versions are automatically created at significant points
  async createVersion(trigger: VersionTrigger): Promise<Version> {
    const currentEventId = this.eventStore.getLatestEventId()
    const snapshot = await this.createSnapshot()
    
    const version = {
      id: generateId(),
      timestamp: Date.now(),
      eventId: currentEventId, // Point in event stream
      
      // Version metadata
      metadata: {
        trigger: trigger.type, // 'auto-save' | 'user-save' | 'before-workflow' | 'after-workflow'
        name: trigger.name || this.generateVersionName(),
        description: trigger.description,
        tags: trigger.tags || new Set<string>(),
        
        // Statistics
        stats: {
          objectCount: snapshot.objects.length,
          layerCount: snapshot.layers.length,
          fileSize: snapshot.size,
          operationsSince: this.getOperationsSince(this.getLastVersion())
        }
      },
      
      // Visual preview
      preview: {
        thumbnail: await this.generateThumbnail(snapshot),
        fullPreview: await this.generatePreview(snapshot)
      },
      
      // Comparison data
      comparison: {
        previousVersionId: this.getLastVersion()?.id,
        changes: await this.calculateChanges(this.getLastVersion(), snapshot)
      }
    }
    
    await this.versionStore.save(version)
    return version
  }
  
  // Automatic version triggers
  setupAutoVersioning(): void {
    // Before risky operations
    this.eventBus.on('workflow:starting', async (workflow) => {
      await this.createVersion({
        type: 'before-workflow',
        name: `Before: ${workflow.name}`,
        description: workflow.userIntent
      })
    })
    
    // After successful workflows
    this.eventBus.on('workflow:completed', async (workflow) => {
      await this.createVersion({
        type: 'after-workflow',
        name: `After: ${workflow.name}`,
        description: `Completed: ${workflow.userIntent}`
      })
    })
    
    // Periodic auto-save
    setInterval(async () => {
      if (this.hasSignificantChanges()) {
        await this.createVersion({
          type: 'auto-save',
          name: 'Auto-save',
          description: `${this.getChangesSummary()}`
        })
      }
    }, 5 * 60 * 1000) // Every 5 minutes
  }
}
```

#### 2. Version Browsing and Comparison

Users can browse through versions visually:

```typescript
class VersionBrowser {
  // Get versions with rich metadata
  async getVersionHistory(options: BrowseOptions): Promise<VersionList> {
    const versions = await this.versionStore.list(options)
    
    return {
      versions: versions.map(v => ({
        ...v,
        
        // Enhanced with contextual info
        context: {
          timeSinceCreated: this.getRelativeTime(v.timestamp),
          changesSummary: this.summarizeChanges(v.comparison.changes),
          isRestorePoint: v.metadata.tags.has('restore-point'),
          workflow: this.getAssociatedWorkflow(v)
        }
      })),
      
      // Grouping for UI
      groups: this.groupVersionsByTime(versions),
      
      // Quick filters
      filters: {
        hasWorkflows: versions.filter(v => v.metadata.trigger.includes('workflow')),
        manualSaves: versions.filter(v => v.metadata.trigger === 'user-save'),
        autoSaves: versions.filter(v => v.metadata.trigger === 'auto-save')
      }
    }
  }
  
  // Visual comparison between versions
  async compareVersions(versionA: string, versionB: string): Promise<Comparison> {
    const [stateA, stateB] = await Promise.all([
      this.reconstructState(versionA),
      this.reconstructState(versionB)
    ])
    
    return {
      // Visual diff
      visual: {
        sideBySide: await this.renderSideBySide(stateA, stateB),
        overlay: await this.renderOverlay(stateA, stateB),
        animation: await this.createTransitionAnimation(stateA, stateB)
      },
      
      // Detailed changes
      changes: {
        added: this.findAddedObjects(stateA, stateB),
        removed: this.findRemovedObjects(stateA, stateB),
        modified: this.findModifiedObjects(stateA, stateB),
        
        // High-level summary
        summary: {
          objectsDelta: stateB.objects.length - stateA.objects.length,
          layersDelta: stateB.layers.length - stateA.layers.length,
          filterOperations: this.countFilterOperations(stateA, stateB),
          transformOperations: this.countTransformOperations(stateA, stateB)
        }
      },
      
      // Operation history between versions
      operations: await this.getOperationsBetween(versionA, versionB)
    }
  }
}
```

#### 3. Reverting to Previous Versions

Multiple revert strategies for different use cases:

```typescript
class VersionReverter {
  // Strategy 1: Hard revert - replace everything
  async hardRevert(versionId: string): Promise<RevertResult> {
    const version = await this.versionStore.get(versionId)
    
    // Create a restore point first
    const restorePoint = await this.versionManager.createVersion({
      type: 'before-revert',
      name: 'Before reverting',
      description: `Restore point before reverting to ${version.metadata.name}`,
      tags: new Set(['restore-point'])
    })
    
    try {
      // Reconstruct the exact state at that version
      const targetState = await this.eventProjector.projectToEvent(version.eventId)
      
      // Replace current canvas state
      await this.canvasManager.replaceState(targetState)
      
      // Record the revert as an event
      await this.eventStore.append({
        type: 'version-reverted',
        versionId,
        revertType: 'hard',
        restorePointId: restorePoint.id
      })
      
      return {
        success: true,
        revertType: 'hard',
        message: `Reverted to version: ${version.metadata.name}`
      }
    } catch (error) {
      // Revert failed, offer to restore the restore point
      return {
        success: false,
        error,
        restorePointId: restorePoint.id,
        message: 'Revert failed. Your work before the revert is safe.'
      }
    }
  }
  
  // Strategy 2: Soft revert - undo operations since version
  async softRevert(versionId: string): Promise<RevertResult> {
    const version = await this.versionStore.get(versionId)
    const eventsSince = await this.eventStore.getEventsSince(version.eventId)
    
    // Group events into logical undo units
    const undoGroups = this.groupEventsForUndo(eventsSince)
    
    // Show user what will be undone
    const confirmation = await this.ui.confirmRevert({
      versionName: version.metadata.name,
      operationsToUndo: undoGroups.length,
      preview: await this.generateRevertPreview(undoGroups)
    })
    
    if (!confirmation) return { success: false, cancelled: true }
    
    // Undo each group in reverse order
    for (const group of undoGroups.reverse()) {
      await this.undoSystem.undoGroup(group)
    }
    
    return {
      success: true,
      revertType: 'soft',
      undoneOperations: undoGroups.length
    }
  }
  
  // Strategy 3: Selective revert - cherry-pick changes
  async selectiveRevert(
    versionId: string, 
    options: SelectiveRevertOptions
  ): Promise<RevertResult> {
    const version = await this.versionStore.get(versionId)
    const currentState = await this.canvasManager.getCurrentState()
    const targetState = await this.eventProjector.projectToEvent(version.eventId)
    
    // Let user select what to revert
    const selection = await this.ui.showSelectiveRevertDialog({
      current: currentState,
      target: targetState,
      options: {
        objects: options.includeObjects ?? true,
        layers: options.includeLayers ?? true,
        styles: options.includeStyles ?? true,
        filters: options.includeFilters ?? true
      }
    })
    
    if (!selection) return { success: false, cancelled: true }
    
    // Apply only selected changes
    const changes = this.calculateSelectedChanges(
      currentState,
      targetState,
      selection
    )
    
    await this.applyChanges(changes)
    
    return {
      success: true,
      revertType: 'selective',
      appliedChanges: changes.length
    }
  }
}
```

#### 4. Version Branching

Support for exploring alternatives without losing work:

```typescript
class VersionBranching {
  // Create a branch from any version
  async createBranch(
    fromVersionId: string,
    branchName: string
  ): Promise<Branch> {
    const baseVersion = await this.versionStore.get(fromVersionId)
    
    const branch = {
      id: generateId(),
      name: branchName,
      baseVersionId: fromVersionId,
      baseEventId: baseVersion.eventId,
      created: Date.now(),
      
      // Branch maintains its own event stream
      eventStream: new BranchEventStream(baseVersion.eventId),
      
      // Track relationship to main
      relationship: {
        divergedAt: baseVersion.eventId,
        commonAncestor: baseVersion.id,
        isActive: true
      }
    }
    
    await this.branchStore.create(branch)
    
    // Switch to branch
    await this.switchToBranch(branch.id)
    
    return branch
  }
  
  // Merge branches back
  async mergeBranch(
    branchId: string,
    strategy: MergeStrategy = 'auto'
  ): Promise<MergeResult> {
    const branch = await this.branchStore.get(branchId)
    const mainEvents = await this.eventStore.getEventsSince(branch.baseEventId)
    const branchEvents = await branch.eventStream.getAll()
    
    // Detect conflicts
    const conflicts = this.detectConflicts(mainEvents, branchEvents)
    
    if (conflicts.length === 0) {
      // No conflicts - auto merge
      await this.applyBranchEvents(branchEvents)
      return { success: true, conflicts: [] }
    }
    
    // Handle conflicts based on strategy
    switch (strategy) {
      case 'auto':
        const resolved = await this.autoResolveConflicts(conflicts)
        if (resolved.success) {
          await this.applyResolvedEvents(resolved.events)
          return { success: true, autoResolved: true }
        }
        break
        
      case 'interactive':
        const resolution = await this.ui.showConflictResolution({
          branch,
          conflicts,
          preview: await this.generateMergePreview(mainEvents, branchEvents)
        })
        
        if (resolution) {
          await this.applyResolvedEvents(resolution.events)
          return { success: true, manuallyResolved: true }
        }
        break
        
      case 'theirs':
        await this.applyBranchEvents(branchEvents)
        return { success: true, strategy: 'theirs' }
    }
    
    return { success: false, conflicts }
  }
}
```

#### 5. Version Storage and Optimization

Efficient storage with incremental snapshots:

```typescript
class VersionStorage {
  // Full snapshots at intervals, deltas in between
  async optimizeStorage(): Promise<void> {
    const versions = await this.versionStore.getAll()
    
    for (let i = 0; i < versions.length; i++) {
      const version = versions[i]
      
      // Keep full snapshots for key versions
      if (this.isKeyVersion(version)) {
        await this.ensureFullSnapshot(version)
        continue
      }
      
      // Convert others to deltas
      const previousSnapshot = this.findPreviousSnapshot(version, versions)
      if (previousSnapshot) {
        const delta = await this.calculateDelta(previousSnapshot, version)
        await this.storeDelta(version.id, delta)
        await this.removeFullSnapshot(version.id)
      }
    }
  }
  
  // Intelligent snapshot decisions
  isKeyVersion(version: Version): boolean {
    return (
      version.metadata.tags.has('restore-point') ||
      version.metadata.trigger === 'user-save' ||
      version.metadata.trigger === 'before-workflow' ||
      this.isTimeInterval(version, 24 * 60 * 60 * 1000) // Daily
    )
  }
}
```

### Benefits of Version History

1. **Safety**: Never lose work - can always go back
2. **Experimentation**: Try things knowing you can revert
3. **Collaboration**: See who did what when
4. **Learning**: Understand how a design evolved
5. **Recovery**: Restore from corruption or mistakes

### Implementation Phases

#### Phase 1: Core Event System (2 weeks)
- [ ] Implement EventStore with append-only log
- [ ] Create CanvasEvent types for all operations  
- [ ] Build EventProjector for replaying events
- [ ] Add event metadata and grouping

#### Phase 2: Execution Contexts (2 weeks)
- [ ] Design ExecutionContext interface
- [ ] Implement ContextManager with snapshot capability
- [ ] Create IsolatedExecutor for context-bound execution
- [ ] Add context validation and constraints

#### Phase 3: Selection Management (1 week)
- [ ] Build SelectionContext with object references
- [ ] Implement ObjectResolver with fuzzy matching
- [ ] Create IsolatedSelectionManager
- [ ] Add selection persistence

#### Phase 4: Hierarchical Undo/Redo (2 weeks)
- [ ] Implement HierarchicalUndoSystem
- [ ] Add intelligent event grouping
- [ ] Create workflow-aware undo
- [ ] Build undo UI with preview

#### Phase 5: Workflow Orchestration (2 weeks)
- [ ] Design WorkflowOrchestrator
- [ ] Implement WorkflowStateMachine
- [ ] Add conflict detection and resolution
- [ ] Create workflow persistence

#### Phase 6: Tool Isolation (1 week)
- [ ] Refactor tools to IsolatedTool pattern
- [ ] Implement ToolExecutor with isolation
- [ ] Update all existing tools
- [ ] Add tool simulation capability

#### Phase 7: Testing & Migration (2 weeks)
- [ ] Comprehensive test suite
- [ ] Migration tools for existing data
- [ ] Performance optimization
- [ ] Documentation

## Benefits

### For Users
1. **Reliable Undo/Redo**: Can undo entire AI workflows or individual steps
2. **Selection Stability**: Selection doesn't change during AI operations
3. **Failure Recovery**: Partial failures don't corrupt their work
4. **Clear History**: Can see and understand what operations did

### For Developers
1. **Testability**: Pure functions and immutable state
2. **Debuggability**: Complete audit trail of all operations
3. **Maintainability**: Clear separation of concerns
4. **Extensibility**: Easy to add new tools and workflows

### For AI Operations
1. **Consistency**: Same prompt produces same result
2. **Isolation**: AI operations don't interfere with user work
3. **Reliability**: Failures are handled gracefully
4. **Observability**: Can trace AI decision making

## Success Metrics
- Undo/redo success rate: >99.9%
- Selection accuracy after restore: >95%
- Workflow completion rate: >98%
- User-reported issues: <0.1% of operations
- Performance impact: <50ms added latency

## Risks & Mitigations
1. **Storage Growth**: Event log could grow large
   - Mitigation: Periodic snapshots and log compaction
   
2. **Performance**: Event replay could be slow
   - Mitigation: Incremental snapshots, caching
   
3. **Complexity**: System is more complex
   - Mitigation: Comprehensive testing, good abstractions

## Future Extensions
1. **Collaborative Editing**: Events enable real-time collaboration
2. **Time Travel Debugging**: Step through operation history
3. **AI Learning**: Use event history to improve AI
4. **Branching History**: Explore alternative edits 