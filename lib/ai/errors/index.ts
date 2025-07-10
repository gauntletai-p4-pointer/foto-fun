/**
 * FotoFun Error System
 * 
 * Provides a consistent error hierarchy for better error handling and user experience.
 * All errors have:
 * - Technical message for debugging
 * - User-friendly message for display
 * - Error code for programmatic handling
 * - Recoverable flag for retry logic
 */

/**
 * Base error class for all FotoFun errors
 */
export class FotoFunError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly userMessage: string,
    public readonly recoverable: boolean = true,
    public readonly cause?: Error
  ) {
    super(message)
    this.name = this.constructor.name
    
    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }
  
  /**
   * Convert to a JSON-serializable object
   */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      userMessage: this.userMessage,
      recoverable: this.recoverable,
      stack: this.stack,
      cause: this.cause?.message
    }
  }
}

/**
 * Canvas-related errors
 */
export class CanvasError extends FotoFunError {
  constructor(message: string, code: string, userMessage: string, cause?: Error) {
    super(message, `CANVAS_${code}`, userMessage, true, cause)
  }
}

export class CanvasNotReadyError extends CanvasError {
  constructor(operation?: string) {
    super(
      `Canvas not initialized${operation ? ` for ${operation}` : ''}`,
      'NOT_READY',
      'Please wait for the canvas to load before performing this action.'
    )
  }
}

export class CanvasInitializationError extends CanvasError {
  constructor(cause: Error) {
    super(
      `Canvas failed to initialize: ${cause.message}`,
      'INIT_FAILED',
      'Failed to initialize the canvas. Please refresh the page and try again.',
      cause
    )
  }
}

export class NoImageLoadedError extends CanvasError {
  constructor(operation: string) {
    super(
      `No image loaded for ${operation}`,
      'NO_IMAGE',
      'Please load an image before using this tool.'
    )
  }
}

/**
 * Tool execution errors
 */
export class ToolError extends FotoFunError {
  constructor(
    public readonly toolName: string,
    message: string,
    code: string,
    userMessage: string,
    recoverable = true,
    cause?: Error
  ) {
    super(message, `TOOL_${code}`, userMessage, recoverable, cause)
  }
}

export class ToolExecutionError extends ToolError {
  constructor(toolName: string, cause: Error) {
    super(
      toolName,
      `Tool ${toolName} failed: ${cause.message}`,
      'EXECUTION_FAILED',
      `The ${toolName} operation failed. Please try again.`,
      true,
      cause
    )
  }
}

export class ToolParameterError extends ToolError {
  constructor(toolName: string, parameter: string, reason: string) {
    super(
      toolName,
      `Invalid parameter ${parameter} for tool ${toolName}: ${reason}`,
      'INVALID_PARAMETER',
      `Invalid ${parameter}: ${reason}`,
      false
    )
  }
}

export class ToolNotFoundError extends ToolError {
  constructor(toolName: string) {
    super(
      toolName,
      `Tool ${toolName} not found`,
      'NOT_FOUND',
      `The requested tool "${toolName}" is not available.`,
      false
    )
  }
}

/**
 * AI/Agent errors
 */
export class AIError extends FotoFunError {
  constructor(message: string, code: string, userMessage: string, recoverable = true, cause?: Error) {
    super(message, `AI_${code}`, userMessage, recoverable, cause)
  }
}

export class AIServiceError extends AIError {
  constructor(
    public readonly service: string,
    message: string,
    code?: string,
    cause?: Error
  ) {
    super(
      `${service} service error: ${message}`,
      code || 'SERVICE_ERROR',
      'The AI service is temporarily unavailable. Please try again.',
      true,
      cause
    )
  }
}

export class AIQuotaExceededError extends AIError {
  constructor(service: string, details?: string) {
    super(
      `${service} quota exceeded${details ? `: ${details}` : ''}`,
      'QUOTA_EXCEEDED',
      'You\'ve reached your AI usage limit. Please try again later or upgrade your plan.',
      false
    )
  }
}

