/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from 'zod'
import { BaseToolAdapter } from '../base'
import type { Canvas, FabricObject } from 'fabric'
import { tool } from 'ai'
import type { Tool } from '@/types'
import { CanvasToolBridge } from '@/lib/ai/tools/canvas-bridge'

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
      
      // Use CanvasToolBridge to get proper canvas context with image targeting
      const canvasContext = CanvasToolBridge.getCanvasContext()
      
      if (!canvasContext) {
        console.error('[BackgroundRemovalAdapter] Canvas context not available')
        return {
          success: false,
          message: 'Canvas not ready. Please wait for the canvas to fully load and try again.',
          cost: 0
        }
      }
      
      console.log('[BackgroundRemovalAdapter] Canvas context:', {
        canvasReady: !!canvasContext.canvas,
        canvasWidth: canvasContext.canvas?.getWidth(),
        canvasHeight: canvasContext.canvas?.getHeight(),
        totalObjects: canvasContext.canvas?.getObjects()?.length || 0,
        targetImages: canvasContext.targetImages.length,
        targetingMode: canvasContext.targetingMode
      })
      
      // Check if we have target images
      if (canvasContext.targetImages.length === 0) {
        console.error('[BackgroundRemovalAdapter] No target images found')
        return {
          success: false,
          message: 'No image found on canvas to process. Please ensure an image is selected or present on the canvas.',
          cost: 0
        }
      }
      
      // Add a small delay to ensure canvas is fully ready
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Get the image to process from the target images
      const imageUrl = await this.getImageFromTargetImages(canvasContext.targetImages)
      
      console.log('[BackgroundRemovalAdapter] Image extraction result:', {
        success: !!imageUrl,
        imageUrlType: typeof imageUrl,
        imageUrlLength: imageUrl?.length,
        imageUrlPrefix: imageUrl?.substring(0, 50) + '...'
      })
      
      if (!imageUrl) {
        console.error('[BackgroundRemovalAdapter] No image URL extracted from target images')
        return {
          success: false,
          message: 'Failed to extract image data from canvas. Please try selecting the image first or re-adding it to the canvas.',
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
      
      // Additional debugging for the specific error
      console.log('[BackgroundRemovalAdapter] Image data validation before API call:', {
        startsWithDataImage: imageUrl.startsWith('data:image/'),
        hasBase64: imageUrl.includes(';base64,'),
        isJPEG: imageUrl.startsWith('data:image/jpeg'),
        isPNG: imageUrl.startsWith('data:image/png'),
        base64Length: imageUrl.split(';base64,')[1]?.length || 0,
        totalLength: imageUrl.length,
        sizeMB: Math.round(imageUrl.length / 1024 / 1024 * 100) / 100
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
   * Get image from target images (from CanvasToolBridge)
   */
  private async getImageFromTargetImages(targetImages: FabricObject[]): Promise<string | null> {
    try {
      console.log('[BackgroundRemovalAdapter] Starting image extraction from target images')
      console.log('[BackgroundRemovalAdapter] Target images count:', targetImages.length)
      
      if (targetImages.length === 0) {
        console.log('[BackgroundRemovalAdapter] No target images provided')
        return null
      }
      
      // Use the first target image
      const imageObj = targetImages[0] as unknown as Record<string, unknown>
      
      // Validate the image object before attempting exports
      if (!imageObj) {
        console.error('[BackgroundRemovalAdapter] Target image object is null or undefined')
        return null
      }
      
      console.log('[BackgroundRemovalAdapter] Processing target image:', {
        type: imageObj.type,
        hasSrc: !!imageObj.getSrc,
        width: imageObj.width,
        height: imageObj.height,
        scaleX: imageObj.scaleX,
        scaleY: imageObj.scaleY,
        hasToDataURL: typeof imageObj.toDataURL === 'function'
      })
      
      // Early detection of corrupted image objects (common after upscaling)
      let isImageCorrupted = false
      try {
        // Test if the image object has the necessary internal properties
        const testProps = (imageObj as any)._originalElement || (imageObj as any)._element
        if (!testProps) {
          console.warn('[BackgroundRemovalAdapter] Image object appears corrupted - missing internal element references')
          isImageCorrupted = true
        }
        
        // Test if toDataURL will work by checking for required internal methods
        if (typeof imageObj.toDataURL === 'function') {
          const hasCanvasElement = (imageObj as any).toCanvasElement || (imageObj as any)._createCanvasElement
          if (!hasCanvasElement) {
            console.warn('[BackgroundRemovalAdapter] Image object missing canvas element methods - likely corrupted')
            isImageCorrupted = true
          }
        } else {
          console.warn('[BackgroundRemovalAdapter] Image object missing toDataURL method')
          isImageCorrupted = true
        }
      } catch (validationError) {
        console.warn('[BackgroundRemovalAdapter] Error validating image object:', validationError)
        isImageCorrupted = true
      }
      
      if (isImageCorrupted) {
        console.log('[BackgroundRemovalAdapter] Image object is corrupted, skipping individual export strategies and using canvas fallback')
        
        // Skip all individual export strategies and go straight to canvas fallback
        const canvasContext = CanvasToolBridge.getCanvasContext()
        if (canvasContext && canvasContext.canvas) {
          console.log('[BackgroundRemovalAdapter] Using canvas fallback for corrupted image object')
          
          // Try high-quality PNG first
          let canvasDataURL = await CanvasToolBridge.getCleanCanvasImage(canvasContext.canvas, {
            format: 'png',
            quality: 1.0,
            multiplier: 1.0
          })
          
                     if (canvasDataURL && this.isValidImageDataUrl(canvasDataURL)) {
             console.log('[BackgroundRemovalAdapter] Canvas PNG fallback successful:', {
               length: canvasDataURL.length,
               sizeMB: Math.round(canvasDataURL.length / 1024 / 1024 * 100) / 100
             })
             
             // Additional processing to improve Bria model compatibility
             const optimizedURL = await this.optimizeImageForBriaModel(canvasDataURL)
             
             if (optimizedURL) {
               return optimizedURL
             }
           }
          
          // If PNG fails, try JPEG
          console.log('[BackgroundRemovalAdapter] PNG canvas fallback failed, trying JPEG')
          canvasDataURL = await CanvasToolBridge.getCleanCanvasImage(canvasContext.canvas, {
            format: 'jpeg',
            quality: 0.95,
            multiplier: 1.0
          })
          
                     if (canvasDataURL && this.isValidImageDataUrl(canvasDataURL)) {
             console.log('[BackgroundRemovalAdapter] Canvas JPEG fallback successful:', {
               length: canvasDataURL.length,
               sizeMB: Math.round(canvasDataURL.length / 1024 / 1024 * 100) / 100
             })
             
             // Additional processing to improve Bria model compatibility
             const optimizedURL = await this.optimizeImageForBriaModel(canvasDataURL)
             
             if (optimizedURL) {
               return optimizedURL
             }
           }
        }
        
        console.error('[BackgroundRemovalAdapter] All canvas fallback strategies failed for corrupted image')
        return null
      }
      
      // Get image dimensions for processing decisions
      const imageWidth = (imageObj.width as number) || 0
      const imageHeight = (imageObj.height as number) || 0
      const actualWidth = imageWidth * ((imageObj.scaleX as number) || 1)
      const actualHeight = imageHeight * ((imageObj.scaleY as number) || 1)
      
      console.log(`[BackgroundRemovalAdapter] Image dimensions: ${imageWidth}x${imageHeight} (actual: ${actualWidth}x${actualHeight})`)
      
      // Try to get the original image URL first (with error handling)
      let originalUrl: string | null = null
      const getSrc = imageObj.getSrc as (() => string) | undefined
      if (getSrc) {
        try {
          originalUrl = getSrc()
          console.log('[BackgroundRemovalAdapter] Original URL type:', originalUrl?.startsWith('data:') ? 'data_url' : 'url')
          console.log('[BackgroundRemovalAdapter] Original URL format:', originalUrl?.substring(0, 30) + '...')
        } catch (getSrcError) {
          console.warn('[BackgroundRemovalAdapter] getSrc() failed, will use toDataURL instead:', getSrcError)
          originalUrl = null
        }
      }
      
      // For non-corrupted images, try original URL if it's valid
      if (originalUrl && originalUrl.startsWith('data:image/') && this.isValidImageDataUrl(originalUrl)) {
        console.log('[BackgroundRemovalAdapter] Using original image URL directly')
        console.log('[BackgroundRemovalAdapter] Original URL validation:', {
          length: originalUrl.length,
          format: originalUrl.substring(0, 30),
          hasBase64: originalUrl.includes(';base64,'),
          base64Length: originalUrl.split(';base64,')[1]?.length || 0
        })
        
        // Additional validation before using original URL
        try {
          const base64Data = originalUrl.split(';base64,')[1]
          if (base64Data && base64Data.length > 100) {
            // Test decode first 100 chars
            const testDecode = atob(base64Data.substring(0, 100))
            console.log('[BackgroundRemovalAdapter] Original URL base64 test decode successful:', testDecode.length, 'bytes')
            
            // Check file signature
            const firstBytes = testDecode.substring(0, 8)
            const isPNG = firstBytes.charCodeAt(0) === 0x89 && firstBytes.charCodeAt(1) === 0x50
            const isJPEG = firstBytes.charCodeAt(0) === 0xFF && firstBytes.charCodeAt(1) === 0xD8
            console.log('[BackgroundRemovalAdapter] Original URL file signature check:', { isPNG, isJPEG })
            
            if (isPNG || isJPEG) {
              console.log('[BackgroundRemovalAdapter] Original URL has valid signature, optimizing for Bria model')
              const optimizedUrl = await this.optimizeImageForBriaModel(originalUrl)
              if (optimizedUrl) {
                return optimizedUrl
              }
            } else {
              console.log('[BackgroundRemovalAdapter] Original URL has invalid signature, will re-export')
            }
          }
        } catch (originalUrlError) {
          console.warn('[BackgroundRemovalAdapter] Original URL validation failed:', originalUrlError)
        }
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
      const toDataURL = imageObj.toDataURL as ((options: { format: string; quality: number; multiplier?: number }) => string) | undefined
      if (typeof toDataURL !== 'function') {
        console.error('[BackgroundRemovalAdapter] Image object missing toDataURL method')
        return null
      }
      
      // If we have originalUrl and it's a data URL, we might be able to use it directly
      if (originalUrl && originalUrl.startsWith('data:image/') && this.isValidImageDataUrl(originalUrl)) {
        console.log('[BackgroundRemovalAdapter] Using original image URL directly')
        console.log('[BackgroundRemovalAdapter] Original URL validation:', {
          length: originalUrl.length,
          format: originalUrl.substring(0, 30),
          hasBase64: originalUrl.includes(';base64,'),
          base64Length: originalUrl.split(';base64,')[1]?.length || 0
        })
        
        // Additional validation before using original URL
        try {
          const base64Data = originalUrl.split(';base64,')[1]
          if (base64Data && base64Data.length > 100) {
            // Test decode first 100 chars
            const testDecode = atob(base64Data.substring(0, 100))
            console.log('[BackgroundRemovalAdapter] Original URL base64 test decode successful:', testDecode.length, 'bytes')
            
            // Check file signature
            const firstBytes = testDecode.substring(0, 8)
            const isPNG = firstBytes.charCodeAt(0) === 0x89 && firstBytes.charCodeAt(1) === 0x50
            const isJPEG = firstBytes.charCodeAt(0) === 0xFF && firstBytes.charCodeAt(1) === 0xD8
            console.log('[BackgroundRemovalAdapter] Original URL file signature check:', { isPNG, isJPEG })
            
            if (isPNG || isJPEG) {
              console.log('[BackgroundRemovalAdapter] Original URL has valid signature, using it')
              return originalUrl
            } else {
              console.log('[BackgroundRemovalAdapter] Original URL has invalid signature, will re-export')
            }
          }
        } catch (originalUrlError) {
          console.warn('[BackgroundRemovalAdapter] Original URL validation failed:', originalUrlError)
        }
      }
      
      // Export strategies - start with most compatible formats for Bria model
      const exportStrategies = [
        { format: 'png', quality: 1.0, multiplier: exportMultiplier, description: 'High quality PNG' },
        { format: 'png', quality: 0.9, multiplier: exportMultiplier, description: 'Good quality PNG' },
        { format: 'jpeg', quality: 0.95, multiplier: exportMultiplier, description: 'High quality JPEG' },
        { format: 'jpeg', quality: 0.85, multiplier: exportMultiplier, description: 'Good quality JPEG' },
        { format: 'png', quality: 1.0, multiplier: exportMultiplier * 0.8, description: 'Smaller PNG' },
        { format: 'jpeg', quality: 0.8, multiplier: exportMultiplier * 0.8, description: 'Smaller JPEG' },
        { format: 'png', quality: 0.8, multiplier: exportMultiplier * 0.6, description: 'Compressed PNG' },
        { format: 'jpeg', quality: 0.7, multiplier: exportMultiplier * 0.6, description: 'Compressed JPEG' }
      ]
      
      console.log('[BackgroundRemovalAdapter] ===== STARTING EXPORT STRATEGIES =====')
      console.log('[BackgroundRemovalAdapter] Will try', exportStrategies.length, 'export strategies')
      
      for (const strategy of exportStrategies) {
        try {
          console.log(`[BackgroundRemovalAdapter] ===== TRYING EXPORT STRATEGY: ${strategy.description} =====`)
          console.log(`[BackgroundRemovalAdapter] Strategy parameters:`, {
            format: strategy.format,
            quality: strategy.quality,
            multiplier: strategy.multiplier,
            expectedDimensions: {
              width: Math.round(actualWidth * strategy.multiplier),
              height: Math.round(actualHeight * strategy.multiplier)
            }
          })
          
          // Add timeout to prevent hanging
          const exportPromise = new Promise<string>((resolve, reject) => {
            try {
              console.log(`[BackgroundRemovalAdapter] Calling toDataURL with strategy: ${strategy.description}`)
              const startTime = Date.now()
              
              const imageUrl = toDataURL({
                format: strategy.format as 'png' | 'jpeg',
                quality: strategy.quality,
                multiplier: strategy.multiplier
              })
              
              const exportTime = Date.now() - startTime
              console.log(`[BackgroundRemovalAdapter] toDataURL completed in ${exportTime}ms for strategy: ${strategy.description}`)
              
              resolve(imageUrl)
            } catch (error) {
              console.error(`[BackgroundRemovalAdapter] toDataURL failed for strategy ${strategy.description}:`, error)
              reject(error)
            }
          })
          
          const timeoutPromise = new Promise<string>((_, reject) => {
            setTimeout(() => reject(new Error('Export timeout')), 10000) // Increased timeout
          })
          
          const imageUrl = await Promise.race([exportPromise, timeoutPromise])
          
          console.log(`[BackgroundRemovalAdapter] Export result for ${strategy.description}:`, {
            success: !!imageUrl,
            length: imageUrl?.length || 0,
            format: imageUrl?.substring(0, 30) || 'N/A'
          })
          
          if (!imageUrl) {
            console.warn(`[BackgroundRemovalAdapter] Export failed for ${strategy.description} - no URL returned`)
            continue
          }
          
          // Additional validation - check if the result looks like a valid data URL
          if (!imageUrl.startsWith('data:image/')) {
            console.warn(`[BackgroundRemovalAdapter] Export result doesn't look like a valid data URL for ${strategy.description}`)
            continue
          }
          
          // Check size limits
          if (imageUrl.length > 8_000_000) { // 8MB limit
            console.log(`[BackgroundRemovalAdapter] Image too large (${imageUrl.length} chars, ~${Math.round(imageUrl.length/1024/1024*100)/100}MB), trying next strategy`)
            continue
          }
          
          // Validate the format
          if (!this.isValidImageDataUrl(imageUrl)) {
            console.log(`[BackgroundRemovalAdapter] Invalid format for ${strategy.description}, trying next strategy`)
            continue
          }
          
          // ===== COMPREHENSIVE VALIDATION BEFORE USING =====
          console.log(`[BackgroundRemovalAdapter] ===== COMPREHENSIVE VALIDATION FOR ${strategy.description} =====`)
          
          // Additional validation: try to load the image in the browser to ensure it's actually valid
          const isActuallyValid = await this.validateImageCanLoad(imageUrl)
          if (!isActuallyValid) {
            console.log(`[BackgroundRemovalAdapter] Image failed browser load test for ${strategy.description}, trying next strategy`)
            continue
          }
          
          // Test if it's a valid image by trying to parse the base64
          try {
            const base64Index = imageUrl.indexOf(';base64,')
            if (base64Index !== -1) {
              const mimeType = imageUrl.substring(0, base64Index)
              const base64Data = imageUrl.substring(base64Index + 8)
              
              console.log(`[BackgroundRemovalAdapter] Final validation for ${strategy.description}:`, {
                mimeType,
                base64Length: base64Data.length,
                base64SizeMB: Math.round(base64Data.length / 1024 / 1024 * 100) / 100
              })
              
              // Try to decode the first chunk to verify it's valid
              const firstChunk = base64Data.substring(0, 100)
              const decodedFirst = atob(firstChunk)
              console.log(`[BackgroundRemovalAdapter] First chunk decode test for ${strategy.description}:`, decodedFirst.length, 'bytes')
              
              // Try to decode the full base64 in chunks to avoid memory issues
              let totalDecodedSize = 0
              const chunkSize = 1000
              for (let i = 0; i < base64Data.length; i += chunkSize) {
                const chunk = base64Data.substring(i, i + chunkSize)
                const decodedChunk = atob(chunk)
                totalDecodedSize += decodedChunk.length
              }
              console.log(`[BackgroundRemovalAdapter] Full base64 validation for ${strategy.description}: ${totalDecodedSize} bytes decoded`)
              
              // Check if it starts with image file signatures
              const fullFirstChunk = atob(base64Data.substring(0, 100))
              const firstBytes = fullFirstChunk.substring(0, 8)
              const isPNG = firstBytes.charCodeAt(0) === 0x89 && firstBytes.charCodeAt(1) === 0x50 && firstBytes.charCodeAt(2) === 0x4E && firstBytes.charCodeAt(3) === 0x47
              const isJPEG = firstBytes.charCodeAt(0) === 0xFF && firstBytes.charCodeAt(1) === 0xD8 && firstBytes.charCodeAt(2) === 0xFF
              
              console.log(`[BackgroundRemovalAdapter] File signature validation for ${strategy.description}:`, { isPNG, isJPEG })
              
              if (!isPNG && !isJPEG) {
                console.warn(`[BackgroundRemovalAdapter] Invalid image format signature for ${strategy.description}`)
                continue
              }
              
              // Additional format-specific validation
              if (isPNG) {
                console.log(`[BackgroundRemovalAdapter] PNG-specific validation for ${strategy.description}`)
                if (fullFirstChunk.length > 12) {
                  const ihdrCheck = fullFirstChunk.substring(8, 12)
                  console.log(`[BackgroundRemovalAdapter] PNG IHDR check:`, ihdrCheck === 'IHDR' ? 'VALID' : 'INVALID')
                }
              }
              
              if (isJPEG) {
                console.log(`[BackgroundRemovalAdapter] JPEG-specific validation for ${strategy.description}`)
                // Check for JFIF marker
                const hasJFIF = base64Data.includes('JFIF')
                console.log(`[BackgroundRemovalAdapter] JPEG JFIF marker:`, hasJFIF ? 'PRESENT' : 'MISSING')
              }
            }
          } catch (base64Error) {
            console.warn(`[BackgroundRemovalAdapter] Base64 validation failed for ${strategy.description}:`, base64Error)
            continue
          }
          
          console.log(`[BackgroundRemovalAdapter] ===== ${strategy.description} PASSED ALL VALIDATIONS =====`)
          console.log(`[BackgroundRemovalAdapter] Successfully processed image using ${strategy.description}`)
          console.log(`[BackgroundRemovalAdapter] Final image details:`, {
            format: imageUrl.substring(0, 30),
            length: imageUrl.length,
            sizeMB: Math.round(imageUrl.length / 1024 / 1024 * 100) / 100,
            strategy: strategy.description
          })
          
          return imageUrl
          
        } catch (exportError) {
          console.warn(`[BackgroundRemovalAdapter] Export error for ${strategy.description}:`, exportError)
          // Log more details about the error
          if (exportError instanceof Error) {
            console.warn(`[BackgroundRemovalAdapter] Error details for ${strategy.description}:`, {
              message: exportError.message,
              stack: exportError.stack?.substring(0, 200) + '...'
            })
          }
          continue
        }
      }
      
      // If all strategies failed, try one more fallback using the canvas itself
      console.log('[BackgroundRemovalAdapter] All export strategies failed, trying canvas fallback')
      try {
        // Get canvas context to try extracting the image differently
        const canvasContext = CanvasToolBridge.getCanvasContext()
        if (canvasContext && canvasContext.canvas) {
          console.log('[BackgroundRemovalAdapter] Trying canvas-level export as fallback')
          
          // Use high quality settings for canvas fallback to maintain image quality
          const canvasDataURL = await CanvasToolBridge.getCleanCanvasImage(canvasContext.canvas, {
            format: 'png',
            quality: 1.0, // Maximum quality for PNG
            multiplier: 1.0 // Full resolution to maintain quality after upscaling
          })
          
          if (canvasDataURL && this.isValidImageDataUrl(canvasDataURL)) {
            console.log('[BackgroundRemovalAdapter] Canvas fallback successful - high quality')
            console.log('[BackgroundRemovalAdapter] Canvas fallback details:', {
              format: canvasDataURL.substring(0, 30),
              length: canvasDataURL.length,
              sizeMB: Math.round(canvasDataURL.length / 1024 / 1024 * 100) / 100
            })
            
            // Validate the canvas export quality
            const base64Data = canvasDataURL.split(';base64,')[1]
            if (base64Data && base64Data.length > 100) {
              try {
                const testDecode = atob(base64Data.substring(0, 100))
                const firstBytes = testDecode.substring(0, 8)
                const isPNG = firstBytes.charCodeAt(0) === 0x89 && firstBytes.charCodeAt(1) === 0x50
                console.log('[BackgroundRemovalAdapter] Canvas fallback format validation:', { isPNG })
                
                if (isPNG) {
                  return canvasDataURL
                }
              } catch (validationError) {
                console.warn('[BackgroundRemovalAdapter] Canvas fallback validation failed:', validationError)
              }
            }
          }
          
          // If PNG fallback fails, try JPEG as a last resort
          console.log('[BackgroundRemovalAdapter] PNG canvas fallback failed, trying JPEG fallback')
          const jpegCanvasDataURL = await CanvasToolBridge.getCleanCanvasImage(canvasContext.canvas, {
            format: 'jpeg',
            quality: 0.95, // High quality JPEG
            multiplier: 1.0 // Full resolution
          })
          
          if (jpegCanvasDataURL && this.isValidImageDataUrl(jpegCanvasDataURL)) {
            console.log('[BackgroundRemovalAdapter] JPEG canvas fallback successful - high quality')
            console.log('[BackgroundRemovalAdapter] JPEG canvas fallback details:', {
              format: jpegCanvasDataURL.substring(0, 30),
              length: jpegCanvasDataURL.length,
              sizeMB: Math.round(jpegCanvasDataURL.length / 1024 / 1024 * 100) / 100
            })
            return jpegCanvasDataURL
          }
        }
      } catch (canvasError) {
        console.warn('[BackgroundRemovalAdapter] Canvas fallback also failed:', canvasError)
      }
      
      // If even the canvas fallback fails, try a direct canvas export
      console.log('[BackgroundRemovalAdapter] All fallbacks failed, trying direct canvas export')
      try {
        const canvasContext = CanvasToolBridge.getCanvasContext()
        if (canvasContext && canvasContext.canvas) {
          const canvas = canvasContext.canvas
          
          // Try direct canvas toDataURL
          const directDataURL = canvas.toDataURL({
            format: 'png',
            quality: 1.0,
            multiplier: 1.0
          })
          if (directDataURL && this.isValidImageDataUrl(directDataURL)) {
            console.log('[BackgroundRemovalAdapter] Direct canvas export successful')
            console.log('[BackgroundRemovalAdapter] Direct canvas export details:', {
              format: directDataURL.substring(0, 30),
              length: directDataURL.length,
              sizeMB: Math.round(directDataURL.length / 1024 / 1024 * 100) / 100
            })
            return directDataURL
          }
        }
      } catch (directError) {
        console.warn('[BackgroundRemovalAdapter] Direct canvas export failed:', directError)
      }
      
      console.error('[BackgroundRemovalAdapter] All export strategies and fallbacks failed')
      return null
      
    } catch (error) {
      console.error('[BackgroundRemovalAdapter] Error getting image from target images:', error)
      return null
    }
  }
  
  /**
   * Optimize image data for better compatibility with Bria model
   */
  private async optimizeImageForBriaModel(imageDataUrl: string): Promise<string | null> {
    try {
      console.log('[BackgroundRemovalAdapter] Optimizing image for Bria model compatibility')
      
      // Check if optimization is needed
      if (!imageDataUrl || !imageDataUrl.startsWith('data:image/')) {
        console.warn('[BackgroundRemovalAdapter] Invalid image data URL for optimization')
        return null
      }
      
      const base64Data = imageDataUrl.split(';base64,')[1]
      if (!base64Data || base64Data.length === 0) {
        console.warn('[BackgroundRemovalAdapter] No base64 data found for optimization')
        return null
      }
      
      // Check current format and size
      const currentSizeMB = Math.round(base64Data.length / 1024 / 1024 * 100) / 100
      const isPNG = imageDataUrl.startsWith('data:image/png')
      const isJPEG = imageDataUrl.startsWith('data:image/jpeg')
      
      console.log('[BackgroundRemovalAdapter] Current image stats:', {
        format: isPNG ? 'PNG' : isJPEG ? 'JPEG' : 'OTHER',
        sizeMB: currentSizeMB,
        base64Length: base64Data.length
      })
      
      // If image is too large (>4MB), we need to compress it
      if (currentSizeMB > 4) {
        console.log('[BackgroundRemovalAdapter] Image too large, attempting compression')
        
        try {
          // Create an image element to load and reprocess the image
          const img = new Image()
          img.crossOrigin = 'anonymous'
          
          await new Promise((resolve, reject) => {
            img.onload = resolve
            img.onerror = reject
            img.src = imageDataUrl
          })
          
          console.log('[BackgroundRemovalAdapter] Image loaded for optimization:', {
            width: img.width,
            height: img.height,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight
          })
          
          // Create a canvas to reprocess the image
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          
          if (!ctx) {
            console.error('[BackgroundRemovalAdapter] Cannot get canvas context for optimization')
            return imageDataUrl // Return original if we can't optimize
          }
          
          // Calculate optimal dimensions (max 2048x2048 for Bria)
          const maxDimension = 2048
          let { width, height } = img
          
          if (width > maxDimension || height > maxDimension) {
            const scale = Math.min(maxDimension / width, maxDimension / height)
            width = Math.round(width * scale)
            height = Math.round(height * scale)
            console.log('[BackgroundRemovalAdapter] Resizing for optimization:', { width, height, scale })
          }
          
          canvas.width = width
          canvas.height = height
          
          // Draw the image with high quality
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'
          ctx.drawImage(img, 0, 0, width, height)
          
          // Try PNG first (lossless, good for background removal)
          let optimizedDataUrl = canvas.toDataURL('image/png', 1.0)
          let optimizedSizeMB = Math.round(optimizedDataUrl.split(';base64,')[1].length / 1024 / 1024 * 100) / 100
          
          console.log('[BackgroundRemovalAdapter] PNG optimization result:', {
            sizeMB: optimizedSizeMB,
            reduction: Math.round((currentSizeMB - optimizedSizeMB) / currentSizeMB * 100)
          })
          
          // If PNG is still too large, try high-quality JPEG
          if (optimizedSizeMB > 4) {
            console.log('[BackgroundRemovalAdapter] PNG still too large, trying JPEG')
            optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.92)
            optimizedSizeMB = Math.round(optimizedDataUrl.split(';base64,')[1].length / 1024 / 1024 * 100) / 100
            
            console.log('[BackgroundRemovalAdapter] JPEG optimization result:', {
              sizeMB: optimizedSizeMB,
              reduction: Math.round((currentSizeMB - optimizedSizeMB) / currentSizeMB * 100)
            })
          }
          
          // If still too large, try more aggressive JPEG compression
          if (optimizedSizeMB > 4) {
            console.log('[BackgroundRemovalAdapter] Still too large, trying aggressive JPEG compression')
            optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.8)
            optimizedSizeMB = Math.round(optimizedDataUrl.split(';base64,')[1].length / 1024 / 1024 * 100) / 100
            
            console.log('[BackgroundRemovalAdapter] Aggressive JPEG result:', {
              sizeMB: optimizedSizeMB,
              reduction: Math.round((currentSizeMB - optimizedSizeMB) / currentSizeMB * 100)
            })
          }
          
          // Validate the optimized result
          if (this.isValidImageDataUrl(optimizedDataUrl)) {
            console.log('[BackgroundRemovalAdapter] Image optimization successful')
            return optimizedDataUrl
          } else {
            console.warn('[BackgroundRemovalAdapter] Optimization produced invalid result, using original')
            return imageDataUrl
          }
          
        } catch (optimizationError) {
          console.error('[BackgroundRemovalAdapter] Error during image optimization:', optimizationError)
          // Return original if optimization fails
          return imageDataUrl
        }
      }
      
      // If image size is acceptable, just validate format compatibility
      if (isPNG || isJPEG) {
        console.log('[BackgroundRemovalAdapter] Image size acceptable, no optimization needed')
        return imageDataUrl
      }
      
      // If format is not PNG or JPEG, convert to PNG
      console.log('[BackgroundRemovalAdapter] Converting unsupported format to PNG')
      try {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        
        await new Promise((resolve, reject) => {
          img.onload = resolve
          img.onerror = reject
          img.src = imageDataUrl
        })
        
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        
        if (ctx) {
          canvas.width = img.width
          canvas.height = img.height
          ctx.drawImage(img, 0, 0)
          
          const pngDataUrl = canvas.toDataURL('image/png', 1.0)
          
          if (this.isValidImageDataUrl(pngDataUrl)) {
            console.log('[BackgroundRemovalAdapter] Format conversion successful')
            return pngDataUrl
          }
        }
      } catch (conversionError) {
        console.error('[BackgroundRemovalAdapter] Error during format conversion:', conversionError)
      }
      
      // Return original if all optimization attempts fail
      console.log('[BackgroundRemovalAdapter] Using original image without optimization')
      return imageDataUrl
      
    } catch (error) {
      console.error('[BackgroundRemovalAdapter] Error in optimizeImageForBriaModel:', error)
      return imageDataUrl // Return original on any error
    }
  }
  
  /**
   * Validate that the image can actually be loaded in the browser
   */
  private async validateImageCanLoad(dataUrl: string): Promise<boolean> {
    try {
      console.log('[BackgroundRemovalAdapter] Testing if image can be loaded in browser...')
      
      return new Promise<boolean>((resolve) => {
        const img = new Image()
        
        const timeout = setTimeout(() => {
          console.warn('[BackgroundRemovalAdapter] Image load test timed out')
          resolve(false)
        }, 5000) // 5 second timeout
        
        img.onload = () => {
          clearTimeout(timeout)
          console.log('[BackgroundRemovalAdapter] Image load test passed:', {
            width: img.width,
            height: img.height,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight
          })
          
          // Additional validation - ensure the image has valid dimensions
          const hasValidDimensions = img.width > 0 && img.height > 0 && img.naturalWidth > 0 && img.naturalHeight > 0
          if (!hasValidDimensions) {
            console.warn('[BackgroundRemovalAdapter] Image has invalid dimensions')
            resolve(false)
            return
          }
          
          // Check if dimensions are reasonable (not too large)
          const maxDimension = 8192 // 8K max
          if (img.naturalWidth > maxDimension || img.naturalHeight > maxDimension) {
            console.warn('[BackgroundRemovalAdapter] Image dimensions too large:', img.naturalWidth, 'x', img.naturalHeight)
            resolve(false)
            return
          }
          
          resolve(true)
        }
        
        img.onerror = (error) => {
          clearTimeout(timeout)
          console.warn('[BackgroundRemovalAdapter] Image load test failed:', error)
          resolve(false)
        }
        
        img.src = dataUrl
      })
    } catch (error) {
      console.error('[BackgroundRemovalAdapter] Error in validateImageCanLoad:', error)
      return false
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
      } catch {
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
      console.log('[BackgroundRemovalAdapter] Starting applyInPlace operation')
      console.log('[BackgroundRemovalAdapter] Original URL prefix:', originalUrl?.substring(0, 50) + '...')
      console.log('[BackgroundRemovalAdapter] Processed URL prefix:', processedUrl?.substring(0, 50) + '...')
      
      const { useCanvasStore } = await import('@/store/canvasStore')
      const canvasStore = useCanvasStore.getState()
      
      // Find the original image object using multiple strategies
      const objects = canvas.getObjects()
      console.log('[BackgroundRemovalAdapter] Canvas has', objects.length, 'objects')
      
      const imageObjects = objects.filter(obj => obj.type === 'image')
      console.log('[BackgroundRemovalAdapter] Found', imageObjects.length, 'image objects')
      
      let originalImage: unknown = null
      
      // Strategy 1: Try exact URL match
      originalImage = imageObjects.find(obj => {
        try {
          const objSrc = (obj as any).getSrc as (() => string) | undefined
          if (!objSrc) return false
          const srcValue = objSrc()
          return srcValue === originalUrl
        } catch (error) {
          console.warn('[BackgroundRemovalAdapter] Error getting src for object:', error)
          return false
        }
      })
      
      if (!originalImage) {
        console.log('[BackgroundRemovalAdapter] Exact URL match failed, trying fuzzy matching')
        
        // Strategy 2: Try fuzzy matching for data URLs (compare significant parts)
        originalImage = imageObjects.find(obj => {
          try {
            const objSrc = (obj as any).getSrc as (() => string) | undefined
            if (!objSrc) return false
            const srcValue = objSrc()
            if (!srcValue || !originalUrl) return false
            
            // For data URLs, compare the base64 data part
            if (srcValue.startsWith('data:') && originalUrl.startsWith('data:')) {
              const objBase64 = srcValue.split(';base64,')[1]
              const origBase64 = originalUrl.split(';base64,')[1]
              if (objBase64 && origBase64) {
                // Compare first 100 characters of base64 (should be enough to identify)
                return objBase64.substring(0, 100) === origBase64.substring(0, 100)
              }
            }
            return false
          } catch (error) {
            console.warn('[BackgroundRemovalAdapter] Error getting src for fuzzy matching:', error)
            return false
          }
        })
      }
      
      if (!originalImage) {
        console.log('[BackgroundRemovalAdapter] Fuzzy matching failed, using first image object')
        // Strategy 3: Fallback to the first image object (if only one image)
        if (imageObjects.length === 1) {
          originalImage = imageObjects[0]
        } else if (imageObjects.length > 1) {
          // Try to find the most recently modified image or selected image
          const selectedObjects = canvas.getActiveObjects()
          const selectedImages = selectedObjects.filter(obj => obj.type === 'image')
          if (selectedImages.length > 0) {
            originalImage = selectedImages[0]
          } else {
            // Just use the first image as fallback
            originalImage = imageObjects[0]
          }
        }
      }
      
      if (!originalImage) {
        console.error('[BackgroundRemovalAdapter] Could not find original image to replace')
        alert('Could not find the original image to replace. Please try using "Accept Both" instead.')
        
        // Close the review modal anyway
        if (canvasStore.setReviewModal) {
          canvasStore.setReviewModal(null)
        }
        return
      }
      
      console.log('[BackgroundRemovalAdapter] Found original image, proceeding with replacement')
      console.log('[BackgroundRemovalAdapter] Original image properties:', {
        type: (originalImage as any).type,
        left: (originalImage as any).left,
        top: (originalImage as any).top,
        width: (originalImage as any).width,
        height: (originalImage as any).height,
        scaleX: (originalImage as any).scaleX,
        scaleY: (originalImage as any).scaleY,
        angle: (originalImage as any).angle
      })
      
      // Load the processed image
      const fabric = await import('fabric')
      
      // Load the processed image using a more direct approach
      let processedImg: unknown
      try {
        console.log('[BackgroundRemovalAdapter] Loading processed image...')
        
        // Create image element first
        const imgElement = new Image()
        imgElement.crossOrigin = 'anonymous'
        
        // Load the image
        await new Promise((resolve, reject) => {
          imgElement.onload = resolve
          imgElement.onerror = reject
          imgElement.src = processedUrl
        })
        
        // Create fabric image from loaded element
        processedImg = new fabric.Image(imgElement) as any
        console.log('[BackgroundRemovalAdapter] Successfully loaded processed image')
      } catch (loadError) {
        console.error('[BackgroundRemovalAdapter] Error loading processed image:', loadError)
        alert('Failed to load the processed image. Please try again.')
        
        // Close the review modal
        if (canvasStore.setReviewModal) {
          canvasStore.setReviewModal(null)
        }
        return
      }
      
      // Copy position and properties from original
      ;(processedImg as any).set({
        left: (originalImage as any).left,
        top: (originalImage as any).top,
        scaleX: (originalImage as any).scaleX,
        scaleY: (originalImage as any).scaleY,
        angle: (originalImage as any).angle,
        selectable: (originalImage as any).selectable,
        evented: (originalImage as any).evented,
        centeredRotation: true  // Ensure rotation happens around center
      })
      
      console.log('[BackgroundRemovalAdapter] Removing original image and adding processed image')
      
      // Remove original and add processed
      canvas.remove(originalImage as any)
      canvas.add(processedImg as any)
      canvas.setActiveObject(processedImg as any)
      canvas.renderAll()
      
      console.log('[BackgroundRemovalAdapter] Successfully applied processed image in place')
      
      // Close the review modal
      if (canvasStore.setReviewModal) {
        canvasStore.setReviewModal(null)
      }
      
    } catch (error) {
      console.error('[BackgroundRemovalAdapter] Error applying in place:', error)
      alert('An error occurred while applying the processed image. Please try again.')
      
      // Try to close the modal even if there was an error
      try {
        const { useCanvasStore } = await import('@/store/canvasStore')
        const canvasStore = useCanvasStore.getState()
        if (canvasStore.setReviewModal) {
          canvasStore.setReviewModal(null)
        }
      } catch (modalError) {
        console.error('[BackgroundRemovalAdapter] Error closing modal after failure:', modalError)
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
   * Accept both images (add processed as new image)
   */
  private async acceptBoth(originalUrl: string, processedUrl: string, canvas: Canvas): Promise<void> {
    try {
      console.log('[BackgroundRemovalAdapter] Starting acceptBoth operation')
      
      const { useCanvasStore } = await import('@/store/canvasStore')
      const canvasStore = useCanvasStore.getState()
      
      // Load the processed image
      const fabric = await import('fabric')
      
      let processedImg: unknown
      try {
        console.log('[BackgroundRemovalAdapter] Loading processed image for acceptBoth...')
        
        // Create image element first
        const imgElement = new Image()
        imgElement.crossOrigin = 'anonymous'
        
        // Load the image
        await new Promise((resolve, reject) => {
          imgElement.onload = resolve
          imgElement.onerror = reject
          imgElement.src = processedUrl
        })
        
        // Create fabric image from loaded element
        processedImg = new fabric.Image(imgElement) as any
        console.log('[BackgroundRemovalAdapter] Successfully loaded processed image for acceptBoth')
      } catch (loadError) {
        console.error('[BackgroundRemovalAdapter] Error loading processed image for acceptBoth:', loadError)
        alert('Failed to load the processed image. Please try again.')
        
        // Close the review modal
        if (canvasStore.setReviewModal) {
          canvasStore.setReviewModal(null)
        }
        return
      }
      
      // Position it next to the original
      const canvasWidth = canvas.getWidth()
      const canvasHeight = canvas.getHeight()
      
      ;(processedImg as any).set({
        left: canvasWidth * 0.6, // Position to the right
        top: canvasHeight * 0.1,
        selectable: true,
        evented: true,
        centeredRotation: true  // Ensure rotation happens around center
      })
      
      console.log('[BackgroundRemovalAdapter] Adding processed image to canvas')
      
      // Add to canvas
      canvas.add(processedImg as any)
      canvas.setActiveObject(processedImg as any)
      canvas.renderAll()
      
      console.log('[BackgroundRemovalAdapter] Successfully added both images')
      
      // Close the review modal
      if (canvasStore.setReviewModal) {
        canvasStore.setReviewModal(null)
      }
      
    } catch (error) {
      console.error('[BackgroundRemovalAdapter] Error accepting both:', error)
      alert('An error occurred while adding the processed image. Please try again.')
      
      // Try to close the modal even if there was an error
      try {
        const { useCanvasStore } = await import('@/store/canvasStore')
        const canvasStore = useCanvasStore.getState()
        if (canvasStore.setReviewModal) {
          canvasStore.setReviewModal(null)
        }
      } catch (modalError) {
        console.error('[BackgroundRemovalAdapter] Error closing modal after acceptBoth failure:', modalError)
      }
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