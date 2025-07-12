import { Command, type ICommand } from './Command'
import type { TypedEventBus } from '@/lib/events/core/TypedEventBus'

/**
 * Composite command that groups multiple commands together
 * Useful for operations that require multiple steps
 */
export class CompositeCommand extends Command {
  private commands: ICommand[] = []
  
  constructor(
    eventBus: TypedEventBus,
    description: string, 
    commands: ICommand[] = []
  ) {
    super(description, eventBus)
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
  async undo(): Promise<void> {
    // Undo in reverse order
    for (let i = this.commands.length - 1; i >= 0; i--) {
      const command = this.commands[i]
      if (command.canUndo()) {
        await command.undo()
      } else {
        throw new Error(`Cannot undo command: ${command.description}`)
      }
    }
  }
  
  /**
   * Redo all commands in order
   */
  async redo(): Promise<void> {
    for (const command of this.commands) {
      await command.redo()
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