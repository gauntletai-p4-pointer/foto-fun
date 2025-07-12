import { z } from 'zod'
import { BaseToolAdapter } from '../base'
import type { Canvas } from 'fabric'
import { tool } from 'ai'
import type { Tool } from '@/types'

// Input schema for AI SDK v5 - simplified for the new model (no parameters needed)
const imageUpscalingInputSchema = z.object({
  // No parameters needed - the new model automatically upscales
})

type ImageUpscalingInput = z.infer<typeof imageUpscalingInputSchema>

interface ImageUpscalingOutput {
  success: boolean
  message: string
  originalImageUrl?: string
  upscaledImageUrl?: string
  cost?: number
  metadata?: {
    model?: string
    processingTime?: number
  }
}

interface ServerResponse {
  success: boolean
  imageUrl?: string
  originalImageUrl?: string
  error?: string
  metadata?: {
    model?: string
    processingTime?: number
  }
}

interface ServerErrorResponse {
  error: string
  message?: string
  details?: unknown
}

/**
 * Tool Adapter for Image Upscaling AI-Native Tool
 * Integrates Real-ESRGAN model with FotoFun's canvas
 */
export class ImageUpscalingAdapter extends BaseToolAdapter<ImageUpscalingInput, ImageUpscalingOutput> {
  // Required BaseToolAdapter properties
  aiName = 'upscaleImage'
  description = `Upscale and enhance image quality using Real-ESRGAN AI-powered upscaler. 
This tool improves the resolution and quality of existing images on the canvas with up to 4x upscaling.

Use this tool when the user wants to:
- Upscale low-resolution images to higher resolution
- Enhance image quality and sharpness
- Improve details in pixelated or blurry images
- Increase image size while maintaining quality

Examples of when to use this tool:
- "upscale this image"
- "make this image higher resolution"
- "enhance the quality of this photo"
- "superscale this image"
- "improve the resolution"

The tool will analyze the selected image (or all images if none selected) and create an upscaled version.
The user will then be shown a review modal to compare the original and upscaled versions.`
  
  metadata = {
    category: 'ai-native' as const,
    executionType: 'expensive' as const,
    worksOn: 'existing-image' as const
  }
  
  inputSchema = imageUpscalingInputSchema
  
  // We don't have a canvas tool for AI-Native Tools - create a placeholder
  get tool(): Tool {
    return {
      id: 'ai-image-upscaling',
      name: 'AI Image Upscaling',
      icon: () => null,
      cursor: 'default',
      isImplemented: true
    }
  }
  
