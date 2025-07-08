import { nanoid } from 'nanoid'

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
  
  constructor(description: string) {
    this.id = nanoid()
    this.timestamp = Date.now()
    this.description = description
  }
  
  /**
   * Execute the command for the first time
   */
  abstract execute(): Promise<void>
  
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