import { nanoid } from 'nanoid'
import type { ExecutionContext } from '@/lib/events/execution/ExecutionContext'
import type { SelectionSnapshot } from '@/lib/ai/execution/SelectionSnapshot'
import type { TypedEventBus } from '@/lib/events/core/TypedEventBus'
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager'
import type { SelectionManager } from '@/lib/editor/selection/SelectionManager'
import type { CommandResult } from './CommandResult'
import { ResultUtils } from './CommandResult'

/**
 * Unified Command Context for dependency injection
 * All commands receive this context with all required dependencies
 */
export interface CommandContext {
  readonly eventBus: TypedEventBus
  readonly canvasManager: CanvasManager
  readonly selectionManager: SelectionManager
  readonly executionId: string
  readonly timestamp: number
}

/**
 * Command metadata for tracking and workflow support
 */
export interface CommandMetadata {
  source: 'user' | 'ai' | 'system'
  workflowId?: string
  parentCommandId?: string
  canMerge: boolean
  affectsSelection: boolean
}

/**
 * Base interface for all commands in the application
 * Implements the Command Pattern for undo/redo functionality
 */
export interface ICommand {
  /**
   * Unique identifier for this command instance
   */
  readonly id: string
  
  /**
   * Timestamp when the command was created
   */
  readonly timestamp: number
  
  /**
   * Human-readable description of what this command does
   */
  readonly description: string
  
  /**
   * Command metadata for tracking
   */
  readonly metadata: CommandMetadata
  
  /**
   * Execute the command
   * Should store any necessary state for undo
   * Returns a Result indicating success or failure
   */
  execute(): Promise<CommandResult<void>>
  
  /**
   * Undo the command
   * Should restore the previous state
   * Returns a Result indicating success or failure
   */
  undo(): Promise<CommandResult<void>>
  
  /**
   * Redo the command
   * Re-applies the command after an undo
   * Returns a Result indicating success or failure
   */
  redo(): Promise<CommandResult<void>>
  
  /**
   * Check if the command can be executed
   */
  canExecute(): boolean
  
  /**
   * Check if the command can be undone
   */
  canUndo(): boolean
  
  /**
   * Optional: Merge with another command if possible
   * Used for combining similar consecutive commands
   */
  canMergeWith?(other: ICommand): boolean
  mergeWith?(other: ICommand): void
}

/**
 * Abstract base class for commands
 * Provides common functionality and enforces the command pattern
 */
export abstract class Command implements ICommand {
  readonly id: string
  readonly timestamp: number
  readonly description: string
  
  // NEW: Execution context for AI workflows
  protected executionContext?: ExecutionContext
  protected selectionSnapshot?: SelectionSnapshot
  
  // NEW: Command metadata for better tracking
  readonly metadata: CommandMetadata
  
  // Unified dependencies through context
  protected readonly context: CommandContext
  
  constructor(
    description: string,
    context: CommandContext,
    metadata?: Partial<CommandMetadata>
  ) {
    this.id = nanoid()
    this.timestamp = Date.now()
    this.description = description
    this.context = context
    this.metadata = {
      source: 'user',
      canMerge: false,
      affectsSelection: true,
      ...metadata
    }
  }
  
  /**
   * Set execution context for AI operations
   */
  setExecutionContext(context: ExecutionContext): void {
    this.executionContext = context
  }
  
  /**
   * Set selection snapshot for consistent targeting
   */
  setSelectionSnapshot(snapshot: SelectionSnapshot): void {
    this.selectionSnapshot = snapshot
  }
  
  /**
   * Enhanced execute with automatic event emission
   */
  async execute(): Promise<CommandResult<void>> {
    const startTime = performance.now()
    
    try {
      // TODO: Emit command started event (waiting for EventRegistry update)
      // this.context.eventBus.emit('command.started', {
      //   commandId: this.id,
      //   description: this.description,
      //   metadata: this.metadata as unknown as Record<string, unknown>
      // })
      
      // Execute with snapshot if available
      if (this.selectionSnapshot) {
        await this.executeWithSnapshot()
      } else {
        await this.doExecute()
      }
      
      const executionTime = performance.now() - startTime
      
      // TODO: Emit command completed event (waiting for EventRegistry update)
      // this.context.eventBus.emit('command.completed', {
      //   commandId: this.id,
      //   success: true
      // })
      
      return {
        success: true,
        data: undefined,
        events: [], // Commands can override to add domain events
        metadata: {
          executionTime,
          affectedObjects: this.getAffectedObjects()
        }
      }
      
    } catch (error) {
      // TODO: Emit command failed event (waiting for EventRegistry update)
      // this.context.eventBus.emit('command.failed', {
      //   commandId: this.id,
      //   error: error instanceof Error ? error.message : 'Unknown error'
      // })
      
      const commandError = error instanceof Error 
        ? new (await import('./CommandResult')).ExecutionError(error.message, { commandId: this.id })
        : new (await import('./CommandResult')).ExecutionError('Unknown execution error', { commandId: this.id })
      
      return {
        success: false,
        error: commandError,
        rollback: this.canUndo() ? async () => {
          const result = await this.undo()
          if (ResultUtils.isFailure(result)) {
            throw result.error
          }
        } : undefined
      }
    }
  }
  
  /**
   * Execute with selection snapshot
   * Default implementation - subclasses can override
   */
  protected async executeWithSnapshot(): Promise<void> {
    await this.doExecute()
  }
  
  /**
   * The actual command implementation
   * Subclasses implement this instead of execute()
   */
  protected abstract doExecute(): Promise<void>
  
  /**
   * Undo the command
   */
  abstract undo(): Promise<CommandResult<void>>
  
  /**
   * Redo the command (default implementation just calls execute)
   * Override if redo behavior differs from initial execution
   */
  async redo(): Promise<CommandResult<void>> {
    return await this.execute()
  }
  
  /**
   * Check if the command can be executed
   * Override to add custom validation
   */
  canExecute(): boolean {
    return true
  }
  
  /**
   * Check if the command can be undone
   * Override to prevent undo in certain cases
   */
  canUndo(): boolean {
    return true
  }
  
  /**
   * Check if this command can be merged with another
   * Override in commands that support merging
   */
  canMergeWith(other: ICommand): boolean {
    void other // Acknowledge parameter to satisfy linter
    return false
  }
  
  /**
   * Merge this command with another
   * Override in commands that support merging
   */
  mergeWith(other: ICommand): void {
    void other // Acknowledge parameter to satisfy linter
    throw new Error(`Command ${this.constructor.name} does not support merging`)
  }

  /**
   * Get the list of object IDs affected by this command
   * Override in commands that modify objects
   */
  protected getAffectedObjects(): string[] {
    return []
  }
} 