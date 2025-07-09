import { z } from 'zod'
import { BaseToolAdapter } from '../base'
import type { Canvas } from 'fabric'
import * as fabric from 'fabric'

// Input schema for AI SDK v5
const imageGenerationInputSchema = z.object({
  prompt: z.string().describe('Text description of the image to generate'),
  negative_prompt: z.string().optional().describe('What to avoid in the generated image'),
  width: z.number().min(256).max(2048).describe('Width in pixels (will be rounded to nearest multiple of 8). Common sizes: 512, 768, 1024'),
  height: z.number().min(256).max(2048).describe('Height in pixels (will be rounded to nearest multiple of 8). Common sizes: 512, 768, 1024'),
  steps: z.number().min(1).max(100).describe('Number of inference steps (more = higher quality but slower)'),
  seed: z.number().optional().describe('Random seed for reproducible results')
})

type ImageGenerationInput = z.infer<typeof imageGenerationInputSchema>

interface ImageGenerationOutput {
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

/**
 * Tool Adapter for Image Generation AI-Native Tool
 * Integrates Replicate's SDXL model with FotoFun's canvas
 */
export class ImageGenerationAdapter extends BaseToolAdapter<ImageGenerationInput, ImageGenerationOutput> {
  // Required BaseToolAdapter properties
  aiName = 'generateImage'
  description = `Generate images from text descriptions using Stable Diffusion XL. 
Creates new images based on detailed text prompts. The generated image will be added to the canvas.

Examples:
- "a serene mountain landscape at sunset"
- "a futuristic robot in a cyberpunk city"
- "an oil painting of a cat wearing a hat"

Common dimensions (all multiples of 8):
- Square: 512x512, 768x768, 1024x1024
- Portrait: 512x768, 768x1024
- Landscape: 768x512, 1024x768

Be specific in your descriptions for better results.`
  
  inputSchema = imageGenerationInputSchema
  
  // We don't need a canvas tool reference since this is an AI-Native Tool
  get tool() {
    return null as any // Not applicable for AI-Native Tools
  }
  
  async execute(params: ImageGenerationInput, context: { canvas: Canvas }): Promise<ImageGenerationOutput> {
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
        const errorData = await response.json()
        throw new Error(errorData.error || `Server error: ${response.status}`)
      }
      
      const result = await response.json()
      console.log('[ImageGenerationAdapter] Server response:', result)
      
      if (!result.success || !result.imageUrl) {
        throw new Error('Invalid response from server')
      }
      
      // Convert the generated image URL to a Fabric.js image and add to canvas
      await this.applyToCanvas(result.imageUrl, context.canvas)
      
      return {
        success: true,
        message: `Generated image from prompt: "${params.prompt}"`,
        imageUrl: result.imageUrl,
        cost: 0.002, // Estimated cost for SDXL
        metadata: result.metadata
      }
      
    } catch (error) {
      console.error('[ImageGenerationAdapter] Error:', error)
      
      return {
        success: false,
        message: `Image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        cost: 0
      }
    }
  }
  
  /**
   * Apply the generated image to the canvas
   */
  private async applyToCanvas(imageUrl: string, canvas: Canvas): Promise<void> {
    try {
      const img = await fabric.Image.fromURL(imageUrl, { crossOrigin: 'anonymous' })
      
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
      
      // Center the image on the canvas
      img.set({
        left: (canvasWidth - (img.width || 0) * scale) / 2,
        top: (canvasHeight - (img.height || 0) * scale) / 2,
        selectable: true,
        evented: true
      })
      
      // Clear canvas and add the new image
      canvas.clear()
      canvas.add(img)
      canvas.setActiveObject(img)
      canvas.renderAll()
      
      console.log('[ImageGenerationAdapter] Image added to canvas')
    } catch (error) {
      console.error('[ImageGenerationAdapter] Error applying image to canvas:', error)
      throw new Error('Failed to apply generated image to canvas')
    }
  }
  
  /**
   * Check if the adapter can execute (API configured)
   */
  canExecute(canvas: Canvas): boolean {
    // For simplicity, return true - server will handle API key validation
    return true
  }
  
  /**
   * Override toAITool for server-side execution
   * On the server, this tool calls our API route directly
   */
  toAITool(): unknown {
    // Import the tool function only on the server
    const { tool } = require('ai')
    
    return tool({
      description: this.description,
      inputSchema: this.inputSchema,
      execute: async (args: any) => {
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
            const errorData = await response.json()
            throw new Error(errorData.error || `Server error: ${response.status}`)
          }
          
          const result = await response.json()
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
    })
  }
  
  /**
   * Generate preview for approval system (not implemented for generation)
   */
  async generatePreview(params: ImageGenerationInput): Promise<{ before: string; after: string }> {
    // For image generation, we can't provide a meaningful preview
    // Return empty images - the actual generation will happen on execute
    return {
      before: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      after: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
    }
  }
} 