import { z } from 'zod'
import { CanvasToolAdapter } from '../base'
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager'
import type { CanvasContext } from '@/lib/ai/tools/canvas-bridge'
import type { ExecutionContext } from '@/lib/events/execution/ExecutionContext'
import type { Tool, CanvasObject } from '@/lib/editor/canvas/types'
import { isImageData } from '@/lib/editor/canvas/types'

// Define parameter schema
const imageGenerationParameters = z.object({
  prompt: z.string().min(1).describe('Text description of the image to generate'),
  negative_prompt: z.string().optional().describe('What to avoid in the generated image'),
  width: z.number().min(256).max(2048).describe('Width in pixels (will be rounded to nearest multiple of 8). Common sizes: 512, 768, 1024'),
  height: z.number().min(256).max(2048).describe('Height in pixels (will be rounded to nearest multiple of 8). Common sizes: 512, 768, 1024'),
  steps: z.number().min(1).max(100).describe('Number of inference steps (more = higher quality but slower)'),
  seed: z.number().optional().describe('Random seed for reproducible results')
})

export type ImageGenerationParams = z.infer<typeof imageGenerationParameters>

export interface ImageGenerationOutput {
  success: boolean
  imageUrl?: string
  message: string
  targetingMode: 'selection' | 'auto-single' | 'all' | 'none'
}

/**
 * Tool Adapter for Image Generation AI-Native Tool
 * Integrates Replicate's SDXL model with FotoFun's canvas
 */
export class ImageGenerationAdapter extends CanvasToolAdapter<ImageGenerationParams, ImageGenerationOutput> {
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
  
  inputSchema = imageGenerationParameters
  
  // AI-Native tools don't have traditional canvas tools - create a proper Tool implementation
  get tool(): Tool {
    return {
      id: 'ai-image-generation',
      name: 'AI Image Generation',
      icon: () => null,
      cursor: 'default',
      // Tool lifecycle methods (no-op for AI-native tools)
      onActivate: () => {
        // AI-native tools don't need activation logic
      },
      onDeactivate: () => {
        // AI-native tools don't need deactivation logic
      }
    }
  }
  
  protected getActionVerb(): string {
    return 'generate image'
  }
  
  async execute(params: ImageGenerationParams, context: CanvasContext, executionContext?: ExecutionContext): Promise<ImageGenerationOutput> {
    return this.executeWithCommonPatterns(
      params,
      context,
      async () => {
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
        
        // Convert the generated image URL to a canvas object and add to canvas
        await this.applyToCanvas(result.imageUrl, context.canvas, params.prompt)
        
        return {
          message: `Generated image from prompt: "${params.prompt}"`,
          imageUrl: result.imageUrl
        }
      },
      executionContext
    )
  }
  
  /**
   * Apply the generated image to the canvas using CanvasManager
   */
  private async applyToCanvas(imageUrl: string, canvas: CanvasManager, prompt: string): Promise<void> {
    try {
      // Load the image
      const imageObject = await canvas.loadImage(imageUrl)
      
      // Scale the image to fit the canvas while maintaining aspect ratio
      const canvasWidth = (canvas.state.documentBounds?.width || 0)
      const canvasHeight = (canvas.state.documentBounds?.height || 0)
      
      // Get image dimensions from the loaded object
      let imgWidth = 512
      let imgHeight = 512
      
      if (imageObject.data && isImageData(imageObject.data)) {
        const imageData = imageObject.data as HTMLImageElement
        imgWidth = imageData.naturalWidth || 512
        imgHeight = imageData.naturalHeight || 512
      }
      
      const scaleX = canvasWidth / imgWidth
      const scaleY = canvasHeight / imgHeight
      const scale = Math.min(scaleX, scaleY, 1) // Don't scale up
      
      // Find the best position for the new image
      const position = this.findBestPosition(canvas, imgWidth * scale, imgHeight * scale)
      
      // Update the image object with proper positioning and scaling
      await canvas.updateObject(imageObject.id, {
        transform: {
          x: position.left,
          y: position.top,
          scaleX: scale,
          scaleY: scale,
          rotation: 0,
          skewX: 0,
          skewY: 0
        },
        name: this.generateLayerName(prompt)
      })
      
      console.log('[ImageGenerationAdapter] Image added to canvas successfully')
      
    } catch (error) {
      console.error('[ImageGenerationAdapter] Error applying image to canvas:', error)
      throw new Error(`Failed to add generated image to canvas: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  /**
   * Find the best position for a new image on the canvas
   */
  private findBestPosition(canvas: CanvasManager, width: number, height: number): { left: number; top: number } {
    const canvasWidth = (canvas.state.documentBounds?.width || 0)
    const canvasHeight = (canvas.state.documentBounds?.height || 0)
    
    // Get all existing objects
    const existingObjects = canvas.state.layers.flatMap(layer => layer.objects)
    
    // If no objects, center the new image
    if (existingObjects.length === 0) {
      return {
        left: (canvasWidth - width) / 2,
        top: (canvasHeight - height) / 2
      }
    }
    
    // Try to find a position that doesn't overlap with existing objects
    const positions = [
      { left: (canvasWidth - width) / 2, top: (canvasHeight - height) / 2 }, // Center
      { left: 50, top: 50 }, // Top-left
      { left: canvasWidth - width - 50, top: 50 }, // Top-right
      { left: 50, top: canvasHeight - height - 50 }, // Bottom-left
      { left: canvasWidth - width - 50, top: canvasHeight - height - 50 }, // Bottom-right
    ]
    
    // Check for overlaps and return the first non-overlapping position
    for (const pos of positions) {
      if (!this.hasOverlap(pos.left, pos.top, width, height, existingObjects)) {
        return pos
      }
    }
    
    // If all positions overlap, use center
    return positions[0]
  }
  
  /**
   * Check if a position would overlap with existing objects
   */
  private hasOverlap(left: number, top: number, width: number, height: number, objects: CanvasObject[]): boolean {
    const newRight = left + width
    const newBottom = top + height
    
    return objects.some(obj => {
      const objLeft = obj.transform.x
      const objTop = obj.transform.y
      
      // Get object dimensions
      let objWidth = 100 // Default width
      let objHeight = 100 // Default height
      
      if (obj.data && isImageData(obj.data)) {
        const imageData = obj.data as HTMLImageElement
        objWidth = imageData.naturalWidth || 100
        objHeight = imageData.naturalHeight || 100
      }
      
      const objRight = objLeft + objWidth * (obj.transform.scaleX || 1)
      const objBottom = objTop + objHeight * (obj.transform.scaleY || 1)
      
      return !(newRight < objLeft || left > objRight || newBottom < objTop || top > objBottom)
    })
  }
  
  /**
   * Generate a descriptive layer name from the prompt
   */
  private generateLayerName(prompt: string): string {
    // Take first few words and clean them up
    const words = prompt.split(' ').slice(0, 3)
    const cleanWords = words.map(word => 
      word.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
    ).filter(word => word.length > 0)
    
    const baseName = cleanWords.join(' ') || 'generated image'
    
    // Capitalize first letter
    return baseName.charAt(0).toUpperCase() + baseName.slice(1)
  }
  
  canExecute(): boolean {
    // Image generation can always be executed
    return true
  }
} 