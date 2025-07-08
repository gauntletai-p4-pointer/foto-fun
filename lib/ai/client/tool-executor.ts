import type { ToolExecutionContext } from '../tools/base'
import { toolRegistry } from '../tools/registry'
import { CanvasToolBridge } from '../tools/canvas-bridge'

/**
 * Client-side tool executor for AI operations
 * Handles execution of AI tools in the browser context
 */
export class ClientToolExecutor {
  /**
   * Execute a tool by name with given parameters
   */
  static async execute(
    toolName: string,
    params: unknown,
    additionalContext?: Partial<ToolExecutionContext>
  ): Promise<unknown> {
    // Get canvas context
    const context = CanvasToolBridge.getCanvasContext()
    if (!context) {
      throw new Error('No canvas context available')
    }
    
    // Merge additional context
    const fullContext = {
      ...context,
      ...additionalContext
    } as ToolExecutionContext
    
    // Try to get the tool from registry (includes both AI tools and adapted tools)
    const tool = toolRegistry.get(toolName)
    if (!tool) {
      throw new Error(`Unknown tool: ${toolName}`)
    }
    
    // Validate requirements
    if (tool.requiresCanvas && !fullContext.canvas) {
      throw new Error(`Tool ${tool.name} requires canvas`)
    }
    
    if (tool.requiresSelection && (!fullContext.selection || fullContext.selection.length === 0)) {
      throw new Error(`Tool ${tool.name} requires selection`)
    }
    
    // Execute client-side
    if (tool.executionSide === 'client' || tool.executionSide === 'both') {
      if (!tool.clientExecutor) {
        throw new Error(`Tool ${tool.name} has no client executor`)
      }
      
      try {
        // Validate input
        const validatedInput = tool.validateInput(params)
        
        // Execute
        const result = await tool.clientExecutor(validatedInput, fullContext)
        
        // Validate output
        return tool.validateOutput(result)
      } catch (error) {
        console.error(`Tool execution failed for ${tool.name}:`, error)
        throw error
      }
    }
    
    throw new Error(`Tool ${tool.name} cannot be executed on client`)
  }
  
  /**
   * Check if a tool is available for AI execution
   */
  static isToolAvailable(toolName: string): boolean {
    return toolRegistry.get(toolName) !== undefined
  }
  
  /**
   * Get list of available tools for AI
   */
  static getAvailableTools(): Array<{ name: string; description: string }> {
    return toolRegistry.getAll().map(tool => ({
      name: tool.name,
      description: tool.description
    }))
  }
} 