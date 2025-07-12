import Replicate from 'replicate'
import { getReplicateApiKey } from '@/lib/config/deployment'
import { SecureReplicateClient } from './secureReplicateClient'

export interface GenerateOptions {
  width?: number
  height?: number
  num_inference_steps?: number
  guidance_scale?: number
  negative_prompt?: string
  seed?: number
}

export interface ImageData {
  element: HTMLImageElement | HTMLCanvasElement
  naturalWidth: number
  naturalHeight: number
}

/**
 * Service for interacting with Replicate AI models
 * Provides image generation, enhancement, and manipulation
 * Updated to follow Replicate JavaScript v1.0.1 API patterns
 */
export class ReplicateService {
  private client: Replicate | null = null
  private secureClient: SecureReplicateClient | null = null
  private isServerSide: boolean

  constructor(apiKey?: string) {
    // Detect if we're running server-side or client-side
    this.isServerSide = typeof window === 'undefined'
    
    if (this.isServerSide) {
      // Server-side: Use direct Replicate client
      const key = apiKey || this.getApiKey()
      
      if (!key) {
        throw new Error('Replicate API key is required. Please set REPLICATE_API_KEY in your environment.')
      }
      
      this.client = new Replicate({ auth: key })
    } else {
      // Client-side: Use secure API routes
      this.secureClient = new SecureReplicateClient()
    }
  }

  /**
   * Get API key based on deployment configuration
   */
  private getApiKey(): string | undefined {
    return getReplicateApiKey()
  }
  
