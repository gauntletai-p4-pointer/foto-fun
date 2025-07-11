import { ObjectTool } from '@/lib/editor/tools/base/ObjectTool'
import { ZoomIn } from 'lucide-react'
import { ReplicateService } from '../services/replicate'
import { ModelPreferencesManager } from '@/lib/settings/ModelPreferences'
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
export class UpscalingTool extends ObjectTool {
  id = 'ai-upscaling'
  name = 'AI Upscaling'
  icon = ZoomIn
  cursor = 'zoom-in'
  shortcut = 'U'
  
  private replicateService: ReplicateService | null = null
  private isProcessing = false
  private preferencesManager = ModelPreferencesManager.getInstance()
  
  protected setupTool(): void {
    // Initialize Replicate service
    const apiKey = process.env.NEXT_PUBLIC_REPLICATE_API_TOKEN
    if (apiKey) {
      this.replicateService = new ReplicateService(apiKey)
    } else {
      console.error('[UpscalingTool] No Replicate API key found')
    }
    
    // Set default options
    this.setOption('scale', 2)
    this.setOption('faceEnhance', false)
    this.setOption('modelTier', this.preferencesManager.getToolModelTier('upscaling') || 'best')
  }
  
  protected cleanupTool(): void {
    this.replicateService = null
    this.isProcessing = false
  }

  async execute(imageObject: CanvasObject, options: UpscalingOptions = { scale: 2 }): Promise<CanvasObject> {
    if (!this.replicateService) {
      throw new Error('Replicate service not initialized')
    }
    
    this.isProcessing = true
    
    try {
      const imageData = imageObject.data as import('@/lib/editor/objects/types').ImageData
      
      // Convert image to data URL for Replicate
      const canvas = document.createElement('canvas')
      canvas.width = imageData.naturalWidth
      canvas.height = imageData.naturalHeight
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(imageData.element, 0, 0)
      const imageDataUrl = canvas.toDataURL('image/png')
      
      // Get settings from options or tool defaults
      const scale = options.scale || (this.getOption('scale') as number) || 2
      const faceEnhance = options.faceEnhance ?? (this.getOption('faceEnhance') as boolean) ?? false
      const modelTier = options.modelTier || (this.getOption('modelTier') as string) || 'best'
      
      // Use Real-ESRGAN model
      const modelId = modelTier === 'fast' 
        ? 'tencentarc/gfpgan:0fbacf7afc6c144e5be9767cff80f25aff23e52b0708f17e20f9879b2f21516c'
        : 'nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b'
      
      const modelInputs = {
        image: imageDataUrl,
        scale: scale,
        face_enhance: faceEnhance
      }
      
      // Call Replicate model
      const output = await this.replicateService.runModel(modelId, modelInputs)
      
      // Extract image URL from output
      const resultImageUrl = this.extractImageUrl(output)
      
      // Load the result image
      const resultImage = await this.loadImage(resultImageUrl)
      
      // Create new upscaled object using canvas manager
      const upscaledObjectId = await this.createNewObject('image', {
        name: `${imageObject.name} (Upscaled ${scale}x)`,
        width: resultImage.naturalWidth,
        height: resultImage.naturalHeight,
        data: {
          src: resultImageUrl,
          naturalWidth: resultImage.naturalWidth,
          naturalHeight: resultImage.naturalHeight,
          element: resultImage
        }
      })
      
      // Get the created object
      const upscaledObject = this.getCanvas().getObject(upscaledObjectId)
      if (!upscaledObject) {
        throw new Error('Failed to create upscaled object')
      }
      
      return upscaledObject
    } finally {
      this.isProcessing = false
    }
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

} 