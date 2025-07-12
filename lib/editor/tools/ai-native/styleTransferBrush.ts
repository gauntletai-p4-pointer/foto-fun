import { ObjectTool } from '../base/ObjectTool'
import type { ToolEvent } from '@/lib/editor/canvas/types'
import type { CanvasObject } from '@/lib/editor/objects/types'
import { ReplicateService } from '@/lib/ai/services/replicate'
import type { ToolDependencies, ToolOptions } from '@/lib/editor/tools/base/BaseTool'
import { isImageObject } from '@/lib/editor/objects/types'
import { StyleTransferBrushIcon } from '@/components/editor/icons/AIToolIcons'

export interface StyleTransferBrushOptions extends ToolOptions {
  brushSize: { type: 'number'; default: number; min: 1; max: 200 }
  style: { type: 'enum'; default: string; enum: string[] }
  strength: { type: 'number'; default: number; min: 0; max: 1 }
  preserveContent: { type: 'number'; default: number; min: 0; max: 1 }
  feather: { type: 'number'; default: number; min: 0; max: 50 }
}

interface BrushStroke {
  points: Array<{ x: number; y: number }>
  size: number
  objectId: string
}

/**
 * Style Transfer Brush - Apply artistic styles to painted areas
 * Supports oil painting, watercolor, pencil sketch, anime, impressionist, and abstract styles
 */
export class StyleTransferBrush extends ObjectTool<StyleTransferBrushOptions> {
  id = 'ai-style-transfer'
  name = 'Style Transfer Brush'
  icon = StyleTransferBrushIcon
  cursor = 'crosshair'
  
  private replicateService: ReplicateService
  protected isDrawing = false
  private currentStroke: BrushStroke | null = null
  private strokeCanvas: HTMLCanvasElement | null = null
  private strokeCtx: CanvasRenderingContext2D | null = null
  
  constructor(dependencies: ToolDependencies) {
    super(dependencies)
    this.replicateService = new ReplicateService()
  }
  
  protected getOptionDefinitions(): StyleTransferBrushOptions {
    return {
      brushSize: { type: 'number', default: 75, min: 1, max: 200 },
      style: { 
        type: 'enum', 
        default: 'oil-painting', 
        enum: ['oil-painting', 'watercolor', 'pencil-sketch', 'anime', 'impressionist', 'abstract'] 
      },
      strength: { type: 'number', default: 0.7, min: 0, max: 1 },
      preserveContent: { type: 'number', default: 0.6, min: 0, max: 1 },
      feather: { type: 'number', default: 15, min: 0, max: 50 }
    }
  }

  protected async setupTool(): Promise<void> {
    this.dependencies.eventBus.emit('tool.message', {
      toolId: this.id,
      type: 'info',
      message: 'Paint on images to apply artistic styles to specific areas'
    })
  }

  protected async cleanupTool(): Promise<void> {
    // Clean up any active strokes
    this.isDrawing = false
    this.currentStroke = null
    this.strokeCanvas = null
    this.strokeCtx = null
  }

  protected handleMouseDown(event: ToolEvent): void {
    const canvas = this.dependencies.canvasManager
    
    // Find the object under the cursor
    const targetObject = canvas.getObjectAtPoint(event.point)
    if (!targetObject || !isImageObject(targetObject)) {
      this.dependencies.eventBus.emit('tool.message', {
        toolId: this.id,
        type: 'info',
        message: 'Click and drag on an image to apply artistic style'
      })
      return
    }
    
    // Initialize stroke
    this.isDrawing = true
    this.currentStroke = {
      points: [event.point],
      size: this.getOption('brushSize') as number,
      objectId: targetObject.id
    }
    
    // Create stroke canvas
    this.strokeCanvas = document.createElement('canvas')
    this.strokeCanvas.width = targetObject.width
    this.strokeCanvas.height = targetObject.height
    this.strokeCtx = this.strokeCanvas.getContext('2d')!
    
    // Start drawing the stroke
    this.drawStrokePoint(event.point, targetObject)
  }

  protected handleMouseMove(event: ToolEvent): void {
    if (!this.isDrawing || !this.currentStroke || !this.strokeCtx) return
    
    const canvas = this.dependencies.canvasManager
    const targetObject = canvas.getObject(this.currentStroke.objectId)
    if (!targetObject) return
    
    // Add point to stroke
    this.currentStroke.points.push(event.point)
    
    // Draw the stroke point
    this.drawStrokePoint(event.point, targetObject)
    
    // Show preview overlay
    this.updatePreview(targetObject)
  }

  protected handleMouseUp(_event: ToolEvent): void {
    if (!this.isDrawing || !this.currentStroke || !this.strokeCanvas) return
    
    this.isDrawing = false
    
    const canvas = this.dependencies.canvasManager
    const targetObject = canvas.getObject(this.currentStroke.objectId)
    if (!targetObject || !isImageObject(targetObject)) return
    
    // Apply the style transfer to the painted area
    this.applyStyleToStroke(targetObject, this.strokeCanvas)
    
    // Clean up
    this.currentStroke = null
    this.strokeCanvas = null
    this.strokeCtx = null
  }

