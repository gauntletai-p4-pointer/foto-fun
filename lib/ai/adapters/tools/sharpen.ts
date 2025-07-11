import { z } from 'zod'
import { UnifiedToolAdapter } from '../base/UnifiedToolAdapter'
import type { ObjectCanvasContext } from '../base/UnifiedToolAdapter'

// Define parameter schema
const sharpenInputSchema = z.object({
  amount: z.number().min(0).max(100)
    .describe('Sharpen intensity as a percentage (0-100). 0 = no sharpening, 100 = maximum sharpening')
})

// Define types
type SharpenInput = z.infer<typeof sharpenInputSchema>

interface SharpenOutput {
  success: boolean
  amount: number
  message: string
  affectedObjects: string[]
}

// Create adapter class
export class SharpenAdapter extends UnifiedToolAdapter<SharpenInput, SharpenOutput> {
  toolId = 'sharpen'
  aiName = 'sharpenImage'
  description = `Sharpen existing images to make them appear more crisp and detailed. You MUST calculate the amount based on user intent.

INTELLIGENT TARGETING:
- If you have images selected, only those images will be sharpened
- If no images are selected, all images on the canvas will be sharpened

Common sharpen requests:
- "sharpen" or "make it crisp" → amount: 15-25
- "heavy sharpen" or "very sharp" → amount: 30-40
- "subtle sharpen" or "slight sharpening" → amount: 5-10
- "remove sharpening" → amount: 0

NEVER ask for exact values - interpret the user's intent.
Range: 0 (no sharpening) to 50 (maximum sharpening)`

  inputSchema = sharpenInputSchema
  
  async execute(params: SharpenInput, context: ObjectCanvasContext): Promise<SharpenOutput> {
    const targets = this.getTargets(context)
    const imageObjects = targets.filter(obj => obj.type === 'image')
    
    if (imageObjects.length === 0) {
      return {
        success: false,
        amount: params.amount,
        message: 'No image objects found to sharpen',
        affectedObjects: []
      }
    }
    
    const affectedObjects: string[] = []
    
    for (const obj of imageObjects) {
      const filters = obj.filters || []
      
      // Remove existing sharpen filters
      const filteredFilters = filters.filter(f => f.type !== 'sharpen')
      
      // Add new sharpen filter if amount > 0
      if (params.amount > 0) {
        filteredFilters.push({
          id: `sharpen-${Date.now()}`,
          type: 'sharpen',
          params: { amount: params.amount }
        })
      }
      
      await context.canvas.updateObject(obj.id, {
        filters: filteredFilters
      })
      
      affectedObjects.push(obj.id)
    }
    
    // Generate descriptive message
    let description = ''
    
    if (params.amount === 0) {
      description = 'Removed sharpening'
    } else if (params.amount <= 20) {
      description = 'Applied subtle sharpening'
    } else if (params.amount <= 40) {
      description = 'Applied moderate sharpening'
    } else if (params.amount <= 70) {
      description = 'Applied strong sharpening'
    } else {
      description = 'Applied intense sharpening'
    }
    
    const message = `${description} (${params.amount}% intensity) on ${affectedObjects.length} object${affectedObjects.length !== 1 ? 's' : ''}`
    
    return {
      success: true,
      amount: params.amount,
      message,
      affectedObjects
    }
  }
}

// Export singleton instance
const sharpenAdapter = new SharpenAdapter()
export default sharpenAdapter 