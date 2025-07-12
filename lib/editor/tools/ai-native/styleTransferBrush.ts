import { ObjectDrawingTool } from '../base/ObjectDrawingTool'
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager'
import type { ToolEvent } from '@/lib/editor/canvas/types'
import type { CanvasObject } from '@/lib/editor/objects/types'
import { ReplicateService } from '@/lib/ai/services/replicate'
import { TypedEventBus } from '@/lib/events/core/TypedEventBus'
import { isImageObject } from '@/lib/editor/objects/types'
import { StyleTransferBrushIcon } from '@/components/editor/icons/AIToolIcons'

export interface StyleTransferBrushOptions {
  brushSize: number
  style: 'oil-painting' | 'watercolor' | 'pencil-sketch' | 'anime' | 'impressionist' | 'abstract'
  strength: number // 0-1, how much style to apply
  preserveContent: number // 0-1, how much to preserve original content
  feather: number // Edge softness
}

interface BrushStroke {
  points: Array<{ x: number; y: number }>
  size: number
  objectId: string
}

/**
 * AI brush that selectively applies artistic styles to painted areas
 * Like a magic brush that turns photos into paintings where you paint
 */
export class StyleTransferBrush extends ObjectDrawingTool {
  id = 'ai-style-transfer'
  name = 'Style Transfer Brush'
  icon = StyleTransferBrushIcon
  cursor = 'crosshair'
  
  private replicateService: ReplicateService
  private eventBus: TypedEventBus
  protected isDrawing = false
  private currentStroke: BrushStroke | null = null
  private strokeCanvas: HTMLCanvasElement | null = null
  private strokeCtx: CanvasRenderingContext2D | null = null
  
  constructor() {
    super()
    this.replicateService = new ReplicateService()
    this.eventBus = new TypedEventBus()
  }
  
  async setupTool(): Promise<void> {
    // Initialize tool-specific resources
    // No special setup needed for style transfer brush
  }
  
  async cleanupTool(): Promise<void> {
    // Clean up any active strokes
    this.isDrawing = false
    this.currentStroke = null
    this.strokeCanvas = null
    this.strokeCtx = null
  }
  
  getOptions(): StyleTransferBrushOptions {
    return {
      brushSize: 75,
      style: 'oil-painting',
      strength: 0.7,
      preserveContent: 0.6,
      feather: 15
    }
  }
  
  protected createEmptyImageData(width: number, height: number): ImageData {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!
    return ctx.createImageData(width, height)
  }
  
  async onActivate(canvas: CanvasManager): Promise<void> {
    await super.onActivate(canvas)
    
    this.eventBus.emit('tool.message', {
      toolId: this.id,
      type: 'info',
      message: 'Paint on images to apply artistic styles to specific areas'
    })
  }
  
