import { z } from 'zod'
import { BaseToolAdapter } from '../base'
import { brightnessTool } from '@/lib/editor/tools/adjustments/brightnessTool'
import type { Canvas } from 'fabric'
import type { Image as FabricImage } from 'fabric'
import { filters } from 'fabric'
import type { CanvasContext } from '@/lib/ai/tools/canvas-bridge'

// Extended type for FabricImage with filters
type FabricImageWithFilters = FabricImage & {
  filters?: unknown[]
  applyFilters(): void
}

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
  targetingMode: 'selection' | 'all-images'
}

// Define filter type
interface ImageFilter {
  type?: string
  [key: string]: unknown
}

/**
 * Adapter for the brightness tool to make it AI-compatible
 * Following AI SDK v5 patterns with intelligent image targeting
 */
export class BrightnessToolAdapter extends BaseToolAdapter<BrightnessInput, BrightnessOutput> {
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
  
  async execute(params: BrightnessInput, context: CanvasContext): Promise<BrightnessOutput> {
    console.log('[BrightnessToolAdapter] Execute called with params:', params)
    console.log('[BrightnessToolAdapter] Targeting mode:', context.targetingMode)
    
    const canvas = context.canvas
    
    if (!canvas) {
      throw new Error('Canvas is required but not provided in context')
    }
    
    // Use pre-filtered target images from enhanced context
    const images = context.targetImages
    
    console.log('[BrightnessToolAdapter] Target images:', images.length)
    console.log('[BrightnessToolAdapter] Targeting mode:', context.targetingMode)
    
    if (images.length === 0) {
      throw new Error('No images found to adjust brightness. Please load an image or select images first.')
    }
    
    // Store previous brightness values (simplified - just track if filters existed)
    const previousValue = 0 // In a real implementation, we'd track the current brightness
    
    // Apply brightness to target images only
    images.forEach((img, index) => {
      console.log(`[BrightnessToolAdapter] Processing image ${index + 1}/${images.length}`)
      
      const imageWithFilters = img as FabricImageWithFilters
      
      // Remove existing brightness filters
      if (!imageWithFilters.filters) {
        imageWithFilters.filters = []
      } else {
        imageWithFilters.filters = imageWithFilters.filters.filter((f: unknown) => (f as unknown as ImageFilter).type !== 'Brightness')
      }
      
      // Add new brightness filter if adjustment is not 0
      if (params.adjustment !== 0) {
        const brightnessValue = params.adjustment / 100
        const brightnessFilter = new filters.Brightness({
          brightness: brightnessValue
        })
        
        imageWithFilters.filters.push(brightnessFilter)
      }
      
      // Apply filters
      imageWithFilters.applyFilters()
    })
    
    // Render the canvas to show changes
    canvas.renderAll()
    
    console.log('[BrightnessToolAdapter] Brightness adjustment applied successfully')
    
    return {
      success: true,
      previousValue,
      newValue: params.adjustment,
      affectedImages: images.length,
      targetingMode: context.targetingMode
    }
  }
  
  canExecute(canvas: Canvas): boolean {
    // Can only adjust brightness if there are images on the canvas
    const hasImages = canvas.getObjects().some(obj => obj.type === 'image')
    if (!hasImages) {
      console.warn('Brightness tool: No images on canvas')
    }
    return hasImages
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