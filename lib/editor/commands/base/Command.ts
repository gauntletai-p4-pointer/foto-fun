import { nanoid } from 'nanoid'
import type { ExecutionContext } from '@/lib/events/execution/ExecutionContext'
import type { SelectionSnapshot } from '@/lib/ai/execution/SelectionSnapshot'
import type { TypedEventBus } from '@/lib/events/core/TypedEventBus'
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager'
import type { SelectionManager } from '@/lib/editor/selection/SelectionManager'

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
   */
  execute(): Promise<void>
  
  /**
   * Undo the command
   * Should restore the previous state
   */
  undo(): Promise<void>
  
  /**
   * Redo the command
   * Re-applies the command after an undo
   */
  redo(): Promise<void>
  
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
  async execute(): Promise<void> {
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
      
      // TODO: Emit command completed event (waiting for EventRegistry update)
      // this.context.eventBus.emit('command.completed', {
      //   commandId: this.id,
      //   success: true
      // })
      
    } catch (error) {
      // TODO: Emit command failed event (waiting for EventRegistry update)
      // this.context.eventBus.emit('command.failed', {
      //   commandId: this.id,
      //   error: error instanceof Error ? error.message : 'Unknown error'
      // })
      throw error
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
  abstract undo(): Promise<void>
  
  /**
   * Redo the command (default implementation just calls execute)
   * Override if redo behavior differs from initial execution
   */
  async redo(): Promise<void> {
    await this.execute()
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
} 