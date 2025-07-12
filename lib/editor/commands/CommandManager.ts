import type { Command } from './base/Command'
import type { SelectionSnapshot } from '@/lib/ai/execution/SelectionSnapshot'
import type { EventStore } from '@/lib/events/core/EventStore'
import type { TypedEventBus } from '@/lib/events/core/TypedEventBus'
import type { EventBasedHistoryStore } from '@/lib/events/history/EventBasedHistoryStore'

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
 * Configuration for CommandManager
 */
export interface CommandManagerConfig {
  validation?: boolean
  middleware?: boolean
  metrics?: boolean
  maxQueueSize?: number
  executionTimeout?: number
}

/**
 * Centralized command execution manager
 * Handles command execution, history integration, and batch operations
 */
export class CommandManager {
  private executionQueue: Command[] = []
  private isExecuting = false
  private disposed = false
  
  constructor(
    private eventStore: EventStore,
    private typedEventBus: TypedEventBus,
    private historyStore: EventBasedHistoryStore,
    private config: CommandManagerConfig = {}
  ) {
    this.initialize()
  }
  
  private initialize(): void {
    this.setupEventHandlers()
    this.setupMiddleware()
    this.setupValidation()
  }
  
  private setupEventHandlers(): void {
    // Listen for command execution events
    this.typedEventBus.on('command.completed', (event) => {
      if (this.config.metrics) {
        console.log(`[CommandManager] Command completed: ${event.commandId}`)
      }
    })
    
    this.typedEventBus.on('command.failed', (event) => {
      console.error(`[CommandManager] Command failed: ${event.commandId}`, event.error)
    })
  }
  
  private setupMiddleware(): void {
    if (!this.config.middleware) return
    
    // Setup command execution middleware
    // This could include validation, logging, metrics, etc.
  }
  
  private setupValidation(): void {
    if (!this.config.validation) return
    
    // Setup command validation middleware
  }
  
  /**
   * Execute a single command
   */
  async executeCommand(command: Command): Promise<void> {
    if (this.disposed) {
      throw new Error('CommandManager has been disposed')
    }
    
    // Check queue size limit
    if (this.config.maxQueueSize && this.executionQueue.length >= this.config.maxQueueSize) {
      throw new Error('Command execution queue is full')
    }
    
    // Add to execution queue
    this.executionQueue.push(command)
    
    try {
      this.isExecuting = true
      
      // Execute the command with timeout if configured
      if (this.config.executionTimeout) {
        await Promise.race([
          command.execute(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Command execution timeout')), this.config.executionTimeout)
          )
        ])
      } else {
        await command.execute()
      }
      
      // Emit success event
      this.typedEventBus.emit('command.completed', { 
        commandId: command.id || 'unknown',
        success: true
      })
      
      // Command will emit its own events through the enhanced execute method
      // History store will automatically track the command through events
    } catch (error) {
      // Remove from queue on error
      const index = this.executionQueue.indexOf(command)
      if (index > -1) {
        this.executionQueue.splice(index, 1)
      }
      
      // Emit failure event
      this.typedEventBus.emit('command.failed', { 
        commandId: command.id || 'unknown',
        error: error instanceof Error ? error.message : String(error)
      })
      
      // Re-throw the error
      throw error
    } finally {
      this.isExecuting = false
      
      // Remove from queue on completion
      const index = this.executionQueue.indexOf(command)
      if (index > -1) {
        this.executionQueue.splice(index, 1)
      }
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
    if (this.disposed) {
      throw new Error('CommandManager has been disposed')
    }
    
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
    if (this.disposed) {
      throw new Error('CommandManager has been disposed')
    }
    
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
    if (this.disposed) return
    this.executionQueue = []
  }
  
  /**
   * Dispose the CommandManager and clean up resources
   */
  dispose(): void {
    if (this.disposed) return
    
    this.clearQueue()
    this.disposed = true
    
    // Remove event listeners
    this.typedEventBus.clear('command.completed')
    this.typedEventBus.clear('command.failed')
  }
  
  /**
   * Check if the manager has been disposed
   */
  isDisposed(): boolean {
    return this.disposed
  }
} 