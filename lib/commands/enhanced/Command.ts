import { z } from 'zod'
import type { MiddlewarePipeline } from '@/lib/core/middleware/MiddlewarePipeline'
import { MiddlewarePipeline as MiddlewarePipelineImpl } from '@/lib/core/middleware/MiddlewarePipeline'

/**
 * Command execution context
 */
export interface CommandContext {
  // Core properties
  commandId: string
  timestamp: number
  
  // User context
  user?: {
    id: string
    permissions?: string[]
  }
  
  // Execution metadata
  metadata?: Record<string, unknown>
  
  // Error handling
  error?: Error
  
  // Performance metrics
  metrics?: Record<string, number>
}

/**
 * Abstract base class for commands with validation
 */
export abstract class Command<TParams = void> {
  abstract id: string
  abstract name: string
  abstract description?: string
  
  /**
   * Validation schema for command parameters
   */
  abstract schema: z.ZodSchema<TParams>
  
  /**
   * Check if command can execute in current context
   */
  abstract canExecute(context: CommandContext): boolean | Promise<boolean>
  
  /**
   * Execute the command with validated parameters
   */
  abstract execute(params: TParams, context: CommandContext): Promise<void>
  
  /**
   * Optional: Undo the command
   */
  undo?(params: TParams, context: CommandContext): Promise<void>
  
  /**
   * Optional: Check if command requires authentication
   */
  requiresAuth?(): boolean
  
  /**
   * Optional: Get required permissions
   */
  requiredPermissions?(): string[]
  
  /**
   * Create a validated command instance
   */
  static create<T>(
    this: new() => Command<T>, 
    params: T
  ): ValidatedCommand<T> {
    const instance = new this()
    const validated = instance.schema.parse(params)
    return new ValidatedCommand(instance, validated)
  }
  
  /**
   * Validate parameters without creating instance
   */
  static validate<T>(
    this: new() => Command<T>,
    params: unknown
  ): T {
    const instance = new this()
    return instance.schema.parse(params)
  }
}

/**
 * Validated command wrapper
 */
export class ValidatedCommand<TParams = void> {
  constructor(
    public readonly command: Command<TParams>,
    public readonly params: TParams
  ) {}
  
  /**
   * Execute the validated command
   */
  async execute(context: CommandContext): Promise<void> {
    return this.command.execute(this.params, context)
  }
  
  /**
   * Check if can execute
   */
  canExecute(context: CommandContext): Promise<boolean> {
    return Promise.resolve(this.command.canExecute(context))
  }
}

/**
 * Composite command for executing multiple commands
 */
export class CompositeCommand extends Command<void> {
  id = 'composite'
  name = 'Composite Command'
  description = 'Executes multiple commands as a single unit'
  schema = z.void()
  
  private commands: Array<ValidatedCommand<unknown>> = []
  private executeInParallel = false
  
  /**
   * Add a command to the composite
   */
  add<T>(command: ValidatedCommand<T>): this {
    this.commands.push(command)
    return this
  }
  
  /**
   * Add multiple commands
   */
  addMany(...commands: Array<ValidatedCommand<unknown>>): this {
    this.commands.push(...commands)
    return this
  }
  
  /**
   * Set execution mode
   */
  parallel(value = true): this {
    this.executeInParallel = value
    return this
  }
  
  /**
   * Check if all commands can execute
   */
  canExecute(context: CommandContext): Promise<boolean> {
    return Promise.all(
      this.commands.map(cmd => cmd.canExecute(context))
    ).then(checks => checks.every(Boolean))
  }
  
  /**
   * Execute all commands
   */
  async execute(_params: void, context: CommandContext): Promise<void> {
    if (this.executeInParallel) {
      // Execute in parallel
      await Promise.all(
        this.commands.map(cmd => cmd.execute(context))
      )
    } else {
      // Execute sequentially
      for (const cmd of this.commands) {
        if (await cmd.canExecute(context)) {
          await cmd.execute(context)
        }
      }
    }
  }
  
  /**
   * Undo all commands in reverse order
   */
  async undo(_params: void, context: CommandContext): Promise<void> {
    // Undo in reverse order
    const reversedCommands = [...this.commands].reverse()
    
    for (const cmd of reversedCommands) {
      if (cmd.command.undo) {
        await cmd.command.undo(cmd.params, context)
      }
    }
  }
}

/**
 * Command bus for executing commands with middleware
 */
export class CommandBus {
  private middleware: MiddlewarePipeline<CommandContext>
  
  constructor(middleware?: MiddlewarePipeline<CommandContext>) {
    this.middleware = middleware || new MiddlewarePipelineImpl()
  }
  
  /**
   * Execute a command
   */
  async execute<T>(command: ValidatedCommand<T>): Promise<void> {
    const context: CommandContext = {
      commandId: command.command.id,
      timestamp: Date.now()
    }
    
    await this.middleware.execute(context, async () => {
      // Check if can execute
      if (!await command.canExecute(context)) {
        throw new Error(`Command ${command.command.name} cannot execute in current context`)
      }
      
      // Execute command
      await command.execute(context)
    })
  }
  
  /**
   * Execute multiple commands
   */
  async executeMany(commands: Array<ValidatedCommand<unknown>>): Promise<void> {
    for (const command of commands) {
      await this.execute(command)
    }
  }
}

/**
 * Command factory for creating commands with defaults
 */
export class CommandFactory {
  /**
   * Create a simple command from a function
   */
  static fromFunction<T>(
    id: string,
    name: string,
    schema: z.ZodSchema<T>,
    executeFn: (params: T, context: CommandContext) => Promise<void>
  ): new() => Command<T> {
    return class extends Command<T> {
      id = id
      name = name
      description = `Command: ${name}`
      schema = schema
      
      canExecute(): boolean {
        return true
      }
      
      async execute(params: T, context: CommandContext): Promise<void> {
        return executeFn(params, context)
      }
    }
  }
  
  /**
   * Create a command with undo support
   */
  static withUndo<T>(
    id: string,
    name: string,
    schema: z.ZodSchema<T>,
    executeFn: (params: T, context: CommandContext) => Promise<void>,
    undoFn: (params: T, context: CommandContext) => Promise<void>
  ): new() => Command<T> {
    return class extends Command<T> {
      id = id
      name = name
      description = `Undoable Command: ${name}`
      schema = schema
      
      canExecute(): boolean {
        return true
      }
      
      async execute(params: T, context: CommandContext): Promise<void> {
        return executeFn(params, context)
      }
      
      async undo(params: T, context: CommandContext): Promise<void> {
        return undoFn(params, context)
      }
    }
  }
} 