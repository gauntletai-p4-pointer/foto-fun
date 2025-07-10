import { z } from 'zod'
import { BaseToolAdapter } from '../base'
import type { CanvasContext } from '@/lib/ai/tools/canvas-bridge'
import type { ExecutionContext } from '@/lib/events/execution/ExecutionContext'
import { vintageEffectsTool } from '@/lib/editor/tools/filters/vintageEffectsTool'
import { ServiceContainer } from '@/lib/core/ServiceContainer'
import type { EventToolStore } from '@/lib/store/tools/EventToolStore'

// Define parameter schema
const vintageEffectsParameters = z.object({
  effect: z.enum(['sepia', 'blackAndWhite', 'vintage1970s', 'vintagePolaroid'])
    .describe('The vintage effect to apply')
})

// Define types
type VintageEffectsInput = z.infer<typeof vintageEffectsParameters>

interface VintageEffectsOutput {
  success: boolean
  effect: string
  message: string
  targetingMode: 'selection' | 'auto-single'
}

/**
 * Adapter for the vintage effects tool
 * Provides AI-compatible interface for applying vintage film effects
 */
export class VintageEffectsToolAdapter extends BaseToolAdapter<VintageEffectsInput, VintageEffectsOutput> {
  tool = vintageEffectsTool
  aiName = 'applyVintageEffect'
  description = `Apply vintage film effects to images. These are WebGL-powered effects that simulate classic film types.

INTELLIGENT TARGETING:
- If you have images selected, only those images will have the effect applied
- If no images are selected, all images on the canvas will have the effect applied

Available effects:
- "brownie" → Classic brownie camera effect with warm brown tones
- "vintage-pinhole" → Pinhole camera effect with vignetting and distortion
- "kodachrome" → Kodachrome film simulation with vibrant, saturated colors
- "technicolor" → Classic Technicolor film effect with rich colors
- "polaroid" → Instant camera effect with faded edges and unique color cast

Common requests:
- "vintage effect" or "old photo" → brownie
- "retro look" → kodachrome or technicolor
- "instant camera" → polaroid
- "pinhole camera" → vintage-pinhole

NEVER ask which effect - interpret the user's intent and choose the most appropriate effect.`
  
  metadata = {
    category: 'canvas-editing' as const,
    executionType: 'fast' as const,
    worksOn: 'existing-image' as const
  }
  
  inputSchema = vintageEffectsParameters
  
  async execute(
    params: VintageEffectsInput, 
    context: CanvasContext,
    executionContext?: ExecutionContext
  ): Promise<VintageEffectsOutput> {
    try {
      console.log(`[VintageEffectsAdapter] Execute called with effect: ${params.effect}`)
      
      const canvas = context.canvas
      if (!canvas) {
        throw new Error('Canvas is required but not provided in context')
      }
      
      // Get target images from context
      const images = context.targetImages
      
      if (images.length === 0) {
        throw new Error('No images found to apply vintage effect')
      }
      
      // Create a selection snapshot from the target images
      const { SelectionSnapshotFactory } = await import('@/lib/ai/execution/SelectionSnapshot')
      const selectionSnapshot = SelectionSnapshotFactory.fromObjects(images)
      
      // Apply vintage effect using the tool
      const container = ServiceContainer.getInstance()
      const toolStore = container.getSync<EventToolStore>('ToolStore')
      
      // Activate the tool
      await toolStore.activateTool(this.tool.id)
      
      // Set selection snapshot on the tool
      const tool = toolStore.getTool(this.tool.id)
      if (tool && 'setSelectionSnapshot' in tool && typeof tool.setSelectionSnapshot === 'function') {
        tool.setSelectionSnapshot(selectionSnapshot)
      }
      
      // Set the effect on the tool
      if (tool && 'setOption' in tool && typeof tool.setOption === 'function') {
        tool.setOption('effect', params.effect)
      }
      
      // If we have an execution context, set it on the tool
      if (tool && executionContext && 'setExecutionContext' in tool) {
        const toolWithContext = tool as { setExecutionContext: (context: ExecutionContext) => void }
        toolWithContext.setExecutionContext(executionContext)
      }
      
      // Apply effect using the tool's method
      if (tool && 'applyVintageEffect' in tool && typeof tool.applyVintageEffect === 'function') {
        const toolWithApply = tool as { applyVintageEffect: (effect: string) => Promise<void> }
        await toolWithApply.applyVintageEffect(params.effect)
      }
      
      // Get human-readable effect name
      const effectNames: Record<string, string> = {
        'brownie': 'Brownie camera',
        'vintage-pinhole': 'Vintage pinhole',
        'kodachrome': 'Kodachrome film',
        'technicolor': 'Technicolor film',
        'polaroid': 'Polaroid instant camera'
      }
      
      const effectName = effectNames[params.effect] || params.effect
      const message = `Applied ${effectName} effect to ${images.length} image${images.length !== 1 ? 's' : ''}`
      
      return {
        success: true,
        effect: params.effect,
        message,
        targetingMode: context.targetingMode === 'selection' || context.targetingMode === 'auto-single' 
          ? context.targetingMode 
          : 'auto-single' // Default to auto-single for 'all' or 'none'
      }
    } catch (error) {
      return {
        success: false,
        effect: '',
        message: error instanceof Error ? error.message : 'Failed to apply vintage effect',
        targetingMode: context.targetingMode === 'selection' || context.targetingMode === 'auto-single' 
          ? context.targetingMode 
          : 'auto-single' // Default to auto-single for 'all' or 'none'
      }
    }
  }
} 