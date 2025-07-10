import type { ToolAdapter } from './base'
import type { Tool } from 'ai'

/**
 * Registry for tool adapters - singleton pattern
 * Maps canvas tools to AI-compatible tool adapters
 */
class AdapterRegistry {
  private adapters = new Map<string, ToolAdapter>()
  
  /**
   * Register a tool adapter
   */
  register(adapter: ToolAdapter): void {
    this.adapters.set(adapter.aiName, adapter)
    console.log(`[AdapterRegistry] Registered AI adapter: ${adapter.aiName}`)
    console.log(`[AdapterRegistry] Adapter description: ${adapter.description}`)
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
    
    console.log('[AdapterRegistry] Getting AI tools, total adapters:', this.adapters.size)
    
    this.adapters.forEach(adapter => {
      console.log(`[AdapterRegistry] Creating AI tool for: ${adapter.aiName}`)
      tools[adapter.aiName] = adapter.toAITool() as Tool<unknown, unknown>
    })
    
    console.log('[AdapterRegistry] Created AI tools:', Object.keys(tools))
    
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
  
  /**
   * Get adapters by category for routing decisions
   */
  getByCategory(category: 'canvas-editing' | 'ai-native'): ToolAdapter[] {
    return this.getAll().filter(adapter => adapter.metadata.category === category)
  }
  
  /**
   * Get only canvas editing tools (for workflows)
   */
  getCanvasEditingTools(): ToolAdapter[] {
    return this.getByCategory('canvas-editing')
  }
  
  /**
   * Get only AI-native tools (for single-tool execution)
   */
  getAINativeTools(): ToolAdapter[] {
    return this.getByCategory('ai-native')
  }
  
  /**
   * Get tool names by category
   */
  getToolNamesByCategory(category: 'canvas-editing' | 'ai-native'): string[] {
    return this.getByCategory(category).map(adapter => adapter.aiName)
  }
}

// Singleton instance
export const adapterRegistry = new AdapterRegistry()

// Auto-discovery function for adapters
export async function autoDiscoverAdapters(): Promise<void> {
  console.log('[AdapterRegistry] Starting auto-discovery of tool adapters')
  
  try {
    // Import and register all adapters
    const { CropToolAdapter } = await import('./tools/crop')
    const { BrightnessToolAdapter } = await import('./tools/brightness')
    const { ContrastToolAdapter } = await import('./tools/contrast')
    const { SaturationToolAdapter } = await import('./tools/saturation')
    const { ResizeToolAdapter } = await import('./tools/resize')
    const { FlipAdapter } = await import('./tools/flip')
    const { RotateToolAdapter } = await import('./tools/rotate')
    const { ImageGenerationAdapter } = await import('./tools/imageGeneration')
    const { ExposureToolAdapter } = await import('./tools/exposure')
    const { HueToolAdapter } = await import('./tools/hue')
    const { ColorTemperatureToolAdapter } = await import('./tools/colorTemperature')
    const { BlurAdapter } = await import('./tools/blur')
    const { SharpenAdapter } = await import('./tools/sharpen')
    const { GrayscaleAdapter } = await import('./tools/grayscale')
    const { InvertAdapter } = await import('./tools/invert')
    const { SepiaAdapter } = await import('./tools/sepia')
    const { addTextAdapter } = await import('./tools/addText')
    const { AnalyzeCanvasAdapter } = await import('./tools/analyzeCanvas')
    const { CanvasSelectionManagerAdapter } = await import('./tools/canvasSelectionManager')
    const { registerChainAdapter } = await import('../execution/ChainAdapter')
    
    // Register all adapters
    const adapters = [
      new CropToolAdapter(),
      new BrightnessToolAdapter(),
      new ContrastToolAdapter(),
      new SaturationToolAdapter(),
      new ResizeToolAdapter(),
      new FlipAdapter(),
      new RotateToolAdapter(),
      new ImageGenerationAdapter(),
      new ExposureToolAdapter(),
      new HueToolAdapter(),
      new ColorTemperatureToolAdapter(),
      new BlurAdapter(),
      new SharpenAdapter(),
      new GrayscaleAdapter(),
      new InvertAdapter(),
      new SepiaAdapter(),
      addTextAdapter,  // This is already an instance
      new AnalyzeCanvasAdapter(),
      new CanvasSelectionManagerAdapter()
    ]
    adapterRegistry.registerMany(adapters)
    
    // Register the chain adapter
    registerChainAdapter()
    
    console.log('[AdapterRegistry] Registered tool adapters including chain execution')
  } catch (error) {
    console.error('[AdapterRegistry] Error during auto-discovery:', error)
  }
} 