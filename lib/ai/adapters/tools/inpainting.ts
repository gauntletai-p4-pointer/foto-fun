import { z } from 'zod'
import * as fabric from 'fabric'
import { useLayerStore } from '@/store/layerStore'
import { tool } from 'ai'
import { v4 as uuidv4 } from 'uuid'
import { BaseToolAdapter } from '../base'
import { CanvasToolBridge } from '@/lib/ai/tools/canvas-bridge'

// Input schema
type InpaintInput = {
  prompt: string
  strength?: number
  steps?: number
  num_outputs?: number
  guaidance_scale?: number
  negative_prompt?: string
}

type InpaintOutput = {
  success: boolean
  message: string
  imageUrl?: string
  cost?: number
  metadata?: {
    model?: string
    processingTime?: number
    [key: string]: unknown
  }
}

// Zod schema
const inpaintInputSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').describe('The text description for inpainting the selected area.'),
  strength: z.number().min(0).max(1).optional().default(0.75).describe('Strength of the inpainting (0-1).'),
  steps: z.number().min(1).optional().default(20).describe('Number of inference steps (more = better quality but slower).'),
  num_outputs: z.number().min(1).optional().default(1).describe('Number of output images to generate.'),
  guaidance_scale: z.number().min(0).optional().default(7.5).describe('Guidance scale (higher = more adherence to prompt).'),
  negative_prompt: z.string().optional().describe('What to avoid in the generated image.'),
})

export class InpaintingAdapter extends BaseToolAdapter<InpaintInput, InpaintOutput> {
  aiName = 'inpaintImage'
  description = `Inpaint a selected area of the image using AI generation. REQUIRES an active selection on the canvas. If there is no selection, DO NOT call this tool; instead, instruct the user to select an area first using selection tools like lasso or magic wand. Use this for filling or replacing selected regions based on prompt. Examples: 'fill the selected area with a cat', 'replace the sky with sunset'.`
  metadata = {
    category: 'ai-native' as const,
    executionType: 'expensive' as const,
    worksOn: 'existing-image' as const
  }
  
  inputSchema = inpaintInputSchema
  
  get tool() {
    return {
      id: 'ai-inpainting',
      name: 'AI Inpainting',
      icon: () => null,
      cursor: 'default',
      isImplemented: true
    }
  }
  