  /**
   * Generate an image from text prompt using specified model
   */
  async generateImage(
    prompt: string,
    modelId: `${string}/${string}` | `${string}/${string}:${string}`,
    options: GenerateOptions = {}
  ): Promise<ImageData> {
    if (this.isServerSide && this.client) {
      // Server-side: Use direct Replicate client
      try {
        const output = await this.client.run(
          modelId,
          {
            input: {
              prompt,
              width: options.width || 1024,
              height: options.height || 1024,
              num_inference_steps: options.num_inference_steps || 30,
              guidance_scale: options.guidance_scale || 7.5,
              negative_prompt: options.negative_prompt || '',
              ...(options.seed !== undefined && { seed: options.seed })
            }
          }
        )
        
        // Handle FileOutput or string array output
        const imageUrl = this.extractImageUrl(output)
        return this.urlToImageData(imageUrl)
      } catch (error) {
        throw new Error(`Image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    } else if (this.secureClient) {
      // Client-side: Use secure API routes
      return this.secureClient.generateImage(prompt, modelId, options)
    } else {
      throw new Error('Replicate service not properly initialized')
    }
  }
  
  /**
   * Remove background from an image using specified model
   */
  async removeBackground(imageData: ImageData, modelId: `${string}/${string}` | `${string}/${string}:${string}`): Promise<ImageData> {
    if (this.isServerSide && this.client) {
      // Server-side: Use direct Replicate client
      try {
        const dataUrl = await this.imageDataToDataURL(imageData)
        
        const output = await this.client.run(
          modelId,
          {
            input: {
              image: dataUrl
            }
          }
        )
        
        const imageUrl = this.extractImageUrl(output)
        return this.urlToImageData(imageUrl)
      } catch (error) {
        throw new Error(`Background removal failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    } else if (this.secureClient) {
      // Client-side: Use secure API routes
      return this.secureClient.removeBackground(imageData, modelId)
    } else {
      throw new Error('Replicate service not properly initialized')
    }
  }
  
  /**
   * Enhance faces in an image using specified model
   */
  async enhanceFace(imageData: ImageData, modelId: `${string}/${string}` | `${string}/${string}:${string}`): Promise<ImageData> {
    if (this.isServerSide && this.client) {
      // Server-side: Use direct Replicate client
      try {
        const dataUrl = await this.imageDataToDataURL(imageData)
        
        const output = await this.client.run(
          modelId,
          {
            input: {
              img: dataUrl,
              scale: 2,
              version: 'v1.4'
            }
          }
        )
        
        const imageUrl = this.extractImageUrl(output)
        return this.urlToImageData(imageUrl)
      } catch (error) {
        throw new Error(`Face enhancement failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    } else if (this.secureClient) {
      // Client-side: Use secure API routes
      return this.secureClient.enhanceFace(imageData, modelId)
    } else {
      throw new Error('Replicate service not properly initialized')
    }
  }
  
  /**
   * Upscale an image using specified model
   */
  async upscaleImage(
    imageData: ImageData,
    modelId: `${string}/${string}` | `${string}/${string}:${string}`,
    scale: 2 | 4 = 2
  ): Promise<ImageData> {
    if (this.isServerSide && this.client) {
      // Server-side: Use direct Replicate client
      try {
        const dataUrl = await this.imageDataToDataURL(imageData)
        
        const output = await this.client.run(
          modelId,
          {
            input: {
              image: dataUrl,
              scale,
              face_enhance: false
            }
          }
        )
        
        const imageUrl = this.extractImageUrl(output)
        return this.urlToImageData(imageUrl)
      } catch (error) {
        throw new Error(`Image upscaling failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    } else if (this.secureClient) {
      // Client-side: Use secure API routes
      return this.secureClient.upscaleImage(imageData, modelId, scale)
    } else {
      throw new Error('Replicate service not properly initialized')
    }
  }
  
  /**
   * Inpaint missing parts of an image using specified model
   */
  async inpaint(
    imageData: ImageData,
    maskData: ImageData,
    prompt: string,
    modelId: `${string}/${string}` | `${string}/${string}:${string}`
  ): Promise<ImageData> {
    if (this.isServerSide && this.client) {
      // Server-side: Use direct Replicate client
      try {
        const imageUrl = await this.imageDataToDataURL(imageData)
        const maskUrl = await this.imageDataToDataURL(maskData)
        
        const output = await this.client.run(
          modelId,
          {
            input: {
              image: imageUrl,
              mask: maskUrl,
              prompt,
              num_inference_steps: 30,
              guidance_scale: 7.5
            }
          }
        )
        
        const imageResultUrl = this.extractImageUrl(output)
        return this.urlToImageData(imageResultUrl)
      } catch (error) {
        throw new Error(`Inpainting failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    } else if (this.secureClient) {
      // Client-side: Use secure API routes
      return this.secureClient.inpaint(imageData, maskData, prompt, modelId)
    } else {
      throw new Error('Replicate service not properly initialized')
    }
  }
  
  /**
   * Run any Replicate model with custom input
   */
  async runModel(modelId: `${string}/${string}` | `${string}/${string}:${string}`, input: Record<string, unknown>): Promise<unknown> {
    if (this.isServerSide && this.client) {
      // Server-side: Use direct Replicate client
      try {
        return await this.client.run(modelId, { input })
      } catch (error) {
        throw new Error(`Model execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    } else if (this.secureClient) {
      // Client-side: Use secure API routes
      return this.secureClient.runModel(modelId, input)
    } else {
      throw new Error('Replicate service not properly initialized')
    }
  }
  
  /**
   * Extract image URL from various Replicate output formats
   */
  private extractImageUrl(output: unknown): string {
    // Handle FileOutput objects
    if (output && typeof output === 'object' && 'url' in output) {
      return (output as { url: string }).url
    }
    
    // Handle array of FileOutput or strings
    if (Array.isArray(output)) {
      const firstItem = output[0]
      if (typeof firstItem === 'string') {
        return firstItem
      }
      if (firstItem && typeof firstItem === 'object' && 'url' in firstItem) {
        return firstItem.url
      }
    }
    
    // Handle direct string URL
    if (typeof output === 'string') {
      return output
    }
    
    throw new Error('Unable to extract image URL from Replicate output')
  }
  
  /**
   * Convert URL to ImageData
   */
  private async urlToImageData(url: string): Promise<ImageData> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      
      img.onload = () => {
        resolve({
          element: img,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight
        })
      }
      
      img.onerror = () => {
        reject(new Error(`Failed to load image from URL: ${url}`))
      }
      
      img.src = url
    })
  }
  
  /**
   * Convert ImageData to data URL
   */
  private async imageDataToDataURL(data: ImageData): Promise<string> {
    if (data.element instanceof HTMLImageElement) {
      // Convert image to canvas
      const canvas = document.createElement('canvas')
      canvas.width = data.naturalWidth
      canvas.height = data.naturalHeight
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(data.element, 0, 0)
      return canvas.toDataURL('image/png')
    } else {
      // Already a canvas
      return data.element.toDataURL('image/png')
    }
  }
} 