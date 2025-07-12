import { Sparkles } from 'lucide-react'
import { ObjectTool } from '@/lib/editor/tools/base/ObjectTool'
import type { CanvasObject } from '@/lib/editor/objects/types'
import type { ToolEvent } from '@/lib/editor/canvas/types'
import { ReplicateService } from '@/lib/ai/services/replicate'
import { ModelRegistry } from '@/lib/ai/models/ModelRegistry'
import type { ToolDependencies, ToolOptions } from '@/lib/editor/tools/base/BaseTool'

interface FaceEnhancementOptions extends ToolOptions {
  enhancementScale: { type: 'number'; default: number; min: 1; max: 4 }
  autoDetect: { type: 'boolean'; default: boolean }
}

/**
 * Face Enhancement Tool - AI-powered face enhancement
 * Uses Replicate's GFPGAN model to enhance faces in images
 */
export class FaceEnhancementTool extends ObjectTool<FaceEnhancementOptions> {
  // Tool identification
  id = 'face-enhancement'
  name = 'Face Enhancement'
  icon = Sparkles
  cursor = 'crosshair'
  
  // Service
  private replicateService: ReplicateService | null = null
  private isProcessing = false
  
  constructor(dependencies: ToolDependencies) {
    super(dependencies)
  }

  protected getOptionDefinitions(): FaceEnhancementOptions {
    return {
      enhancementScale: { type: 'number', default: 2, min: 1, max: 4 },
      autoDetect: { type: 'boolean', default: true }
    }
  }

  protected async setupTool(): Promise<void> {
    // Initialize Replicate service (automatically handles server/client routing)
    try {
      this.replicateService = new ReplicateService()
    } catch (error) {
      console.error('[FaceEnhancementTool] Failed to initialize Replicate service:', error)
    }
  }
  
  protected async cleanupTool(): Promise<void> {
    this.replicateService = null
    this.isProcessing = false
  }

  protected handleMouseDown(event: ToolEvent): void {
    if (!this.replicateService) {
      console.error('[FaceEnhancementTool] Replicate service not initialized')
      return
    }
    
    if (this.isProcessing) {
      console.warn('[FaceEnhancementTool] Already processing')
      return
    }
    
    const canvas = this.getCanvas()
    const point = event.point
    
    // Find which object was clicked
    this.getObjectAtPoint(point).then(clickedObject => {
      if (!clickedObject || clickedObject.type !== 'image') {
        console.warn('[FaceEnhancementTool] Click on an image to enhance faces')
        return
      }
      
      // Select the object if not already selected
      if (!canvas.state.selectedObjectIds.has(clickedObject.id)) {
        canvas.selectObject(clickedObject.id)
      }
      
      // Enhance the face
      this.enhanceFace(clickedObject)
    })
  }

  protected handleMouseMove(_event: ToolEvent): void {
    // No mouse move handling for face enhancement
  }

  protected handleMouseUp(_event: ToolEvent): void {
    // No mouse up handling for face enhancement
  }
  
