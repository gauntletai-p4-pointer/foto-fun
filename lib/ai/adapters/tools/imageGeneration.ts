import { BaseToolAdapter } from '../base'
import { ImageGenerationTool } from '@/lib/editor/tools/ai-native/imageGenerationCanvasTool'
import { ServiceContainer } from '@/lib/core/ServiceContainer'
import type { EventLayerStore } from '@/lib/store/layers/EventLayerStore'
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager'
import type { FabricImage } from '@/lib/editor/canvas/types'

export interface ImageGenerationParams {
  prompt: string
  width: number
  height: number
  steps: number
  seed?: number
  negative_prompt?: string
}

export interface ImageGenerationOutput {
  success: boolean
  imageUrl?: string
  message: string
  targetingMode: 'selection' | 'auto-single'
}

/**
 * Tool Adapter for Image Generation AI-Native Tool
 * Integrates Replicate's SDXL model with FotoFun's canvas
 */
export class ImageGenerationAdapter extends BaseToolAdapter<ImageGenerationParams, ImageGenerationOutput> {
  // Required BaseToolAdapter properties
  aiName = 'generateImage'
  description = `Generate NEW images from scratch using text descriptions with Stable Diffusion XL. 
This tool creates completely new images based on detailed text prompts - it does NOT modify existing images.

Use this tool when the user wants to:
- Create a new image from a description
- Add a new generated image to the canvas
- Generate artwork, photos, or illustrations from text

DO NOT use this tool for:
- Making existing images "more vibrant" (use adjustSaturation instead)
- Enhancing existing photos (use other adjustment tools)
- Modifying colors, brightness, or effects on existing images

Examples of when to use this tool:
- "generate a serene mountain landscape at sunset"
- "create a futuristic robot in a cyberpunk city"
- "add an oil painting of a cat wearing a hat"
- "generate a new background image"

Common dimensions (all multiples of 8):
- Square: 512x512, 768x768, 1024x1024
- Portrait: 512x768, 768x1024
- Landscape: 768x512, 1024x768

Be specific in your descriptions for better results. The generated image will be added as a new layer on the canvas.`
  
  metadata = {
    category: 'ai-native' as const,
    executionType: 'expensive' as const,
    worksOn: 'new-image' as const
  }
  
  inputSchema = {
    prompt: {
      type: 'string',
      description: 'Text description of the image to generate',
    },
    negative_prompt: {
      type: 'string',
      description: 'What to avoid in the generated image',
      optional: true,
    },
    width: {
      type: 'number',
      description: 'Width in pixels (will be rounded to nearest multiple of 8). Common sizes: 512, 768, 1024',
      minimum: 256,
      maximum: 2048,
    },
    height: {
      type: 'number',
      description: 'Height in pixels (will be rounded to nearest multiple of 8). Common sizes: 512, 768, 1024',
      minimum: 256,
      maximum: 2048,
    },
    steps: {
      type: 'number',
      description: 'Number of inference steps (more = higher quality but slower)',
      minimum: 1,
      maximum: 100,
    },
    seed: {
      type: 'number',
      description: 'Random seed for reproducible results',
      optional: true,
    },
  }
  
  // We don't have a canvas tool for AI-Native Tools - create a placeholder
  get tool(): { id: string; name: string; icon: () => null; cursor: string; isImplemented: boolean } {
    return {
      id: 'ai-image-generation',
      name: 'AI Image Generation',
      icon: () => null,
      cursor: 'default',
      isImplemented: true
    }
  }
  
