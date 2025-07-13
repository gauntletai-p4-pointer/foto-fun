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
      console.log('[ImageUpscalingAdapter] Starting applyInPlace operation')
      console.log('[ImageUpscalingAdapter] Original URL prefix:', originalUrl?.substring(0, 50) + '...')
      console.log('[ImageUpscalingAdapter] Upscaled URL prefix:', upscaledUrl?.substring(0, 50) + '...')
      
      const { useCanvasStore } = await import('@/store/canvasStore')
      const canvasStore = useCanvasStore.getState()
      
      // Find the original image object and replace it
      const objects = canvas.getObjects()
      console.log('[ImageUpscalingAdapter] Canvas has', objects.length, 'objects')
      
      const imageObjects = objects.filter(obj => obj.type === 'image')
      console.log('[ImageUpscalingAdapter] Found', imageObjects.length, 'image objects')
      
      let originalImage: unknown = null
      
      // Try multiple strategies to find the original image
      for (const imageObj of imageObjects) {
        try {
          const getSrc = (imageObj as any).getSrc as (() => string) | undefined
          if (getSrc) {
            const srcValue = getSrc()
            if (srcValue === originalUrl) {
              originalImage = imageObj
              console.log('[ImageUpscalingAdapter] Found original image by exact URL match')
              break
            }
          }
        } catch (error) {
          console.warn('[ImageUpscalingAdapter] Error checking image getSrc:', error)
        }
      }
      
      // If no exact match, use the first image (fallback)
      if (!originalImage && imageObjects.length > 0) {
        originalImage = imageObjects[0]
        console.log('[ImageUpscalingAdapter] Using first image as fallback')
      }
      
      if (!originalImage) {
        console.error('[ImageUpscalingAdapter] Could not find original image to replace')
        alert('Could not find the original image to replace. Please try using "Accept Both" instead.')
        
        // Close the review modal anyway
        if (canvasStore.setReviewModal) {
          canvasStore.setReviewModal(null)
        }
        return
      }
      
      console.log('[ImageUpscalingAdapter] Found original image, proceeding with replacement')
      console.log('[ImageUpscalingAdapter] Original image properties:', {
        type: (originalImage as any).type,
        left: (originalImage as any).left,
        top: (originalImage as any).top,
        width: (originalImage as any).width,
        height: (originalImage as any).height,
        scaleX: (originalImage as any).scaleX,
        scaleY: (originalImage as any).scaleY,
        angle: (originalImage as any).angle
      })
      
      // Load the upscaled image with proper error handling
      const fabric = await import('fabric')
      
      let upscaledImg: unknown
      try {
        console.log('[ImageUpscalingAdapter] Loading upscaled image...')
        
        // Create image element first for better control
        const imgElement = new Image()
        imgElement.crossOrigin = 'anonymous'
        
        // Load the image with timeout
        await new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            reject(new Error('Image load timeout'))
          }, 10000) // 10 second timeout
          
          imgElement.onload = () => {
            clearTimeout(timeoutId)
            resolve(undefined)
          }
          imgElement.onerror = () => {
            clearTimeout(timeoutId)
            reject(new Error('Image load failed'))
          }
          imgElement.src = upscaledUrl
        })
        
        console.log('[ImageUpscalingAdapter] Image element loaded successfully:', {
          width: imgElement.width,
          height: imgElement.height,
          naturalWidth: imgElement.naturalWidth,
          naturalHeight: imgElement.naturalHeight
        })
        
        // Create fabric image from loaded element with proper options
        upscaledImg = new fabric.Image(imgElement, {
          crossOrigin: 'anonymous',
          // Preserve important properties for proper functionality
          evented: true,
          selectable: true,
          centeredRotation: true
        }) as any
        
        console.log('[ImageUpscalingAdapter] Successfully created Fabric image')
        
        // Ensure the image is properly initialized
        await new Promise(resolve => setTimeout(resolve, 100))
        
      } catch (loadError) {
        console.error('[ImageUpscalingAdapter] Error loading upscaled image:', loadError)
        alert('Failed to load the upscaled image. Please try again or use "Accept Both" instead.')
        
        // Close the review modal
        if (canvasStore.setReviewModal) {
          canvasStore.setReviewModal(null)
        }
        return
      }
      
      // Copy position and properties from original with validation
      const propertiesToCopy = {
        left: (originalImage as any).left || 0,
        top: (originalImage as any).top || 0,
        scaleX: (originalImage as any).scaleX || 1,
        scaleY: (originalImage as any).scaleY || 1,
        angle: (originalImage as any).angle || 0,
        selectable: (originalImage as any).selectable !== false,
        evented: (originalImage as any).evented !== false,
        centeredRotation: true,
        // Preserve any additional properties that might be important
        visible: (originalImage as any).visible !== false,
        opacity: (originalImage as any).opacity || 1
      }
      
      console.log('[ImageUpscalingAdapter] Applying properties to upscaled image:', propertiesToCopy)
      
      try {
        ;(upscaledImg as any).set(propertiesToCopy)
        console.log('[ImageUpscalingAdapter] Properties applied successfully')
      } catch (setError) {
        console.error('[ImageUpscalingAdapter] Error applying properties:', setError)
        // Continue anyway - basic positioning might still work
      }
      
      console.log('[ImageUpscalingAdapter] Removing original image and adding upscaled image')
      
      // Remove original and add upscaled with error handling
      try {
        canvas.remove(originalImage as any)
        canvas.add(upscaledImg as any)
        canvas.setActiveObject(upscaledImg as any)
        canvas.renderAll()
        
        console.log('[ImageUpscalingAdapter] Successfully replaced image on canvas')
        
        // Give the canvas time to process the new image
        await new Promise(resolve => setTimeout(resolve, 200))
        
        // Verify the new image is properly added
        const newObjects = canvas.getObjects()
        const newImageObjects = newObjects.filter(obj => obj.type === 'image')
        console.log('[ImageUpscalingAdapter] Canvas now has', newImageObjects.length, 'image objects')
        
        // Test the new image object to ensure it's properly functioning
        if (newImageObjects.length > 0) {
          const newImage = newImageObjects[newImageObjects.length - 1] // Get the last added image
          try {
            const testSrc = (newImage as any).getSrc?.()
            console.log('[ImageUpscalingAdapter] New image getSrc test:', testSrc ? 'SUCCESS' : 'FAILED')
            
            const testDataURL = (newImage as any).toDataURL?.({ format: 'png', quality: 0.1 })
            console.log('[ImageUpscalingAdapter] New image toDataURL test:', testDataURL ? 'SUCCESS' : 'FAILED')
          } catch (testError) {
            console.warn('[ImageUpscalingAdapter] New image object functionality test failed:', testError)
            // The image is added but might have limited functionality - this is acceptable
          }
        }
        
      } catch (canvasError) {
        console.error('[ImageUpscalingAdapter] Error manipulating canvas:', canvasError)
        alert('Error applying the upscaled image to canvas. Please try again.')
        
        // Close the review modal
        if (canvasStore.setReviewModal) {
          canvasStore.setReviewModal(null)
        }
        return
      }
      
      console.log('[ImageUpscalingAdapter] Successfully applied upscaled image in place')
      
      // Close the review modal
      if (canvasStore.setReviewModal) {
        canvasStore.setReviewModal(null)
      }
      
    } catch (error) {
      console.error('[ImageUpscalingAdapter] Unexpected error in applyInPlace:', error)
      alert('An unexpected error occurred. Please try again or use "Accept Both" instead.')
      
      // Try to close the modal even if there was an error
      try {
        const { useCanvasStore } = await import('@/store/canvasStore')
        const canvasStore = useCanvasStore.getState()
        if (canvasStore.setReviewModal) {
          canvasStore.setReviewModal(null)
        }
      } catch (modalError) {
        console.error('[ImageUpscalingAdapter] Error closing modal after failure:', modalError)
      }
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