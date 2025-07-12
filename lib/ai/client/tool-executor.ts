import { CanvasToolBridge } from '../tools/canvas-bridge'
import { adapterRegistry, autoDiscoverAdapters } from '../adapters/registry'
import type { ServiceContainer } from '@/lib/core/ServiceContainer'

/**
 * Client-side tool executor for AI operations
 * Handles execution of AI tools in the browser context
 * 
 * This executor ONLY works with AI-adapted tools from the adapter registry.
 * Regular canvas tools must be adapted before they can be used by AI.
 */
export class ClientToolExecutor {
  private static initialized = false
  private static serviceContainer: ServiceContainer | null = null
  
  /**
   * Set the service container for dependency injection
   */
  static setServiceContainer(container: ServiceContainer): void {
    this.serviceContainer = container
  }
  
  /**
   * Initialize adapters on first use
   */
  private static async initialize() {
    if (!this.initialized) {
      console.log('[ClientToolExecutor] Initializing adapters...')
      await autoDiscoverAdapters(this.serviceContainer || undefined)
      this.initialized = true
      console.log('[ClientToolExecutor] Adapters initialized:', adapterRegistry.getAll().map(t => t.aiName))
    }
  }
  
  /**
   * Execute an AI-adapted tool by name with given parameters
   */
  static async execute(
    toolName: string,
    params: unknown
  ): Promise<unknown> {
    console.log('[ClientToolExecutor] === EXECUTE TOOL ===')
    console.log('[ClientToolExecutor] Tool name:', toolName)
    console.log('[ClientToolExecutor] Params:', params)
    console.log('[ClientToolExecutor] Params type:', typeof params)
    
    // Initialize adapters if not already done
    await this.initialize()
    
    // Get tool from registry
    const tool = adapterRegistry.get(toolName)
    console.log('[ClientToolExecutor] Tool lookup result:', !!tool)
    console.log('[ClientToolExecutor] Looking for tool:', toolName)
    console.log('[ClientToolExecutor] Is saturation tool?:', toolName === 'adjustSaturation')
    
    if (!tool) {
      console.error('[ClientToolExecutor] Tool not found:', toolName)
      console.log('[ClientToolExecutor] Available tools:', adapterRegistry.getAll().map(t => t.aiName))
      console.log('[ClientToolExecutor] Registry has saturation:', adapterRegistry.get('adjustSaturation') !== undefined)
      throw new Error(`Tool not found: ${toolName}`)
    }
    
    // Get unified context from bridge
    const context = CanvasToolBridge.getCanvasContext()
    if (!context) {
      console.error('[ClientToolExecutor] Canvas context not available')
      throw new Error('Canvas context is not available. Please ensure an image is loaded.')
    }
    
    console.log('[ClientToolExecutor] Using enhanced context with targeting:', {
      targetObjects: context.targetObjects.length,
      targetingMode: context.targetingMode
    })
    
    try {
      // Execute the adapter with enhanced context
      const result = await tool.execute(params, context)
      console.log('[ClientToolExecutor] Adapter execution successful:', result)
      return result
    } catch (error) {
      console.error(`AI tool execution failed for ${toolName}:`, error)
      throw error
    }
  }
  
  /**
   * Check if an AI tool is available
   */
  static isToolAvailable(toolName: string): boolean {
    return adapterRegistry.hasAdapter(toolName)
  }
  
  /**
   * Get list of available AI tools
   */
  static getAvailableTools(): Array<{ name: string; description: string }> {
    return adapterRegistry.getAll().map(adapter => ({
      name: adapter.aiName,
      description: adapter.description
    }))
  }
} 