import { Sparkles } from 'lucide-react'
import { ObjectTool } from '@/lib/editor/tools/base/ObjectTool'
import type { CanvasObject } from '@/lib/editor/objects/types'
import type { ToolEvent } from '@/lib/editor/canvas/types'
import { ReplicateService } from '@/lib/ai/services/replicate'
// import { TOOL_IDS } from '@/constants'

/**
 * Face Enhancement Tool - AI-powered face enhancement
 * Uses Replicate's GFPGAN model to enhance faces in images
 */
export class FaceEnhancementTool extends ObjectTool {
  // Tool identification
  id = 'face-enhancement'
  name = 'Face Enhancement'
  icon = Sparkles
  cursor = 'crosshair'
  
  // Service
  private replicateService: ReplicateService | null = null
  private isProcessing = false
  
  protected setupTool(): void {
    // Initialize Replicate service
    const apiKey = process.env.NEXT_PUBLIC_REPLICATE_API_TOKEN
    if (apiKey) {
      this.replicateService = new ReplicateService(apiKey)
    } else {
      console.error('[FaceEnhancementTool] No Replicate API key found')
    }
    
    // Set default options
    this.setOption('enhancementScale', 2) // 1-4, higher = better quality but slower
    this.setOption('autoDetect', true) // Automatically detect and enhance all faces
  }
  
  protected cleanupTool(): void {
    this.replicateService = null
    this.isProcessing = false
  }
  
  async onMouseDown(event: ToolEvent): Promise<void> {
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
    const clickedObject = await this.getObjectAtPoint(point)
    
    if (!clickedObject || clickedObject.type !== 'image') {
      console.warn('[FaceEnhancementTool] Click on an image to enhance faces')
      return
    }
    
    // Select the object if not already selected
    if (!canvas.state.selectedObjectIds.has(clickedObject.id)) {
      canvas.selectObject(clickedObject.id)
    }
    
    // Enhance the face
    await this.enhanceFace(clickedObject)
  }
  
  /**
   * Enhance faces in the selected object
   */
  async enhanceFace(object: CanvasObject): Promise<void> {
    if (!this.replicateService || object.type !== 'image') return
    
    this.isProcessing = true
    const canvas = this.getCanvas()
    
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
      
      // Enhance face using Replicate
      const enhancedImageData = await this.replicateService.enhanceFace(replicateImageData)
      
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
      
      // Emit success event
      if (this.executionContext) {
        await this.executionContext.emit({
          type: 'ai.face.enhanced',
          objectId: object.id,
          scale: this.getOption('enhancementScale')
        } as { type: string; objectId: string; scale: unknown })
      }
      
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
      
      // Emit error event
      if (this.executionContext) {
        await this.executionContext.emit({
          type: 'ai.face.error',
          objectId: object.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        } as any)
      }
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
      if (!obj.visible || obj.locked) continue
      
      // Check if point is within object bounds
      if (point.x >= obj.x && point.x <= obj.x + obj.width &&
          point.y >= obj.y && point.y <= obj.y + obj.height) {
        return obj
      }
    }
    
    return null
  }
  
  /**
   * Get image data from an object for Replicate
   */
  private async getObjectImageDataForReplicate(object: CanvasObject): Promise<import('@/lib/ai/services/replicate').ImageData | null> {
    if (object.type !== 'image') return null
    
    // Get the image data
    const imageData = object.data as unknown as import('@/lib/editor/objects/types').ImageData
    if (!imageData || !imageData.element) return null
    
    return {
      element: imageData.element,
      naturalWidth: imageData.naturalWidth,
      naturalHeight: imageData.naturalHeight
    }
  }
  
  /**
   * Convert ImageData to HTMLImageElement
   */
  private async imageDataToImage(imageData: ImageData): Promise<HTMLImageElement> {
    // Create canvas and draw image data
    const canvas = document.createElement('canvas')
    canvas.width = imageData.width
    canvas.height = imageData.height
    const ctx = canvas.getContext('2d')!
    ctx.putImageData(imageData, 0, 0)
    
    // Convert to blob and create image
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to create blob'))
          return
        }
        
        const url = URL.createObjectURL(blob)
        const img = new Image()
        img.onload = () => {
          URL.revokeObjectURL(url)
          resolve(img)
        }
        img.onerror = () => {
          URL.revokeObjectURL(url)
          reject(new Error('Failed to load image'))
        }
        img.src = url
      })
    })
  }
  
  /**
   * Apply face enhancement for AI operations
   */
  async applyWithContext(
    targetObject?: CanvasObject,
    options?: {
      scale?: number
    }
  ): Promise<void> {
    if (!this.replicateService) {
      throw new Error('Replicate service not initialized')
    }
    
    // Set options if provided
    if (options?.scale !== undefined) {
      this.setOption('enhancementScale', options.scale)
    }
    
    // Get target object
    const target = targetObject || this.getTargetObject()
    if (!target || target.type !== 'image') {
      throw new Error('Face enhancement requires an image object')
    }
    
    // Enhance the face
    await this.enhanceFace(target)
  }
}

// Export singleton instance
export const faceEnhancementTool = new FaceEnhancementTool() 