  async execute(params: ImageGenerationParams, context: { canvas: any }): Promise<ImageGenerationOutput> {
    try {
      console.log('[ImageGenerationAdapter] Generating image with params:', params)
      
      // Call our server API instead of Replicate directly
      const response = await fetch('/api/ai/replicate/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params)
      })
      
      if (!response.ok) {
        const errorData: { error: string; message?: string; details?: unknown } = await response.json()
        throw new Error(errorData.error || `Server error: ${response.status}`)
      }
      
      const result: { success: boolean; imageUrl?: string; error?: string; metadata?: { width: number; height: number; model?: string; processingTime?: number } } = await response.json()
      console.log('[ImageGenerationAdapter] Server response:', result)
      
      if (!result.success || !result.imageUrl) {
        throw new Error('Invalid response from server')
      }
      
      // Convert the generated image URL to a Fabric.js image and add to canvas
      await this.applyToCanvas(result.imageUrl, context.canvas, params.prompt)
      
      return {
        success: true,
        message: `Generated image from prompt: "${params.prompt}"`,
        imageUrl: result.imageUrl,
        targetingMode: 'auto-single'
      }
      
    } catch (error) {
      console.error('[ImageGenerationAdapter] Error:', error)
      
      return {
        success: false,
        message: `Image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        targetingMode: 'auto-single'
      }
    }
  }
  
  /**
   * Apply the generated image to the canvas
   */
  private async applyToCanvas(imageUrl: string, canvas: any, prompt: string): Promise<void> {
    try {
      const img = await new Promise<any>((resolve, reject) => {
        const img = new fabric.Image(null, {
          crossOrigin: 'anonymous',
          src: imageUrl,
          onLoad: resolve,
          onError: reject,
        });
        canvas.add(img);
        canvas.setActiveObject(img);
        resolve(img);
      });
      
      if (!img) {
        throw new Error('Failed to load generated image')
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
      
      // Create a new layer for the generated image
      const layerStore = ServiceContainer.get<EventLayerStore>('EventLayerStore');
      const layerName = this.generateLayerName(prompt)
      
      console.log('[ImageGenerationAdapter] Creating new layer:', layerName)
      console.log('[ImageGenerationAdapter] Canvas objects before:', canvas.getObjects().length)
      
      const newLayer = layerStore.addLayer({
        name: layerName,
        type: 'image'
      })
      
      console.log('[ImageGenerationAdapter] Layer created, canvas objects after:', canvas.getObjects().length)
      
      // Generate unique ID for the image object
      const imageId = `generated_image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      console.log('[ImageGenerationAdapter] Generated image ID:', imageId)
      console.log('[ImageGenerationAdapter] Canvas objects before adding:', canvas.getObjects().length)
      
      // Set image properties including the correct layerId
      img.set({
        left: position.left,
        top: position.top,
        originX: 'center',
        originY: 'center',
        selectable: true,
        evented: true,
        id: imageId,
        layerId: newLayer.id
      })
      
      // Add the image to canvas
      console.log('[ImageGenerationAdapter] Adding image to canvas at position:', position)
      canvas.add(img)
      canvas.setActiveObject(img)
      
      console.log('[ImageGenerationAdapter] Canvas objects after adding image:', canvas.getObjects().length)
      
      // Now update the layer with the object ID
      layerStore.updateLayer(newLayer.id, {
        objectIds: [imageId]
      })
      
      console.log('[ImageGenerationAdapter] Updated layer with object ID:', imageId)
      console.log('[ImageGenerationAdapter] Final canvas objects:', canvas.getObjects().length)
      
      canvas.renderAll()
      
      console.log('[ImageGenerationAdapter] Image added to canvas at position:', position)
      console.log('[ImageGenerationAdapter] Created new layer:', newLayer.name, 'with ID:', newLayer.id)
    } catch (error) {
      console.error('[ImageGenerationAdapter] Error applying image to canvas:', error)
      throw new Error('Failed to apply generated image to canvas')
    }
  }
  
  /**
   * Find the best position to place a new image without overlapping existing content
   */
  private findBestPosition(canvas: any, img: fabric.Image, scale: number): { left: number; top: number } {
    // Get viewport transform for accurate positioning
    const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0]
    const zoom = vpt[0] // zoom is stored in the scale components
    
    const canvasWidth = canvas.getWidth()
    const canvasHeight = canvas.getHeight()
    const imgWidth = (img.width || 0) * scale
    const imgHeight = (img.height || 0) * scale
    
    const existingObjects = canvas.getObjects()
    
    console.log('[ImageGenerationAdapter] findBestPosition called with:')
    console.log('  - Canvas size:', canvasWidth, 'x', canvasHeight)
    console.log('  - Image size:', imgWidth, 'x', imgHeight)
    console.log('  - Existing objects:', existingObjects.length)
    console.log('  - Viewport transform:', vpt)
    
    // If no existing objects, center the image in the viewport
    if (existingObjects.length === 0) {
      // Calculate the center of the visible viewport in object coordinates
      const viewportCenterX = (canvasWidth / 2 - vpt[4]) / zoom
      const viewportCenterY = (canvasHeight / 2 - vpt[5]) / zoom
      
      const centerPosition = {
        left: viewportCenterX,
        top: viewportCenterY
      }
      console.log('  - No existing objects, centering in viewport:', centerPosition)
      return centerPosition
    }
    
    // Check if a position overlaps with existing objects
    const hasOverlap = (centerX: number, centerY: number, width: number, height: number): boolean => {
      // Calculate bounds from center
      const left = centerX - width / 2
      const top = centerY - height / 2
      
      for (const obj of existingObjects) {
        const objCenterX = (obj.left || 0) + (obj.originX === 'center' ? 0 : (obj.width || 0) * (obj.scaleX || 1) / 2)
        const objCenterY = (obj.top || 0) + (obj.originY === 'center' ? 0 : (obj.height || 0) * (obj.scaleY || 1) / 2)
        const objWidth = (obj.width || 0) * (obj.scaleX || 1)
        const objHeight = (obj.height || 0) * (obj.scaleY || 1)
        const objLeft = objCenterX - objWidth / 2
        const objTop = objCenterY - objHeight / 2
        
        // Check if rectangles overlap
        const overlaps = left < objLeft + objWidth &&
                        left + width > objLeft &&
                        top < objTop + objHeight &&
                        top + height > objTop
        
        if (overlaps) {
          console.log(`    - Overlap detected with object at center (${objCenterX}, ${objCenterY})`)
          return true
        }
      }
      return false
    }
    
