import type { Command } from './base/Command'
import type { SelectionSnapshot } from '@/lib/ai/execution/SelectionSnapshot'

/**
 * Result of a single command execution
 */
export interface CommandExecutionResult {
  command: Command
  success: boolean
  error?: Error
}

/**
 * Result of batch command execution
 */
export interface BatchExecutionResult {
  results: CommandExecutionResult[]
  allSucceeded: boolean
}

/**
 * Error thrown when batch execution fails
 */
export class BatchExecutionError extends Error {
  constructor(message: string, public results: CommandExecutionResult[]) {
    super(message)
    this.name = 'BatchExecutionError'
  }
}

/**
 * Centralized command execution manager
 * Handles command execution, history integration, and batch operations
 */
export class CommandManager {
  private static instance: CommandManager
  private executionQueue: Command[] = []
  private isExecuting = false
  
  /**
   * Get the singleton instance
   */
  static getInstance(): CommandManager {
    if (!CommandManager.instance) {
      CommandManager.instance = new CommandManager()
    }
    return CommandManager.instance
  }
  
  private constructor() {
    // Private constructor for singleton
  }
  
  /**
   * Execute a single command
   */
  async executeCommand(command: Command): Promise<void> {
    // Add to execution queue
    this.executionQueue.push(command)
    
    try {
      // Execute the command
      await command.execute()
      
      // Command will emit its own events through the enhanced execute method
      // History store will automatically track the command through events
    } catch (error) {
      // Remove from queue on error
      const index = this.executionQueue.indexOf(command)
      if (index > -1) {
        this.executionQueue.splice(index, 1)
      }
      
      // Re-throw the error
      throw error
    }
  }
  
  /**
   * Execute commands with shared selection context
   */
  async executeWithSelectionContext(
    commands: Command[],
    selectionSnapshot: SelectionSnapshot,
    workflowId: string
  ): Promise<void> {
    // Set the same snapshot and workflow ID on all commands
    commands.forEach(cmd => {
      cmd.setSelectionSnapshot(selectionSnapshot)
      if (cmd.metadata) {
        cmd.metadata.workflowId = workflowId
      }
    })
    
    // Execute in sequence
    for (const command of commands) {
      await this.executeCommand(command)
    }
  }
  
  /**
   * Batch execution with transaction support
   */
  async executeBatch(
    commands: Command[],
    options: {
      atomic?: boolean // All succeed or all fail
      continueOnError?: boolean
    } = {}
  ): Promise<BatchExecutionResult> {
    const results: CommandExecutionResult[] = []
    const executedCommands: Command[] = []
    
    for (const command of commands) {
      try {
        await this.executeCommand(command)
        executedCommands.push(command)
        results.push({ command, success: true })
      } catch (error) {
        results.push({ 
          command, 
          success: false, 
          error: error instanceof Error ? error : new Error(String(error))
        })
        
        if (options.atomic) {
          // Rollback all successful commands
          await this.rollbackCommands(executedCommands)
          throw new BatchExecutionError('Batch execution failed', results)
        }
        
        if (!options.continueOnError) {
          break
        }
      }
    }
    
    return { 
      results, 
      allSucceeded: results.every(r => r.success) 
    }
  }
  
  /**
   * Rollback commands by executing their undo methods
   */
  private async rollbackCommands(commands: Command[]): Promise<void> {
    // Rollback in reverse order
    for (let i = commands.length - 1; i >= 0; i--) {
      const command = commands[i]
      if (command.canUndo()) {
        try {
          await command.undo()
        } catch (error) {
          console.error(`Failed to rollback command: ${command.description}`, error)
          // Continue rolling back other commands
        }
      }
    }
  }
  
  /**
   * Get the current execution queue
   */
  getExecutionQueue(): ReadonlyArray<Command> {
    return [...this.executionQueue]
  }
  
  /**
   * Check if any commands are currently executing
   */
  isCommandExecuting(): boolean {
    return this.isExecuting
  }
  
  /**
   * Clear the execution queue
   * Note: This doesn't stop currently executing commands
   */
  clearQueue(): void {
    this.executionQueue = []
  }
} 