import { ObjectTool } from '@/lib/editor/tools/base/ObjectTool'
import { Layers } from 'lucide-react'
import { ReplicateService } from '../services/replicate'
import { ModelPreferencesManager } from '@/lib/settings/ModelPreferences'
import { TypedEventBus } from '@/lib/events/core/TypedEventBus'
import type { CanvasObject } from '@/lib/editor/objects/types'

export interface VariationOptions {
  prompt?: string
  strength?: number
  numVariations?: number
}

/**
 * AI-powered variation generation tool
 * Create variations of existing images
 */
export class VariationTool extends ObjectTool {
  id = 'ai-variation'
  name = 'Image Variations'
  icon = Layers
  cursor = 'crosshair'
  shortcut = 'V'
  
  private replicateService: ReplicateService | null = null
  private isProcessing = false
  private preferencesManager = ModelPreferencesManager.getInstance()
  private eventBus = new TypedEventBus()
  
  protected setupTool(): void {
    // Initialize Replicate service (automatically handles server/client routing)
    try {
      this.replicateService = new ReplicateService()
    } catch (error) {
      console.error('[VariationTool] Failed to initialize Replicate service:', error)
    }
    
    // Set default options
    this.setOption('prompt', 'high quality, detailed')
    this.setOption('strength', 0.3)
    this.setOption('numVariations', 2)
  }
  
  protected cleanupTool(): void {
    this.replicateService = null
    this.isProcessing = false
  }

  async execute(
    imageObject: CanvasObject, 
    options: VariationOptions = {}
  ): Promise<CanvasObject[]> {
    if (!this.replicateService) {
      throw new Error('Replicate service not initialized')
    }
    
    this.isProcessing = true
    
    const taskId = `${this.id}-${Date.now()}`
    this.eventBus.emit('ai.processing.started', {
      taskId,
      toolId: this.id,
      description: 'Generating image variations with AI',
      targetObjectIds: [imageObject.id]
    })
    
    try {
      const imageData = imageObject.data as import('@/lib/editor/objects/types').ImageData
      
      // Convert image to data URL
      const imageDataUrl = await this.imageToDataUrl(imageData.element)
      
      // Get settings from options or tool defaults
      const prompt = options.prompt || (this.getOption('prompt') as string) || 'high quality, detailed'
      const strength = options.strength || (this.getOption('strength') as number) || 0.3
      const numVariations = options.numVariations || (this.getOption('numVariations') as number) || 2
      
      const modelId = 'stability-ai/stable-diffusion-xl-img2img:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b'
      
      const modelInputs = {
        image: imageDataUrl,
        prompt: prompt,
        strength: strength,
        num_outputs: numVariations,
        num_inference_steps: 30,
        guidance_scale: 7.5
      }
      
      // Call Replicate model
      const output = await this.replicateService.runModel(modelId, modelInputs)
      
      // Extract image URLs from output (multiple results)
      const resultUrls = this.extractImageUrls(output)
      
      // Load all result images and create objects using canvas manager
      const variations: CanvasObject[] = []
      for (let i = 0; i < resultUrls.length; i++) {
        const resultImage = await this.loadImage(resultUrls[i])
        
        const variationObjectId = await this.createNewObject('image', {
          name: `${imageObject.name} (Variation ${i + 1})`,
          data: {
            src: resultUrls[i],
            naturalWidth: resultImage.naturalWidth,
            naturalHeight: resultImage.naturalHeight,
            element: resultImage
          }
        })
        
        // Get the created object
        const variationObject = this.getCanvas().getObject(variationObjectId)
        if (variationObject) {
          variations.push(variationObject)
        }
      }
      
      this.eventBus.emit('ai.processing.completed', {
        taskId,
        toolId: this.id,
        success: true,
        affectedObjectIds: variations.map(v => v.id)
      })
      
      return variations
    } catch (error) {
      console.error('Variation generation failed:', error)
      this.eventBus.emit('ai.processing.failed', {
        taskId,
        toolId: this.id,
        error: error instanceof Error ? error.message : 'Variation generation failed'
      })
      throw error
    } finally {
      this.isProcessing = false
    }
  }

  private async imageToDataUrl(element: HTMLImageElement | HTMLCanvasElement): Promise<string> {
    if (element instanceof HTMLCanvasElement) {
      return element.toDataURL('image/png')
    }
    
    const canvas = document.createElement('canvas')
    canvas.width = element.naturalWidth
    canvas.height = element.naturalHeight
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(element, 0, 0)
    return canvas.toDataURL('image/png')
  }

  private extractImageUrls(output: unknown): string[] {
    if (Array.isArray(output)) {
      return output.map(item => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object' && 'url' in item) return (item as { url: string }).url
        throw new Error('Invalid output format')
      })
    }
    
    if (typeof output === 'string') return [output]
    if (output && typeof output === 'object' && 'url' in output) return [(output as { url: string }).url]
    
    throw new Error('Unable to extract image URLs from model output')
  }

  private async loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error(`Failed to load image: ${url}`))
      img.src = url
    })
  }

} 