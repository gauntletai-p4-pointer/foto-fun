# Command & Selection Systems: Architectural Refactoring Plan

## Executive Summary

This document outlines a comprehensive refactoring plan for the command and selection systems to address critical architectural issues identified during senior-level code review. The current implementation violates multiple SOLID principles, contains massive code duplication, and lacks proper abstraction boundaries.

**Priority**: Critical  
**Estimated Effort**: 3-4 sprints  
**Risk**: Medium (breaking changes required)  
**Impact**: High (foundation for all editor operations)

## Current State Assessment

### 🚨 Critical Issues Identified

1. **Code Duplication**: 200+ lines of duplicated selection logic across 3 layers
2. **Inconsistent APIs**: 3 different command constructor patterns
3. **Singleton Anti-patterns**: CommandManager and SelectionContextManager
4. **Broken Abstractions**: Commands directly manipulating canvas internals
5. **Inconsistent Error Handling**: 3 different strategies with no standardization
6. **Poor Separation of Concerns**: Business logic mixed with orchestration

### Architecture Violations

- **DRY Principle**: Selection operations duplicated in SelectionManager, SelectionOperations, and CreateSelectionCommand
- **Single Responsibility**: Commands handling orchestration AND domain logic
- **Dependency Inversion**: Concrete dependencies instead of abstractions
- **Open/Closed**: Adding command types requires modifying existing code
- **Interface Segregation**: Monolithic command interfaces

## Refactoring Strategy

### Phase 1: Foundation (Sprint 1)
**Goal**: Establish proper domain boundaries and eliminate code duplication

### Phase 2: Standardization (Sprint 2)
**Goal**: Implement consistent patterns and dependency injection

### Phase 3: Enhancement (Sprint 3)
**Goal**: Add advanced features and improve observability

### Phase 4: Optimization (Sprint 4)
**Goal**: Performance optimization and final polish

---

## Phase 1: Foundation (Sprint 1)

### 1.1 Extract Selection Domain Service

**Problem**: Selection operations duplicated across multiple classes

**Solution**: Create centralized `SelectionDomainService`

```typescript
// lib/editor/selection/domain/SelectionDomainService.ts
export interface SelectionDomainService {
  combineSelections(
    existing: PixelSelection | null,
    newSelection: PixelSelection,
    mode: SelectionMode
  ): PixelSelection

  transformSelection(
    selection: PixelSelection,
    transform: SelectionTransform
  ): PixelSelection

  validateSelection(selection: PixelSelection): ValidationResult

  calculateBounds(mask: ImageData): SelectionBounds

  optimizeSelection(selection: PixelSelection): PixelSelection
}

export class DefaultSelectionDomainService implements SelectionDomainService {
  combineSelections(
    existing: PixelSelection | null,
    newSelection: PixelSelection,
    mode: SelectionMode
  ): PixelSelection {
    if (!existing || mode === 'replace') {
      return this.optimizeSelection(newSelection)
    }

    const combiner = this.getCombiner(mode)
    const resultMask = this.createCombinedMask(existing.mask, newSelection.mask, combiner)
    const bounds = this.calculateCombinedBounds(existing.bounds, newSelection.bounds, mode)

    return this.optimizeSelection({
      type: 'pixel',
      mask: resultMask,
      bounds
    })
  }

  private getCombiner(mode: SelectionMode): PixelCombiner {
    const combiners: Record<SelectionMode, PixelCombiner> = {
      add: (a, b) => Math.max(a, b),
      subtract: (a, b) => Math.max(0, a - b),
      intersect: (a, b) => Math.min(a, b),
      replace: (_, b) => b
    }
    return combiners[mode]
  }

  // Eliminate duplication by centralizing all pixel operations
  private createCombinedMask(
    maskA: ImageData,
    maskB: ImageData,
    combiner: PixelCombiner
  ): ImageData {
    // Single implementation of pixel combination logic
  }
}
```

**Files to Modify**:
- `lib/editor/selection/SelectionManager.ts` - Remove duplicated logic
- `lib/editor/selection/SelectionOperations.ts` - Refactor to use domain service
- `lib/editor/commands/selection/CreateSelectionCommand.ts` - Remove business logic

### 1.2 Implement Command Context Pattern

**Problem**: Inconsistent command constructor patterns

**Solution**: Standardize with CommandContext

