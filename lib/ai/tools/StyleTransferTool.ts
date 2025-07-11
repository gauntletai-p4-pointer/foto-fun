import { ReplicateService } from '../services/replicate'
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
export class StyleTransferTool {
  readonly id = 'ai-style-transfer'
  readonly name = 'Style Transfer'
  readonly description = 'Apply artistic styles to images using AI'
  
  private replicateService = new ReplicateService()

  async execute(
    imageObject: CanvasObject, 
    options: StyleTransferOptions
  ): Promise<CanvasObject> {
    const imageData = imageObject.data as import('@/lib/editor/objects/types').ImageData
    
    // Convert image to data URL
    const imageDataUrl = await this.imageToDataUrl(imageData.element)
    
    // Use SDXL Image-to-Image model
    const modelId = options.modelTier === 'artistic'
      ? 'tommoore515/material_stable_diffusion:7d7bf2b2-4a0b-4b8b-8b8b-8b8b8b8b8b8b'
      : 'stability-ai/stable-diffusion-xl-img2img:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b'
    
    const modelInputs = {
      image: imageDataUrl,
      prompt: options.prompt,
      strength: options.strength || 0.7,
      num_inference_steps: 30,
      guidance_scale: 7.5
    }
    
    // Call Replicate model
    const output = await this.replicateService.runModel(modelId, modelInputs)
    
    // Extract image URL from output
    const resultImageUrl = this.extractImageUrl(output)
    
    // Load the result image
    const resultImage = await this.loadImage(resultImageUrl)
    
    // Create new styled object
    const styledObject: CanvasObject = {
      ...imageObject,
      id: this.generateId(),
      name: `${imageObject.name} (Style: ${options.prompt})`,
      data: {
        src: resultImageUrl,
        naturalWidth: resultImage.naturalWidth,
        naturalHeight: resultImage.naturalHeight,
        element: resultImage
      }
    }
    
    return styledObject
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
    return `styled_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
} 