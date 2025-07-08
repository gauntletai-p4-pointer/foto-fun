import type { ToolAdapter } from './base'
import type { FotoFunTool, ToolExecutionContext } from '../tools/base'
import { toolRegistry } from '../tools/registry'
import { ToolFactory } from '../tools/factory'

/**
 * Registry for tool adapters
 * Automatically registers AI tools when adapters are added
 */
class AdapterRegistry {
  private adapters = new Map<string, ToolAdapter>()
  
  /**
   * Register a tool adapter
   * Automatically registers the AI tool in the main tool registry
   */
  register(adapter: ToolAdapter): void {
    // Register in adapter registry
    this.adapters.set(adapter.tool.id, adapter)
    
    // Create AI tool using ToolFactory and register in main tool registry
    const config = 'getToolConfig' in adapter && typeof adapter.getToolConfig === 'function'
      ? adapter.getToolConfig()
      : this.createToolConfig(adapter)
    const aiTool = ToolFactory.createTool(config)
    toolRegistry.register(aiTool)
    
    console.log(`Registered AI adapter for tool: ${adapter.tool.name} as ${adapter.aiName}`)
  }
  
  /**
   * Fallback method to create tool config if adapter doesn't have getToolConfig
   */
  private createToolConfig(adapter: ToolAdapter) {
    return {
      name: adapter.aiName,
      category: 'edit' as const,
      description: adapter.aiDescription,
      inputSchema: adapter.inputSchema,
      outputSchema: adapter.outputSchema,
      executionSide: 'client' as const,
      requiresCanvas: true,
      clientExecutor: async (input: unknown, context: ToolExecutionContext) => {
        if (!context.canvas) {
          throw new Error('Canvas is required for this operation')
        }
        
        if (adapter.canExecute && !adapter.canExecute(context.canvas)) {
          throw new Error('Tool cannot be executed in current state')
        }
        
        return adapter.execute(input, context.canvas)
      },
      previewGenerator: adapter.generatePreview ? 
        async (input: unknown, context: ToolExecutionContext) => {
          if (!context.canvas) {
            throw new Error('Canvas is required for preview generation')
          }
          const preview = await adapter.generatePreview!(input, context.canvas)
          return {
            ...preview,
            confidence: 1,
            diff: undefined,
            alternativeParams: undefined
          }
        } : undefined
    }
  }
  
  /**
   * Register multiple adapters at once
   */
  registerMany(adapters: ToolAdapter[]): void {
    adapters.forEach(adapter => this.register(adapter))
  }
  
  /**
   * Get adapter by tool ID
   */
  get(toolId: string): ToolAdapter | undefined {
    return this.adapters.get(toolId)
  }
  
  /**
   * Get all registered adapters
   */
  getAll(): ToolAdapter[] {
    return Array.from(this.adapters.values())
  }
  
  /**
   * Get all AI tool names for system prompt
   */
  getAIToolNames(): string[] {
    return this.getAll().map(adapter => adapter.aiName)
  }
  
  /**
   * Get tool descriptions for system prompt
   */
  getToolDescriptions(): string[] {
    return this.getAll().map(adapter => 
      `- ${adapter.aiName}: ${adapter.aiDescription}`
    )
  }
  
  /**
   * Check if a tool has an adapter
   */
  hasAdapter(toolId: string): boolean {
    return this.adapters.has(toolId)
  }
  
  /**
   * Get all AI tools as a record for AI SDK
   */
  getAITools(): Record<string, FotoFunTool> {
    const tools: Record<string, FotoFunTool> = {}
    
    this.adapters.forEach(adapter => {
      // Create tool config and use ToolFactory
      const config = 'getToolConfig' in adapter && typeof adapter.getToolConfig === 'function'
        ? adapter.getToolConfig()
        : this.createToolConfig(adapter)
      const aiTool = ToolFactory.createTool(config)
      tools[adapter.aiName] = aiTool
    })
    
    return tools
  }
}

// Singleton instance
export const adapterRegistry = new AdapterRegistry()

// Auto-discovery function for adapters
export async function autoDiscoverAdapters(): Promise<void> {
  try {
    // In a real implementation, this would scan the adapters directory
    // For now, we'll manually import known adapters
    const { CropToolAdapter } = await import('./tools/crop')
    
    adapterRegistry.register(new CropToolAdapter())
    
    // Future adapters would be imported here:
    // const { BrightnessAdapter } = await import('./tools/brightness')
    // const { ContrastAdapter } = await import('./tools/contrast')
    // etc.
    
  } catch (error) {
    console.error('Error auto-discovering adapters:', error)
  }
} 