```typescript
// lib/editor/commands/context/CommandContext.ts
export interface CommandContext {
  readonly eventBus: TypedEventBus
  readonly canvasManager: CanvasManager
  readonly selectionManager: SelectionManager
  readonly selectionDomainService: SelectionDomainService
  readonly validationService: ValidationService
  readonly executionId: string
  readonly timestamp: number
}

export class CommandContextFactory {
  static create(dependencies: CommandDependencies): CommandContext {
    return {
      ...dependencies,
      executionId: nanoid(),
      timestamp: Date.now()
    }
  }
}

// Updated base command
export abstract class Command implements ICommand {
  readonly id: string
  readonly timestamp: number
  readonly description: string
  readonly metadata: CommandMetadata
  
  protected readonly context: CommandContext

  constructor(
    description: string,
    context: CommandContext,
    metadata?: Partial<CommandMetadata>
  ) {
    this.id = nanoid()
    this.timestamp = context.timestamp
    this.description = description
    this.context = context
    this.metadata = {
      source: 'user',
      canMerge: false,
      affectsSelection: true,
      ...metadata
    }
  }
}
```

### 1.3 Create Command Factory

**Problem**: No standardized way to create commands

**Solution**: Implement factory pattern

```typescript
// lib/editor/commands/factory/CommandFactory.ts
export interface CommandFactory {
  createAddObjectCommand(object: CanvasObject): AddObjectCommand
  createUpdateObjectCommand(objectId: string, updates: Partial<CanvasObject>): UpdateObjectCommand
  createRemoveObjectCommand(objectId: string): RemoveObjectCommand
  createSelectionCommand(selection: PixelSelection, mode: SelectionMode): CreateSelectionCommand
  createCompositeCommand(description: string, commands: ICommand[]): CompositeCommand
}

export class DefaultCommandFactory implements CommandFactory {
  constructor(private context: CommandContext) {}

  createAddObjectCommand(object: CanvasObject): AddObjectCommand {
    return new AddObjectCommand(
      `Add ${object.type}`,
      this.context,
      { objectData: object }
    )
  }

  createUpdateObjectCommand(objectId: string, updates: Partial<CanvasObject>): UpdateObjectCommand {
    return new UpdateObjectCommand(
      'Update object',
      this.context,
      { objectId, updates }
    )
  }

  // Standardized creation for all command types
}
```

---

## Phase 2: Standardization (Sprint 2)

### 2.1 Implement Result Pattern

**Problem**: Inconsistent error handling across commands

**Solution**: Standardize with Result pattern

```typescript
// lib/editor/commands/result/CommandResult.ts
export type CommandResult<T = void> = 
  | CommandSuccess<T>
  | CommandFailure

export interface CommandSuccess<T> {
  success: true
  data: T
  events: DomainEvent[]
  metadata: ExecutionMetadata
}

export interface CommandFailure {
  success: false
  error: CommandError
  rollback?: () => Promise<void>
  partialResults?: unknown[]
}

export class CommandError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context: Record<string, unknown> = {},
    public readonly cause?: Error
  ) {
    super(message)
    this.name = 'CommandError'
  }
}

// Updated command interface
export interface ICommand {
  execute(): Promise<CommandResult>
  undo(): Promise<CommandResult>
  redo(): Promise<CommandResult>
  canExecute(): boolean
  canUndo(): boolean
}
```

### 2.2 Replace Singleton Patterns

**Problem**: CommandManager and SelectionContextManager use singletons

**Solution**: Proper dependency injection

```typescript
// lib/editor/commands/execution/CommandExecutor.ts
export interface CommandExecutor {
  execute<T>(command: ICommand): Promise<CommandResult<T>>
  executeBatch(commands: ICommand[], options?: BatchOptions): Promise<BatchResult>
  executeWithContext(commands: ICommand[], context: ExecutionContext): Promise<BatchResult>
}

export class DefaultCommandExecutor implements CommandExecutor {
  constructor(
    private eventBus: TypedEventBus,
    private historyStore: HistoryStore,
    private errorHandler: ErrorHandler
  ) {}

  async execute<T>(command: ICommand): Promise<CommandResult<T>> {
    const startTime = performance.now()
    
    try {
      // Emit command started event
      this.eventBus.emit('command.execution.started', {
        commandId: command.id,
        description: command.description
      })

      const result = await command.execute()
      
      if (result.success) {
        // Add to history
        await this.historyStore.addCommand(command)
        
        // Emit success event
        this.eventBus.emit('command.execution.completed', {
          commandId: command.id,
          executionTime: performance.now() - startTime,
          events: result.events
        })
      }

      return result
    } catch (error) {
      return this.handleExecutionError(command, error)
    }
  }

  private async handleExecutionError(command: ICommand, error: unknown): Promise<CommandResult> {
    const commandError = CommandError.fromUnknown(error, {
      commandId: command.id,
      commandType: command.constructor.name
    })

    this.eventBus.emit('command.execution.failed', {
      commandId: command.id,
      error: commandError.message,
      context: commandError.context
    })

    return {
      success: false,
      error: commandError
    }
  }
}

// Service registration
export class CommandModule {
  static register(container: ServiceContainer): void {
    container.register('CommandExecutor', DefaultCommandExecutor)
    container.register('CommandFactory', DefaultCommandFactory)
    container.register('SelectionDomainService', DefaultSelectionDomainService)
  }
}
```