  /**
   * Enhance faces in the selected object
   */
  async enhanceFace(object: CanvasObject): Promise<void> {
    if (!this.replicateService || object.type !== 'image') return
    
    this.isProcessing = true
    const canvas = this.getCanvas()
    
    const taskId = `${this.id}-${Date.now()}`
    this.dependencies.eventBus.emit('ai.processing.started', {
      operationId: taskId,
      type: 'face-enhancement',
      metadata: {
        toolId: this.id,
        description: 'Enhancing faces with AI',
        targetObjectIds: [object.id]
      }
    })
    
    try {
      // Update object to show processing state
      await canvas.updateObject(object.id, {
        metadata: {
          ...object.metadata,
          isProcessing: true,
          processingType: 'face-enhancement'
        }
      })
      
      // Get image data from object
      const replicateImageData = await this.getObjectImageDataForReplicate(object)
      if (!replicateImageData) {
        throw new Error('Could not get image data from object')
      }
      
      // Get model configuration
      const modelConfig = ModelRegistry.getModelConfig('face-enhancement')
      const tier = modelConfig?.tiers[modelConfig.defaultTier]
      if (!tier) {
        throw new Error('Face enhancement model not configured')
      }
      
      // Enhance face using Replicate
      const enhancedImageData = await this.replicateService.enhanceFace(replicateImageData, tier.modelId as `${string}/${string}`)
      
      // Update the object with enhanced image
      await canvas.updateObject(object.id, {
        data: {
          element: enhancedImageData.element,
          naturalWidth: enhancedImageData.naturalWidth,
          naturalHeight: enhancedImageData.naturalHeight
        } as import('@/lib/editor/objects/types').ImageData,
        metadata: {
          ...object.metadata,
          isProcessing: false,
          lastEnhancement: new Date().toISOString(),
          enhancementScale: this.getOption('enhancementScale')
        }
      })
      
      // Emit success events
      this.dependencies.eventBus.emit('ai.face.enhanced', {
        operationId: taskId,
        imageId: object.id,
        enhancementType: 'face-enhancement',
        result: {
          success: true,
          enhancementScale: this.getOption('enhancementScale') as number
        }
      })
      
      this.dependencies.eventBus.emit('ai.processing.completed', {
        operationId: taskId,
        result: {
          success: true,
          affectedObjectIds: [object.id]
        },
        metadata: {
          toolId: this.id
        }
      })
      
    } catch (error) {
      console.error('[FaceEnhancementTool] Enhancement failed:', error)
      
      // Update object to remove processing state
      await canvas.updateObject(object.id, {
        metadata: {
          ...object.metadata,
          isProcessing: false,
          lastError: error instanceof Error ? error.message : 'Enhancement failed'
        }
      })
      
      // Emit error events
      this.dependencies.eventBus.emit('ai.face.error', {
        operationId: taskId,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          toolId: this.id,
          objectId: object.id,
          enhancementScale: this.getOption('enhancementScale') as number
        }
      })
      
      this.dependencies.eventBus.emit('ai.processing.failed', {
        operationId: taskId,
        error: error instanceof Error ? error.message : 'Face enhancement failed',
        metadata: {
          toolId: this.id
        }
      })
    } finally {
      this.isProcessing = false
    }
  }
  
  /**
   * Get object at a specific point
   */
  private async getObjectAtPoint(point: { x: number; y: number }): Promise<CanvasObject | null> {
    const canvas = this.getCanvas()
    const objects = canvas.getAllObjects()
    
    // Check objects in reverse order (top to bottom)
    for (let i = objects.length - 1; i >= 0; i--) {
      const obj = objects[i]
      if (obj.type === 'image' && 
          point.x >= obj.x && point.x <= obj.x + obj.width &&
          point.y >= obj.y && point.y <= obj.y + obj.height) {
        return obj
      }
    }
    
    return null
  }
  
  /**
   * Get image data for Replicate from a canvas object
   */
  private async getObjectImageDataForReplicate(object: CanvasObject): Promise<import('@/lib/ai/services/replicate').ImageData | null> {
    if (object.type !== 'image') return null
    
    const imageData = object.data as import('@/lib/editor/objects/types').ImageData
    if (!imageData.element) return null
    
    return {
      element: imageData.element,
      naturalWidth: imageData.naturalWidth,
      naturalHeight: imageData.naturalHeight
    }
  }
  
  /**
   * Apply face enhancement with context (for AI adapter use)
   */
  async applyWithContext(
    targetObject?: CanvasObject,
    options?: {
      scale?: number
    }
  ): Promise<void> {
    const object = targetObject || this.getTargetObject()
    if (!object || object.type !== 'image') {
      throw new Error('Face enhancement requires an image object')
    }
    
    // Set options if provided
    if (options?.scale) {
      this.setOption('enhancementScale', options.scale)
    }
    
    await this.enhanceFace(object)
  }
} 