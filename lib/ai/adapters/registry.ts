import type { ToolAdapter } from './base'
import type { UnifiedToolAdapter } from './base/UnifiedToolAdapter'
import type { Tool } from 'ai'

/**
 * Registry for tool adapters - singleton pattern
 * Maps canvas tools to AI-compatible tool adapters
 */
class AdapterRegistry {
  private adapters = new Map<string, ToolAdapter | UnifiedToolAdapter<any, any>>()
  
  /**
   * Register a tool adapter
   */
  register(adapter: ToolAdapter | UnifiedToolAdapter<any, any>): void {
    this.adapters.set(adapter.aiName, adapter)
    // console.log(`[AdapterRegistry] Registered AI adapter: ${adapter.aiName}`)
    // console.log(`[AdapterRegistry] Adapter description: ${adapter.description}`)
  }
  
  /**
   * Register multiple adapters at once
   */
  registerMany(adapters: (ToolAdapter | UnifiedToolAdapter<any, any>)[]): void {
    adapters.forEach(adapter => this.register(adapter))
  }
  
  /**
   * Get adapter by name
   */
  get(name: string): ToolAdapter | UnifiedToolAdapter<unknown, unknown> | undefined {
    return this.adapters.get(name)
  }
  
  /**
   * Get all registered adapters
   */
  getAll(): (ToolAdapter | UnifiedToolAdapter<unknown, unknown>)[] {
    return Array.from(this.adapters.values())
  }
  
