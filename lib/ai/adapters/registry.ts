import type { ToolAdapter } from './base'
import type { Tool } from 'ai'

/**
 * Registry for tool adapters
 * Following AI SDK v5 patterns
 */
class AdapterRegistry {
  private adapters = new Map<string, ToolAdapter>()
  
  /**
   * Register a tool adapter
   */
  register(adapter: ToolAdapter): void {
    this.adapters.set(adapter.aiName, adapter)
    console.log(`Registered AI adapter: ${adapter.aiName}`)
  }
  
  /**
   * Register multiple adapters at once
   */
  registerMany(adapters: ToolAdapter[]): void {
    adapters.forEach(adapter => this.register(adapter))
  }
  
  /**
   * Get adapter by name
   */
  get(name: string): ToolAdapter | undefined {
    return this.adapters.get(name)
  }
  
  /**
   * Get all registered adapters
   */
  getAll(): ToolAdapter[] {
    return Array.from(this.adapters.values())
  }
  
  /**
   * Get all AI tools as a record for AI SDK v5
   * This returns the actual AI SDK tool objects
   * The type matches what the AI SDK expects for ToolSet
   */
  getAITools(): Record<string, Tool<unknown, unknown>> {
    const tools: Record<string, Tool<unknown, unknown>> = {}
    
    this.adapters.forEach(adapter => {
      tools[adapter.aiName] = adapter.toAITool() as Tool<unknown, unknown>
    })
    
    return tools
  }
  
  /**
   * Get tool descriptions for system prompt
   */
  getToolDescriptions(): string[] {
    return this.getAll().map(adapter => 
      `- ${adapter.aiName}: ${adapter.description}`
    )
  }
  
  /**
   * Check if a tool has an adapter
   */
  hasAdapter(name: string): boolean {
    return this.adapters.has(name)
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