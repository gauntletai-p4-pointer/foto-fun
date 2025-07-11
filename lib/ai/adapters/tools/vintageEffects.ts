import { z } from 'zod'
import { UnifiedToolAdapter } from '../base/UnifiedToolAdapter'
import type { ObjectCanvasContext } from '../base/UnifiedToolAdapter'

// Define parameter schema
const vintageEffectsInputSchema = z.object({
  effect: z.enum(['brownie', 'vintage-pinhole', 'kodachrome', 'technicolor', 'polaroid'])
    .describe('The vintage effect to apply')
})

// Define types
type VintageEffectsInput = z.infer<typeof vintageEffectsInputSchema>

interface VintageEffectsOutput {
  success: boolean
  effect: string
  message: string
  affectedObjects: string[]
}

/**
 * Adapter for the vintage effects tool
 * Provides AI-compatible interface for applying vintage film effects
 */
export class VintageEffectsToolAdapter extends UnifiedToolAdapter<VintageEffectsInput, VintageEffectsOutput> {
  toolId = 'vintage-effects'
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
  
  inputSchema = vintageEffectsInputSchema
  
  async execute(params: VintageEffectsInput, context: ObjectCanvasContext): Promise<VintageEffectsOutput> {
    const targets = this.getTargets(context)
    const imageObjects = targets.filter(obj => obj.type === 'image')
    
    if (imageObjects.length === 0) {
      return {
        success: false,
        effect: params.effect,
        message: 'No image objects found to apply vintage effect',
        affectedObjects: []
      }
    }
    
    const affectedObjects: string[] = []
    
    for (const obj of imageObjects) {
      const filters = obj.filters || []
      
      // Remove existing vintage effect filters
      const filteredFilters = filters.filter(f => !['brownie', 'vintage-pinhole', 'kodachrome', 'technicolor', 'polaroid'].includes(f.type))
      
      // Add new vintage effect filter
      filteredFilters.push({
        id: `vintage-${Date.now()}`,
        type: params.effect,
        params: {}
      })
      
      await context.canvas.updateObject(obj.id, {
        filters: filteredFilters
      })
      
      affectedObjects.push(obj.id)
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
    const message = `Applied ${effectName} effect to ${affectedObjects.length} object${affectedObjects.length !== 1 ? 's' : ''}`
    
    return {
      success: true,
      effect: params.effect,
      message,
      affectedObjects
    }
  }
}

// Export singleton instance
const vintageEffectsAdapter = new VintageEffectsToolAdapter()
export default vintageEffectsAdapter 