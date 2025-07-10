import { z } from 'zod'
import { BaseToolAdapter } from '../base'
import { flipTool } from '@/lib/editor/tools/transform/flipTool'
import type { CanvasContext } from '@/lib/ai/tools/canvas-bridge'

// Define parameter schema
const flipParameters = z.object({
  horizontal: z.boolean().optional(),
  vertical: z.boolean().optional()
})

type FlipInput = z.infer<typeof flipParameters>

// Define output type
interface FlipOutput {
  success: boolean
  horizontal: boolean
  vertical: boolean
  message: string
  targetingMode: 'selection' | 'auto-single'
}

// Create adapter class
export class FlipAdapter extends BaseToolAdapter<FlipInput, FlipOutput> {
  tool = flipTool
  aiName = 'flipImage'
  description = `Flip existing images horizontally or vertically. You MUST determine the flip direction based on user intent.

INTELLIGENT TARGETING:
- If you have images selected, only those images will be flipped
- If no images are selected, all images on the canvas will be flipped

Common flip requests:
- "flip horizontally" or "mirror" → horizontal: true
- "flip vertically" or "flip upside down" → vertical: true
- "flip both ways" → horizontal: true, vertical: true

NEVER ask which direction - interpret the user's intent.`

  metadata = {
    category: 'canvas-editing' as const,
    executionType: 'fast' as const,
    worksOn: 'existing-image' as const
  }

  inputSchema = flipParameters
  
  async execute(params: FlipInput, context: CanvasContext): Promise<FlipOutput> {
    try {
      console.log('[FlipAdapter] Execute called with params:', params)
      console.log('[FlipAdapter] Targeting mode:', context.targetingMode)
      
      // Use pre-filtered target images from enhanced context
      const images = context.targetImages
      
      console.log('[FlipAdapter] Target images:', images.length)
      console.log('[FlipAdapter] Targeting mode:', context.targetingMode)
      
      if (images.length === 0) {
        throw new Error('No images found to flip. Please load an image or select images first.')
      }
      
      // Create a selection snapshot from the target images
      const { SelectionSnapshotFactory } = await import('@/lib/ai/execution/SelectionSnapshot')
      const selectionSnapshot = SelectionSnapshotFactory.fromObjects(images)
      
      // Activate the flip tool first
      const { useToolStore } = await import('@/store/toolStore')
      useToolStore.getState().setActiveTool(this.tool.id)
      
      // Set selection snapshot on the tool
      const tool = useToolStore.getState().getTool(this.tool.id)
      if (tool && 'setSelectionSnapshot' in tool && typeof tool.setSelectionSnapshot === 'function') {
        tool.setSelectionSnapshot(selectionSnapshot)
      }
      
      // Small delay to ensure tool is activated and subscribed
      await new Promise(resolve => setTimeout(resolve, 50))
      
      try {
        // Get the flip tool options and trigger the flip action
        const { useToolOptionsStore } = await import('@/store/toolOptionsStore')
        
        if (params.horizontal) {
          useToolOptionsStore.getState().updateOption(this.tool.id, 'flipAction', 'horizontal')
        }
        
        if (params.vertical) {
          // Small delay between flips if both are requested
          if (params.horizontal) {
            await new Promise(resolve => setTimeout(resolve, 100))
          }
          useToolOptionsStore.getState().updateOption(this.tool.id, 'flipAction', 'vertical')
        }
      } finally {
        // Clear selection snapshot
        if (tool && 'setSelectionSnapshot' in tool && typeof tool.setSelectionSnapshot === 'function') {
          tool.setSelectionSnapshot(null)
        }
      }
      
      const flips = []
      if (params.horizontal) flips.push('horizontally')
      if (params.vertical) flips.push('vertically')
      
      // Generate descriptive message
      let description = ''
      if (params.horizontal && params.vertical) {
        description = 'Flipped both horizontally and vertically (180° rotation)'
      } else if (params.horizontal) {
        description = 'Flipped horizontally (mirrored)'
      } else if (params.vertical) {
        description = 'Flipped vertically (upside down)'
      } else {
        description = 'No flip applied'
      }
      
      const message = `${description} for ${images.length} image${images.length !== 1 ? 's' : ''}`
      
      return {
        success: true,
        horizontal: params.horizontal || false,
        vertical: params.vertical || false,
        message,
        targetingMode: context.targetingMode
      }
    } catch (error) {
      return {
        success: false,
        horizontal: false,
        vertical: false,
        message: error instanceof Error ? error.message : 'Failed to flip image',
        targetingMode: context.targetingMode
      }
    }
  }
}

// Export singleton instance
const flipAdapter = new FlipAdapter()
export default flipAdapter 