import { Sparkles } from 'lucide-react'
import { ObjectTool } from '@/lib/editor/tools/base/ObjectTool'
import { ReplicateService } from '@/lib/ai/services/replicate'
import type { ToolEvent } from '@/lib/editor/canvas/types'

/**
 * AI-Native Image Generation Tool
 * Creates images from text prompts using Stable Diffusion XL
 */
export class ImageGenerationTool extends ObjectTool {
  id = 'image-generation'
  name = 'AI Image Generation'
  icon = Sparkles
  cursor = 'crosshair'
  shortcut = 'G'
  
  private replicateService: ReplicateService | null = null
  private isGenerating = false
  
  protected setupTool(): void {
    // Initialize with default options
    this.setOption('prompt', '')
    this.setOption('width', 1024)
    this.setOption('height', 1024)
    this.setOption('guidance_scale', 7.5)
    this.setOption('negative_prompt', '')
    
    // Initialize Replicate service
    const apiKey = process.env.NEXT_PUBLIC_REPLICATE_API_KEY
    if (apiKey) {
      this.replicateService = new ReplicateService(apiKey)
    } else {
      console.warn('Replicate API key not found')
    }
  }
  
  protected cleanupTool(): void {
    this.replicateService = null
  }
  
  /**
   * Generate image from current prompt
   */
  async generateImage(): Promise<void> {
    if (!this.replicateService || this.isGenerating) return
    
    const prompt = this.getOption('prompt') as string
    if (!prompt) {
      console.warn('No prompt provided')
      return
    }
    
    this.isGenerating = true
    
    try {
      // Generate the image
      const imageData = await this.replicateService.generateImage(prompt, {
        width: this.getOption('width') as number,
        height: this.getOption('height') as number,
        guidance_scale: this.getOption('guidance_scale') as number,
        negative_prompt: this.getOption('negative_prompt') as string
      })
      
      // Create object at last mouse position or center
      const x = this.lastMousePosition?.x ?? this.getCanvas().state.canvasWidth / 2
      const y = this.lastMousePosition?.y ?? this.getCanvas().state.canvasHeight / 2
      
      // Add to canvas
      const objectId = await this.createNewObject('image', {
        x: x - imageData.naturalWidth / 2,
        y: y - imageData.naturalHeight / 2,
        width: imageData.naturalWidth,
        height: imageData.naturalHeight,
        data: imageData,
        metadata: {
          aiGenerated: true,
          prompt,
          model: 'stable-diffusion-xl'
        }
      })
      
      // Select the new object
      this.getCanvas().selectObject(objectId)
      
    } catch (error) {
      console.error('Failed to generate image:', error)
    } finally {
      this.isGenerating = false
    }
  }
  
  onMouseDown(event: ToolEvent): void {
    // Update position for generation
    this.lastMousePosition = event.point
    
    // Trigger generation if we have a prompt
    if (this.getOption('prompt')) {
      this.generateImage()
    }
  }
  
  /**
   * Update prompt and regenerate
   */
  async setPrompt(prompt: string): Promise<void> {
    this.setOption('prompt', prompt)
    await this.generateImage()
  }
} 