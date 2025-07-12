import { z } from 'zod'
import { UnifiedToolAdapter, type ObjectCanvasContext } from '../base/UnifiedToolAdapter'
import { vintageEffectsTool } from '@/lib/editor/tools/filters/vintageEffectsTool'

// Define parameter schema
const vintageEffectsParameters = z.object({
  effect: z.enum(['brownie', 'vintage-pinhole', 'kodachrome', 'technicolor', 'polaroid', 'sepia'])
    .describe('The vintage effect to apply')
})

// Define types
type VintageEffectsInput = z.infer<typeof vintageEffectsParameters>

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
  aiName = 'apply_vintage_effect'
  description = `Apply vintage film effects to images. These are WebGL-powered effects that simulate classic film types.

Available effects:
- "brownie" → Classic brownie camera effect with warm brown tones
- "vintage-pinhole" → Pinhole camera effect with vignetting and distortion
- "kodachrome" → Kodachrome film simulation with vibrant, saturated colors
- "technicolor" → Classic Technicolor film effect with rich colors
- "polaroid" → Instant camera effect with faded edges and unique color cast
- "sepia" → Classic sepia tone effect

Common requests:
- "vintage effect" or "old photo" → brownie
- "retro look" → kodachrome or technicolor
- "instant camera" → polaroid
- "pinhole camera" → vintage-pinhole
- "sepia tone" → sepia

NEVER ask which effect - interpret the user's intent and choose the most appropriate effect.`
  
  inputSchema = vintageEffectsParameters
  
  async execute(
    params: VintageEffectsInput, 
    context: ObjectCanvasContext
  ): Promise<VintageEffectsOutput> {
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
    
    console.log(`[VintageEffectsAdapter] Applying ${params.effect} effect to ${imageObjects.length} objects`)
    
    try {
      // Use the underlying vintage effects tool to apply the effect
      await vintageEffectsTool.applyVintageEffect(params.effect, 100)
      
      // Get affected object IDs
      const affectedObjects = imageObjects.map(obj => obj.id)
      
      // Get human-readable effect name
      const effectNames: Record<string, string> = {
        'brownie': 'Brownie camera',
        'vintage-pinhole': 'Vintage pinhole',
        'kodachrome': 'Kodachrome film',
        'technicolor': 'Technicolor film',
        'polaroid': 'Polaroid instant camera',
        'sepia': 'Sepia tone'
      }
      
      const effectName = effectNames[params.effect] || params.effect
      const message = `Applied ${effectName} effect to ${affectedObjects.length} object(s)`
      
      return {
        success: true,
        effect: params.effect,
        message,
        affectedObjects
      }
    } catch (error) {
      throw new Error(`Vintage effect application failed: ${this.formatError(error)}`)
    }
  }
}

// Export singleton instance
const vintageEffectsAdapter = new VintageEffectsToolAdapter()
export default vintageEffectsAdapter 