import { z } from 'zod'
import { BaseToolAdapter } from '../base'
import { invertTool } from '@/lib/editor/tools/filters/invertTool'
import type { CanvasContext } from '@/lib/ai/tools/canvas-bridge'

// Define parameter schema
const invertParameters = z.object({
  enable: z.boolean()
    .describe('Whether to enable color inversion (true) or disable it (false)')
})

// Define types
type InvertInput = z.infer<typeof invertParameters>

interface InvertOutput {
  success: boolean
  enabled: boolean
  message: string
  targetingMode: 'selection' | 'all-images' | 'auto-single'
}

// Create adapter class
export class InvertAdapter extends BaseToolAdapter<InvertInput, InvertOutput> {
  tool = invertTool
  aiName = 'invertColors'
  description = `Invert the colors of existing images (negative effect). 

IMPORTANT: The tool checks if images already have invert applied:
- If NO images have invert → applies invert
- If ANY images have invert → removes invert from all
This ensures consistent behavior across multiple operations.

INTELLIGENT TARGETING:
- If you have images selected, only those images will be inverted
- If no images are selected, all images on the canvas will be inverted

Common invert requests:
- "invert colors" or "negative effect" → enable: true
- "remove invert" or "restore normal colors" → enable: false

Note: The enable parameter is used for intent, but the actual action depends on current image state.`

  metadata = {
    category: 'canvas-editing' as const,
    executionType: 'fast' as const,
    worksOn: 'existing-image' as const
  }

  inputSchema = invertParameters
  
  async execute(params: InvertInput, context: CanvasContext): Promise<InvertOutput> {
    try {
      console.log('[InvertAdapter] Execute called with params:', params)
      console.log('[InvertAdapter] Targeting mode:', context.targetingMode)
      
      // Use pre-filtered target images from enhanced context
      const images = context.targetImages
      
      console.log('[InvertAdapter] Target images:', images.length)
      console.log('[InvertAdapter] Targeting mode:', context.targetingMode)
      
      if (images.length === 0) {
        throw new Error('No images found to invert. Please load an image or select images first.')
      }
      
      // Create a selection snapshot from the target images
      const { SelectionSnapshotFactory } = await import('@/lib/ai/execution/SelectionSnapshot')
      const selectionSnapshot = SelectionSnapshotFactory.fromObjects(images)
      
      // Activate the invert tool first
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
        // Trigger the toggle action
        const { useToolOptionsStore } = await import('@/store/toolOptionsStore')
        useToolOptionsStore.getState().updateOption(this.tool.id, 'action', 'toggle')
      } finally {
        // Clear selection snapshot
        if (tool && 'setSelectionSnapshot' in tool && typeof tool.setSelectionSnapshot === 'function') {
          tool.setSelectionSnapshot(null)
        }
      }
      
      // Generate descriptive message
      const description = params.enable
        ? 'Inverted colors (negative effect)'
        : 'Restored normal colors'
      
      const message = `${description} for ${images.length} image${images.length !== 1 ? 's' : ''}`
      
      return {
        success: true,
        enabled: params.enable,
        message,
        targetingMode: context.targetingMode
      }
    } catch (error) {
      return {
        success: false,
        enabled: false,
        message: error instanceof Error ? error.message : 'Failed to invert colors',
        targetingMode: context.targetingMode
      }
    }
  }
}

// Export singleton instance
const invertAdapter = new InvertAdapter()
export default invertAdapter 