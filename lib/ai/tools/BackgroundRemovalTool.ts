import { ObjectTool } from '@/lib/editor/tools/base/ObjectTool'
import { ReplicateService } from '@/lib/ai/services/replicate'
import type { CanvasObject } from '@/lib/editor/objects/types'
import { Eraser } from 'lucide-react'
import { ModelPreferencesManager } from '@/lib/settings/ModelPreferences'
import { TypedEventBus } from '@/lib/events/core/TypedEventBus'

import type { ImageData as ReplicateImageData } from '@/lib/ai/services/replicate'

export interface BackgroundRemovalOptions {
  modelTier?: 'best' | 'fast'
  createNewObject?: boolean
}

export class BackgroundRemovalTool extends ObjectTool {
  id = 'background-removal'
  name = 'Background Removal'
  icon = Eraser
  cursor = 'crosshair'
  shortcut = 'B'
  
  private replicateService = new ReplicateService()
  
  constructor(
    private preferencesManager: ModelPreferencesManager,
    private eventBus: TypedEventBus
  ) {
    super()
  }
  
  protected setupTool(): void {
    // Set default options from user preferences
    const defaultTier = this.preferencesManager.getToolModelTier('backgroundRemoval')
    this.setOption('modelTier', defaultTier)
    this.setOption('createNewObject', false)
  }
  
  protected cleanupTool(): void {
    // Cleanup if needed
  }
  
  /**
   * Get available model tiers
   */
  getModelTiers() {
    return [
      { 
        id: 'best', 
        modelId: 'meta/sam-2-large:1234567890abcdef', 
        name: 'SAM 2 Large', 
        cost: 0.003,
        quality: 'exceptional - handles hair and complex edges'
      },
      { 
        id: 'fast', 
        modelId: 'cjwbw/rembg:fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003', 
        name: 'RemBG', 
        cost: 0.0005,
        quality: 'good - fast for clean backgrounds'
      }
    ]
  }
  
  /**
   * Get current model tier
   */
  getCurrentTier() {
    const tierId = this.getOption('modelTier') as string || 'best'
    const tiers = this.getModelTiers()
    return tiers.find(t => t.id === tierId) || tiers[0]
  }
  
  /**
   * Set model tier and save preference
   */
  setModelTier(tierId: string): void {
    this.setOption('modelTier', tierId)
    this.preferencesManager.setToolModelTier('backgroundRemoval', tierId)
  }
  
  async execute(): Promise<void> {
    const canvas = this.getCanvas()
    if (!canvas) return
    
    const selectedObjects = this.getTargetObjects()
    if (selectedObjects.length === 0) {
      console.warn('[BackgroundRemovalTool] No objects selected')
      return
    }
    
    // Process each selected object
    for (const object of selectedObjects) {
      if (object.type === 'image') {
        await this.removeBackground(object)
      }
    }
  }
  
  private async removeBackground(object: CanvasObject): Promise<void> {
    if (!this.replicateService) {
      console.error('[BackgroundRemovalTool] Service not initialized')
      return
    }
    
    try {
      const operationId = `${this.id}-${Date.now()}`
      this.eventBus.emit('ai.processing.started', {
        operationId,
        type: 'background-removal',
        metadata: {
          toolId: this.id,
          description: 'Removing background with AI',
          targetObjectIds: [object.id]
        }
      })
      
      // Get the current model tier
      const tier = this.getCurrentTier()
      if (!tier) {
        throw new Error('No model tier selected')
      }
      
      // Show progress with model info
      console.log(`[BackgroundRemovalTool] Removing background using ${tier.name}...`)
      
      // Get image data
      const imageData = await this.getImageDataFromObject(object)
      
      // Process based on selected model
      let processedData: import('@/lib/ai/services/replicate').ImageData
      
      if (tier.modelId.includes('rembg')) {
        // Fast RemBG model
        processedData = await this.replicateService.removeBackground(imageData, tier.modelId as `${string}/${string}`)
      } else if (tier.modelId.includes('sam-2')) {
        // Best quality SAM 2 model
        processedData = await this.replicateService.removeBackground(imageData, tier.modelId as `${string}/${string}`)
      } else {
        // Fallback to default
        processedData = await this.replicateService.removeBackground(imageData, tier.modelId as `${string}/${string}`)
      }
      
      // Create processed image element
      const processedImage = processedData.element as HTMLImageElement
      
      const canvas = this.getCanvas()
      
      if (this.getOption('createNewObject')) {
        // Create new object with removed background
        await canvas.addObject({
          type: 'image',
          x: object.x + 20,
          y: object.y + 20,
          width: object.width,
          height: object.height,
          scaleX: object.scaleX,
          scaleY: object.scaleY,
          data: {
            element: processedImage,
            naturalWidth: processedData.naturalWidth,
            naturalHeight: processedData.naturalHeight
          },
          metadata: {
            source: 'background-removal',
            originalObjectId: object.id,
            modelUsed: tier.name,
            cost: tier.cost
          }
        })
      } else {
        // Update existing object
        await canvas.updateObject(object.id, {
          data: {
            element: processedImage,
            naturalWidth: processedData.naturalWidth,
            naturalHeight: processedData.naturalHeight
          },
          metadata: {
            ...object.metadata,
            backgroundRemoved: true,
            modelUsed: tier.name,
            cost: tier.cost
          }
        })
      }
      
      console.log('[BackgroundRemovalTool] Background removed successfully')
      
      this.eventBus.emit('ai.processing.completed', {
        operationId,
        metadata: {
          toolId: this.id,
          success: true,
          affectedObjectIds: [object.id]
        }
      })
    } catch (error) {
      console.error('[BackgroundRemovalTool] Failed to remove background:', error)
      this.eventBus.emit('ai.processing.failed', {
        operationId: `${this.id}-${Date.now()}`,
        error: error instanceof Error ? error.message : 'Background removal failed',
        metadata: {
          toolId: this.id
        }
      })
    }
  }
  
  private async getImageDataFromObject(_object: CanvasObject): Promise<ReplicateImageData> {
    // This is a placeholder - actual implementation would extract ImageData from the canvas object
    // For now, return mock data
    const canvas = document.createElement('canvas')
    canvas.width = 100
    canvas.height = 100
    
    return {
      element: canvas,
      naturalWidth: 100,
      naturalHeight: 100
    }
  }
  
  private async createImageElement(imageData: globalThis.ImageData): Promise<HTMLImageElement> {
    // Convert ImageData to Image element
    const canvas = document.createElement('canvas')
    canvas.width = imageData.width
    canvas.height = imageData.height
    const ctx = canvas.getContext('2d')!
    ctx.putImageData(imageData, 0, 0)
    
    const img = new Image()
    return new Promise((resolve, reject) => {
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = canvas.toDataURL()
    })
  }
} 