import { PaintBucket } from 'lucide-react'
import { ObjectTool } from '@/lib/editor/tools/base/ObjectTool'
import type { CanvasObject } from '@/lib/editor/objects/types'
import type { ToolEvent } from '@/lib/editor/canvas/types'
import { ReplicateService } from '@/lib/ai/services/replicate'
import { TypedEventBus } from '@/lib/events/core/TypedEventBus'
import { ModelRegistry } from '@/lib/ai/models/ModelRegistry'
import Konva from 'konva'

/**
 * Inpainting Tool - AI-powered intelligent fill
 * Uses Replicate's Stable Diffusion Inpainting to fill masked areas
 */
export class InpaintingTool extends ObjectTool {
  // Tool identification
  id = 'inpainting'
  name = 'AI Inpainting'
  icon = PaintBucket
  cursor = 'crosshair'
  
  // Service and state
  private replicateService: ReplicateService | null = null
  private isProcessing = false
  private maskCanvas: HTMLCanvasElement | null = null
  private maskContext: CanvasRenderingContext2D | null = null
  private isDrawingMask = false
  private maskGroup: Konva.Group | null = null
  private eventBus = new TypedEventBus()
  
  protected setupTool(): void {
    // Initialize Replicate service (automatically handles server/client routing)
    try {
      this.replicateService = new ReplicateService()
    } catch (error) {
      console.error('[InpaintingTool] Failed to initialize Replicate service:', error)
    }
    
    // Create mask canvas
    this.maskCanvas = document.createElement('canvas')
    this.maskContext = this.maskCanvas.getContext('2d')!
    
    // Set default options
    this.setOption('prompt', '') // What to fill the area with
    this.setOption('brushSize', 20)
    this.setOption('mode', 'draw') // 'draw' or 'selection' (use existing selection)
  }
  
  protected cleanupTool(): void {
    this.cleanupMask()
    this.replicateService = null
    this.isProcessing = false
    this.maskCanvas = null
    this.maskContext = null
  }
  
  async onMouseDown(event: ToolEvent): Promise<void> {
    if (!this.replicateService || this.isProcessing) return
    
    const canvas = this.getCanvas()
    const point = event.point
    const mode = this.getOption('mode') as string
    
    if (mode === 'draw') {
      // Start drawing mask
      const targetObject = this.getTargetObject()
      if (!targetObject || targetObject.type !== 'image') {
        console.warn('[InpaintingTool] Select an image object first')
        return
      }
      
      this.startMaskDrawing(targetObject, point)
    } else {
      // Use existing selection
      const selectionManager = canvas.getSelectionManager()
      const selection = selectionManager.getSelection()
      
      if (!selection) {
        console.warn('[InpaintingTool] No selection found. Create a selection or use draw mode')
        return
      }
      
      const targetObject = this.getTargetObject()
      if (!targetObject || targetObject.type !== 'image') {
        console.warn('[InpaintingTool] Select an image object to inpaint')
        return
      }
      
      // Apply inpainting with selection as mask
      await this.applyInpainting(targetObject, selection.mask)
    }
  }
  
  onMouseMove(event: ToolEvent): void {
    if (!this.isDrawingMask || !this.maskContext || !this.maskGroup) return
    
    const canvas = this.getCanvas()
    const stage = canvas.stage
    const overlayLayer = stage.children[2] as Konva.Layer
    
    // Draw on mask
    const brushSize = this.getOption('brushSize') as number
    const targetObject = this.getTargetObject()!
    
    // Convert to object-relative coordinates
    const relX = event.point.x - targetObject.x
    const relY = event.point.y - targetObject.y
    
    // Draw on mask canvas
    this.maskContext.fillStyle = 'white'
    this.maskContext.beginPath()
    this.maskContext.arc(relX, relY, brushSize / 2, 0, Math.PI * 2)
    this.maskContext.fill()
    
    // Visual feedback
    const circle = new Konva.Circle({
      x: event.point.x,
      y: event.point.y,
      radius: brushSize / 2,
      fill: 'rgba(255, 0, 0, 0.5)',
      listening: false
    })
    
    this.maskGroup.add(circle)
    overlayLayer.batchDraw()
  }
  