  async execute(params: InpaintInput, context: { canvas: fabric.Canvas }): Promise<InpaintOutput> {
    try {
      const { useCanvasStore } = await import('@/store/canvasStore')
      const canvasStore = useCanvasStore.getState()
      const selectionManager = canvasStore.selectionManager
      if (!selectionManager || !selectionManager.getSelection()) {
        return { success: false, message: 'No selection available for inpainting. Please select an area first.' }
      }
      
      const selection = selectionManager.getSelection()!
      
      // Generate mask - selection.mask is already canvas-sized and positioned correctly
      const selectionMask = selection.mask
      const selectionBounds = selection.bounds
      
      console.log('[InpaintingAdapter] Selection bounds:', selectionBounds)
      console.log('[InpaintingAdapter] Canvas size:', context.canvas.getWidth(), 'x', context.canvas.getHeight())
      console.log('[InpaintingAdapter] Selection mask size:', selectionMask.width, 'x', selectionMask.height)
      
      const maskCanvas = document.createElement('canvas')
      maskCanvas.width = selectionMask.width
      maskCanvas.height = selectionMask.height
      const maskCtx = maskCanvas.getContext('2d')!
      
      // Convert selection mask to black/white mask
      const maskData = maskCtx.createImageData(selectionMask.width, selectionMask.height)
      for (let i = 0; i < selectionMask.data.length; i += 4) {
        const alpha = selectionMask.data[i + 3]
        const isSelected = alpha > 128
        
        // Set RGB based on selection (white = inpaint, black = preserve)
        const color = isSelected ? 255 : 0
        maskData.data[i] = color     // R
        maskData.data[i + 1] = color // G
        maskData.data[i + 2] = color // B
        maskData.data[i + 3] = 255   // A (always opaque)
      }
      
      maskCtx.putImageData(maskData, 0, 0)
      const maskUrl = maskCanvas.toDataURL('image/png')
      console.log('[InpaintingAdapter] Generated mask URL length:', maskUrl.length)
      
      // Get image without selection overlay
      const imageUrl = await CanvasToolBridge.getCleanCanvasImage(context.canvas, { format: 'png', multiplier: 1 })
      
      // Remove width/height auto-fill logic
      
      // Debug: Verify mask positioning
      console.log('[InpaintingAdapter] Selection bounds:', selectionBounds)
      console.log('[InpaintingAdapter] Canvas size:', context.canvas.getWidth(), 'x', context.canvas.getHeight())
      console.log('[InpaintingAdapter] Selection mask size:', selectionMask.width, 'x', selectionMask.height)
      
      // Call API
      const response = await fetch('/api/ai/replicate/inpaint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageUrl,
          mask: maskUrl,
          prompt: params.prompt,
          strength: params.strength,
          steps: params.steps,
          num_outputs: params.num_outputs,
          guaidance_scale: params.guaidance_scale,
          negative_prompt: params.negative_prompt
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Server error')
      }
      
      const result = await response.json()
      if (!result.success || !result.imageUrl) {
        throw new Error('Invalid response')
      }
      
      // Show in review modal instead of applying directly
      console.log('[InpaintingAdapter] Showing result in review modal...')
      await this.showInReviewModal(result.imageUrl, context.canvas, params.prompt, maskUrl)
      console.log('[InpaintingAdapter] Review modal displayed')
      
      return {
        success: true,
        message: `Inpainted with prompt: "${params.prompt}"`,
        imageUrl: result.imageUrl,
        cost: 0.002, // Estimated
        metadata: result.metadata
      }
    } catch (error) {
      console.error('[InpaintingAdapter] Error:', error)
      return {
        success: false,
        message: `Inpainting failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }
  


  private async showInReviewModal(processedImageUrl: string, canvas: fabric.Canvas, prompt: string, maskImage: string): Promise<void> {
    console.log('[InpaintingAdapter] showInReviewModal called with imageUrl length:', processedImageUrl.length)
    
    // Get the original canvas as base64 for comparison (without selection overlay)
    const originalImageUrl = await CanvasToolBridge.getCleanCanvasImage(canvas, { format: 'png', multiplier: 1 })
    
    // Get canvas store to show review modal
    const { useCanvasStore } = await import('@/store/canvasStore')
    const canvasStore = useCanvasStore.getState()
    
    console.log('[InpaintingAdapter] Setting up review modal...')
    
    canvasStore.setReviewModal({
      isOpen: true,
      title: `AI Inpainting Result: ${prompt}`,
      originalImage: originalImageUrl,
      processedImage: processedImageUrl,
      maskImage: maskImage,
      onApplyInPlace: () => {
        console.log('[InpaintingAdapter] User chose to apply inpainting result')
        this.applyToCanvas(processedImageUrl, canvas, prompt)
        canvasStore.setReviewModal(null)
      },
      onRejectChange: () => {
        console.log('[InpaintingAdapter] User rejected inpainting result')
        canvasStore.setReviewModal(null)
      },
      onAcceptBoth: () => {
        console.log('[InpaintingAdapter] User chose to keep both images')
        this.applyToCanvas(processedImageUrl, canvas, prompt)
        canvasStore.setReviewModal(null)
      }
    })
  }
  
  private async applyToCanvas(imageUrl: string, canvas: fabric.Canvas, prompt: string): Promise<void> {
    const img = await fabric.Image.fromURL(imageUrl, { crossOrigin: 'anonymous' })
    if (!img) throw new Error('Failed to load image')
    
    const canvasWidth = canvas.getWidth()
    const canvasHeight = canvas.getHeight()
    const scaleX = canvasWidth / (img.width || 1)
    const scaleY = canvasHeight / (img.height || 1)
    const scale = Math.min(scaleX, scaleY, 1)
    img.scale(scale)
    
    const left = (canvasWidth - img.getScaledWidth()) / 2
    const top = (canvasHeight - img.getScaledHeight()) / 2
    
    const layerStore = useLayerStore.getState()
    const layerName = `Inpainted: ${prompt.substring(0, 20)}`
    const newLayer = layerStore.addLayer({ name: layerName, type: 'image' })
    
    const imageId = `inpainted_${uuidv4()}`
    img.set({ left, top, selectable: true, evented: true, id: imageId, layerId: newLayer.id })
    
    canvas.add(img)
    canvas.setActiveObject(img)
    canvas.renderAll()
  }
  
  toAITool() {
    return tool({
      description: this.description,
      inputSchema: this.inputSchema,
      execute: async (args: InpaintInput) => {
        // Server-side placeholder
        return {
          success: true,
          message: `Inpainting request sent with prompt: "${args.prompt}". Will be applied on client.`
        }
      }
    })
  }
}