export class AIServiceUnavailableError extends AIError {
  constructor(service: string, details?: string) {
    super(
      `${service} service unavailable${details ? `: ${details}` : ''}`,
      'SERVICE_UNAVAILABLE',
      'The AI service is temporarily unavailable. Please try again in a few moments.',
      true
    )
  }
}

/**
 * Command/History errors
 */
export class CommandError extends FotoFunError {
  constructor(message: string, code: string, userMessage: string, cause?: Error) {
    super(message, `COMMAND_${code}`, userMessage, true, cause)
  }
}

export class CommandExecutionError extends CommandError {
  constructor(commandName: string, cause: Error) {
    super(
      `Command ${commandName} failed: ${cause.message}`,
      'EXECUTION_FAILED',
      'The operation failed. You can undo and try again.',
      cause
    )
  }
}

export class CommandValidationError extends CommandError {
  constructor(commandName: string, reason: string) {
    super(
      `Command ${commandName} validation failed: ${reason}`,
      'VALIDATION_FAILED',
      reason,
      undefined
    )
  }
}

/**
 * File handling errors
 */
export class FileError extends FotoFunError {
  constructor(message: string, code: string, userMessage: string, cause?: Error) {
    super(message, `FILE_${code}`, userMessage, true, cause)
  }
}

export class FileTooLargeError extends FileError {
  constructor(fileName: string, size: number, maxSize: number) {
    super(
      `File ${fileName} is too large: ${size} bytes (max: ${maxSize})`,
      'TOO_LARGE',
      `File is too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB.`
    )
  }
}

export class InvalidFileTypeError extends FileError {
  constructor(fileName: string, fileType: string) {
    super(
      `Invalid file type for ${fileName}: ${fileType}`,
      'INVALID_TYPE',
      'Please select a valid image file (JPEG, PNG, GIF, or WebP).'
    )
  }
}

/**
 * Layer errors
 */
export class LayerError extends FotoFunError {
  constructor(message: string, code: string, userMessage: string, cause?: Error) {
    super(message, `LAYER_${code}`, userMessage, true, cause)
  }
}

export class LayerLockedError extends LayerError {
  constructor(layerName: string, operation: string) {
    super(
      `Cannot ${operation} on locked layer: ${layerName}`,
      'LOCKED',
      `Cannot ${operation} on a locked layer. Unlock the layer first.`
    )
  }
}

export class LayerNotFoundError extends LayerError {
  constructor(layerId: string) {
    super(
      `Layer ${layerId} not found`,
      'NOT_FOUND',
      'The requested layer no longer exists.'
    )
  }
}

/**
 * Error utilities
 */
export function isRecoverableError(error: unknown): boolean {
  return error instanceof FotoFunError && error.recoverable
}

export function getUserMessage(error: unknown): string {
  if (error instanceof FotoFunError) {
    return error.userMessage
  }
  
  if (error instanceof Error) {
    // Check for common error patterns
    if (error.message.includes('Network')) {
      return 'Network error. Please check your connection and try again.'
    }
    if (error.message.includes('timeout')) {
      return 'The operation timed out. Please try again.'
    }
  }
  
  return 'An unexpected error occurred. Please try again.'
}

export function getErrorCode(error: unknown): string {
  if (error instanceof FotoFunError) {
    return error.code
  }
  return 'UNKNOWN_ERROR'
}

/**
 * Error recovery suggestions
 */
export function getRecoverySuggestion(error: unknown): string | null {
  const code = getErrorCode(error)
  
  const suggestions: Record<string, string> = {
    'CANVAS_NOT_READY': 'Wait a moment for the canvas to load',
    'CANVAS_NO_IMAGE': 'Open an image file first',
    'TOOL_EXECUTION_FAILED': 'Try the operation again',
    'AI_QUOTA_EXCEEDED': 'Wait a few minutes or upgrade your plan',
    'AI_SERVICE_UNAVAILABLE': 'Try again in a few moments',
    'FILE_TOO_LARGE': 'Use a smaller image or compress it first',
    'FILE_INVALID_TYPE': 'Use JPEG, PNG, GIF, or WebP format',
    'LAYER_LOCKED': 'Unlock the layer in the layers panel',
    'COMMAND_EXECUTION_FAILED': 'Undo and try again'
  }
  
  return suggestions[code] || null
} 