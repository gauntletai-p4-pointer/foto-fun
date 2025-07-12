import { ObjectTool } from '@/lib/editor/tools/base/ObjectTool'
import { Image } from 'lucide-react'
import { ReplicateService } from '@/lib/ai/services/replicate'
import { ModelRegistry } from '@/lib/ai/models/ModelRegistry'
import { ModelPreferencesManager } from '@/lib/settings/ModelPreferences'
import type { ModelTier } from '@/lib/plugins/types'
import { TypedEventBus } from '@/lib/events/core/TypedEventBus'

export interface ImageGenerationOptions {
  prompt: string
  width?: number
  height?: number
  negativePrompt?: string
  modelTier?: string
  position?: { x: number; y: number }
}

export class ImageGenerationTool extends ObjectTool {
  id = 'ai-image-generation'
  name = 'AI Image Generation'
  icon = Image
  cursor = 'crosshair'
  shortcut = 'G'
  
  private replicateService: ReplicateService | null = null
  constructor(
    private preferencesManager: ModelPreferencesManager,
    private eventBus: TypedEventBus
  ) {
    super()
  }
  
  protected setupTool(): void {
    // Initialize Replicate service
    try {
      this.replicateService = new ReplicateService()
    } catch (error) {
      console.error('[ImageGenerationTool] Failed to initialize Replicate service:', error)
    }
    
    // Set default options
    this.setOption('prompt', '')
    this.setOption('width', 1024)
    this.setOption('height', 1024)
    this.setOption('modelTier', this.preferencesManager.getToolModelTier('image-generation'))
  }
  
  protected cleanupTool(): void {
    this.replicateService = null
  }
  
  /**
   * Get available model tiers
   */
  getModelTiers(): Record<string, ModelTier> {
    const config = ModelRegistry.getModelConfig('image-generation')
    return config?.tiers || {}
  }
  
  /**
   * Get current model tier
   */
  getCurrentTier(): ModelTier | undefined {
    const tierId = this.getOption('modelTier') as string || 'balanced'
    return ModelRegistry.getModelTier('image-generation', tierId)
  }
  
  /**
   * Set model tier
   */
  setModelTier(tierId: string): void {
    const tiers = this.getModelTiers()
    if (tiers[tierId]) {
      this.setOption('modelTier', tierId)
      this.preferencesManager.setToolModelTier('image-generation', tierId)
    }
  }
  
  /**
   * Execute image generation
   * Overloaded to support both UI usage (no params) and adapter usage (with params)
   */
  async execute(): Promise<void>
  async execute(options: ImageGenerationOptions): Promise<import('@/lib/editor/objects/types').CanvasObject>
  async execute(options?: ImageGenerationOptions): Promise<void | import('@/lib/editor/objects/types').CanvasObject> {
    if (!this.replicateService) {
      const error = 'Replicate service not initialized'
      console.error(`[ImageGenerationTool] ${error}`)
      if (options) throw new Error(error)
      return
    }
    
    // Determine parameters - use provided options or tool settings
    const prompt = options?.prompt || (this.getOption('prompt') as string)
    const width = options?.width || (this.getOption('width') as number) || 1024
    const height = options?.height || (this.getOption('height') as number) || 1024
    const negativePrompt = options?.negativePrompt || ''
    
    if (!prompt) {
      const error = 'No prompt provided'
      console.warn(`[ImageGenerationTool] ${error}`)
      if (options) throw new Error(error)
      return
    }
    
    const canvas = this.getCanvas()
    
    // Get model tier from options or tool settings
    const tierName = options?.modelTier || (this.getOption('modelTier') as string) || 'balanced'
    const tier = ModelRegistry.getModelTier('image-generation', tierName) || this.getCurrentTier()
    
    if (!tier) {
      const error = 'No model tier selected'
      console.error(`[ImageGenerationTool] ${error}`)
      if (options) throw new Error(error)
      return
    }
    
    const taskId = `${this.id}-${Date.now()}`
    
    try {
      this.eventBus.emit('ai.processing.started', {
        operationId: taskId,
        type: 'image-generation',
        metadata: {
          toolId: this.id,
          description: `Generating image: ${prompt}`
        }
      })
      
      console.log(`[ImageGenerationTool] Generating image with ${tier.name}...`)
      console.log(`Prompt: ${prompt}`)
      console.log(`Estimated cost: $${tier.cost}`)
      
      // Generate image using the selected model
      const imageData = await this.replicateService.generateImage(prompt, tier.modelId as `${string}/${string}`, {
        width,
        height,
        negative_prompt: negativePrompt,
        // Add model-specific parameters
        ...(tier.id === 'fast' ? { num_inference_steps: 4 } : {}),
        ...(tier.id === 'best' ? { num_inference_steps: 50, guidance_scale: 7.5 } : {})
      })
      
      // Determine position
      let x: number, y: number
      if (options?.position?.x !== undefined && options?.position?.y !== undefined) {
        x = options.position.x
        y = options.position.y
      } else {
        // Center in viewport
        const viewport = canvas.getViewportBounds()
        x = viewport.x + (viewport.width - imageData.naturalWidth) / 2
        y = viewport.y + (viewport.height - imageData.naturalHeight) / 2
      }
      
      // Add to canvas
      const objectId = await this.createNewObject('image', {
        x,
        y,
        data: imageData,
        width: imageData.naturalWidth,
        height: imageData.naturalHeight,
        metadata: {
          source: 'ai-generation',
          prompt,
          modelUsed: tier.name,
          modelId: tier.modelId,
          cost: tier.cost,
          aiGenerated: true,
          generatedAt: new Date().toISOString()
        }
      })
      
      // Select the new object
      canvas.selectObject(objectId)
      
      console.log('[ImageGenerationTool] Image generated successfully')
      
      this.eventBus.emit('ai.processing.completed', {
        operationId: taskId,
        result: {
          toolId: this.id,
          success: true,
          affectedObjectIds: [objectId]
        },
        metadata: {
          toolId: this.id
        }
      })
      
      // Return the object for adapter use, or void for UI use
      if (options) {
        const createdObject = canvas.getObject(objectId)
        if (!createdObject) {
          throw new Error('Failed to create image object')
        }
        return createdObject
      }
    } catch (error) {
      console.error('[ImageGenerationTool] Failed to generate image:', error)
      this.eventBus.emit('ai.processing.failed', {
        operationId: taskId,
        error: error instanceof Error ? error.message : 'Image generation failed',
        metadata: {
          toolId: this.id
        }
      })
      
      if (options) {
        throw error
      }
    }
  }



  /**
   * Get tool-specific UI options
   */
  getUIOptions() {
    return {
      prompt: {
        type: 'text' as const,
        label: 'Prompt',
        placeholder: 'Describe the image you want to generate...',
        multiline: true
      },
      modelTier: {
        type: 'model-selector' as const,
        label: 'Quality',
        tiers: this.getModelTiers()
      },
      width: {
        type: 'number' as const,
        label: 'Width',
        min: 512,
        max: 2048,
        step: 64
      },
      height: {
        type: 'number' as const,
        label: 'Height', 
        min: 512,
        max: 2048,
        step: 64
      }
    }
  }
} 