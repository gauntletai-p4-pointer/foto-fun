/**
 * Result Pattern for Command Error Handling
 * Provides standardized success/failure responses for commands
 */

export interface ExecutionMetadata {
  executionTime: number
  affectedObjects: string[]
  memoryUsage?: number
  performanceMetrics?: Record<string, number>
}

export interface CommandSuccess<T = void> {
  success: true
  data: T
  events: DomainEvent[]
  metadata: ExecutionMetadata
}

export interface CommandFailure {
  success: false
  error: CommandError
  rollback?: () => Promise<void>
}

export type CommandResult<T = void> = CommandSuccess<T> | CommandFailure

/**
 * Domain Event for command execution tracking
 */
export interface DomainEvent {
  id: string
  type: string
  aggregateId: string
  timestamp: number
  data: Record<string, unknown>
}

/**
 * Command-specific error types
 */
export class CommandError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'CommandError'
  }
}

export class ValidationError extends CommandError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', context)
    this.name = 'ValidationError'
  }
}

export class ExecutionError extends CommandError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'EXECUTION_ERROR', context)
    this.name = 'ExecutionError'
  }
}

export class ConcurrencyError extends CommandError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'CONCURRENCY_ERROR', context)
    this.name = 'ConcurrencyError'
  }
}

/**
 * Helper functions for creating results
 */
export function success<T>(
  data: T,
  events: DomainEvent[] = [],
  metadata: Partial<ExecutionMetadata> = {}
): CommandSuccess<T> {
  return {
    success: true,
    data,
    events,
    metadata: {
      executionTime: 0,
      affectedObjects: [],
      ...metadata
    }
  }
}

export function failure(
  error: CommandError,
  rollback?: () => Promise<void>
): CommandFailure {
  return {
    success: false,
    error,
    rollback
  }
}

/**
 * Result utilities for working with command results
 */
export class ResultUtils {
  static isSuccess<T>(result: CommandResult<T>): result is CommandSuccess<T> {
    return result.success === true
  }

  static isFailure<T>(result: CommandResult<T>): result is CommandFailure {
    return result.success === false
  }

  static unwrap<T>(result: CommandResult<T>): T {
    if (ResultUtils.isSuccess(result)) {
      return result.data
    }
    throw result.error
  }

  static unwrapOr<T>(result: CommandResult<T>, defaultValue: T): T {
    if (ResultUtils.isSuccess(result)) {
      return result.data
    }
    return defaultValue
  }
} 