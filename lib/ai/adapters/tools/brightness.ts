import { z } from 'zod'
import { BaseToolAdapter } from '../base'
import type { CanvasContext } from '@/lib/ai/tools/canvas-bridge'
import type { ExecutionContext } from '@/lib/events/execution/ExecutionContext'
import { brightnessTool } from '@/lib/editor/tools/adjustments/brightnessTool'

// Define parameter schema
const brightnessParameters = z.object({
  adjustment: z.number().min(-100).max(100)
    .describe('Brightness adjustment percentage. Negative values darken, positive values brighten. Range: -100 to +100')
})

// Define types
type BrightnessInput = z.infer<typeof brightnessParameters>

interface BrightnessOutput {
  success: boolean
  adjustment: number
  message: string
  targetingMode: 'selection' | 'auto-single'
}

/**
 * Adapter for the brightness adjustment tool
 * Provides AI-compatible interface for adjusting image brightness
 */
export class BrightnessToolAdapter extends BaseToolAdapter<BrightnessInput, BrightnessOutput> {
  tool = brightnessTool
  aiName = 'adjust_brightness'
  description = `Adjust the brightness of images. 
  
  You MUST calculate the adjustment value based on user intent:
  - "brighter" or "lighter" → +20 to +30
  - "much brighter" → +40 to +60
  - "slightly brighter" → +10 to +15
  - "darker" → -20 to -30
  - "much darker" → -40 to -60
  - "slightly darker" → -10 to -15
  
  NEVER ask for exact values - interpret the user's intent.`
  
  metadata = {
    category: 'canvas-editing' as const,
    executionType: 'fast' as const,
    worksOn: 'existing-image' as const
  }
  
  inputSchema = brightnessParameters
  
  async execute(
    params: BrightnessInput, 
    context: CanvasContext,
    executionContext?: ExecutionContext
  ): Promise<BrightnessOutput> {
    try {
      console.log(`[BrightnessAdapter] Execute called with adjustment: ${params.adjustment}`)
      
      const canvas = context.canvas
      if (!canvas) {
        throw new Error('Canvas is required but not provided in context')
      }
      
      // Get target images from context
      const images = context.targetImages
      
      if (images.length === 0) {
        throw new Error('No images found to adjust brightness')
      }
      
      // Get the tool store from service container
      const container = (window as { __serviceContainer?: unknown }).__serviceContainer
      if (!container) {
        throw new Error('Service container not found')
      }
      
      const toolStore = container.get('ToolStore')
      
      // Activate the brightness tool
      toolStore.setActiveTool(this.tool.id)
      const activeTool = toolStore.getTool(this.tool.id)
      
      if (!activeTool) {
        throw new Error('Brightness tool not found')
      }
      
      // Set the adjustment value on the tool
      activeTool.setOption('adjustment', params.adjustment)
      
      // If we have an execution context, set it on the tool
      if (executionContext && 'setExecutionContext' in activeTool) {
        const toolWithContext = activeTool as { setExecutionContext: (context: ExecutionContext) => void }
        toolWithContext.setExecutionContext(executionContext)
      }
      
      // Apply brightness using the tool's method
      if ('applyBrightness' in activeTool && typeof activeTool.applyBrightness === 'function') {
        const toolWithApply = activeTool as { applyBrightness: (adjustment: number) => Promise<void> }
        await toolWithApply.applyBrightness(params.adjustment)
      }
      
      return {
        success: true,
        adjustment: params.adjustment,
        message: `Brightness adjusted by ${params.adjustment > 0 ? '+' : ''}${params.adjustment}%`,
        targetingMode: context.targetingMode
      }
      
    } catch (error) {
      return {
        success: false,
        adjustment: params.adjustment,
        message: error instanceof Error ? error.message : 'Failed to adjust brightness',
        targetingMode: context.targetingMode
      }
    }
  }
} 