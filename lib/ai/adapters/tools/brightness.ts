import { z } from 'zod'
import { FilterToolAdapter } from '../base'
import { brightnessTool } from '@/lib/editor/tools/adjustments/brightnessTool'
import type { Canvas } from 'fabric'
import { filters } from 'fabric'
import type { CanvasContext } from '@/lib/ai/tools/canvas-bridge'

// Input schema following AI SDK v5 patterns
const brightnessParameters = z.object({
  adjustment: z.number()
    .min(-100)
    .max(100)
    .describe('Brightness adjustment from -100 (darkest) to 100 (brightest), where 0 is no change')
})

type BrightnessInput = z.infer<typeof brightnessParameters>

// Output type
interface BrightnessOutput {
  success: boolean
  previousValue: number
  newValue: number
  affectedImages: number
  targetingMode: 'selection' | 'auto-single'
  message?: string
}

/**
 * Adapter for the brightness tool to make it AI-compatible
 * Following AI SDK v5 patterns with intelligent image targeting
 */
export class BrightnessToolAdapter extends FilterToolAdapter<BrightnessInput, BrightnessOutput> {
  tool = brightnessTool
  aiName = 'adjustBrightness'
  description = `Adjust the brightness of existing images on the canvas. This tool makes images lighter or darker.

INTELLIGENT TARGETING:
- If you have images selected, only those images will be adjusted
- If no images are selected, all images on the canvas will be adjusted

You MUST calculate the adjustment value based on user intent:
- "brighter" or "lighter" → +20 to +30
- "much brighter" or "very bright" → +40 to +60
- "slightly brighter" → +10 to +15
- "darker" or "dimmer" → -20 to -30
- "much darker" or "very dark" → -40 to -60
- "slightly darker" → -10 to -15

NEVER ask for exact values - interpret the user's intent and calculate appropriate adjustment values.
Range: -100 (completely black) to +100 (completely white)`

  metadata = {
    category: 'canvas-editing' as const,
    executionType: 'fast' as const,
    worksOn: 'existing-image' as const
  }

  inputSchema = brightnessParameters
  
  protected getActionVerb(): string {
    return 'adjust brightness'
  }
  
  protected getFilterType(): string {
    return 'Brightness'
  }
  
  protected shouldApplyFilter(params: BrightnessInput): boolean {
    return params.adjustment !== 0
  }
  
  protected createFilter(params: BrightnessInput): unknown {
    const brightnessValue = params.adjustment / 100
    return new filters.Brightness({
      brightness: brightnessValue
    })
  }
  
  async execute(params: BrightnessInput, context: CanvasContext): Promise<BrightnessOutput> {
    return this.executeWithCommonPatterns(params, context, async (images) => {
      // Apply brightness filter to images
      await this.applyFilterToImages(images, params, context.canvas)
      
      console.log('[BrightnessToolAdapter] Brightness adjustment applied successfully')
      
      // Generate descriptive message based on adjustment
      const direction = params.adjustment > 0 ? 'increased' : 'decreased'
      const magnitude = Math.abs(params.adjustment)
      let description = ''
      
      if (magnitude <= 15) {
        description = 'slightly'
      } else if (magnitude <= 35) {
        description = 'moderately'
      } else if (magnitude <= 60) {
        description = 'significantly'
      } else {
        description = 'dramatically'
      }
      
      const message = `${description.charAt(0).toUpperCase() + description.slice(1)} ${direction} brightness by ${magnitude}% on ${images.length} image${images.length !== 1 ? 's' : ''}`
      
      return {
        previousValue: 0, // In a real implementation, we'd track the current brightness
        newValue: params.adjustment,
        affectedImages: images.length,
        message
      }
    })
  }
  
  async generatePreview(params: BrightnessInput, canvas: Canvas): Promise<{ before: string; after: string }> {
    // Save current state
    const before = canvas.toDataURL()
    
    // Clone canvas for preview
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = canvas.getWidth()
    tempCanvas.height = canvas.getHeight()
    const ctx = tempCanvas.getContext('2d')!
    
    // Draw current canvas to temp
    const img = new Image()
    img.src = before
    await new Promise(resolve => {
      img.onload = resolve
    })
    ctx.drawImage(img, 0, 0)
    
    // Apply brightness adjustment to temp canvas
    if (params.adjustment !== 0) {
      // Simple brightness adjustment using canvas composite operations
      ctx.globalCompositeOperation = params.adjustment > 0 ? 'lighten' : 'darken'
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.abs(params.adjustment) / 200})`
      ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height)
    }
    
    const after = tempCanvas.toDataURL()
    
    return { before, after }
  }
}

// Export default instance for auto-discovery
export default BrightnessToolAdapter 