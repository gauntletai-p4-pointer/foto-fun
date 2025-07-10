import { z } from 'zod'
import { BaseToolAdapter } from '../base'
import type { Canvas } from 'fabric'
import { tool } from 'ai'
import type { Tool } from '@/types'

// Input schema for AI SDK v5 - no parameters needed for background removal
const backgroundRemovalInputSchema = z.object({
  // No parameters needed - the model automatically removes backgrounds
})

type BackgroundRemovalInput = z.infer<typeof backgroundRemovalInputSchema>

interface BackgroundRemovalOutput {
  success: boolean
  message: string
  originalImageUrl?: string
  processedImageUrl?: string
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
 * Tool Adapter for Background Removal AI-Native Tool
 * Integrates Bria remove-background model with FotoFun's canvas
 */
export class BackgroundRemovalAdapter extends BaseToolAdapter<BackgroundRemovalInput, BackgroundRemovalOutput> {
  // Required BaseToolAdapter properties
  aiName = 'removeBackground'
  description = `Remove background from images using Bria's AI-powered background removal tool. 
This tool automatically detects and removes the background from images, leaving only the main subject.

Use this tool when the user wants to:
- Remove the background from an image
- Create transparent background images
- Isolate subjects from their backgrounds
- Prepare images for compositing

Examples of when to use this tool:
- "remove the background"
- "make the background transparent"
- "cut out the subject"
- "remove background from this image"
- "isolate the subject"

The tool will analyze the selected image (or all images if none selected) and create a version with the background removed.
The user will then be shown a review modal to compare the original and processed versions.`
  
  metadata = {
    category: 'ai-native' as const,
    executionType: 'expensive' as const,
    worksOn: 'existing-image' as const
  }
  
  inputSchema = backgroundRemovalInputSchema
  
  // We don't have a canvas tool for AI-Native Tools - create a placeholder
  get tool(): Tool {
    return {
      id: 'ai-background-removal',
      name: 'AI Background Removal',
      icon: () => null,
      cursor: 'default',
      isImplemented: true
    }
  }
  