  private drawStrokePoint(point: { x: number; y: number }, targetObject: CanvasObject): void {
    if (!this.strokeCtx) return
    
    const brushSize = this.getOption('brushSize') as number
    const feather = this.getOption('feather') as number
    const relativeX = point.x - targetObject.x
    const relativeY = point.y - targetObject.y
    
    // Draw with feathered brush
    const gradient = this.strokeCtx.createRadialGradient(
      relativeX, relativeY, 0,
      relativeX, relativeY, brushSize / 2
    )
    
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
    gradient.addColorStop(1 - feather / brushSize, 'rgba(255, 255, 255, 1)')
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
    
    this.strokeCtx.globalCompositeOperation = 'source-over'
    this.strokeCtx.fillStyle = gradient
    this.strokeCtx.beginPath()
    this.strokeCtx.arc(relativeX, relativeY, brushSize / 2, 0, Math.PI * 2)
    this.strokeCtx.fill()
  }

  private updatePreview(_targetObject: CanvasObject): void {
    // Could show a real-time preview overlay
    // For now, just visual feedback through the brush stroke
  }

  private async applyStyleToStroke(
    targetObject: CanvasObject & { data: import('@/lib/editor/objects/types').ImageData },
    strokeCanvas: HTMLCanvasElement
  ): Promise<void> {
    const canvas = this.dependencies.canvasManager
    const style = this.getOption('style') as string
    
    const taskId = `${this.id}-${Date.now()}`
    
    try {
      this.dependencies.eventBus.emit('ai.processing.started', {
        operationId: taskId,
        type: 'style-transfer',
        metadata: {
          toolId: this.id,
          description: `Applying ${style} style transfer`,
          targetObjectIds: [targetObject.id]
        }
      })
      
      // Get the stroke mask
      const maskData = this.createMaskFromStroke(strokeCanvas)
      
      // Get the original image data
      const originalCanvas = document.createElement('canvas')
      originalCanvas.width = targetObject.width
      originalCanvas.height = targetObject.height
      const originalCtx = originalCanvas.getContext('2d')!
      
      // Draw the original image
      if (targetObject.data.element instanceof HTMLImageElement) {
        originalCtx.drawImage(targetObject.data.element, 0, 0, targetObject.width, targetObject.height)
      } else {
        originalCtx.drawImage(targetObject.data.element, 0, 0)
      }
      
      // Apply style transfer (simulated for now)
      const strength = this.getOption('strength') as number
      const preserveContent = this.getOption('preserveContent') as number
      const styledCanvas = await this.simulateStyleTransfer(originalCanvas, maskData, {
        style,
        strength,
        preserveContent
      })
      
      // Update the object with the styled image
      await canvas.updateObject(targetObject.id, {
        data: {
          element: styledCanvas,
          naturalWidth: styledCanvas.width,
          naturalHeight: styledCanvas.height
        } as import('@/lib/editor/objects/types').ImageData
      })
      
      this.dependencies.eventBus.emit('ai.processing.completed', {
        operationId: taskId,
        result: {
          success: true,
          affectedObjectIds: [targetObject.id]
        },
        metadata: {
          toolId: this.id
        }
      })
      
    } catch (error) {
      console.error('Style transfer failed:', error)
      this.dependencies.eventBus.emit('ai.processing.failed', {
        operationId: `${this.id}-${Date.now()}`,
        error: error instanceof Error ? error.message : 'Style transfer failed',
        metadata: {
          toolId: this.id
        }
      })
    }
  }

  private createMaskFromStroke(strokeCanvas: HTMLCanvasElement): ImageData {
    const ctx = strokeCanvas.getContext('2d')!
    return ctx.getImageData(0, 0, strokeCanvas.width, strokeCanvas.height)
  }

  private async simulateStyleTransfer(
    originalCanvas: HTMLCanvasElement,
    maskData: ImageData,
    options: { style: string; strength: number; preserveContent: number }
  ): Promise<HTMLCanvasElement> {
    // This is a simplified simulation of style transfer
    // In a real implementation, this would use AI style transfer models
    const resultCanvas = document.createElement('canvas')
    resultCanvas.width = originalCanvas.width
    resultCanvas.height = originalCanvas.height
    const ctx = resultCanvas.getContext('2d')!
    
    // Copy original image
    ctx.drawImage(originalCanvas, 0, 0)
    
    // Apply style transformation based on style type
    const imageData = ctx.getImageData(0, 0, resultCanvas.width, resultCanvas.height)
    const data = imageData.data
    const maskPixels = maskData.data
    
    for (let i = 0; i < data.length; i += 4) {
      const maskAlpha = maskPixels[i + 3] / 255
      if (maskAlpha > 0) {
        const effectStrength = maskAlpha * options.strength
        
        // Apply style-specific transformations
        switch (options.style) {
          case 'oil-painting':
            this.applyOilPaintingEffect(data, i, effectStrength, options.preserveContent)
            break
          case 'watercolor':
            this.applyWatercolorEffect(data, i, effectStrength, options.preserveContent)
            break
          case 'pencil-sketch':
            this.applyPencilSketchEffect(data, i, effectStrength, options.preserveContent)
            break
          case 'anime':
            this.applyAnimeEffect(data, i, effectStrength, options.preserveContent)
            break
          case 'impressionist':
            this.applyImpressionistEffect(data, i, effectStrength, options.preserveContent)
            break
          case 'abstract':
            this.applyAbstractEffect(data, i, effectStrength, options.preserveContent)
            break
        }
      }
    }
    
    ctx.putImageData(imageData, 0, 0)
    return resultCanvas
  }

