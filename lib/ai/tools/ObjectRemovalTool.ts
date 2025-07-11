import { ReplicateService } from '../services/replicate'
import type { CanvasObject } from '@/lib/editor/objects/types'

export interface ObjectRemovalOptions {
  modelTier?: 'best' | 'alternative'
}

/**
 * AI-powered object removal tool
 * Uses LaMa or inpainting models to remove unwanted objects
 */
export class ObjectRemovalTool {
  readonly id = 'ai-object-removal'
  readonly name = 'Object Removal'
  readonly description = 'Remove unwanted objects from images using AI'
  
  private replicateService = new ReplicateService()

  async execute(
    imageObject: CanvasObject, 
    maskObject: CanvasObject,
    options: ObjectRemovalOptions = {}
  ): Promise<CanvasObject> {
    const imageData = imageObject.data as import('@/lib/editor/objects/types').ImageData
    const maskData = maskObject.data as import('@/lib/editor/objects/types').ImageData
    
    // Convert images to data URLs
    const imageDataUrl = await this.imageToDataUrl(imageData.element)
    const maskDataUrl = await this.imageToDataUrl(maskData.element)
    
    // Use LaMa model for object removal
    const modelId = options.modelTier === 'alternative'
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
    
    // Create new object with removed content
    const resultObject: CanvasObject = {
      ...imageObject,
      id: this.generateId(),
      name: `${imageObject.name} (Object Removed)`,
      data: {
        src: resultImageUrl,
        naturalWidth: resultImage.naturalWidth,
        naturalHeight: resultImage.naturalHeight,
        element: resultImage
      }
    }
    
    return resultObject
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

  private extractImageUrl(output: any): string {
    if (typeof output === 'string') return output
    if (Array.isArray(output) && output.length > 0) {
      const first = output[0]
      if (typeof first === 'string') return first
      if (first && typeof first === 'object' && 'url' in first) return first.url
    }
    if (output && typeof output === 'object' && 'url' in output) return output.url
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

  private generateId(): string {
    return `object_removed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
} 