  async execute(params: BackgroundRemovalInput, context: { canvas: Canvas }): Promise<BackgroundRemovalOutput> {
    try {
      console.log('[BackgroundRemovalAdapter] Starting background removal with params:', params)
      console.log('[BackgroundRemovalAdapter] Canvas state:', {
        canvasReady: !!context.canvas,
        canvasWidth: context.canvas?.getWidth(),
        canvasHeight: context.canvas?.getHeight(),
        objectCount: context.canvas?.getObjects()?.length || 0
      })
      
      // Add a small delay to ensure canvas is fully ready
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Get the image to process from canvas
      const imageUrl = await this.getImageFromCanvas(context.canvas)
      
      console.log('[BackgroundRemovalAdapter] Image extraction result:', {
        success: !!imageUrl,
        imageUrlType: typeof imageUrl,
        imageUrlLength: imageUrl?.length,
        imageUrlPrefix: imageUrl?.substring(0, 50) + '...'
      })
      
      if (!imageUrl) {
        console.error('[BackgroundRemovalAdapter] No image URL extracted from canvas')
        return {
          success: false,
          message: 'No image found on canvas to process. Please ensure an image is selected or present on the canvas.',
          cost: 0
        }
      }
      
      // Validate the image URL before sending
      if (!this.isValidImageDataUrl(imageUrl)) {
        console.error('[BackgroundRemovalAdapter] Image URL failed validation before sending to API')
        return {
          success: false,
          message: 'Image format validation failed. Please try with a different image or re-add the image to the canvas.',
          cost: 0
        }
      }
      
      // Call our server API with Bria remove-background parameters
      const requestBody = {
        image: imageUrl
      }
      
      console.log('[BackgroundRemovalAdapter] Sending request to API:', {
        imageSize: imageUrl.length,
        imageFormat: imageUrl.substring(0, 20),
        requestTimestamp: new Date().toISOString()
      })
      
      // Log detailed debugging info for non-deterministic issue tracking
      console.log('[BackgroundRemovalAdapter] Final validation before API call:', {
        imageUrlValid: this.isValidImageDataUrl(imageUrl),
        imageSize: imageUrl.length,
        format: imageUrl.substring(0, 30),
        hasBase64: imageUrl.includes(';base64,'),
        base64Length: imageUrl.split(';base64,')[1]?.length || 0
      })
      
      const response = await fetch('/api/ai/replicate/remove-background', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })
      
      console.log('[BackgroundRemovalAdapter] API response status:', response.status, response.statusText)
      
      if (!response.ok) {
        let errorData: ServerErrorResponse
        try {
          errorData = await response.json()
          console.error('[BackgroundRemovalAdapter] API error details:', {
            status: response.status,
            statusText: response.statusText,
            error: errorData.error,
            details: errorData.details,
            message: errorData.message
          })
        } catch (parseError) {
          console.error('[BackgroundRemovalAdapter] Failed to parse error response:', parseError)
          return {
            success: false,
            message: `Server communication error: ${response.status} ${response.statusText}`,
            cost: 0
          }
        }
        
        return {
          success: false,
          message: `Background removal failed: ${errorData.error || `Server error: ${response.status}`}`,
          cost: 0
        }
      }
      
      let result: ServerResponse
      try {
        result = await response.json()
        console.log('[BackgroundRemovalAdapter] Server response received:', {
          success: result.success,
          hasImageUrl: !!result.imageUrl,
          imageUrlLength: result.imageUrl?.length,
          hasOriginalUrl: !!result.originalImageUrl,
          metadata: result.metadata
        })
      } catch (parseError) {
        console.error('[BackgroundRemovalAdapter] Failed to parse success response:', parseError)
        return {
          success: false,
          message: 'Invalid response format from server',
          cost: 0
        }
      }
      
      if (!result.success || !result.imageUrl) {
        console.error('[BackgroundRemovalAdapter] Invalid response from server:', result)
        return {
          success: false,
          message: 'Server returned invalid response',
          cost: 0
        }
      }
      
      // Show the review modal with before/after images
      try {
        await this.showReviewModal(result.originalImageUrl!, result.imageUrl, context.canvas)
      } catch (modalError) {
        console.error('[BackgroundRemovalAdapter] Error showing review modal:', modalError)
        // Don't fail the entire operation if modal fails
      }
      
      return {
        success: true,
        message: 'Successfully removed background using Bria AI',
        originalImageUrl: result.originalImageUrl,
        processedImageUrl: result.imageUrl,
        cost: 0.005, // Estimated cost for background removal
        metadata: result.metadata
      }
      
    } catch (error) {
      console.error('[BackgroundRemovalAdapter] Unexpected error:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      })
      
      return {
        success: false,
        message: `Background removal failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        cost: 0
      }
    }
  }
  
  /**
   * Get image from canvas to process
   */
  private async getImageFromCanvas(canvas: Canvas): Promise<string | null> {
    try {
      console.log('[BackgroundRemovalAdapter] Starting canvas image extraction')
      
      // Ensure canvas is ready
      if (!canvas) {
        console.error('[BackgroundRemovalAdapter] Canvas is null or undefined')
        return null
      }
      
      // Add a small delay to ensure canvas operations are complete
      await new Promise(resolve => setTimeout(resolve, 50))
      
      // Get canvas objects with error handling
      let selectedObjects: any[] = []
      let allObjects: any[] = []
      
      try {
        selectedObjects = canvas.getActiveObjects() || []
        allObjects = canvas.getObjects() || []
      } catch (canvasError) {
        console.error('[BackgroundRemovalAdapter] Error accessing canvas objects:', canvasError)
        return null
      }
      
      console.log('[BackgroundRemovalAdapter] Canvas objects found:', {
        selectedCount: selectedObjects.length,
        totalCount: allObjects.length
      })
      
      // Find images in selected objects first, then in all objects
      const imageObjects = selectedObjects.length > 0 
        ? selectedObjects.filter(obj => obj && obj.type === 'image')
        : allObjects.filter(obj => obj && obj.type === 'image')
      
      if (imageObjects.length === 0) {
        console.log('[BackgroundRemovalAdapter] No image objects found on canvas')
        return null
      }
      
      // Use the first image found
      const imageObj = imageObjects[0] as any
      
      // Validate the image object
      if (!imageObj) {
        console.error('[BackgroundRemovalAdapter] Image object is null or undefined')
        return null
      }
      
      console.log('[BackgroundRemovalAdapter] Found image object:', {
        type: imageObj.type,
        hasSrc: !!imageObj.getSrc,
        width: imageObj.width,
        height: imageObj.height,
        scaleX: imageObj.scaleX,
        scaleY: imageObj.scaleY,
        hasToDataURL: typeof imageObj.toDataURL === 'function'
      })
      
      // Get image dimensions for processing decisions
      const imageWidth = imageObj.width || 0
      const imageHeight = imageObj.height || 0
      const actualWidth = imageWidth * (imageObj.scaleX || 1)
      const actualHeight = imageHeight * (imageObj.scaleY || 1)
      
      console.log(`[BackgroundRemovalAdapter] Image dimensions: ${imageWidth}x${imageHeight} (actual: ${actualWidth}x${actualHeight})`)
      
      // Try to get the original image URL first
      let originalUrl: string | null = null
      if (imageObj.getSrc) {
        originalUrl = imageObj.getSrc()
        console.log('[BackgroundRemovalAdapter] Original URL type:', originalUrl?.startsWith('data:') ? 'data_url' : 'url')
        console.log('[BackgroundRemovalAdapter] Original URL format:', originalUrl?.substring(0, 30) + '...')
      }
      
      // Always process the image to ensure compatibility
      console.log('[BackgroundRemovalAdapter] Processing image for maximum compatibility with Bria model')
      
      // Determine optimal size for the API
      const maxDimension = 1024 // Reduced from 2048 for better compatibility
      const needsResize = actualWidth > maxDimension || actualHeight > maxDimension
      
      let exportMultiplier = 1
      if (needsResize) {
        exportMultiplier = Math.min(maxDimension / actualWidth, maxDimension / actualHeight)
        console.log(`[BackgroundRemovalAdapter] Resizing image by factor ${exportMultiplier} (${actualWidth}x${actualHeight} → ${Math.round(actualWidth * exportMultiplier)}x${Math.round(actualHeight * exportMultiplier)})`)
      }
      
             // Validate the image object has the toDataURL method
       if (typeof imageObj.toDataURL !== 'function') {
         console.error('[BackgroundRemovalAdapter] Image object missing toDataURL method')
         return null
       }
       
       // Try multiple export strategies
       const exportStrategies = [
         { format: 'png', quality: 1.0, multiplier: exportMultiplier, description: 'PNG high quality' },
         { format: 'jpeg', quality: 0.95, multiplier: exportMultiplier, description: 'JPEG high quality' },
         { format: 'jpeg', quality: 0.8, multiplier: exportMultiplier * 0.8, description: 'JPEG medium quality' },
         { format: 'png', quality: 1.0, multiplier: exportMultiplier * 0.5, description: 'PNG smaller size' },
         { format: 'jpeg', quality: 0.7, multiplier: exportMultiplier * 0.5, description: 'JPEG low quality' }
       ]
       
       for (const strategy of exportStrategies) {
         try {
           console.log(`[BackgroundRemovalAdapter] Trying export strategy: ${strategy.description}`)
           
           // Add timeout to prevent hanging
           const exportPromise = new Promise<string>((resolve, reject) => {
             try {
               const imageUrl = imageObj.toDataURL({
                 format: strategy.format as 'png' | 'jpeg',
                 quality: strategy.quality,
                 multiplier: strategy.multiplier
               })
               resolve(imageUrl)
             } catch (error) {
               reject(error)
             }
           })
           
           const timeoutPromise = new Promise<string>((_, reject) => {
             setTimeout(() => reject(new Error('Export timeout')), 5000)
           })
           
           const imageUrl = await Promise.race([exportPromise, timeoutPromise])
           
           console.log(`[BackgroundRemovalAdapter] Export result: ${imageUrl?.length || 0} characters`)
           
           if (!imageUrl) {
             console.warn(`[BackgroundRemovalAdapter] Export failed for ${strategy.description}`)
             continue
           }
           
           // Check size limits
           if (imageUrl.length > 8_000_000) { // 8MB limit
             console.log(`[BackgroundRemovalAdapter] Image too large (${imageUrl.length}), trying next strategy`)
             continue
           }
           
           // Validate the format
           if (!this.isValidImageDataUrl(imageUrl)) {
             console.log(`[BackgroundRemovalAdapter] Invalid format for ${strategy.description}, trying next strategy`)
             continue
           }
           
           // Test if it's a valid image by trying to parse the base64
           try {
             const base64Index = imageUrl.indexOf(';base64,')
             if (base64Index !== -1) {
               const base64Data = imageUrl.substring(base64Index + 8)
               // Try to decode to verify it's valid base64
               atob(base64Data.substring(0, 100)) // Test first 100 chars
               console.log(`[BackgroundRemovalAdapter] Base64 validation passed for ${strategy.description}`)
             }
           } catch (base64Error) {
             console.warn(`[BackgroundRemovalAdapter] Base64 validation failed for ${strategy.description}:`, base64Error)
             continue
           }
           
           console.log(`[BackgroundRemovalAdapter] Successfully processed image using ${strategy.description}`)
           console.log(`[BackgroundRemovalAdapter] Final image: ${imageUrl.substring(0, 50)}... (${imageUrl.length} chars)`)
           
           return imageUrl
           
         } catch (exportError) {
           console.warn(`[BackgroundRemovalAdapter] Export error for ${strategy.description}:`, exportError)
           continue
         }
       }
      
      console.error('[BackgroundRemovalAdapter] All export strategies failed')
      return null
      
    } catch (error) {
      console.error('[BackgroundRemovalAdapter] Error getting image from canvas:', error)
      return null
    }
  }
  
  /**
   * Validate that the image data URL is in a supported format
   */
  private isValidImageDataUrl(dataUrl: string): boolean {
    try {
      // Check if it's a valid data URL
      if (!dataUrl.startsWith('data:image/')) {
        console.warn('[BackgroundRemovalAdapter] Not a valid image data URL')
        return false
      }
      
      // Check if it's a supported format (PNG, JPEG are most reliable)
      const supportedFormats = ['data:image/png', 'data:image/jpeg', 'data:image/jpg']
      const hasValidFormat = supportedFormats.some(format => dataUrl.startsWith(format))
      
      if (!hasValidFormat) {
        console.warn('[BackgroundRemovalAdapter] Unsupported image format:', dataUrl.substring(0, 20))
        return false
      }
      
      // Check if the data URL has content after the base64 header
      const base64Index = dataUrl.indexOf(';base64,')
      if (base64Index === -1) {
        console.warn('[BackgroundRemovalAdapter] Missing base64 header')
        return false
      }
      
      const base64Data = dataUrl.substring(base64Index + 8)
      if (!base64Data || base64Data.length < 100) { // Minimum size check
        console.warn('[BackgroundRemovalAdapter] Insufficient image data')
        return false
      }
      
      // Check if image is too large (> 8MB base64)
      if (base64Data.length > 8_000_000) {
        console.warn('[BackgroundRemovalAdapter] Image too large for API:', base64Data.length)
        return false
      }
      
      // Additional validation - ensure it's valid base64
      try {
        atob(base64Data.substring(0, 100)) // Test decode first 100 chars
      } catch (base64Error) {
        console.warn('[BackgroundRemovalAdapter] Invalid base64 data')
        return false
      }
      
      return true
      
    } catch (error) {
      console.error('[BackgroundRemovalAdapter] Error validating image data URL:', error)
      return false
    }
  }
  
  /**
   * Show the review modal with before/after images
   */
  private async showReviewModal(originalUrl: string, processedUrl: string, canvas: Canvas): Promise<void> {
    // Import the canvas store to trigger the review modal
    const { useCanvasStore } = await import('@/store/canvasStore')
    const canvasStore = useCanvasStore.getState()
    
    // Set the review modal state
    if (canvasStore.setReviewModal) {
      canvasStore.setReviewModal({
        isOpen: true,
        title: 'Review Background Removal',
        originalImage: originalUrl,
        processedImage: processedUrl,
        onApplyInPlace: () => this.applyInPlace(originalUrl, processedUrl, canvas),
        onRejectChange: () => this.rejectChange(),
        onAcceptBoth: () => this.acceptBoth(originalUrl, processedUrl, canvas)
      })
    }
  }
  
  /**
   * Apply the processed image in place of the original
   */
  private async applyInPlace(originalUrl: string, processedUrl: string, canvas: Canvas): Promise<void> {
    try {
      const { useCanvasStore } = await import('@/store/canvasStore')
      const canvasStore = useCanvasStore.getState()
      
      // Find the original image object and replace it
      const objects = canvas.getObjects()
      const originalImage = objects.find(obj => 
        obj.type === 'image' && (obj as any).getSrc?.() === originalUrl
      )
      
      if (originalImage) {
        // Load the processed image
        const fabric = await import('fabric')
        const processedImg = await fabric.Image.fromURL(processedUrl, { crossOrigin: 'anonymous' })
        
        // Copy position and properties from original
        processedImg.set({
          left: originalImage.left,
          top: originalImage.top,
          scaleX: originalImage.scaleX,
          scaleY: originalImage.scaleY,
          angle: originalImage.angle,
          selectable: originalImage.selectable,
          evented: originalImage.evented
        })
        
        // Remove original and add processed
        canvas.remove(originalImage)
        canvas.add(processedImg)
        canvas.setActiveObject(processedImg)
        canvas.renderAll()
      }
      
      // Close the review modal
      if (canvasStore.setReviewModal) {
        canvasStore.setReviewModal(null)
      }
      
    } catch (error) {
      console.error('[BackgroundRemovalAdapter] Error applying in place:', error)
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
   * Accept both images (add processed as new image)
   */
  private async acceptBoth(originalUrl: string, processedUrl: string, canvas: Canvas): Promise<void> {
    try {
      const { useCanvasStore } = await import('@/store/canvasStore')
      const canvasStore = useCanvasStore.getState()
      
      // Load the processed image
      const fabric = await import('fabric')
      const processedImg = await fabric.Image.fromURL(processedUrl, { crossOrigin: 'anonymous' })
      
      // Position it next to the original
      const canvasWidth = canvas.getWidth()
      const canvasHeight = canvas.getHeight()
      
      processedImg.set({
        left: canvasWidth * 0.6, // Position to the right
        top: canvasHeight * 0.1,
        selectable: true,
        evented: true
      })
      
      // Add to canvas
      canvas.add(processedImg)
      canvas.setActiveObject(processedImg)
      canvas.renderAll()
      
      // Close the review modal
      if (canvasStore.setReviewModal) {
        canvasStore.setReviewModal(null)
      }
      
    } catch (error) {
      console.error('[BackgroundRemovalAdapter] Error accepting both:', error)
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
      execute: async (args: BackgroundRemovalInput) => {
        console.log('[BackgroundRemovalAdapter] Server-side tool execution with args:', args)
        
        // No parameters needed for background removal
        
        return {
          success: true,
          message: 'Starting background removal with Bria AI. Please wait...'
        }
      }
    })
  }
  
  /**
   * Generate preview for approval system (not implemented for background removal)
   */
  async generatePreview(): Promise<{ before: string; after: string }> {
    // For background removal, we can't provide a meaningful preview
    // Return empty images - the actual processing will happen on execute
    return {
      before: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      after: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
    }
  }
} 