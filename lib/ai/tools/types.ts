/**
 * Error structure for tool execution failures
 */
export interface ToolError {
  code: string
  message: string
  details?: unknown
}

/**
 * Standardized result format for all tool executions
 */
export interface ToolResult<T = unknown> {
  success: boolean
  data?: T
  error?: ToolError
  preview?: {
    before?: string
    after?: string
  }
  metadata?: {
    duration: number
    confidence?: number
    toolName: string
  }
}

/**
 * Tool execution context passed to all tools
 */
export interface ToolExecutionContext {
  canvas?: unknown // Canvas instance on client
  canvasContext?: unknown // Canvas context for server
  userId?: string
  sessionId?: string
} 