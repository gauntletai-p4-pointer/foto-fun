import { ReplicateService } from '../services/replicate'
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
export class VariationTool {
  readonly id = 'ai-variation'
  readonly name = 'Image Variations'
  readonly description = 'Generate variations of existing images using AI'
  
  private replicateService = new ReplicateService()

  async execute(
    imageObject: CanvasObject, 
    options: VariationOptions = {}
  ): Promise<CanvasObject[]> {
    const imageData = imageObject.data as import('@/lib/editor/objects/types').ImageData
    
    // Convert image to data URL
    const imageDataUrl = await this.imageToDataUrl(imageData.element)
    
    const modelId = 'stability-ai/stable-diffusion-xl-img2img:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b'
    
    const modelInputs = {
      image: imageDataUrl,
      prompt: options.prompt || 'high quality, detailed',
      strength: options.strength || 0.3,
      num_outputs: options.numVariations || 2,
      num_inference_steps: 30,
      guidance_scale: 7.5
    }
    
    // Call Replicate model
    const output = await this.replicateService.runModel(modelId, modelInputs)
    
    // Extract image URLs from output (multiple results)
    const resultUrls = this.extractImageUrls(output)
    
    // Load all result images and create objects
    const variations: CanvasObject[] = []
    for (let i = 0; i < resultUrls.length; i++) {
      const resultImage = await this.loadImage(resultUrls[i])
      
      const variationObject: CanvasObject = {
        ...imageObject,
        id: this.generateId(),
        name: `${imageObject.name} (Variation ${i + 1})`,
        data: {
          src: resultUrls[i],
          naturalWidth: resultImage.naturalWidth,
          naturalHeight: resultImage.naturalHeight,
          element: resultImage
        }
      }
      
      variations.push(variationObject)
    }
    
    return variations
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

  private extractImageUrls(output: any): string[] {
    if (Array.isArray(output)) {
      return output.map(item => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object' && 'url' in item) return item.url
        throw new Error('Invalid output format')
      })
    }
    
    if (typeof output === 'string') return [output]
    if (output && typeof output === 'object' && 'url' in output) return [output.url]
    
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

  private generateId(): string {
    return `variation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
} 