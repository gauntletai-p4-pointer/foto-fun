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
    // Import all canvas tool adapters
    const { CropToolAdapter } = await import('./tools/crop')
    const { default: BrightnessAdapter } = await import('./tools/brightness')
    const { default: ContrastAdapter } = await import('./tools/contrast')
    const { default: SaturationAdapter } = await import('./tools/saturation')
    const { default: HueAdapter } = await import('./tools/hue')
    const { default: ExposureAdapter } = await import('./tools/exposure')
    const { default: ColorTemperatureAdapter } = await import('./tools/colorTemperature')
    const { default: RotateAdapter } = await import('./tools/rotate')
    const { default: FlipAdapter } = await import('./tools/flip')
    const { default: ResizeAdapter } = await import('./tools/resize')
    const { default: BlurAdapter } = await import('./tools/blur')
    const { default: SharpenAdapter } = await import('./tools/sharpen')
    const { default: GrayscaleAdapter } = await import('./tools/grayscale')
    const { default: SepiaAdapter } = await import('./tools/sepia')
    const { default: InvertAdapter } = await import('./tools/invert')
    const { addTextAdapter } = await import('./tools/addText')
    const { AnalyzeCanvasAdapter } = await import('./tools/analyzeCanvas')
    
    // Register canvas tool adapters
    adapterRegistry.register(new CropToolAdapter())
    adapterRegistry.register(new BrightnessAdapter())
    adapterRegistry.register(new ContrastAdapter())
    adapterRegistry.register(new SaturationAdapter())
    adapterRegistry.register(HueAdapter)
    adapterRegistry.register(ExposureAdapter) // This is already an instance, not a class
    adapterRegistry.register(ColorTemperatureAdapter)
    adapterRegistry.register(RotateAdapter)
    adapterRegistry.register(FlipAdapter)
    adapterRegistry.register(ResizeAdapter)
    adapterRegistry.register(BlurAdapter)
    adapterRegistry.register(SharpenAdapter)
    adapterRegistry.register(GrayscaleAdapter)
    adapterRegistry.register(SepiaAdapter)
    adapterRegistry.register(InvertAdapter)
    adapterRegistry.register(addTextAdapter)
    adapterRegistry.register(new AnalyzeCanvasAdapter())
    
    // Import and register AI-Native Tool adapters (Replicate)
    try {
      const { ImageGenerationAdapter } = await import('./tools/imageGeneration')
      const { ImageUpscalingAdapter } = await import('./tools/imageUpscaling')
      const { BackgroundRemovalAdapter } = await import('./tools/backgroundRemoval')
      const { InpaintingAdapter } = await import('./tools/inpainting')
      adapterRegistry.register(new ImageGenerationAdapter())
      adapterRegistry.register(new ImageUpscalingAdapter())
      adapterRegistry.register(new BackgroundRemovalAdapter())
      adapterRegistry.register(new InpaintingAdapter())
      console.log('[AdapterRegistry] Registered Replicate AI-Native Tool adapters')
    } catch (error) {
      console.warn('[AdapterRegistry] Replicate adapters not available (API key not configured):', error)
    }
    
    console.log('[AdapterRegistry] Registered 20 tool adapters (17 canvas + 3 AI-Native)')
  } catch (error) {
    console.error('[AdapterRegistry] Error during auto-discovery:', error)
  }
} 