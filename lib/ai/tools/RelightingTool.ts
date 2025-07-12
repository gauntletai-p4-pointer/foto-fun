import { ObjectTool } from '@/lib/editor/tools/base/ObjectTool'
import { Lightbulb } from 'lucide-react'
import { ReplicateService } from '../services/replicate'
import { ModelPreferencesManager } from '@/lib/settings/ModelPreferences'
import { TypedEventBus } from '@/lib/events/core/TypedEventBus'
import type { CanvasObject } from '@/lib/editor/objects/types'

export interface RelightingOptions {
  lightDirection?: 'left' | 'right' | 'top' | 'bottom' | 'front'
  intensity?: number
}

/**
 * AI-powered relighting tool
 * Change lighting conditions in images
 */
export class RelightingTool extends ObjectTool {
  id = 'ai-relighting'
  name = 'AI Relighting'
  icon = Lightbulb
  cursor = 'crosshair'
  shortcut = 'L'
  
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
      console.error('[RelightingTool] Failed to initialize Replicate service:', error)
    }
    
    // Set default options
    this.setOption('lightDirection', 'front')
    this.setOption('intensity', 1.0)
  }
  
  protected cleanupTool(): void {
    this.replicateService = null
    this.isProcessing = false
  }

  async execute(
    imageObject: CanvasObject, 
    options: RelightingOptions = {}
  ): Promise<CanvasObject> {
    if (!this.replicateService) {
      throw new Error('Replicate service not initialized')
    }
    
    this.isProcessing = true
    
    const taskId = `${this.id}-${Date.now()}`
    this.eventBus.emit('ai.processing.started', {
      operationId: taskId,
      type: 'relighting',
      taskId,
      toolId: this.id,
      metadata: {
        description: 'Applying AI relighting',
        targetObjectIds: [imageObject.id]
      }
    })
    
    try {
      const imageData = imageObject.data as import('@/lib/editor/objects/types').ImageData
      
      // Convert image to data URL
      const imageDataUrl = await this.imageToDataUrl(imageData.element)
      
      // Get settings from options or tool defaults
      const lightDirection = options.lightDirection || (this.getOption('lightDirection') as string) || 'front'
      const intensity = options.intensity || (this.getOption('intensity') as number) || 1.0
      
      const modelId = 'tencentarc/ic-light:1b8e4c9b-4f8a-4a6b-8b8b-8b8b8b8b8b8b'
      
      const modelInputs = {
        image: imageDataUrl,
        light_direction: lightDirection,
        light_intensity: intensity
      }
      
      // Call Replicate model
      const output = await this.replicateService.runModel(modelId, modelInputs)
      
      // Extract image URL from output
      const resultImageUrl = this.extractImageUrl(output)
      
      // Load the result image
      const resultImage = await this.loadImage(resultImageUrl)
      
      // Create new relit object using canvas manager
      const relitObjectId = await this.createNewObject('image', {
        name: `${imageObject.name} (Relit)`,
        data: {
          src: resultImageUrl,
          naturalWidth: resultImage.naturalWidth,
          naturalHeight: resultImage.naturalHeight,
          element: resultImage
        }
      })
      
      // Get the created object
      const relitObject = this.getCanvas().getObject(relitObjectId)
      if (!relitObject) {
        throw new Error('Failed to create relit object')
      }
      
      this.eventBus.emit('ai.processing.completed', {
        operationId: taskId,
        taskId,
        toolId: this.id,
        result: {
          affectedObjectIds: [relitObjectId]
        }
      })
      
      return relitObject
    } catch (error) {
      console.error('Relighting failed:', error)
      this.eventBus.emit('ai.processing.failed', {
        operationId: taskId,
        taskId,
        toolId: this.id,
        error: error instanceof Error ? error.message : 'Relighting failed'
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

export interface PromptEnhancementOptions {
  maxLength?: number
  style?: 'detailed' | 'artistic' | 'photographic'
}

/**
 * AI-powered prompt enhancement tool
 * Improve and expand text prompts for better AI generation
 */
export class PromptEnhancementTool {
  readonly id = 'ai-prompt-enhancement'
  readonly name = 'Prompt Enhancement'
  readonly description = 'Enhance and improve text prompts using AI'
  
  private replicateService = new ReplicateService()

  async execute(prompt: string, options: PromptEnhancementOptions = {}): Promise<string> {
    const modelId = 'meta-llama/llama-3.2-11b-vision-instruct:1234567890abcdef'
    
    const enhancementPrompt = `Enhance this image generation prompt to be more detailed and effective: "${prompt}". 
    Style: ${options.style || 'detailed'}. 
    Keep it under ${options.maxLength || 200} characters.`
    
    const modelInputs = {
      prompt: enhancementPrompt,
      max_tokens: 100
    }
    
    // Call Replicate model
    const output = await this.replicateService.runModel(modelId, modelInputs)
    
    return typeof output === 'string' ? output : String(output)
  }
}

export interface SmartSelectionOptions {
  selectionType?: 'object' | 'background' | 'person'
  refinement?: number
}

/**
 * AI-powered smart selection tool
 * Make intelligent selections using point/box input
 */
export class SmartSelectionTool {
  readonly id = 'ai-smart-selection'
  readonly name = 'Smart Selection'
  readonly description = 'Make intelligent selections using AI'
  
  private replicateService = new ReplicateService()

  async execute(
    imageObject: CanvasObject,
    point: { x: number; y: number },
    _options: SmartSelectionOptions = {}
  ): Promise<CanvasObject> {
    const imageData = imageObject.data as import('@/lib/editor/objects/types').ImageData
    
    // Convert image to data URL
    const imageDataUrl = await this.imageToDataUrl(imageData.element)
    
    const modelId = 'meta/sam-2-large:1234567890abcdef'
    
    const modelInputs = {
      image: imageDataUrl,
      point_coords: [[point.x, point.y]],
      point_labels: [1] // 1 for foreground
    }
    
    // Call Replicate model
    const output = await this.replicateService.runModel(modelId, modelInputs)
    
    // Create selection mask object
    const selectionObject: CanvasObject = {
      ...imageObject,
      id: this.generateId(),
      name: `${imageObject.name} (Selection)`,
      type: 'image',
      data: {
        src: typeof output === 'string' ? output : String(output),
        naturalWidth: imageData.naturalWidth,
        naturalHeight: imageData.naturalHeight,
        element: imageData.element
      }
    }
    
    return selectionObject
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

  private generateId(): string {
    return `selection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

export interface DepthEstimationOptions {
  outputFormat?: 'grayscale' | 'colored'
}

/**
 * AI-powered depth estimation tool
 * Generate depth maps from images
 */
export class DepthEstimationTool {
  readonly id = 'ai-depth-estimation'
  readonly name = 'Depth Estimation'
  readonly description = 'Generate depth maps from images using AI'
  
  private replicateService = new ReplicateService()

  async execute(
    imageObject: CanvasObject,
    options: DepthEstimationOptions = {}
  ): Promise<CanvasObject> {
    const imageData = imageObject.data as import('@/lib/editor/objects/types').ImageData
    
    // Convert image to data URL
    const imageDataUrl = await this.imageToDataUrl(imageData.element)
    
    const modelId = 'stability-ai/stable-diffusion-depth2img:1234567890abcdef'
    
    const modelInputs = {
      image: imageDataUrl,
      output_format: options.outputFormat || 'grayscale'
    }
    
    // Call Replicate model
    const output = await this.replicateService.runModel(modelId, modelInputs)
    
    // Extract image URL from output
    const resultImageUrl = this.extractImageUrl(output)
    
    // Load the result image
    const resultImage = await this.loadImage(resultImageUrl)
    
    // Create depth map object
    const depthObject: CanvasObject = {
      ...imageObject,
      id: this.generateId(),
      name: `${imageObject.name} (Depth Map)`,
      data: {
        src: resultImageUrl,
        naturalWidth: resultImage.naturalWidth,
        naturalHeight: resultImage.naturalHeight,
        element: resultImage
      }
    }
    
    return depthObject
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

  private generateId(): string {
    return `depth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

export interface InstructionEditingOptions {
  instruction: string
  strength?: number
}

/**
 * AI-powered instruction-based editing tool
 * Edit images using natural language instructions
 */
export class InstructionEditingTool {
  readonly id = 'ai-instruction-editing'
  readonly name = 'Instruction Editing'
  readonly description = 'Edit images using natural language instructions'
  
  private replicateService = new ReplicateService()

  async execute(
    imageObject: CanvasObject,
    options: InstructionEditingOptions
  ): Promise<CanvasObject> {
    const imageData = imageObject.data as import('@/lib/editor/objects/types').ImageData
    
    // Convert image to data URL
    const imageDataUrl = await this.imageToDataUrl(imageData.element)
    
    const modelId = 'timothybrooks/instruct-pix2pix:1234567890abcdef'
    
    const modelInputs = {
      image: imageDataUrl,
      prompt: options.instruction,
      num_inference_steps: 30,
      image_guidance_scale: 1.5,
      guidance_scale: 7.0
    }
    
    // Call Replicate model
    const output = await this.replicateService.runModel(modelId, modelInputs)
    
    // Extract image URL from output
    const resultImageUrl = this.extractImageUrl(output)
    
    // Load the result image
    const resultImage = await this.loadImage(resultImageUrl)
    
    // Create edited object
    const editedObject: CanvasObject = {
      ...imageObject,
      id: this.generateId(),
      name: `${imageObject.name} (${options.instruction})`,
      data: {
        src: resultImageUrl,
        naturalWidth: resultImage.naturalWidth,
        naturalHeight: resultImage.naturalHeight,
        element: resultImage
      }
    }
    
    return editedObject
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

  private generateId(): string {
    return `edited_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
} 