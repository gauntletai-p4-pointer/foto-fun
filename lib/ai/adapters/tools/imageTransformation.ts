import { z } from 'zod'
import { BaseToolAdapter } from '../base'
import type { Canvas } from 'fabric'
import * as fabric from 'fabric'
import { useLayerStore } from '@/store/layerStore'
import { tool } from 'ai'
import type { Tool } from '@/types'

// Input schema for AI SDK v5
const imageTransformationInputSchema = z.object({
  prompt: z.string().describe('Text description of how to transform the image'),
  negative_prompt: z.string().optional().describe('What to avoid in the transformed image'),
  width: z.number().min(256).max(2048).describe('Width in pixels (will be rounded to nearest multiple of 8). Common sizes: 512, 768, 1024'),
  height: z.number().min(256).max(2048).describe('Height in pixels (will be rounded to nearest multiple of 8). Common sizes: 512, 768, 1024'),
  steps: z.number().min(1).max(100).describe('Number of inference steps (more = higher quality but slower)'),
  seed: z.number().optional().describe('Random seed for reproducible results')
})

type ImageTransformationInput = z.infer<typeof imageTransformationInputSchema>

interface ImageTransformationOutput {
  success: boolean
  message: string
  imageUrl?: string
  cost?: number
  metadata?: {
    width: number
    height: number
    model?: string
    processingTime?: number
  }
}