  async execute(params: ImageUpscalingInput, context: { canvas: Canvas }): Promise<ImageUpscalingOutput> {
    try {
      console.log('[ImageUpscalingAdapter] Upscaling image with params:', params)
      
      // Get the image to upscale from canvas
      const imageUrl = await this.getImageFromCanvas(context.canvas)
      
      console.log('[ImageUpscalingAdapter] Extracted image URL:', imageUrl)
      console.log('[ImageUpscalingAdapter] Image URL type:', typeof imageUrl)
      console.log('[ImageUpscalingAdapter] Image URL length:', imageUrl?.length)
      
      if (!imageUrl) {
        return {
          success: false,
          message: 'No image found on canvas to upscale. Please add an image first.',
          cost: 0
        }
      }
      
      // Call our server API with Real-ESRGAN parameters
      const requestBody = {
        image: imageUrl,
        scale: 4,
        face_enhance: false
      }
      
      console.log('[ImageUpscalingAdapter] Sending request body:', requestBody)
      console.log('[ImageUpscalingAdapter] Request body JSON:', JSON.stringify(requestBody, null, 2))
      
      const response = await fetch('/api/ai/replicate/upscale-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })
      
      if (!response.ok) {
        console.error('[ImageUpscalingAdapter] API response not ok:', response.status, response.statusText)
        let errorData: ServerErrorResponse
        try {
          errorData = await response.json()
          console.error('[ImageUpscalingAdapter] API error details:', errorData)
        } catch (parseError) {
          console.error('[ImageUpscalingAdapter] Failed to parse error response:', parseError)
          throw new Error(`Server error: ${response.status} ${response.statusText}`)
        }
        throw new Error(errorData.error || `Server error: ${response.status}`)
      }
      
      let result: ServerResponse
      try {
        result = await response.json()
        console.log('[ImageUpscalingAdapter] Server response:', result)
      } catch (parseError) {
        console.error('[ImageUpscalingAdapter] Failed to parse success response:', parseError)
        throw new Error('Invalid response format from server')
      }
      
      if (!result.success || !result.imageUrl) {
        throw new Error('Invalid response from server')
      }
      
      // Show the review modal with before/after images
      await this.showReviewModal(result.originalImageUrl!, result.imageUrl, context.canvas)
      
      return {
        success: true,
        message: 'Successfully upscaled image 4x using Real-ESRGAN',
        originalImageUrl: result.originalImageUrl,
        upscaledImageUrl: result.imageUrl,
        cost: 0.01, // Estimated cost for upscaling
        metadata: result.metadata
      }
      
    } catch (error) {
      console.error('[ImageUpscalingAdapter] Error:', error)
      
      return {
        success: false,
        message: `Image upscaling failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        cost: 0
      }
    }
  }
  
  /**
   * Get image from canvas to upscale
   */
  private async getImageFromCanvas(canvas: Canvas): Promise<string | null> {
    try {
      // Get selected objects first, then all objects
      const selectedObjects = canvas.getActiveObjects()
      const allObjects = canvas.getObjects()
      
      // Find images in selected objects first, then in all objects
      const imageObjects = selectedObjects.length > 0 
        ? selectedObjects.filter(obj => obj.type === 'image')
        : allObjects.filter(obj => obj.type === 'image')
      
      if (imageObjects.length === 0) {
        return null
      }
      
      // Use the first image found
      const imageObj = imageObjects[0] as unknown as { getSrc?: () => string; toDataURL?: (options: { format: string; quality: number }) => string }
      
      // Try to get the original image URL
      if (imageObj.getSrc) {
        return imageObj.getSrc()
      }
      
      // Fallback: export the image object as data URL
      if (!imageObj.toDataURL) {
        return null
      }
      
      const dataUrl = imageObj.toDataURL({
        format: 'png',
        quality: 1.0
      })
      
      return dataUrl
      
    } catch (error) {
      console.error('[ImageUpscalingAdapter] Error getting image from canvas:', error)
      return null
    }
  }
  
  /**
   * Show the review modal with before/after images
   */
  private async showReviewModal(originalUrl: string, upscaledUrl: string, canvas: Canvas): Promise<void> {
    // Import the canvas store to trigger the review modal
    const { useCanvasStore } = await import('@/store/canvasStore')
    const canvasStore = useCanvasStore.getState()
    
    // Set the review modal state
    if (canvasStore.setReviewModal) {
      canvasStore.setReviewModal({
        isOpen: true,
        title: 'Review Image',
        originalImage: originalUrl,
        processedImage: upscaledUrl,
        onApplyInPlace: () => this.applyInPlace(originalUrl, upscaledUrl, canvas),
        onRejectChange: () => this.rejectChange(),
        onAcceptBoth: () => this.acceptBoth(originalUrl, upscaledUrl, canvas)
      })
    }
  }
  
  /**
   * Apply the upscaled image in place of the original
   */
  private async applyInPlace(originalUrl: string, upscaledUrl: string, canvas: Canvas): Promise<void> {
    try {
      const { useCanvasStore } = await import('@/store/canvasStore')
      const canvasStore = useCanvasStore.getState()
      
      // Find the original image object and replace it
      const objects = canvas.getObjects()
      const originalImage = objects.find(obj => 
        obj.type === 'image' && (obj as unknown as { getSrc?: () => string }).getSrc?.() === originalUrl
      )
      
      if (originalImage) {
        // Load the upscaled image
        const fabric = await import('fabric')
        const upscaledImg = await fabric.Image.fromURL(upscaledUrl, { crossOrigin: 'anonymous' })
        
        // Copy position and properties from original
        upscaledImg.set({
          left: originalImage.left,
          top: originalImage.top,
          scaleX: originalImage.scaleX,
          scaleY: originalImage.scaleY,
          angle: originalImage.angle,
          selectable: originalImage.selectable,
          evented: originalImage.evented,
          centeredRotation: true  // Ensure rotation happens around center
        })
        
        // Remove original and add upscaled
        canvas.remove(originalImage)
        canvas.add(upscaledImg)
        canvas.setActiveObject(upscaledImg)
        canvas.renderAll()
      }
      
      // Close the review modal
      if (canvasStore.setReviewModal) {
        canvasStore.setReviewModal(null)
      }
      
    } catch (error) {
      console.error('[ImageUpscalingAdapter] Error applying in place:', error)
    }
  }
  
  /**
   * Reject the change (just close the modal)
   */
  private async rejectChange(): Promise<void> {
    const { useCanvasStore } = await import('@/store/canvasStore')
    const canvasStore = useCanvasStore.getState()
    
    if (canvasStore.setReviewModal) {
      canvasStore.setReviewModal(null)
    }
  }
  
  /**
   * Accept both images (add upscaled as new image)
   */
  private async acceptBoth(originalUrl: string, upscaledUrl: string, canvas: Canvas): Promise<void> {
    try {
      const { useCanvasStore } = await import('@/store/canvasStore')
      const canvasStore = useCanvasStore.getState()
      
      // Load the upscaled image
      const fabric = await import('fabric')
      const upscaledImg = await fabric.Image.fromURL(upscaledUrl, { crossOrigin: 'anonymous' })
      
      // Position it next to the original
      const canvasWidth = canvas.getWidth()
      const canvasHeight = canvas.getHeight()
      
      upscaledImg.set({
        left: canvasWidth * 0.6, // Position to the right
        top: canvasHeight * 0.1,
        selectable: true,
        evented: true,
        centeredRotation: true  // Ensure rotation happens around center
      })
      
      // Add to canvas
      canvas.add(upscaledImg)
      canvas.setActiveObject(upscaledImg)
      canvas.renderAll()
      
      // Close the review modal
      if (canvasStore.setReviewModal) {
        canvasStore.setReviewModal(null)
      }
      
    } catch (error) {
      console.error('[ImageUpscalingAdapter] Error accepting both:', error)
    }
  }
  
  /**
   * Check if the adapter can execute (API configured)
   */
  canExecute(): boolean {
    // For simplicity, return true - server will handle API key validation
    return true
  }
  
  /**
   * Override toAITool for server-side execution
   */
  toAITool(): unknown {
    return tool({
      description: this.description,
      inputSchema: this.inputSchema,
      execute: async (args: ImageUpscalingInput) => {
        console.log('[ImageUpscalingAdapter] Server-side tool execution with args:', args)
        
        // No parameters needed for this simplified model
        
        return {
          success: true,
          message: 'Starting image upscaling with Real-ESRGAN (4x). Please wait...'
        }
      }
    })
  }
  
  /**
   * Generate preview for approval system (not implemented for upscaling)
   */
  async generatePreview(): Promise<{ before: string; after: string }> {
    // For image upscaling, we can't provide a meaningful preview
    // Return empty images - the actual upscaling will happen on execute
    return {
      before: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      after: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
    }
  }
} 