### 2.3 Implement Command Validation

**Problem**: No validation layer for command parameters

**Solution**: Add validation service

```typescript
// lib/editor/commands/validation/CommandValidationService.ts
export interface CommandValidationService {
  validateCommand(command: ICommand): ValidationResult
  validateBatch(commands: ICommand[]): BatchValidationResult
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

export class DefaultCommandValidationService implements CommandValidationService {
  private validators: Map<string, CommandValidator> = new Map()

  constructor() {
    this.registerValidators()
  }

  validateCommand(command: ICommand): ValidationResult {
    const validator = this.getValidator(command.constructor.name)
    return validator.validate(command)
  }

  private registerValidators(): void {
    this.validators.set('AddObjectCommand', new AddObjectValidator())
    this.validators.set('UpdateObjectCommand', new UpdateObjectValidator())
    this.validators.set('CreateSelectionCommand', new SelectionValidator())
    // Register all command validators
  }
}

// Example validator
export class AddObjectValidator implements CommandValidator {
  validate(command: AddObjectCommand): ValidationResult {
    const errors: ValidationError[] = []
    
    if (!command.object) {
      errors.push(new ValidationError('Object is required'))
    }
    
    if (!command.object.id) {
      errors.push(new ValidationError('Object ID is required'))
    }
    
    if (command.object.position && !this.isValidPosition(command.object.position)) {
      errors.push(new ValidationError('Invalid object position'))
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: []
    }
  }
}
```

---

## Phase 3: Enhancement (Sprint 3)

### 3.1 Implement Command Middleware

**Problem**: Cross-cutting concerns scattered throughout commands

**Solution**: Middleware pipeline

```typescript
// lib/editor/commands/middleware/CommandMiddleware.ts
export interface CommandMiddleware {
  name: string
  execute(command: ICommand, next: () => Promise<CommandResult>): Promise<CommandResult>
}

export class ValidationMiddleware implements CommandMiddleware {
  name = 'validation'

  constructor(private validationService: CommandValidationService) {}

  async execute(command: ICommand, next: () => Promise<CommandResult>): Promise<CommandResult> {
    const validation = this.validationService.validateCommand(command)
    
    if (!validation.isValid) {
      return {
        success: false,
        error: new CommandError(
          'Command validation failed',
          'VALIDATION_ERROR',
          { errors: validation.errors }
        )
      }
    }

    return next()
  }
}

export class LoggingMiddleware implements CommandMiddleware {
  name = 'logging'

  async execute(command: ICommand, next: () => Promise<CommandResult>): Promise<CommandResult> {
    const startTime = performance.now()
    console.log(`[Command] Executing ${command.description}`)

    const result = await next()
    
    const executionTime = performance.now() - startTime
    console.log(`[Command] ${command.description} ${result.success ? 'succeeded' : 'failed'} in ${executionTime.toFixed(2)}ms`)

    return result
  }
}

export class MetricsMiddleware implements CommandMiddleware {
  name = 'metrics'

  constructor(private metricsService: MetricsService) {}

  async execute(command: ICommand, next: () => Promise<CommandResult>): Promise<CommandResult> {
    const startTime = performance.now()
    
    try {
      const result = await next()
      
      this.metricsService.recordCommandExecution({
        commandType: command.constructor.name,
        success: result.success,
        executionTime: performance.now() - startTime
      })

      return result
    } catch (error) {
      this.metricsService.recordCommandError({
        commandType: command.constructor.name,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }
}

// Middleware pipeline
export class CommandPipeline {
  private middlewares: CommandMiddleware[] = []

  addMiddleware(middleware: CommandMiddleware): this {
    this.middlewares.push(middleware)
    return this
  }

  async execute(command: ICommand): Promise<CommandResult> {
    let index = 0

    const next = async (): Promise<CommandResult> => {
      if (index >= this.middlewares.length) {
        return command.execute()
      }

      const middleware = this.middlewares[index++]
      return middleware.execute(command, next)
    }

    return next()
  }
}
```