  async onMouseUp(): Promise<void> {
    if (!this.isDrawingMask || !this.maskCanvas) return
    
    this.isDrawingMask = false
    
    const targetObject = this.getTargetObject()
    if (!targetObject) return
    
    // Get mask image data
    const maskData = this.maskContext!.getImageData(
      0, 0, 
      this.maskCanvas.width, 
      this.maskCanvas.height
    )
    
    // Apply inpainting
    await this.applyInpainting(targetObject, maskData)
    
    // Clean up mask
    this.cleanupMask()
  }
  
  /**
   * Start drawing mask
   */
  private startMaskDrawing(object: CanvasObject, startPoint: { x: number; y: number }): void {
    const canvas = this.getCanvas()
    const stage = canvas.stage
    const overlayLayer = stage.children[2] as Konva.Layer
    
    // Set up mask canvas
    this.maskCanvas!.width = object.width
    this.maskCanvas!.height = object.height
    this.maskContext!.fillStyle = 'black'
    this.maskContext!.fillRect(0, 0, object.width, object.height)
    
    // Create visual group
    this.maskGroup = new Konva.Group({ name: 'inpaintingMask' })
    overlayLayer.add(this.maskGroup)
    
    // Start drawing
    this.isDrawingMask = true
    
    // Draw initial point
    const brushSize = this.getOption('brushSize') as number
    const relX = startPoint.x - object.x
    const relY = startPoint.y - object.y
    
    this.maskContext!.fillStyle = 'white'
    this.maskContext!.beginPath()
    this.maskContext!.arc(relX, relY, brushSize / 2, 0, Math.PI * 2)
    this.maskContext!.fill()
  }
  
  /**
   * Apply inpainting to object
   */
  private async applyInpainting(object: CanvasObject, maskData: ImageData): Promise<void> {
    if (!this.replicateService || object.type !== 'image') return
    
    const prompt = this.getOption('prompt') as string
    if (!prompt) {
      console.error('[InpaintingTool] Please provide a prompt describing what to fill')
      return
    }
    
    this.isProcessing = true
    const canvas = this.getCanvas()
    
    const taskId = `${this.id}-${Date.now()}`
    this.eventBus.emit('ai.processing.started', {
      taskId,
      toolId: this.id,
      description: `Inpainting with prompt: ${prompt}`,
      targetObjectIds: [object.id]
    })
    
    try {
      // Update object to show processing state
      await canvas.updateObject(object.id, {
        metadata: {
          ...object.metadata,
          isProcessing: true,
          processingType: 'inpainting'
        }
      })
      
      // Get image data
      const imageData = await this.getObjectImageDataForReplicate(object)
      if (!imageData) {
        throw new Error('Could not get image data from object')
      }
      
      // Convert mask to Replicate format
      const maskReplicateData = await this.maskToReplicateFormat(maskData, object)
      
      // Get model configuration
      const modelConfig = ModelRegistry.getModelConfig('inpainting')
      const tier = modelConfig?.tiers[modelConfig.defaultTier]
      if (!tier) {
        throw new Error('Inpainting model not configured')
      }
      
      // Apply inpainting
      const result = await this.replicateService.inpaint(
        imageData,
        maskReplicateData,
        prompt,
        tier.modelId as `${string}/${string}`
      )
      
      // Update object with result
      await canvas.updateObject(object.id, {
        data: {
          element: result.element,
          naturalWidth: result.naturalWidth,
          naturalHeight: result.naturalHeight
        } as import('@/lib/editor/objects/types').ImageData,
        metadata: {
          ...object.metadata,
          isProcessing: false,
          lastInpainting: new Date().toISOString(),
          inpaintingPrompt: prompt
        }
      })
      
      // Emit success events
      this.eventBus.emit('ai.inpainting.completed', {
        taskId,
        toolId: this.id,
        objectId: object.id,
        prompt,
        success: true,
        maskArea: {
          x: 0,
          y: 0,
          width: maskData.width,
          height: maskData.height
        }
      })
      
      this.eventBus.emit('ai.processing.completed', {
        taskId,
        toolId: this.id,
        success: true,
        affectedObjectIds: [object.id]
      })
      
    } catch (error) {
      console.error('[InpaintingTool] Inpainting failed:', error)
      
      // Update object to remove processing state
      await canvas.updateObject(object.id, {
        metadata: {
          ...object.metadata,
          isProcessing: false,
          lastError: error instanceof Error ? error.message : 'Inpainting failed'
        }
      })
      
      this.eventBus.emit('ai.processing.failed', {
        taskId,
        toolId: this.id,
        error: error instanceof Error ? error.message : 'Inpainting failed'
      })
      
    } finally {
      this.isProcessing = false
    }
  }
  