  private applyOilPaintingEffect(data: Uint8ClampedArray, i: number, strength: number, preserve: number): void {
    // Oil painting: increase saturation and add texture
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    
    // Increase saturation
    const gray = 0.299 * r + 0.587 * g + 0.114 * b
    const satBoost = 1 + strength * 0.5
    
    data[i] = Math.min(255, gray + (r - gray) * satBoost * (1 - preserve) + r * preserve)
    data[i + 1] = Math.min(255, gray + (g - gray) * satBoost * (1 - preserve) + g * preserve)
    data[i + 2] = Math.min(255, gray + (b - gray) * satBoost * (1 - preserve) + b * preserve)
  }

  private applyWatercolorEffect(data: Uint8ClampedArray, i: number, strength: number, preserve: number): void {
    // Watercolor: soften colors and reduce contrast
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    
    // Soften towards lighter tones
    const softR = r + (255 - r) * strength * 0.3
    const softG = g + (255 - g) * strength * 0.3
    const softB = b + (255 - b) * strength * 0.3
    
    data[i] = softR * (1 - preserve) + r * preserve
    data[i + 1] = softG * (1 - preserve) + g * preserve
    data[i + 2] = softB * (1 - preserve) + b * preserve
  }

  private applyPencilSketchEffect(data: Uint8ClampedArray, i: number, strength: number, preserve: number): void {
    // Pencil sketch: convert to grayscale and enhance edges
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    
    const gray = 0.299 * r + 0.587 * g + 0.114 * b
    const contrast = 1 + strength * 0.5
    const enhanced = Math.min(255, Math.max(0, (gray - 128) * contrast + 128))
    
    data[i] = enhanced * (1 - preserve) + r * preserve
    data[i + 1] = enhanced * (1 - preserve) + g * preserve
    data[i + 2] = enhanced * (1 - preserve) + b * preserve
  }

  private applyAnimeEffect(data: Uint8ClampedArray, i: number, strength: number, preserve: number): void {
    // Anime: posterize colors and increase saturation
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    
    // Posterize (reduce color levels)
    const levels = 8
    const factor = 255 / levels
    const posterR = Math.round(r / factor) * factor
    const posterG = Math.round(g / factor) * factor
    const posterB = Math.round(b / factor) * factor
    
    data[i] = posterR * (1 - preserve) * strength + r * (preserve + (1 - strength))
    data[i + 1] = posterG * (1 - preserve) * strength + g * (preserve + (1 - strength))
    data[i + 2] = posterB * (1 - preserve) * strength + b * (preserve + (1 - strength))
  }

  private applyImpressionistEffect(data: Uint8ClampedArray, i: number, strength: number, preserve: number): void {
    // Impressionist: soften and add color variation
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    
    // Add subtle color variation
    const variation = strength * 20
    const newR = Math.min(255, Math.max(0, r + (Math.random() - 0.5) * variation))
    const newG = Math.min(255, Math.max(0, g + (Math.random() - 0.5) * variation))
    const newB = Math.min(255, Math.max(0, b + (Math.random() - 0.5) * variation))
    
    data[i] = newR * (1 - preserve) + r * preserve
    data[i + 1] = newG * (1 - preserve) + g * preserve
    data[i + 2] = newB * (1 - preserve) + b * preserve
  }

  private applyAbstractEffect(data: Uint8ClampedArray, i: number, strength: number, preserve: number): void {
    // Abstract: high contrast and color shifts
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    
    // High contrast
    const contrast = 1 + strength * 2
    const newR = Math.min(255, Math.max(0, (r - 128) * contrast + 128))
    const newG = Math.min(255, Math.max(0, (g - 128) * contrast + 128))
    const newB = Math.min(255, Math.max(0, (b - 128) * contrast + 128))
    
    // Color shift
    const shiftR = (newR + newG * 0.3) % 255
    const shiftG = (newG + newB * 0.3) % 255
    const shiftB = (newB + newR * 0.3) % 255
    
    data[i] = shiftR * (1 - preserve) + r * preserve
    data[i + 1] = shiftG * (1 - preserve) + g * preserve
    data[i + 2] = shiftB * (1 - preserve) + b * preserve
  }
} 