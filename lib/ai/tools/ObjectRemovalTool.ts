import { ObjectTool } from '@/lib/editor/tools/base/ObjectTool'
import { Eraser } from 'lucide-react'
import { ReplicateService } from '../services/replicate'
import { ModelPreferencesManager } from '@/lib/settings/ModelPreferences'
import type { CanvasObject } from '@/lib/editor/objects/types'
import { TypedEventBus } from '@/lib/events/core/TypedEventBus'

export interface ObjectRemovalOptions {
  modelTier?: 'best' | 'alternative'
}

/**
 * AI-powered object removal tool
 * Uses LaMa or inpainting models to remove unwanted objects
 */
export class ObjectRemovalTool extends ObjectTool {
  id = 'ai-object-removal'
  name = 'Object Removal'
  icon = Eraser
  cursor = 'crosshair'
  shortcut = 'R'
  
  private replicateService: ReplicateService | null = null
  private isProcessing = false
  private preferencesManager = ModelPreferencesManager.getInstance()
  private eventBus = new TypedEventBus()
  
  protected setupTool(): void {
    // Initialize Replicate service (automatically handles server/client routing)
    try {
      this.replicateService = new ReplicateService()
    } catch (error) {
      console.error('[ObjectRemovalTool] Failed to initialize Replicate service:', error)
    }
    
    // Set default options
    this.setOption('modelTier', this.preferencesManager.getToolModelTier('object-removal') || 'best')
  }
  
  protected cleanupTool(): void {
    this.replicateService = null
    this.isProcessing = false
  }

  async execute(
    imageObject: CanvasObject, 
    maskObject: CanvasObject,
    options: ObjectRemovalOptions = {}
  ): Promise<CanvasObject> {
    if (!this.replicateService) {
      throw new Error('Replicate service not initialized')
    }
    
    this.isProcessing = true
    
    const taskId = `${this.id}-${Date.now()}`
    this.eventBus.emit('ai.processing.started', {
      taskId,
      toolId: this.id,
      description: 'Removing object with AI',
      targetObjectIds: [imageObject.id]
    })
    
    try {
      const imageData = imageObject.data as import('@/lib/editor/objects/types').ImageData
      const maskData = maskObject.data as import('@/lib/editor/objects/types').ImageData
      
      // Convert images to data URLs
      const imageDataUrl = await this.imageToDataUrl(imageData.element)
      const maskDataUrl = await this.imageToDataUrl(maskData.element)
      
      // Get model tier from options or tool setting
      const modelTier = options.modelTier || (this.getOption('modelTier') as string) || 'best'
      
      // Use LaMa model for object removal
      const modelId = modelTier === 'alternative'
        ? 'stability-ai/stable-diffusion-xl-inpainting:7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc'
        : 'chenxwh/lama:3b2d8b4e3ce55e1b5b7d9c1c6e5f8b2a9d1c3e4f5a6b7c8d9e0f1a2b3c4d5e6f'
      
      const modelInputs = {
        image: imageDataUrl,
        mask: maskDataUrl
      }
      
      // Call Replicate model
      const output = await this.replicateService.runModel(modelId, modelInputs)
      
      // Extract image URL from output
      const resultImageUrl = this.extractImageUrl(output)
      
      // Load the result image
      const resultImage = await this.loadImage(resultImageUrl)
      
      // Create new object with removed content using canvas manager
      const resultObjectId = await this.createNewObject('image', {
        name: `${imageObject.name} (Object Removed)`,
        data: {
          src: resultImageUrl,
          naturalWidth: resultImage.naturalWidth,
          naturalHeight: resultImage.naturalHeight,
          element: resultImage
        }
      })
      
      // Get the created object
      const resultObject = this.getCanvas().getObject(resultObjectId)
      if (!resultObject) {
        throw new Error('Failed to create result object')
      }
      
      this.eventBus.emit('ai.processing.completed', {
        taskId,
        toolId: this.id,
        success: true,
        affectedObjectIds: [resultObjectId]
      })
      
      return resultObject
    } catch (error) {
      console.error('Object removal failed:', error)
      this.eventBus.emit('ai.processing.failed', {
        taskId,
        toolId: this.id,
        error: error instanceof Error ? error.message : 'Object removal failed'
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