### 3.2 Advanced Command Composition

**Problem**: Limited support for complex command workflows

**Solution**: Enhanced composition patterns

```typescript
// lib/editor/commands/composition/CommandComposer.ts
export class CommandComposer {
  private commands: ICommand[] = []
  private conditions: Map<string, () => boolean> = new Map()
  private dependencies: Map<string, string[]> = new Map()

  add(command: ICommand): this {
    this.commands.push(command)
    return this
  }

  addConditional(command: ICommand, condition: () => boolean): this {
    this.commands.push(command)
    this.conditions.set(command.id, condition)
    return this
  }

  addWithDependencies(command: ICommand, dependsOn: string[]): this {
    this.commands.push(command)
    this.dependencies.set(command.id, dependsOn)
    return this
  }

  parallel(...commands: ICommand[]): this {
    const parallelCommand = new ParallelCommand(
      'Parallel execution',
      this.context,
      commands
    )
    this.commands.push(parallelCommand)
    return this
  }

  sequence(...commands: ICommand[]): this {
    const sequenceCommand = new SequenceCommand(
      'Sequential execution',
      this.context,
      commands
    )
    this.commands.push(sequenceCommand)
    return this
  }

  build(): CompositeCommand {
    // Resolve dependencies and create optimized execution plan
    const executionPlan = this.resolveDependencies()
    return new CompositeCommand(
      'Composed command',
      this.context,
      executionPlan
    )
  }

  private resolveDependencies(): ICommand[] {
    // Topological sort based on dependencies
    // Filter based on conditions
    // Optimize execution order
  }
}

// Usage example
const composer = new CommandComposer(context)
  .add(new CreateSelectionCommand(...))
  .addConditional(
    new CropCommand(...),
    () => selectionManager.hasSelection()
  )
  .parallel(
    new AdjustBrightnessCommand(...),
    new AdjustContrastCommand(...)
  )
  .sequence(
    new SaveCommand(...),
    new NotifyCommand(...)
  )
  .build()
```

### 3.3 Command Replay and Time Travel

**Problem**: Limited debugging and replay capabilities

**Solution**: Event sourcing with replay

```typescript
// lib/editor/commands/replay/CommandReplayService.ts
export interface CommandReplayService {
  recordCommand(command: ICommand, result: CommandResult): Promise<void>
  replayFromPoint(pointInTime: number): Promise<void>
  replayCommands(commandIds: string[]): Promise<void>
  createSnapshot(): Promise<CanvasSnapshot>
  restoreSnapshot(snapshot: CanvasSnapshot): Promise<void>
}

export class DefaultCommandReplayService implements CommandReplayService {
  constructor(
    private eventStore: EventStore,
    private canvasManager: CanvasManager,
    private commandExecutor: CommandExecutor
  ) {}

  async recordCommand(command: ICommand, result: CommandResult): Promise<void> {
    const event = new CommandExecutedEvent({
      commandId: command.id,
      commandType: command.constructor.name,
      parameters: this.serializeCommand(command),
      result: this.serializeResult(result),
      timestamp: Date.now()
    })

    await this.eventStore.append(event)
  }

  async replayFromPoint(pointInTime: number): Promise<void> {
    // Get all events after the point in time
    const events = await this.eventStore.getEventsAfter(pointInTime)
    
    // Reset canvas to the state at that point
    await this.restoreCanvasToPoint(pointInTime)
    
    // Replay all commands
    for (const event of events) {
      if (event instanceof CommandExecutedEvent) {
        const command = this.deserializeCommand(event.data)
        await this.commandExecutor.execute(command)
      }
    }
  }

  async createSnapshot(): Promise<CanvasSnapshot> {
    return {
      id: nanoid(),
      timestamp: Date.now(),
      canvasState: await this.canvasManager.serialize(),
      selectionState: this.selectionManager.getSelection(),
      lastEventId: await this.eventStore.getLastEventId()
    }
  }
}
```

---

## Phase 4: Optimization (Sprint 4)

### 4.1 Performance Optimization

**Problem**: Command execution can be slow for complex operations

