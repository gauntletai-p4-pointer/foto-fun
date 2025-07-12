/**
 * Secure Replicate Client
 * Client-side service that calls server-side API routes instead of directly using Replicate API
 * This ensures API keys are never exposed to the browser
 */

export interface ImageData {
  element: HTMLImageElement | HTMLCanvasElement
  naturalWidth: number
  naturalHeight: number
}

export interface GenerateOptions {
  width?: number
  height?: number
  num_inference_steps?: number
  guidance_scale?: number
  negative_prompt?: string
  seed?: number
}

/**
 * Secure client for Replicate operations
 * All operations go through server-side API routes
 */
export class SecureReplicateClient {
  private baseUrl = '/api/ai/replicate'

  /**
   * Generate an image from text prompt
   */
  async generateImage(
    prompt: string,
    _modelId?: string, // Ignored - server uses configured model
    options: GenerateOptions = {}
  ): Promise<ImageData> {
    try {
      const response = await fetch(`${this.baseUrl}/generate-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          negative_prompt: options.negative_prompt,
          width: options.width || 1024,
          height: options.height || 1024,
          steps: options.num_inference_steps || 50,
          seed: options.seed
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Image generation failed')
      }

      const data = await response.json()
      return this.urlToImageData(data.imageUrl)
    } catch (error) {
      throw new Error(`Image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Remove background from an image
   */
  async removeBackground(imageData: ImageData, _modelId?: string): Promise<ImageData> {
    try {
      const imageUrl = await this.imageDataToDataURL(imageData)
      
      const response = await fetch(`${this.baseUrl}/background-removal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl,
          modelTier: 'best' // Default to best quality
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Background removal failed')
      }

      const data = await response.json()
      return this.urlToImageData(data.imageUrl)
    } catch (error) {
      throw new Error(`Background removal failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Enhance faces in an image
   */
  async enhanceFace(imageData: ImageData, _modelId?: string): Promise<ImageData> {
    try {
      const imageUrl = await this.imageDataToDataURL(imageData)
      
      const response = await fetch(`${this.baseUrl}/face-enhancement`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl,
          scale: 2,
          version: 'v1.4'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Face enhancement failed')
      }

      const data = await response.json()
      return this.urlToImageData(data.imageUrl)
    } catch (error) {
      throw new Error(`Face enhancement failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Upscale an image
   */
  async upscaleImage(
    imageData: ImageData,
    _modelId?: string,
    scale: 2 | 4 = 2
  ): Promise<ImageData> {
    try {
      const imageUrl = await this.imageDataToDataURL(imageData)
      
      const response = await fetch(`${this.baseUrl}/upscale`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl,
          scale,
          faceEnhance: false,
          modelTier: 'best'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Image upscaling failed')
      }

      const data = await response.json()
      return this.urlToImageData(data.imageUrl)
    } catch (error) {
      throw new Error(`Image upscaling failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Inpaint missing parts of an image
   */
  async inpaint(
    imageData: ImageData,
    maskData: ImageData,
    prompt: string,
    modelId?: string
  ): Promise<ImageData> {
    try {
      const imageUrl = await this.imageDataToDataURL(imageData)
      const maskUrl = await this.imageDataToDataURL(maskData)
      
      const response = await fetch(`${this.baseUrl}/run-model`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          modelId: modelId || 'stability-ai/stable-diffusion-xl-inpainting:7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc',
          input: {
            image: imageUrl,
            mask: maskUrl,
            prompt,
            num_inference_steps: 30,
            guidance_scale: 7.5
          }
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Inpainting failed')
      }

      const data = await response.json()
      const imageResultUrl = this.extractImageUrl(data.output)
      return this.urlToImageData(imageResultUrl)
    } catch (error) {
      throw new Error(`Inpainting failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Run any Replicate model with custom input
   */
  async runModel(modelId: string, input: Record<string, unknown>): Promise<unknown> {
    try {
      const response = await fetch(`${this.baseUrl}/run-model`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          modelId,
          input
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Model execution failed')
      }

      const data = await response.json()
      return data.output
    } catch (error) {
      throw new Error(`Model execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
        return (firstItem as { url: string }).url
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
    if (data.element instanceof HTMLCanvasElement) {
      return data.element.toDataURL('image/png')
    }
    
    // Convert HTMLImageElement to canvas first
    const canvas = document.createElement('canvas')
    canvas.width = data.naturalWidth
    canvas.height = data.naturalHeight
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(data.element, 0, 0)
    return canvas.toDataURL('image/png')
  }
} 