import { ObjectTool } from '@/lib/editor/tools/base/ObjectTool'
import { Image } from 'lucide-react'
import { ReplicateService } from '@/lib/ai/services/replicate'
import { ModelRegistry } from '@/lib/ai/models/ModelRegistry'
import { ModelPreferencesManager } from '@/lib/settings/ModelPreferences'
import type { ModelTier } from '@/lib/plugins/types'
import { TypedEventBus } from '@/lib/events/core/TypedEventBus'

export class ImageGenerationTool extends ObjectTool {
  id = 'ai-image-generation'
  name = 'AI Image Generation'
  icon = Image
  cursor = 'crosshair'
  shortcut = 'G'
  
  private replicateService: ReplicateService | null = null
  private preferencesManager = ModelPreferencesManager.getInstance()
  private eventBus = new TypedEventBus()
  
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
  
  async execute(): Promise<void> {
    if (!this.replicateService) {
      console.error('[ImageGenerationTool] Service not initialized')
      return
    }
    
    const prompt = this.getOption('prompt') as string
    if (!prompt) {
      console.warn('[ImageGenerationTool] No prompt provided')
      return
    }
    
    const canvas = this.getCanvas()
    const tier = this.getCurrentTier()
    
    if (!tier) {
      console.error('[ImageGenerationTool] No model tier selected')
      return
    }
    
    const taskId = `${this.id}-${Date.now()}`
    
    try {
      this.eventBus.emit('ai.processing.started', {
        taskId,
        toolId: this.id,
        description: `Generating image: ${prompt}`
      })
      
      console.log(`[ImageGenerationTool] Generating image with ${tier.name}...`)
      console.log(`Prompt: ${prompt}`)
      console.log(`Estimated cost: $${tier.cost}`)
      
      // Generate image using the selected model
      const imageData = await this.replicateService.generateImage(prompt, tier.modelId as `${string}/${string}`, {
        width: this.getOption('width') as number,
        height: this.getOption('height') as number,
        // Add model-specific parameters
        ...(tier.id === 'fast' ? { num_inference_steps: 4 } : {}),
        ...(tier.id === 'best' ? { num_inference_steps: 50, guidance_scale: 7.5 } : {})
      })
      
      // Add to canvas
      const objectId = await this.createNewObject('image', {
        data: imageData,
        width: imageData.naturalWidth,
        height: imageData.naturalHeight,
        metadata: {
          source: 'ai-generation',
          prompt,
          modelUsed: tier.name,
          modelId: tier.modelId,
          cost: tier.cost
        }
      })
      
      // Select the new object
      canvas.selectObject(objectId)
      
      console.log('[ImageGenerationTool] Image generated successfully')
      
      this.eventBus.emit('ai.processing.completed', {
        taskId,
        toolId: this.id,
        success: true,
        affectedObjectIds: [objectId]
      })
    } catch (error) {
      console.error('[ImageGenerationTool] Failed to generate image:', error)
      this.eventBus.emit('ai.processing.failed', {
        taskId,
        toolId: this.id,
        error: error instanceof Error ? error.message : 'Image generation failed'
      })
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