import { z } from 'zod'
import { BaseToolAdapter } from '../base'
import { brightnessTool } from '@/lib/editor/tools/adjustments/brightnessTool'
import type { Canvas } from 'fabric'
import type { Image as FabricImage } from 'fabric'
import { filters } from 'fabric'

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
}

// Define filter type
interface ImageFilter {
  type?: string
  [key: string]: unknown
}

/**
 * Adapter for the brightness tool to make it AI-compatible
 * Following AI SDK v5 patterns
 */
export class BrightnessToolAdapter extends BaseToolAdapter<BrightnessInput, BrightnessOutput> {
  tool = brightnessTool
  aiName = 'adjustBrightness'
  description = `Adjust image brightness. You MUST calculate the adjustment value based on user intent.
Common patterns you should use:
- "brighter" or "lighten" → +20 to +30
- "much brighter" or "very bright" → +40 to +60
- "slightly brighter" or "a bit lighter" → +10 to +15
- "darker" or "darken" → -20 to -30
- "much darker" or "very dark" → -40 to -60
- "slightly darker" or "a bit darker" → -10 to -15
- "brighten by X%" → use X directly
- "darken by X%" → use -X
NEVER ask for exact values - always interpret the user's intent and choose an appropriate value.`
  
  inputSchema = brightnessParameters
  
  async execute(params: BrightnessInput, context: { canvas: Canvas }): Promise<BrightnessOutput> {
    console.log('[BrightnessToolAdapter] Execute called with params:', params)
    const canvas = context.canvas
    
    if (!canvas) {
      throw new Error('Canvas is required but not provided in context')
    }
    
    // Get all image objects
    const objects = canvas.getObjects()
    const images = objects.filter(obj => obj.type === 'image') as FabricImage[]
    
    console.log('[BrightnessToolAdapter] Found images:', images.length)
    
    if (images.length === 0) {
      throw new Error('No images found on canvas. Please load an image first before adjusting brightness.')
    }
    
    // Store previous brightness values (simplified - just track if filters existed)
    const previousValue = 0 // In a real implementation, we'd track the current brightness
    
    // Apply brightness to all images
    images.forEach(img => {
      // Remove existing brightness filters
      if (!img.filters) {
        img.filters = []
      } else {
        img.filters = img.filters.filter((f) => (f as unknown as ImageFilter).type !== 'Brightness')
      }
      
      // Add new brightness filter if adjustment is not 0
      if (params.adjustment !== 0) {
        const brightnessValue = params.adjustment / 100
        const brightnessFilter = new filters.Brightness({
          brightness: brightnessValue
        })
        
        img.filters.push(brightnessFilter)
      }
      
      // Apply filters
      img.applyFilters()
    })
    
    // Render the canvas to show changes
    canvas.renderAll()
    
    console.log('[BrightnessToolAdapter] Brightness adjustment applied successfully')
    
    return {
      success: true,
      previousValue,
      newValue: params.adjustment,
      affectedImages: images.length
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