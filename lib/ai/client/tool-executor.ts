import { CanvasToolBridge } from '../tools/canvas-bridge'
import { adapterRegistry, autoDiscoverAdapters } from '../adapters/registry'
import { useCanvasStore } from '@/store/canvasStore'

/**
 * Client-side tool executor for AI operations
 * Handles execution of AI tools in the browser context
 * 
 * This executor ONLY works with AI-adapted tools from the adapter registry.
 * Regular canvas tools must be adapted before they can be used by AI.
 */
export class ClientToolExecutor {
  private static initialized = false
  
  /**
   * Initialize adapters on first use
   */
  private static async initialize() {
    if (!this.initialized) {
      console.log('[ClientToolExecutor] Initializing adapters...')
      await autoDiscoverAdapters()
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
    console.log('[ClientToolExecutor] Executing tool:', toolName, 'with params:', params)
    
    // Initialize adapters if not already done
    await this.initialize()
    
    // Get tool from registry
    const tool = adapterRegistry.get(toolName)
    if (!tool) {
      console.error('[ClientToolExecutor] Tool not found:', toolName)
      console.log('[ClientToolExecutor] Available tools:', adapterRegistry.getAll().map(t => t.aiName))
      throw new Error(`Tool not found: ${toolName}`)
    }
    
    // Wait for canvas to be ready
    console.log('[ClientToolExecutor] Waiting for canvas...')
    
    // First check current state
    const initialState = useCanvasStore.getState()
    console.log('[ClientToolExecutor] Initial state:', {
      isReady: initialState.isReady,
      hasCanvas: !!initialState.fabricCanvas,
      hasContent: initialState.fabricCanvas ? initialState.fabricCanvas.getObjects().length : 0,
      initPromise: !!initialState.initializationPromise
    })
    
    try {
      await useCanvasStore.getState().waitForReady()
      console.log('[ClientToolExecutor] Canvas ready after wait')
    } catch (error) {
      console.error('[ClientToolExecutor] Canvas wait failed:', error)
      
      // Check if this is because no canvas exists at all
      const state = useCanvasStore.getState()
      if (!state.fabricCanvas && !state.initializationPromise) {
        throw new Error('No image loaded. Please open an image file before using AI tools.')
      }
      
      // Otherwise, it's a real initialization error
      throw new Error('Canvas initialization failed. Please refresh the page and try again.')
    }
    
    // Get canvas directly from store to ensure we have the latest state
    const canvasState = useCanvasStore.getState()
    const { fabricCanvas, isReady, hasContent } = canvasState
    
    console.log('[ClientToolExecutor] State after wait:', {
      isReady,
      hasCanvas: !!fabricCanvas,
      hasContent: hasContent(),
      objectCount: fabricCanvas ? fabricCanvas.getObjects().length : 0
    })
    
    // Verify canvas is available
    if (!fabricCanvas || !isReady) {
      console.error('[ClientToolExecutor] Canvas not available after waitForReady')
      console.log('[ClientToolExecutor] Canvas state:', {
        isReady,
        hasCanvas: !!fabricCanvas,
        initError: canvasState.initializationError
      })
      throw new Error('Canvas is not available. Please ensure an image is loaded.')
    }
    
    // Check if canvas has content for tools that need it
    if (!hasContent()) {
      console.log('[ClientToolExecutor] Canvas has no content')
      // Some tools (like image generation) don't need existing content
      // Let the tool adapter handle whether it needs content or not
    }
    
    // Get full enhanced context from bridge
    const context = CanvasToolBridge.getCanvasContext()
    if (!context) {
      console.error('[ClientToolExecutor] Bridge context not available')
      throw new Error('Canvas context is not available. Please ensure an image is loaded.')
    }
    
    console.log('[ClientToolExecutor] Using enhanced context with targeting:', {
      targetImages: context.targetImages.length,
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