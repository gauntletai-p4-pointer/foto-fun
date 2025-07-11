import { ReplicateService } from '../services/replicate'
import type { CanvasObject } from '@/lib/editor/objects/types'

export interface UpscalingOptions {
  scale: 2 | 4
  faceEnhance?: boolean
  modelTier?: 'best' | 'fast'
}

/**
 * AI-powered image upscaling tool
 * Supports multiple models for different quality/speed tradeoffs
 */
export class UpscalingTool {
  readonly id = 'ai-upscaling'
  readonly name = 'AI Upscaling'
  readonly description = 'Enhance image resolution using AI upscaling models'
  
  private replicateService = new ReplicateService()

  async execute(imageObject: CanvasObject, options: UpscalingOptions = { scale: 2 }): Promise<CanvasObject> {
    const imageData = imageObject.data as import('@/lib/editor/objects/types').ImageData
    
    // Convert image to data URL for Replicate
    const canvas = document.createElement('canvas')
    canvas.width = imageData.naturalWidth
    canvas.height = imageData.naturalHeight
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(imageData.element, 0, 0)
    const imageDataUrl = canvas.toDataURL('image/png')
    
    // Use Real-ESRGAN model
    const modelId = options.modelTier === 'fast' 
      ? 'tencentarc/gfpgan:0fbacf7afc6c144e5be9767cff80f25aff23e52b0708f17e20f9879b2f21516c'
      : 'nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b'
    
    const modelInputs = {
      image: imageDataUrl,
      scale: options.scale,
      face_enhance: options.faceEnhance || false
    }
    
    // Call Replicate model
    const output = await this.replicateService.runModel(modelId, modelInputs)
    
    // Extract image URL from output
    const resultImageUrl = this.extractImageUrl(output)
    
    // Load the result image
    const resultImage = await this.loadImage(resultImageUrl)
    
    // Create new upscaled object
    const upscaledObject: CanvasObject = {
      ...imageObject,
      id: this.generateId(),
      name: `${imageObject.name} (Upscaled ${options.scale}x)`,
      width: resultImage.naturalWidth,
      height: resultImage.naturalHeight,
      data: {
        src: resultImageUrl,
        naturalWidth: resultImage.naturalWidth,
        naturalHeight: resultImage.naturalHeight,
        element: resultImage
      }
    }
    
    return upscaledObject
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
    return `upscaled_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
} 