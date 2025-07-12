import { ObjectTool } from '@/lib/editor/tools/base/ObjectTool'
import { Palette } from 'lucide-react'
import { ReplicateService } from '../services/replicate'
import { ModelPreferencesManager } from '@/lib/settings/ModelPreferences'
import { TypedEventBus } from '@/lib/events/core/TypedEventBus'
import type { CanvasObject } from '@/lib/editor/objects/types'

export interface StyleTransferOptions {
  prompt: string
  strength?: number
  modelTier?: 'best' | 'artistic'
}

/**
 * AI-powered style transfer tool
 * Apply artistic styles to images using AI
 */
export class StyleTransferTool extends ObjectTool {
  id = 'ai-style-transfer'
  name = 'Style Transfer'
  icon = Palette
  cursor = 'crosshair'
  shortcut = 'S'
  
  private replicateService: ReplicateService | null = null
  private isProcessing = false
  constructor(
    private preferencesManager: ModelPreferencesManager,
    private eventBus: TypedEventBus
  ) {
    super()
  }
  
  protected setupTool(): void {
    // Initialize Replicate service (automatically handles server/client routing)
    try {
      this.replicateService = new ReplicateService()
    } catch (error) {
      console.error('[StyleTransferTool] Failed to initialize Replicate service:', error)
    }
    
    // Set default options
    this.setOption('prompt', '')
    this.setOption('strength', 0.7)
    this.setOption('modelTier', this.preferencesManager.getToolModelTier('style-transfer') || 'best')
  }
  
  protected cleanupTool(): void {
    this.replicateService = null
    this.isProcessing = false
  }

  async execute(
    imageObject: CanvasObject, 
    options: StyleTransferOptions
  ): Promise<CanvasObject> {
    if (!this.replicateService) {
      throw new Error('Replicate service not initialized')
    }
    
    this.isProcessing = true
    
    const taskId = `${this.id}-${Date.now()}`
    this.eventBus.emit('ai.processing.started', {
      operationId: taskId,
      type: 'style-transfer',
      taskId,
      toolId: this.id,
      metadata: {
        description: 'Applying style transfer with AI',
        targetObjectIds: [imageObject.id]
      }
    })
    
    try {
      const imageData = imageObject.data as import('@/lib/editor/objects/types').ImageData
      
      // Convert image to data URL
      const imageDataUrl = await this.imageToDataUrl(imageData.element)
      
      // Get settings from options or tool defaults
      const modelTier = options.modelTier || (this.getOption('modelTier') as string) || 'best'
      const strength = options.strength || (this.getOption('strength') as number) || 0.7
      
      // Use SDXL Image-to-Image model
      const modelId = modelTier === 'artistic'
        ? 'tommoore515/material_stable_diffusion:7d7bf2b2-4a0b-4b8b-8b8b-8b8b8b8b8b8b'
        : 'stability-ai/stable-diffusion-xl-img2img:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b'
      
      const modelInputs = {
        image: imageDataUrl,
        prompt: options.prompt,
        strength: strength,
        num_inference_steps: 30,
        guidance_scale: 7.5
      }
      
      // Call Replicate model
      const output = await this.replicateService.runModel(modelId, modelInputs)
      
      // Extract image URL from output
      const resultImageUrl = this.extractImageUrl(output)
      
      // Load the result image
      const resultImage = await this.loadImage(resultImageUrl)
      
      // Create new styled object using canvas manager
      const styledObjectId = await this.createNewObject('image', {
        name: `${imageObject.name} (Style: ${options.prompt})`,
        data: {
          src: resultImageUrl,
          naturalWidth: resultImage.naturalWidth,
          naturalHeight: resultImage.naturalHeight,
          element: resultImage
        }
      })
      
      // Get the created object
      const styledObject = this.getCanvas().getObject(styledObjectId)
      if (!styledObject) {
        throw new Error('Failed to create styled object')
      }
      
      this.eventBus.emit('ai.processing.completed', {
        operationId: taskId,
        taskId,
        toolId: this.id,
        result: {
          affectedObjectIds: [styledObjectId]
        }
      })
      
      return styledObject
    } catch (error) {
      console.error('Style transfer failed:', error)
      this.eventBus.emit('ai.processing.failed', {
        operationId: taskId,
        taskId,
        toolId: this.id,
        error: error instanceof Error ? error.message : 'Style transfer failed'
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

  private extractImageUrl(output: unknown): string {
    if (typeof output === 'string') return output
    if (Array.isArray(output) && output.length > 0) {
      const first = output[0]
      if (typeof first === 'string') return first
      if (first && typeof first === 'object' && 'url' in first) return (first as { url: string }).url
    }
    if (output && typeof output === 'object' && 'url' in output) return (output as { url: string }).url
    throw new Error('Unable to extract image URL from model output')
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