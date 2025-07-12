import { Command, type ICommand, type CommandContext } from './Command'
import type { CommandResult } from './CommandResult'

/**
 * Composite command that groups multiple commands together
 * Useful for operations that require multiple steps
 */
export class CompositeCommand extends Command {
  private commands: ICommand[] = []
  
  constructor(
    description: string,
    context: CommandContext,
    commands: ICommand[] = []
  ) {
    super(description, context)
    this.commands = commands
  }
  
  /**
   * Add a command to the composite
   */
  addCommand(command: ICommand): void {
    this.commands.push(command)
  }
  
  /**
   * Get all commands in the composite
   */
  getCommands(): readonly ICommand[] {
    return this.commands
  }
  
  /**
   * Execute all commands in order
   */
  protected async doExecute(): Promise<void> {
    for (const command of this.commands) {
      if (command.canExecute()) {
        await command.execute()
      } else {
        throw new Error(`Cannot execute command: ${command.description}`)
      }
    }
  }
  
  /**
   * Undo all commands in reverse order
   */
  async undo(): Promise<CommandResult<void>> {
    try {
      // Undo in reverse order
      for (let i = this.commands.length - 1; i >= 0; i--) {
        const command = this.commands[i]
        if (command.canUndo()) {
          const result = await command.undo()
          if (!result.success) {
            return result // Return the failure result
          }
        } else {
          return {
            success: false,
            error: new (await import('./CommandResult')).ExecutionError(
              `Cannot undo command: ${command.description}`,
              { commandId: this.id }
            )
          }
        }
      }

      return {
        success: true,
        data: undefined,
        events: [],
        metadata: {
          executionTime: 0,
          affectedObjects: []
        }
      }
    } catch (error) {
      return {
        success: false,
        error: new (await import('./CommandResult')).ExecutionError(
          `Composite undo failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          { commandId: this.id }
        )
      }
    }
  }
  
  /**
   * Redo all commands in order
   */
  async redo(): Promise<CommandResult<void>> {
    try {
      for (const command of this.commands) {
        const result = await command.redo()
        if (!result.success) {
          return result // Return the failure result
        }
      }

      return {
        success: true,
        data: undefined,
        events: [],
        metadata: {
          executionTime: 0,
          affectedObjects: []
        }
      }
    } catch (error) {
      return {
        success: false,
        error: new (await import('./CommandResult')).ExecutionError(
          `Composite redo failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          { commandId: this.id }
        )
      }
    }
  }
  
  /**
   * Check if all commands can be executed
   */
  canExecute(): boolean {
    return this.commands.length > 0 && this.commands.every(cmd => cmd.canExecute())
  }
  
  /**
   * Check if all commands can be undone
   */
  canUndo(): boolean {
    return this.commands.length > 0 && this.commands.every(cmd => cmd.canUndo())
  }
  
  /**
   * Check if the composite is empty
   */
  isEmpty(): boolean {
    return this.commands.length === 0
  }
} 