  async onMouseDown(event: ToolEvent): Promise<void> {
    const canvas = this.getCanvas()
    if (!canvas) return
    
    // Find the object under the cursor
    const targetObject = canvas.getObjectAtPoint(event.point)
    if (!targetObject || !isImageObject(targetObject)) {
      this.eventBus.emit('tool.message', {
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
      size: this.getOptions().brushSize,
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
  
  async onMouseMove(event: ToolEvent): Promise<void> {
    if (!this.isDrawing || !this.currentStroke || !this.strokeCtx) return
    
    const canvas = this.getCanvas()
    if (!canvas) return
    
    const targetObject = canvas.getObject(this.currentStroke.objectId)
    if (!targetObject) return
    
    // Add point to stroke
    this.currentStroke.points.push(event.point)
    
    // Draw the stroke point
    this.drawStrokePoint(event.point, targetObject)
    
    // Show preview overlay
    this.updatePreview(targetObject)
  }
  
  async onMouseUp(_event: ToolEvent): Promise<void> {
    if (!this.isDrawing || !this.currentStroke || !this.strokeCanvas) return
    
    this.isDrawing = false
    
    const canvas = this.getCanvas()
    if (!canvas) return
    
    const targetObject = canvas.getObject(this.currentStroke.objectId)
    if (!targetObject || !isImageObject(targetObject)) return
    
    // Apply the style transfer to the painted area
    await this.applyStyleToStroke(targetObject, this.strokeCanvas)
    
    // Clean up
    this.currentStroke = null
    this.strokeCanvas = null
    this.strokeCtx = null
  }
  
  private drawStrokePoint(point: { x: number; y: number }, targetObject: CanvasObject): void {
    if (!this.strokeCtx) return
    
    const options = this.getOptions()
    const relativeX = point.x - targetObject.x
    const relativeY = point.y - targetObject.y
    
    // Draw with feathered brush
    const gradient = this.strokeCtx.createRadialGradient(
      relativeX, relativeY, 0,
      relativeX, relativeY, options.brushSize / 2
    )
    
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
    gradient.addColorStop(1 - options.feather / options.brushSize, 'rgba(255, 255, 255, 1)')
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
    
    this.strokeCtx.globalCompositeOperation = 'source-over'
    this.strokeCtx.fillStyle = gradient
    this.strokeCtx.beginPath()
    this.strokeCtx.arc(relativeX, relativeY, options.brushSize / 2, 0, Math.PI * 2)
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
    const canvas = this.getCanvas()
    if (!canvas) return
    
    const options = this.getOptions()
    
    const taskId = `${this.id}-${Date.now()}`
    
    try {
      this.eventBus.emit('ai.processing.started', {
        taskId,
        toolId: this.id,
        description: `Applying ${options.style} style transfer`
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
      
      // In a real implementation, this would:
      // 1. Extract the masked region
      // 2. Send to a style transfer AI model
      // 3. Get back the stylized version
      // 4. Blend with original based on mask and settings
      
      // For now, simulate the style effect
      const styledCanvas = await this.simulateStyleTransfer(
        originalCanvas,
        maskData,
        options
      )
      
      // Create a new image object with the result
      const blob = await new Promise<Blob>((resolve) => {
        styledCanvas.toBlob((blob) => resolve(blob!), 'image/png')
      })
      
      const url = URL.createObjectURL(blob)
      const img = new Image()
      
      img.onload = async () => {
        // Update the object with the new image
        await canvas.updateObject(targetObject.id, {
          data: {
            src: url,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
            element: img
          },
          metadata: {
            ...targetObject.metadata,
            lastStyleTransfer: options.style,
            lastStyleTransferDate: new Date().toISOString()
          }
        })
        
        this.eventBus.emit('ai.processing.completed', {
          taskId,
          toolId: this.id,
          success: true
        })
      }
      
      img.src = url
      
    } catch (error) {
      console.error('Style transfer failed:', error)
      this.eventBus.emit('ai.processing.failed', {
        taskId,
        toolId: this.id,
        error: error instanceof Error ? error.message : 'Unknown error'
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
    options: StyleTransferBrushOptions
  ): Promise<HTMLCanvasElement> {
    const width = originalCanvas.width
    const height = originalCanvas.height
    
    const resultCanvas = document.createElement('canvas')
    resultCanvas.width = width
    resultCanvas.height = height
    const resultCtx = resultCanvas.getContext('2d')!
    
    // Draw original
    resultCtx.drawImage(originalCanvas, 0, 0)
    
    // Get image data
    const imageData = resultCtx.getImageData(0, 0, width, height)
    const data = imageData.data
    const maskPixels = maskData.data
    
    // Apply style effects based on selected style
    for (let i = 0; i < data.length; i += 4) {
      const maskAlpha = maskPixels[i + 3] / 255
      if (maskAlpha === 0) continue
      
      const effectStrength = maskAlpha * options.strength
      const contentPreservation = options.preserveContent
      
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      
      let newR = r, newG = g, newB = b
      
      switch (options.style) {
        case 'oil-painting':
          // Simulate oil painting with color quantization and texture
          newR = Math.round(r / 32) * 32
          newG = Math.round(g / 32) * 32
          newB = Math.round(b / 32) * 32
          
          // Add slight color mixing
          const avgColor = (newR + newG + newB) / 3
          newR = newR * 0.8 + avgColor * 0.2
          newG = newG * 0.8 + avgColor * 0.2
          newB = newB * 0.8 + avgColor * 0.2
          break
          
        case 'watercolor':
          // Simulate watercolor with transparency and bleeding
          const luminance = 0.299 * r + 0.587 * g + 0.114 * b
          const _saturation = Math.max(r, g, b) - Math.min(r, g, b)
          
          // Reduce saturation and add transparency effect
          newR = r * 0.7 + luminance * 0.3
          newG = g * 0.7 + luminance * 0.3
          newB = b * 0.7 + luminance * 0.3
          
          // Add slight color variation
          newR += (Math.random() - 0.5) * 20
          newG += (Math.random() - 0.5) * 20
          newB += (Math.random() - 0.5) * 20
          break
          
        case 'pencil-sketch':
          // Convert to grayscale with edge emphasis
          const gray = 0.299 * r + 0.587 * g + 0.114 * b
          const edge = this.detectEdge(data, i, width, height)
          const sketch = gray * (1 - edge * 0.5)
          
          newR = newG = newB = sketch
          break
          
        case 'anime':
          // Cel shading effect with bold colors
          const levels = 4
          newR = Math.round(r / 255 * levels) * (255 / levels)
          newG = Math.round(g / 255 * levels) * (255 / levels)
          newB = Math.round(b / 255 * levels) * (255 / levels)
          
          // Enhance saturation
          const grayAnime = (newR + newG + newB) / 3
          newR = grayAnime + (newR - grayAnime) * 1.5
          newG = grayAnime + (newG - grayAnime) * 1.5
          newB = grayAnime + (newB - grayAnime) * 1.5
          break
          
        case 'impressionist':
          // Dabs of color with variation
          const offsetX = Math.sin(i * 0.01) * 5
          const offsetY = Math.cos(i * 0.01) * 5
          const offsetIndex = i + Math.round(offsetX) * 4 + Math.round(offsetY) * width * 4
          
          if (offsetIndex >= 0 && offsetIndex < data.length) {
            newR = data[offsetIndex] * 0.7 + r * 0.3
            newG = data[offsetIndex + 1] * 0.7 + g * 0.3
            newB = data[offsetIndex + 2] * 0.7 + b * 0.3
          }
          
          // Add color variation
          newR += (Math.random() - 0.5) * 30
          newG += (Math.random() - 0.5) * 30
          newB += (Math.random() - 0.5) * 30
          break
          
        case 'abstract':
          // Extreme color shifts and distortion
          const hue = Math.atan2(r - 128, g - 128)
          const shift = Math.sin(hue + i * 0.001) * 100
          
          newR = r + shift
          newG = g - shift * 0.5
          newB = b + shift * 0.7
          
          // Add noise
          newR += (Math.random() - 0.5) * 50
          newG += (Math.random() - 0.5) * 50
          newB += (Math.random() - 0.5) * 50
          break
      }
      
      // Clamp values
      newR = Math.max(0, Math.min(255, newR))
      newG = Math.max(0, Math.min(255, newG))
      newB = Math.max(0, Math.min(255, newB))
      
      // Blend with original based on content preservation
      data[i] = r * contentPreservation + newR * (1 - contentPreservation) * effectStrength + r * (1 - effectStrength)
      data[i + 1] = g * contentPreservation + newG * (1 - contentPreservation) * effectStrength + g * (1 - effectStrength)
      data[i + 2] = b * contentPreservation + newB * (1 - contentPreservation) * effectStrength + b * (1 - effectStrength)
    }
    
    resultCtx.putImageData(imageData, 0, 0)
    return resultCanvas
  }
  
  private detectEdge(data: Uint8ClampedArray, index: number, width: number, height: number): number {
    const x = (index / 4) % width
    const y = Math.floor((index / 4) / width)
    
    if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
      return 0
    }
    
    // Simple edge detection using neighboring pixels
    const _current = data[index]
    const left = data[index - 4]
    const right = data[index + 4]
    const top = data[index - width * 4]
    const bottom = data[index + width * 4]
    
    const horizontalEdge = Math.abs(left - right)
    const verticalEdge = Math.abs(top - bottom)
    
    return Math.min(1, (horizontalEdge + verticalEdge) / 255)
  }
} 