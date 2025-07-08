import type { FotoFunTool } from './base'

export class ToolRegistry {
  private tools = new Map<string, FotoFunTool>()
  
  /**
   * Register a tool
   */
  register(tool: FotoFunTool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool with name "${tool.name}" is already registered`)
    }
    this.tools.set(tool.name, tool)
  }
  
  /**
   * Register multiple tools at once
   */
  registerMany(tools: FotoFunTool[]): void {
    for (const tool of tools) {
      this.register(tool)
    }
  }
  
  /**
   * Get a tool by name
   */
  get(name: string): FotoFunTool | undefined {
    return this.tools.get(name)
  }
  
  /**
   * Get all tools
   */
  getAll(): FotoFunTool[] {
    return Array.from(this.tools.values())
  }
  
  /**
   * Get all enabled tools for a given context
   */
  async getEnabledTools(
    context: unknown,
    agent: unknown
  ): Promise<FotoFunTool[]> {
    const tools = this.getAll()
    const enabledTools: FotoFunTool[] = []
    
    for (const tool of tools) {
      if (typeof tool.isEnabled === 'boolean') {
        if (tool.isEnabled) {
          enabledTools.push(tool)
        }
      } else {
        const enabled = await tool.isEnabled(context, agent)
        if (enabled) {
          enabledTools.push(tool)
        }
      }
    }
    
    return enabledTools
  }
  
  /**
   * Get tools by category
   */
  getByCategory(category: string): FotoFunTool[] {
    return this.getAll().filter(tool => tool.category === category)
  }
  
  /**
   * Get tools that require canvas
   */
  getCanvasTools(): FotoFunTool[] {
    return this.getAll().filter(tool => tool.requiresCanvas)
  }
  
  /**
   * Get tools that require selection
   */
  getSelectionTools(): FotoFunTool[] {
    return this.getAll().filter(tool => tool.requiresSelection)
  }
  
  /**
   * Convert tools to AI SDK v5 format
   */
  toAISDKTools(): Record<string, unknown> {
    const tools: Record<string, unknown> = {}
    
    for (const [name, tool] of this.tools) {
      tools[name] = tool.tool
    }
    
    return tools
  }
  
  /**
   * Clear all tools
   */
  clear(): void {
    this.tools.clear()
  }
}

// Global singleton instance
export const toolRegistry = new ToolRegistry() 