interface ServerResponse {
  success: boolean
  imageUrl?: string
  error?: string
  metadata?: {
    width: number
    height: number
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
 * Tool Adapter for Image Transformation AI-Native Tool
 * Integrates Replicate's SDXL model with FotoFun's canvas for image transformation
 */
export class ImageTransformationAdapter extends BaseToolAdapter<ImageTransformationInput, ImageTransformationOutput> {
  // Required BaseToolAdapter properties
  aiName = 'transformImage'
  description = `Transform existing images using text descriptions with Stable Diffusion XL. 
This tool modifies and enhances existing images based on detailed text prompts.

Use this tool when the user wants to:
- Transform an existing image with new styles or elements
- Apply artistic effects to existing images
- Modify the appearance of existing images
- Create variations of existing images

DO NOT use this tool for:
- Creating completely new images from scratch (use generateImage instead)
- Simple color adjustments (use specific adjustment tools)
- Basic filters (use filter tools)

Examples of when to use this tool:
- "make this photo look like an oil painting"
- "transform this landscape into a cyberpunk scene"
- "add magical elements to this portrait"
- "convert this image to a pencil sketch"

Common dimensions (all multiples of 8):
- Square: 512x512, 768x768, 1024x1024
- Portrait: 512x768, 768x1024
- Landscape: 768x512, 1024x768

Be specific in your descriptions for better results. The transformed image will be added as a new layer on the canvas.`
  
  metadata = {
    category: 'ai-native' as const,
    executionType: 'expensive' as const,
    worksOn: 'existing-image' as const
  }
  
  inputSchema = imageTransformationInputSchema
  
  // We don't have a canvas tool for AI-Native Tools - create a placeholder
  get tool(): Tool {
    return {
      id: 'ai-image-transformation',
      name: 'AI Image Transformation',
      icon: () => null,
      cursor: 'default',
      isImplemented: true
    }
  }
  
  async execute(params: ImageTransformationInput, context: { canvas: Canvas }): Promise<ImageTransformationOutput> {
    try {
      console.log('[ImageTransformationAdapter] Transforming image with params:', params)
      
      // Call our server API instead of Replicate directly
      const response = await fetch('/api/ai/replicate/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params)
      })
      
      if (!response.ok) {
        const errorData: ServerErrorResponse = await response.json()
        throw new Error(errorData.error || `Server error: ${response.status}`)
      }
      
      const result: ServerResponse = await response.json()
      console.log('[ImageTransformationAdapter] Server response:', result)
      
      if (!result.success || !result.imageUrl) {
        throw new Error('Invalid response from server')
      }
      
      // Convert the transformed image URL to a Fabric.js image and add to canvas
      await this.applyToCanvas(result.imageUrl, context.canvas, params.prompt)
      
      return {
        success: true,
        message: `Transformed image with prompt: "${params.prompt}"`,
        imageUrl: result.imageUrl,
        cost: 0.002, // Estimated cost for SDXL
        metadata: result.metadata
      }
      
    } catch (error) {
      console.error('[ImageTransformationAdapter] Error:', error)
      
      return {
        success: false,
        message: `Image transformation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        cost: 0
      }
    }
  }
  
  /**
   * Apply the transformed image to the canvas
   */
  private async applyToCanvas(imageUrl: string, canvas: Canvas, prompt: string): Promise<void> {
    try {
      const img = await fabric.Image.fromURL(imageUrl, { crossOrigin: 'anonymous' })
      
      if (!img) {
        throw new Error('Failed to load transformed image')
      }
      
      // Scale the image to fit the canvas while maintaining aspect ratio
      const canvasWidth = canvas.getWidth()
      const canvasHeight = canvas.getHeight()
      
      const scaleX = canvasWidth / (img.width || 1)
      const scaleY = canvasHeight / (img.height || 1)
      const scale = Math.min(scaleX, scaleY, 1) // Don't scale up
      
      img.scale(scale)
      
      // Find the best position for the new image
      const position = this.findBestPosition(canvas, img, scale)
      
      // Create a new layer for the transformed image
      const layerStore = useLayerStore.getState()
      const layerName = this.generateLayerName(prompt)
      
      console.log('[ImageTransformationAdapter] Creating new layer:', layerName)
      console.log('[ImageTransformationAdapter] Canvas objects before:', canvas.getObjects().length)
      
      const newLayer = layerStore.addLayer({
        name: layerName,
        type: 'image'
      })
      
      console.log('[ImageTransformationAdapter] Layer created, canvas objects after:', canvas.getObjects().length)
      
      // Generate unique ID for the image object
      const imageId = `transformed_image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      console.log('[ImageTransformationAdapter] Generated image ID:', imageId)
      console.log('[ImageTransformationAdapter] Canvas objects before adding:', canvas.getObjects().length)
      
      // Set image properties including the correct layerId
      img.set({
        left: position.left,
        top: position.top,
        selectable: true,
        evented: true,
        id: imageId,
        layerId: newLayer.id
      })
      
      // Add the image to canvas
      console.log('[ImageTransformationAdapter] Adding image to canvas at position:', position)
      canvas.add(img)
      canvas.setActiveObject(img)
      
      console.log('[ImageTransformationAdapter] Canvas objects after adding image:', canvas.getObjects().length)
      
      // Now update the layer with the object ID
      layerStore.updateLayer(newLayer.id, {
        objectIds: [imageId]
      })
      
      console.log('[ImageTransformationAdapter] Updated layer with object ID:', imageId)
      console.log('[ImageTransformationAdapter] Final canvas objects:', canvas.getObjects().length)
      
      canvas.renderAll()
      
      console.log('[ImageTransformationAdapter] Image added to canvas at position:', position)
      console.log('[ImageTransformationAdapter] Created new layer:', newLayer.name, 'with ID:', newLayer.id)
    } catch (error) {
      console.error('[ImageTransformationAdapter] Error applying image to canvas:', error)
      throw new Error('Failed to apply transformed image to canvas')
    }
  }
  
  /**
   * Find the best position to place a new image without overlapping existing content
   */
  private findBestPosition(canvas: Canvas, img: fabric.Image, scale: number): { left: number; top: number } {
    const canvasWidth = canvas.getWidth()
    const canvasHeight = canvas.getHeight()
    const imgWidth = (img.width || 0) * scale
    const imgHeight = (img.height || 0) * scale
    
    const existingObjects = canvas.getObjects()
    
    console.log('[ImageTransformationAdapter] findBestPosition called with:')
    console.log('  - Canvas size:', canvasWidth, 'x', canvasHeight)
    console.log('  - Image size:', imgWidth, 'x', imgHeight)
    console.log('  - Existing objects:', existingObjects.length)
    
    // If no existing objects, center the image
    if (existingObjects.length === 0) {
      const centerPosition = {
        left: (canvasWidth - imgWidth) / 2,
        top: (canvasHeight - imgHeight) / 2
      }
      console.log('  - No existing objects, centering:', centerPosition)
      return centerPosition
    }
    
    // Check if a position overlaps with existing objects
    const hasOverlap = (left: number, top: number, width: number, height: number): boolean => {
      for (const obj of existingObjects) {
        const objLeft = obj.left || 0
        const objTop = obj.top || 0
        const objWidth = (obj.width || 0) * (obj.scaleX || 1)
        const objHeight = (obj.height || 0) * (obj.scaleY || 1)
        
        // Check if rectangles overlap
        const overlaps = left < objLeft + objWidth &&
                        left + width > objLeft &&
                        top < objTop + objHeight &&
                        top + height > objTop
        
        if (overlaps) {
          console.log(`    - Overlap detected with object at (${objLeft}, ${objTop}) size (${objWidth}, ${objHeight})`)
          return true
        }
      }
      return false
    }
    
    // Get bounding box of all existing objects
    const bounds = this.getObjectsBounds(existingObjects)
    console.log('  - Existing objects bounds:', bounds)
    
    // Try different positions in order of preference
    const positions = [
      // Right of existing content
      { left: bounds.right + 20, top: bounds.top, label: 'right' },
      // Left of existing content
      { left: bounds.left - imgWidth - 20, top: bounds.top, label: 'left' },
      // Below existing content
      { left: bounds.left, top: bounds.bottom + 20, label: 'below' },
      // Above existing content
      { left: bounds.left, top: bounds.top - imgHeight - 20, label: 'above' },
      // Bottom right corner
      { left: bounds.right + 20, top: bounds.bottom + 20, label: 'bottom-right' },
      // Top right corner
      { left: bounds.right + 20, top: bounds.top - imgHeight - 20, label: 'top-right' },
      // Bottom left corner
      { left: bounds.left - imgWidth - 20, top: bounds.bottom + 20, label: 'bottom-left' },
      // Top left corner
      { left: bounds.left - imgWidth - 20, top: bounds.top - imgHeight - 20, label: 'top-left' }
    ]
    
    // Find the first position that fits within canvas bounds and doesn't overlap
    for (const pos of positions) {
      const withinBounds = pos.left >= 0 && 
                           pos.top >= 0 && 
                           pos.left + imgWidth <= canvasWidth && 
                           pos.top + imgHeight <= canvasHeight
      
      const noOverlap = !hasOverlap(pos.left, pos.top, imgWidth, imgHeight)
      
      console.log(`  - Testing position ${pos.label}: (${pos.left}, ${pos.top}) - bounds: ${withinBounds}, overlap: ${!noOverlap}`)
      
      if (withinBounds && noOverlap) {
        console.log(`  - Found position: ${pos.label} at (${pos.left}, ${pos.top})`)
        return { left: pos.left, top: pos.top }
      }
    }
    
    console.log('  - No ideal position found, trying grid search...')
    
    // If no ideal position found, try a grid-based approach
    const gridSize = 20
    for (let y = 0; y <= canvasHeight - imgHeight; y += gridSize) {
      for (let x = 0; x <= canvasWidth - imgWidth; x += gridSize) {
        if (!hasOverlap(x, y, imgWidth, imgHeight)) {
          console.log(`  - Grid search found position at (${x}, ${y})`)
          return { left: x, top: y }
        }
      }
    }
    
    // Last resort: center the image (may overlap)
    console.log('  - WARNING: Falling back to center position (may overlap)')
    const fallbackPosition = {
      left: (canvasWidth - imgWidth) / 2,
      top: (canvasHeight - imgHeight) / 2
    }
    console.log('  - Fallback position:', fallbackPosition)
    return fallbackPosition
  }
  
  /**
   * Get the bounding box of all objects on the canvas
   */
  private getObjectsBounds(objects: fabric.Object[]): { left: number; top: number; right: number; bottom: number } {
    if (objects.length === 0) {
      return { left: 0, top: 0, right: 0, bottom: 0 }
    }
    
    let minLeft = Infinity
    let minTop = Infinity
    let maxRight = -Infinity
    let maxBottom = -Infinity
    
    for (const obj of objects) {
      const left = obj.left || 0
      const top = obj.top || 0
      const width = (obj.width || 0) * (obj.scaleX || 1)
      const height = (obj.height || 0) * (obj.scaleY || 1)
      
      minLeft = Math.min(minLeft, left)
      minTop = Math.min(minTop, top)
      maxRight = Math.max(maxRight, left + width)
      maxBottom = Math.max(maxBottom, top + height)
    }
    
    return {
      left: minLeft,
      top: minTop,
      right: maxRight,
      bottom: maxBottom
    }
  }
  
  /**
   * Generate a descriptive layer name based on the prompt
   */
  private generateLayerName(prompt: string): string {
    // Extract key words from the prompt to create a meaningful layer name
    const words = prompt
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .split(' ')
      .filter(word => word.length > 2) // Filter out short words
      .slice(0, 3) // Take first 3 meaningful words
    
    if (words.length === 0) {
      return 'Transformed Image'
    }
    
    // Capitalize first letter of each word
    const capitalizedWords = words.map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    )
    
    return capitalizedWords.join(' ')
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
   * On the server, this tool calls our API route directly
   */
  toAITool(): unknown {
    return tool({
      description: this.description,
      inputSchema: this.inputSchema,
      execute: async (args: ImageTransformationInput) => {
        console.log('[ImageTransformationAdapter] Server-side tool execution with args:', args)
        
        try {
          // On server, we can call our API route directly or use the server client
          // For consistency, we'll call the same API route
          const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/ai/replicate/generate-image`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(args)
          })
          
          if (!response.ok) {
            const errorData: ServerErrorResponse = await response.json()
            throw new Error(errorData.error || `Server error: ${response.status}`)
          }
          
          const result: ServerResponse = await response.json()
          console.log('[ImageTransformationAdapter] Server tool result:', result)
          
          return {
            success: result.success,
            // Don't include imageUrl in server response to avoid context length issues
            message: `Transformed image with prompt: "${args.prompt}". Image will be added to canvas.`
          }
        } catch (error) {
          console.error('[ImageTransformationAdapter] Server-side tool error:', error)
          return {
            success: false,
            message: `Image transformation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          }
        }
      }
    })
  }
  
  /**
   * Generate preview for approval system (not implemented for transformation)
   */
  async generatePreview(): Promise<{ before: string; after: string }> {
    // For image transformation, we can't provide a meaningful preview
    // Return empty images - the actual transformation will happen on execute
    return {
      before: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      after: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
    }
  }
} 