**Solution**: Optimize hot paths

```typescript
// lib/editor/commands/optimization/CommandOptimizer.ts
export class CommandOptimizer {
  optimizeCommand(command: ICommand): ICommand {
    // Command-specific optimizations
    if (command instanceof UpdateObjectCommand) {
      return this.optimizeUpdateCommand(command)
    }
    
    if (command instanceof CompositeCommand) {
      return this.optimizeCompositeCommand(command)
    }

    return command
  }

  private optimizeUpdateCommand(command: UpdateObjectCommand): ICommand {
    // Batch consecutive updates to the same object
    // Eliminate redundant property updates
    // Use dirty checking for large objects
  }

  private optimizeCompositeCommand(command: CompositeCommand): ICommand {
    // Parallelize independent commands
    // Eliminate no-op commands
    // Merge compatible commands
  }
}

// Batch processing for bulk operations
export class BatchCommandProcessor {
  async processBatch(commands: ICommand[]): Promise<BatchResult> {
    // Group by object ID for optimization
    const grouped = this.groupCommandsByTarget(commands)
    
    // Execute in parallel where possible
    const results = await Promise.allSettled(
      grouped.map(group => this.processGroup(group))
    )

    return this.aggregateResults(results)
  }
}
```

### 4.2 Memory Management

**Problem**: Command history can consume significant memory

**Solution**: Implement memory management

```typescript
// lib/editor/commands/memory/CommandMemoryManager.ts
export class CommandMemoryManager {
  private maxHistorySize = 100
  private compressionThreshold = 50

  async manageMemory(historyStore: HistoryStore): Promise<void> {
    const commands = historyStore.getAllCommands()
    
    if (commands.length > this.maxHistorySize) {
      await this.compressOldCommands(commands.slice(0, this.compressionThreshold))
    }

    // Clean up large object references
    await this.cleanupLargeObjects(commands)
  }

  private async compressOldCommands(commands: ICommand[]): Promise<void> {
    // Convert old commands to lightweight representations
    // Keep only essential data for undo/redo
    // Store in compressed format
  }
}
```

---

## Implementation Guidelines

### Testing Strategy

1. **Unit Tests**: Each domain service and command type
2. **Integration Tests**: Command execution flows
3. **Performance Tests**: Batch operations and memory usage
4. **Regression Tests**: Ensure existing functionality works

### Migration Strategy

1. **Backward Compatibility**: Maintain existing APIs during transition
2. **Feature Flags**: Enable new system incrementally
3. **Gradual Migration**: Move command types one at a time
4. **Validation**: Extensive testing in development environment

### Rollback Plan

1. **Feature Flags**: Quick disable of new system
2. **Database Migrations**: Reversible schema changes
3. **API Versioning**: Support both old and new APIs temporarily
4. **Monitoring**: Track performance and error rates

---

## Success Metrics

### Code Quality
- [ ] Eliminate all code duplication (0 duplicated selection operations)
- [ ] Consistent API patterns (100% of commands use same constructor pattern)
- [ ] No singleton patterns (0 getInstance() methods)
- [ ] 100% test coverage for new domain services

### Performance
- [ ] Command execution time < 10ms for simple operations
- [ ] Batch operations scale linearly with command count
- [ ] Memory usage stable over long sessions
- [ ] Zero memory leaks in command history

### Developer Experience
- [ ] Consistent error messages and handling
- [ ] Clear documentation for all new patterns
- [ ] Easy to add new command types
- [ ] Comprehensive debugging tools

---

## Risk Mitigation

### Technical Risks
- **Breaking Changes**: Extensive testing and gradual rollout
- **Performance Regression**: Benchmark before/after
- **Complexity**: Clear documentation and training

### Timeline Risks
- **Scope Creep**: Strict phase boundaries
- **Dependencies**: Parallel development where possible
- **Resource Allocation**: Dedicated team for duration

### Quality Risks
- **Insufficient Testing**: Automated test requirements
- **Documentation Lag**: Documentation as part of definition of done
- **Knowledge Transfer**: Pair programming and code reviews

---

## Conclusion

This refactoring plan addresses all identified architectural issues while maintaining system stability. The phased approach allows for incremental improvement with minimal risk. The result will be a maintainable, testable, and extensible command and selection system that meets senior-level engineering standards.

**Next Steps**:
1. Review and approve this plan
2. Allocate development resources
3. Begin Phase 1 implementation
4. Set up monitoring and success metrics tracking 