import { z } from 'zod'
import { UnifiedToolAdapter, type ObjectCanvasContext } from '../base/UnifiedToolAdapter'
import { grayscaleTool } from '@/lib/editor/tools/filters/grayscaleTool'

// Define parameter schema
const grayscaleParameters = z.object({
  enabled: z.boolean().describe('Whether to apply grayscale effect. true = convert to grayscale, false = remove grayscale')
})

// Define types
type GrayscaleInput = z.infer<typeof grayscaleParameters>

interface GrayscaleOutput {
  success: boolean
  enabled: boolean
  message: string
  affectedObjects: string[]
}

/**
 * Adapter for the grayscale filter tool
 * Provides AI-compatible interface for converting images to grayscale
 */
export class GrayscaleToolAdapter extends UnifiedToolAdapter<GrayscaleInput, GrayscaleOutput> {
  toolId = 'grayscale'
  aiName = 'apply_grayscale'
  description = `Convert images to grayscale (black and white) or remove grayscale effect.
  
  Common requests:
  - "make it black and white" → enabled: true
  - "convert to grayscale" → enabled: true
  - "remove color" → enabled: true
  - "restore color" → enabled: false
  - "remove grayscale" → enabled: false
  
  NEVER ask the user - determine from their intent.`
  
  inputSchema = grayscaleParameters
  
  async execute(
    params: GrayscaleInput, 
    context: ObjectCanvasContext
  ): Promise<GrayscaleOutput> {
    const targets = this.getTargets(context)
    const imageObjects = targets.filter(obj => obj.type === 'image')
    
    if (imageObjects.length === 0) {
      return {
        success: false,
        enabled: params.enabled,
        message: 'No image objects found to apply grayscale',
        affectedObjects: []
      }
    }
    
    console.log(`[GrayscaleAdapter] ${params.enabled ? 'Applying' : 'Removing'} grayscale to ${imageObjects.length} objects`)
    
    try {
      // Use the underlying grayscale tool to apply the effect
      if (params.enabled) {
        await grayscaleTool.applyGrayscale(100)
      } else {
        await grayscaleTool.applyGrayscale(0)
      }
      
      // Get affected object IDs
      const affectedObjects = imageObjects.map(obj => obj.id)
      
      const message = params.enabled 
        ? `Converted ${affectedObjects.length} object(s) to grayscale`
        : `Removed grayscale effect from ${affectedObjects.length} object(s)`
      
      return {
        success: true,
        enabled: params.enabled,
        message,
        affectedObjects
      }
    } catch (error) {
      throw new Error(`Grayscale application failed: ${this.formatError(error)}`)
    }
  }
}

// Export singleton instance
const grayscaleAdapter = new GrayscaleToolAdapter()
export default grayscaleAdapter 