  /**
   * Get all AI tools as a record for AI SDK v5
   * This returns the actual AI SDK tool objects
   * The type matches what the AI SDK expects for ToolSet
   */
  getAITools(): Record<string, Tool<unknown, unknown>> {
    const tools: Record<string, Tool<unknown, unknown>> = {}
    
    // console.log('[AdapterRegistry] Getting AI tools, total adapters:', this.adapters.size)
    
    this.adapters.forEach(adapter => {
      // console.log(`[AdapterRegistry] Creating AI tool for: ${adapter.aiName}`)
      tools[adapter.aiName] = adapter.toAITool() as Tool<unknown, unknown>
    })
    
    // console.log('[AdapterRegistry] Created AI tools:', Object.keys(tools))
    
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
  getByCategory(category: 'canvas-editing' | 'ai-native'): (ToolAdapter | UnifiedToolAdapter<any, any>)[] {
    return this.getAll().filter(adapter => {
      // Check if this is a ToolAdapter with metadata property
      if ('metadata' in adapter && adapter.metadata && typeof adapter.metadata === 'object' && 'category' in adapter.metadata) {
        return adapter.metadata.category === category
      } else {
        // UnifiedToolAdapter or ToolAdapter without metadata - assume canvas-editing
        return category === 'canvas-editing'
      }
    })
  }
  
  /**
   * Get only canvas editing tools (for workflows)
   */
  getCanvasEditingTools(): (ToolAdapter | UnifiedToolAdapter<any, any>)[] {
    return this.getByCategory('canvas-editing')
  }
  
  /**
   * Get only AI-native tools (for single-tool execution)
   */
  getAINativeTools(): (ToolAdapter | UnifiedToolAdapter<any, any>)[] {
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
  // console.log('[AdapterRegistry] Starting auto-discovery of tool adapters')
  
  try {
    // Import and register all canvas tool adapters
    const { CropToolAdapter } = await import('./tools/crop')
    const { MoveToolAdapter } = await import('./tools/move')
    const { BrightnessToolAdapter } = await import('./tools/brightness')
    const { ContrastToolAdapter } = await import('./tools/contrast')
    const { SaturationToolAdapter } = await import('./tools/saturation')
    const { ResizeToolAdapter } = await import('./tools/resize')
    const { FlipToolAdapter } = await import('./tools/flip')
    const { RotateToolAdapter } = await import('./tools/rotate')
    const { ExposureToolAdapter } = await import('./tools/exposure')
    const { HueToolAdapter } = await import('./tools/hue')
    const { BlurToolAdapter } = await import('./tools/blur')
    const { SharpenAdapter } = await import('./tools/sharpen')
    const { GrayscaleToolAdapter } = await import('./tools/grayscale')
    const { InvertToolAdapter } = await import('./tools/invert')
    const { VintageEffectsToolAdapter } = await import('./tools/vintageEffects')
    const { AddTextToolAdapter } = await import('./tools/addText')
    const { AnalyzeCanvasAdapter } = await import('./tools/analyzeCanvas')
    const { CanvasSelectionManagerAdapter } = await import('./tools/canvasSelectionManager')
    const { BrushToolAdapter } = await import('./tools/brush')
    const { EraserToolAdapter } = await import('./tools/eraser')
    const { GradientToolAdapter } = await import('./tools/gradient')
    
    // Import and register all AI tool adapters
    const { ImageGenerationAdapter } = await import('./tools/ImageGenerationAdapter')
    const { ObjectRemovalAdapter } = await import('./tools/ObjectRemovalAdapter')
    const { StyleTransferAdapter } = await import('./tools/StyleTransferAdapter')
    const { VariationAdapter } = await import('./tools/VariationAdapter')
    const { RelightingAdapter } = await import('./tools/RelightingAdapter')
    const { UpscalingAdapter } = await import('./tools/UpscalingAdapter')
    const { FaceEnhancementAdapter } = await import('./tools/FaceEnhancementAdapter')
    const { InpaintingAdapter } = await import('./tools/InpaintingAdapter')
    const { OutpaintingAdapter } = await import('./tools/OutpaintingAdapter')
    const { SemanticSelectionAdapter } = await import('./tools/SemanticSelectionAdapter')
    const { DepthEstimationAdapter } = await import('./tools/DepthEstimationAdapter')
    const { InstructionEditingAdapter } = await import('./tools/InstructionEditingAdapter')
    const { PromptEnhancementAdapter } = await import('./tools/PromptEnhancementAdapter')
    
    const { registerChainAdapter } = await import('../execution/ChainAdapter')
    
    // Register all canvas tool adapters
    const canvasAdapters = [
      new CropToolAdapter(),
      new MoveToolAdapter(),
      new BrightnessToolAdapter(),
      new ContrastToolAdapter(),
      new SaturationToolAdapter(),
      new ResizeToolAdapter(),
      new FlipToolAdapter(),
      new RotateToolAdapter(),
      new ExposureToolAdapter(),
      new HueToolAdapter(),
      new BlurToolAdapter(),
      new SharpenAdapter(),
      new GrayscaleToolAdapter(),
      new InvertToolAdapter(),
      new VintageEffectsToolAdapter(),
      new AddTextToolAdapter(),
      new AnalyzeCanvasAdapter(),
      new CanvasSelectionManagerAdapter(),
      new BrushToolAdapter(),
      new EraserToolAdapter(),
      new GradientToolAdapter()
    ]
    
    // Register all AI tool adapters
    const aiAdapters = [
      new ImageGenerationAdapter(),
      new ObjectRemovalAdapter(),
      new StyleTransferAdapter(),
      new VariationAdapter(),
      new RelightingAdapter(),
      new UpscalingAdapter(),
      new FaceEnhancementAdapter(),
      new InpaintingAdapter(),
      new OutpaintingAdapter(),
      new SemanticSelectionAdapter(),
      new DepthEstimationAdapter(),
      new InstructionEditingAdapter(),
      new PromptEnhancementAdapter()
    ]
    
    // Register all adapters
    adapterRegistry.registerMany([...canvasAdapters, ...aiAdapters])
    
    // Register the chain adapter
    registerChainAdapter()
    
    // console.log('[AdapterRegistry] Registered tool adapters including chain execution')
  } catch (error) {
    console.error('[AdapterRegistry] Error during auto-discovery:', error)
  }
} 