    // Get bounding box of all existing objects
    const bounds = this.getObjectsBounds(existingObjects)
    console.log('  - Existing objects bounds:', bounds)
    
    // Try common positions relative to existing content
    const positions = [
      { left: bounds.left - imgWidth - 20, top: bounds.top, label: 'left of content' },
      { left: bounds.right + 20, top: bounds.top, label: 'right of content' },
      { left: bounds.left, top: bounds.top - imgHeight - 20, label: 'above content' },
      { left: bounds.left, top: bounds.bottom + 20, label: 'below content' },
    ]
    
    console.log('  - Trying positions relative to existing content...')
    for (const pos of positions) {
      // Convert to center coordinates
      const centerX = pos.left + imgWidth / 2
      const centerY = pos.top + imgHeight / 2
      
      const withinBounds = pos.left >= 0 && 
                          pos.top >= 0 && 
                          pos.left + imgWidth <= canvasWidth && 
                          pos.top + imgHeight <= canvasHeight
      
      const noOverlap = !hasOverlap(centerX, centerY, imgWidth, imgHeight)
      
      console.log(`  - Testing position ${pos.label}: center (${centerX}, ${centerY}) - bounds: ${withinBounds}, overlap: ${!noOverlap}`)
      
      if (withinBounds && noOverlap) {
        console.log(`  - Found position: ${pos.label}`)
        return { left: centerX, top: centerY }
      }
    }
    
    // Grid search for empty space
    console.log('  - Grid searching for empty space...')
    const gridSize = Math.min(imgWidth, imgHeight) / 2
    
    for (let y = imgHeight / 2; y <= canvasHeight - imgHeight / 2; y += gridSize) {
      for (let x = imgWidth / 2; x <= canvasWidth - imgWidth / 2; x += gridSize) {
        if (!hasOverlap(x, y, imgWidth, imgHeight)) {
          console.log(`  - Grid search found position at center (${x}, ${y})`)
          return { left: x, top: y }
        }
      }
    }
    
    // Last resort: center the image (may overlap)
    console.log('  - WARNING: Falling back to center position (may overlap)')
    
    // Calculate the center of the visible viewport in object coordinates
    const viewportCenterX = (canvasWidth / 2 - vpt[4]) / zoom
    const viewportCenterY = (canvasHeight / 2 - vpt[5]) / zoom
    
    const fallbackPosition = {
      left: viewportCenterX,
      top: viewportCenterY
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
      const width = (obj.width || 0) * (obj.scaleX || 1)
      const height = (obj.height || 0) * (obj.scaleY || 1)
      
      // Calculate actual position based on origin
      let actualLeft = obj.left || 0
      let actualTop = obj.top || 0
      
      // Adjust for origin
      if (obj.originX === 'center') {
        actualLeft -= width / 2
      } else if (obj.originX === 'right') {
        actualLeft -= width
      }
      
      if (obj.originY === 'center') {
        actualTop -= height / 2
      } else if (obj.originY === 'bottom') {
        actualTop -= height
      }
      
      minLeft = Math.min(minLeft, actualLeft)
      minTop = Math.min(minTop, actualTop)
      maxRight = Math.max(maxRight, actualLeft + width)
      maxBottom = Math.max(maxBottom, actualTop + height)
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
      return 'Generated Image'
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
    return {
      description: this.description,
      inputSchema: this.inputSchema,
      execute: async (args: ImageGenerationParams) => {
        console.log('[ImageGenerationAdapter] Server-side tool execution with args:', args)
        
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
            const errorData: { error: string; message?: string; details?: unknown } = await response.json()
            throw new Error(errorData.error || `Server error: ${response.status}`)
          }
          
          const result: { success: boolean; imageUrl?: string; error?: string; metadata?: { width: number; height: number; model?: string; processingTime?: number } } = await response.json()
          console.log('[ImageGenerationAdapter] Server tool result:', result)
          
          return {
            success: result.success,
            // Don't include imageUrl in server response to avoid context length issues
            message: `Generated image from prompt: "${args.prompt}". Image will be added to canvas.`
          }
        } catch (error) {
          console.error('[ImageGenerationAdapter] Server-side tool error:', error)
          return {
            success: false,
            message: `Image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          }
        }
      }
    }
  }
  
  /**
   * Generate preview for approval system (not implemented for generation)
   */
  async generatePreview(): Promise<{ before: string; after: string }> {
    // For image generation, we can't provide a meaningful preview
    // Return empty images - the actual generation will happen on execute
    return {
      before: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      after: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
    }
  }
} 