  /**
   * Get image data for Replicate
   */
  private async getObjectImageDataForReplicate(object: CanvasObject): Promise<import('@/lib/ai/services/replicate').ImageData | null> {
    if (object.type !== 'image') return null
    
    const imageData = object.data as unknown as import('@/lib/editor/objects/types').ImageData
    if (!imageData || !imageData.element) return null
    
    return {
      element: imageData.element,
      naturalWidth: imageData.naturalWidth,
      naturalHeight: imageData.naturalHeight
    }
  }
  
  /**
   * Convert mask ImageData to Replicate format
   */
  private async maskToReplicateFormat(
    maskData: ImageData, 
    object: CanvasObject
  ): Promise<import('@/lib/ai/services/replicate').ImageData> {
    // Create canvas for mask
    const maskCanvas = document.createElement('canvas')
    maskCanvas.width = object.width
    maskCanvas.height = object.height
    const ctx = maskCanvas.getContext('2d')!
    
    // Put mask data
    ctx.putImageData(maskData, 0, 0)
    
    return {
      element: maskCanvas,
      naturalWidth: object.width,
      naturalHeight: object.height
    }
  }
  
  /**
   * Clean up mask visualization
   */
  private cleanupMask(): void {
    if (this.maskGroup) {
      this.maskGroup.destroy()
      this.maskGroup = null
      
      const canvas = this.getCanvas()
      const stage = canvas.stage
      const overlayLayer = stage.children[2] as Konva.Layer
      overlayLayer.batchDraw()
    }
    
    if (this.maskContext) {
      this.maskContext.clearRect(0, 0, this.maskCanvas!.width, this.maskCanvas!.height)
    }
  }
  
  /**
   * Apply inpainting for AI operations
   */
  async applyWithContext(
    prompt: string,
    targetObject?: CanvasObject,
    maskData?: ImageData
  ): Promise<void> {
    if (!this.replicateService) {
      throw new Error('Replicate service not initialized')
    }
    
    // Set prompt
    this.setOption('prompt', prompt)
    
    // Get target object
    const target = targetObject || this.getTargetObject()
    if (!target || target.type !== 'image') {
      throw new Error('Inpainting requires an image object')
    }
    
    // Get or create mask
    if (!maskData) {
      // Use current selection if available
      const canvas = this.getCanvas()
      const selectionManager = canvas.getSelectionManager()
      const selection = selectionManager.getSelection()
      
      if (!selection || !selection.mask) {
        throw new Error('No mask provided and no selection found')
      }
      
      maskData = selection.mask
    }
    
    // Apply inpainting
    await this.applyInpainting(target, maskData)
  }
}

// Export singleton instance
export const inpaintingTool = new InpaintingTool() 