import Replicate from 'replicate'

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
 */
export class ReplicateService {
  private client: Replicate
  
  constructor(apiKey: string) {
    this.client = new Replicate({ auth: apiKey })
  }
  
  /**
   * Generate an image from text prompt using SDXL
   */
  async generateImage(
    prompt: string,
    options: GenerateOptions = {}
  ): Promise<ImageData> {
    const output = await this.client.run(
      "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
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
    
    const imageUrl = Array.isArray(output) ? output[0] : output
    return this.urlToImageData(imageUrl as string)
  }
  
  /**
   * Remove background from an image
   */
  async removeBackground(imageData: ImageData): Promise<ImageData> {
    const dataUrl = await this.imageDataToDataURL(imageData)
    
    const output = await this.client.run(
      "cjwbw/rembg:fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003",
      {
        input: {
          image: dataUrl
        }
      }
    )
    
    return this.urlToImageData((output as unknown) as string)
  }
  
  /**
   * Enhance faces in an image using GFPGAN
   */
  async enhanceFace(imageData: ImageData): Promise<ImageData> {
    const dataUrl = await this.imageDataToDataURL(imageData)
    
    const output = await this.client.run(
      "tencentarc/gfpgan:0fbacf7afc6c144e5be9767cff80f25aff23e52b0708f17e20f9879b2f21516c",
      {
        input: {
          img: dataUrl,
          scale: 2,
          version: 'v1.4'
        }
      }
    )
    
    return this.urlToImageData(output as string)
  }
  
  /**
   * Upscale an image using Real-ESRGAN
   */
  async upscaleImage(
    imageData: ImageData,
    scale: 2 | 4 = 2
  ): Promise<ImageData> {
    const dataUrl = await this.imageDataToDataURL(imageData)
    
    const output = await this.client.run(
      "nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b",
      {
        input: {
          image: dataUrl,
          scale,
          face_enhance: false
        }
      }
    )
    
    return this.urlToImageData(output as string)
  }
  
  /**
   * Inpaint missing parts of an image
   */
  async inpaint(
    imageData: ImageData,
    maskData: ImageData,
    prompt: string
  ): Promise<ImageData> {
    const imageUrl = await this.imageDataToDataURL(imageData)
    const maskUrl = await this.imageDataToDataURL(maskData)
    
    const output = await this.client.run(
      "stability-ai/stable-diffusion-inpainting:95b7223104132402a9ae91cc677285bc5eb997834bd2349fa486f53910fd68b3",
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
    
    return this.urlToImageData(output as string)
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
        reject(new Error('Failed to load image from URL'))
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