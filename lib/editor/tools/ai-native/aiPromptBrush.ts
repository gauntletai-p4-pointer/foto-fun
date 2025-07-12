import { ObjectDrawingTool } from '../base/ObjectDrawingTool'
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager'
import type { ToolEvent } from '@/lib/editor/canvas/types'
import type { CanvasObject } from '@/lib/editor/objects/types'
import { ReplicateService } from '@/lib/ai/services/replicate'
import { TypedEventBus } from '@/lib/events/core/TypedEventBus'
// import { nanoid } from 'nanoid'
import { isImageObject } from '@/lib/editor/objects/types'
import { AIPromptBrushIcon } from '@/components/editor/icons/AIToolIcons'

export interface AIPromptBrushOptions {
  brushSize: number
  prompt: string
  strength: number // 0-1, how much the prompt affects the area
  blendMode: 'replace' | 'blend' | 'overlay'
  feather: number // Edge softness
}

interface BrushStroke {
  points: Array<{ x: number; y: number }>
  size: number
  objectId: string
}

/**
 * AI brush that applies prompts to painted areas
 * Example: Paint "make it golden" to turn painted areas golden
 */
export class AIPromptBrush extends ObjectDrawingTool {
  id = 'ai-prompt-brush'
  name = 'AI Prompt Brush'
  icon = AIPromptBrushIcon
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
    // Initialize stroke canvas
    this.strokeCanvas = document.createElement('canvas')
    this.strokeCtx = this.strokeCanvas.getContext('2d')
  }
  
  async cleanupTool(): Promise<void> {
    // Clean up resources
    this.isDrawing = false
    this.currentStroke = null
    this.strokeCanvas = null
    this.strokeCtx = null
  }
  
  getOptions(): AIPromptBrushOptions {
    return {
      brushSize: 50,
      prompt: 'make it beautiful',
      strength: 0.8,
      blendMode: 'blend',
      feather: 10
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
    
    const options = this.getOptions()
    if (!options.prompt || options.prompt.trim() === '') {
      this.eventBus.emit('tool.message', {
        toolId: this.id,
        type: 'warning',
        message: 'Please set a prompt in the tool options before painting'
      })
    }
  }
  
  async onMouseDown(event: ToolEvent): Promise<void> {
    const canvas = this.getCanvas()
    if (!canvas) return
    
    const options = this.getOptions()
    if (!options.prompt || options.prompt.trim() === '') {
      this.eventBus.emit('tool.message', {
        toolId: this.id,
        type: 'error',
        message: 'No prompt set. Please enter a prompt in the tool options.'
      })
      return
    }
    
    // Find the object under the cursor
    const targetObject = canvas.getObjectAtPoint(event.point)
    if (!targetObject || !isImageObject(targetObject)) {
      this.eventBus.emit('tool.message', {
        toolId: this.id,
        type: 'info',
        message: 'Click and drag on an image to apply the AI prompt'
      })
      return
    }
    
    // Initialize stroke
    this.isDrawing = true
    this.currentStroke = {
      points: [event.point],
      size: options.brushSize,
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
    
    // Show preview (optional)
    this.updatePreview()
  }
  
  async onMouseUp(_event: ToolEvent): Promise<void> {
    if (!this.isDrawing || !this.currentStroke || !this.strokeCanvas) return
    
    this.isDrawing = false
    
    const canvas = this.getCanvas()
    if (!canvas) return
    
    const targetObject = canvas.getObject(this.currentStroke.objectId)
    if (!targetObject || !isImageObject(targetObject)) return
    
    // Apply the AI prompt to the painted area
    await this.applyPromptToStroke(targetObject, this.strokeCanvas)
    
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
  
  private updatePreview(): void {
    // Could show a real-time preview of the effect
    // For now, just show the brush stroke
  }
  
  private async applyPromptToStroke(
    targetObject: CanvasObject & { data: import('@/lib/editor/objects/types').ImageData },
    strokeCanvas: HTMLCanvasElement
  ): Promise<void> {
    const canvas = this.getCanvas()
    if (!canvas) return
    
    const options = this.getOptions()
    
    try {
      const taskId = `${this.id}-${Date.now()}`
      this.eventBus.emit('ai.processing.started', {
        taskId,
        toolId: this.id,
        description: `AI painting with prompt: ${options.prompt}`
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
      // 1. Send the image, mask, and prompt to an AI inpainting model
      // 2. Get back the modified region
      // 3. Blend it with the original based on the blend mode
      
      // For now, simulate the effect
      const modifiedCanvas = await this.simulatePromptEffect(
        originalCanvas,
        maskData,
        options
      )
      
      // Create a new image object with the result
      const blob = await new Promise<Blob>((resolve) => {
        modifiedCanvas.toBlob((blob) => resolve(blob!), 'image/png')
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
            lastAIPrompt: options.prompt,
            lastAIBrushEdit: new Date().toISOString()
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
      console.error('AI prompt brush failed:', error)
      const errorTaskId = `${this.id}-${Date.now()}`
      this.eventBus.emit('ai.processing.failed', {
        taskId: errorTaskId,
        toolId: this.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
  
  private createMaskFromStroke(strokeCanvas: HTMLCanvasElement): ImageData {
    const ctx = strokeCanvas.getContext('2d')!
    return ctx.getImageData(0, 0, strokeCanvas.width, strokeCanvas.height)
  }
  
  private async simulatePromptEffect(
    originalCanvas: HTMLCanvasElement,
    maskData: ImageData,
    options: AIPromptBrushOptions
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
    
    // Simulate prompt effects based on common prompts
    const promptLower = options.prompt.toLowerCase()
    
    for (let i = 0; i < data.length; i += 4) {
      const maskAlpha = maskPixels[i + 3] / 255
      if (maskAlpha === 0) continue
      
      const effectStrength = maskAlpha * options.strength
      
      // Apply effects based on prompt keywords
      if (promptLower.includes('golden') || promptLower.includes('gold')) {
        // Golden effect
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        
        data[i] = Math.min(255, r + (255 - r) * effectStrength * 0.8)
        data[i + 1] = Math.min(255, g + (215 - g) * effectStrength * 0.8)
        data[i + 2] = Math.min(255, b + (0 - b) * effectStrength * 0.5)
      } else if (promptLower.includes('bright')) {
        // Brightness
        data[i] = Math.min(255, data[i] * (1 + effectStrength * 0.5))
        data[i + 1] = Math.min(255, data[i + 1] * (1 + effectStrength * 0.5))
        data[i + 2] = Math.min(255, data[i + 2] * (1 + effectStrength * 0.5))
      } else if (promptLower.includes('dark')) {
        // Darkness
        data[i] = data[i] * (1 - effectStrength * 0.5)
        data[i + 1] = data[i + 1] * (1 - effectStrength * 0.5)
        data[i + 2] = data[i + 2] * (1 - effectStrength * 0.5)
      } else if (promptLower.includes('blur')) {
        // Simple blur (would be better with proper convolution)
        const x = (i / 4) % width
        const y = Math.floor((i / 4) / width)
        const blurRadius = 3
        
        let r = 0, g = 0, b = 0, count = 0
        
        for (let dy = -blurRadius; dy <= blurRadius; dy++) {
          for (let dx = -blurRadius; dx <= blurRadius; dx++) {
            const nx = x + dx
            const ny = y + dy
            
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const idx = (ny * width + nx) * 4
              r += data[idx]
              g += data[idx + 1]
              b += data[idx + 2]
              count++
            }
          }
        }
        
        if (count > 0) {
          data[i] = Math.round(data[i] * (1 - effectStrength) + (r / count) * effectStrength)
          data[i + 1] = Math.round(data[i + 1] * (1 - effectStrength) + (g / count) * effectStrength)
          data[i + 2] = Math.round(data[i + 2] * (1 - effectStrength) + (b / count) * effectStrength)
        }
      } else if (promptLower.includes('beautiful') || promptLower.includes('enhance')) {
        // Generic enhancement - increase contrast and saturation
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        
        // Increase contrast
        data[i] = Math.min(255, Math.max(0, (r - 128) * (1 + effectStrength * 0.3) + 128))
        data[i + 1] = Math.min(255, Math.max(0, (g - 128) * (1 + effectStrength * 0.3) + 128))
        data[i + 2] = Math.min(255, Math.max(0, (b - 128) * (1 + effectStrength * 0.3) + 128))
        
        // Increase saturation
        const gray = 0.299 * r + 0.587 * g + 0.114 * b
        const saturationBoost = 1 + effectStrength * 0.3
        
        data[i] = Math.min(255, Math.max(0, gray + (data[i] - gray) * saturationBoost))
        data[i + 1] = Math.min(255, Math.max(0, gray + (data[i + 1] - gray) * saturationBoost))
        data[i + 2] = Math.min(255, Math.max(0, gray + (data[i + 2] - gray) * saturationBoost))
      }
      
      // Apply blend mode
      if (options.blendMode === 'overlay') {
        // Keep some of the original
        const originalIdx = i
        const origR = originalCanvas.getContext('2d')!.getImageData(0, 0, width, height).data[originalIdx]
        const origG = originalCanvas.getContext('2d')!.getImageData(0, 0, width, height).data[originalIdx + 1]
        const origB = originalCanvas.getContext('2d')!.getImageData(0, 0, width, height).data[originalIdx + 2]
        
        data[i] = Math.round(origR * (1 - effectStrength) + data[i] * effectStrength)
        data[i + 1] = Math.round(origG * (1 - effectStrength) + data[i + 1] * effectStrength)
        data[i + 2] = Math.round(origB * (1 - effectStrength) + data[i + 2] * effectStrength)
      }
    }
    
    resultCtx.putImageData(imageData, 0, 0)
    return resultCanvas
  }
} 